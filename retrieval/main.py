from fastapi import FastAPI
from fastapi import Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
import json
from helpers.search import hybrid_semantic_vector_search
from helpers.common import build_context_from_hits, parse_json_response
from helpers.open_ai import generate_llm_response, guardrail_validate, stream_llm_response_chunks
from helpers.cosmos import read_chat_thread_items, create_chat_thread_item, update_chat_thread_item, delete_chat_thread_item
from helpers.cosmos import read_chat_message_items, create_chat_message_items
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def index():
    return {"response": "hello world v2"}

@app.post("/sample-test")
def sample_test():
    return {"response": "sample test successful"}

@app.post('/read-chat-threads')
async def read_chat_threads(request: Request):
    try:
        body = await request.json()
        user_email = body.get("userEmail")
        type = body.get("type")

        if not user_email or not type:
            return JSONResponse(
                status_code=400,
                content={"error": "userEmail and type are required"}
            )
        
        chat_threads = read_chat_thread_items(user_email, type)
        return chat_threads
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "failed to fetch chat threads"}
        )
    
@app.post('/create-chat-threads', status_code=201)
async def create_chat_threads(request: Request):
    try:
        body = await request.json()
        new_thread = create_chat_thread_item(body)
        return new_thread

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "failed to create chat thread"}
        )

@app.post('/update-chat-threads')
async def update_chat_threads(request: Request):
    try:
        body = await request.json()
        
        user_email = body.get("userEmail")
        thread_id = body.get("id")
        name = body.get("name")
        
        if not user_email or not thread_id:
            return JSONResponse(status_code=400, content={"error": "userEmail and id are required"})
        
        if not name or not str(name).strip():
            return JSONResponse(status_code=400, content={"error": "name is required"})

        updated_thread = update_chat_thread_item(thread_id, user_email, str(name).strip())
        
        return updated_thread

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "failed to update chat thread"})

    
@app.post('/delete-chat-threads')
async def delete_chat_threads(request: Request):
    try:
        body = await request.json()
                
        user_email = body.get('userEmail')
        thread_id = body.get('id')

        if not user_email or not thread_id:
            return JSONResponse(status_code=400, content={"error": "userEmail and id are required"})

        delete_chat_thread_item(thread_id, user_email)
        
        return Response(status_code=204)

    except Exception as e: 
        return JSONResponse(
            status_code=500,
            content={"error": "failed to delete chat thread"}
        )
    
@app.post('/read-chat-messages')
async def read_chat_messages(request: Request):
    try:
        body = await request.json()

        thread_id = body['threadId']
        type = body['type']
        user_email = body['userEmail']

        if not user_email or not thread_id:
            return JSONResponse(
                status_code=400,
                content={"error": "userEmail and threadId are required"}
            )

        chat_messages = read_chat_message_items(user_email, thread_id, type)

        return chat_messages

    except Exception as e:
        print(str(e))
        return JSONResponse(
            status_code=500,
            content={"error": "failed to read chat messages"}
        )


@app.post("/get-response")
async def get_response(request: Request):
    
    body = await request.json()
    prompt = body.get("content")

    print("Performing hybrid search against search index....")
    hits = hybrid_semantic_vector_search(prompt, k=5)

    print("Building context from search result....")
    context = build_context_from_hits(hits)

    print("Generating augmented LLM response....")
    rag_answer = generate_llm_response(context=context, prompt=prompt)
    
    print("Performing guardrail validation for hallucination check....")
    validated_response = guardrail_validate(context=context, prompt=prompt, rag_answer=rag_answer)

    print("Creating chat messages for user and assistant into Cosmos DB....")
    create_chat_message_items(body, validated_response, context)

    return validated_response

@app.post("/get-streamed-response")
async def get_streamed_response(request: Request):
    body = await request.json()
    prompt = body.get("content")

    if not prompt:
        return JSONResponse(
            status_code=400,
            content={"error": "content is required"}
        )

    def event_stream():
        try:
            yield f"event: status\ndata: {json.dumps({'stage': 'retrieving_documents'})}\n\n"
            print("Performing hybrid search against search index....")
            hits = hybrid_semantic_vector_search(prompt, k=5)

            print("Building context from search result....")
            context = build_context_from_hits(hits)

            yield f"event: status\ndata: {json.dumps({'stage': 'generating_answer'})}\n\n"

            print("Generating augmented LLM response....")
            raw_parts = []
            for delta in stream_llm_response_chunks(context=context, prompt=prompt):
                raw_parts.append(delta)
                yield f"event: answer_delta\ndata: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"

            rag_answer = parse_json_response("".join(raw_parts))

            yield f"event: status\ndata: {json.dumps({'stage': 'validating_response'})}\n\n"
            print("Performing guardrail validation for hallucination check....")
            validated_response = guardrail_validate(context=context, prompt=prompt, rag_answer=rag_answer)

            print("Creating chat messages for user and assistant into Cosmos DB....")
            # create_chat_message_items(body, validated_response, context)

            yield f"event: final\ndata: {json.dumps(validated_response, ensure_ascii=False)}\n\n"
            yield "event: done\ndata: {}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
