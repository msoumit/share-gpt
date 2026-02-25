from fastapi import FastAPI
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import json
from helpers.search import hybrid_semantic_vector_search
from helpers.common import build_context_from_hits
from helpers.open_ai import generate_llm_response, guardrail_validate
from helpers.cosmos import read_chat_thread_items, create_chat_thread_item, update_chat_thread_item, delete_chat_thread_item
from helpers.cosmos import read_chat_message_items
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
        return JSONResponse(
            status_code=500,
            content={"error": "failed to create chat threads"}
        )


@app.post("/get-response")
async def get_response(request: Request):
    
    body = await request.json()
    prompt = body.get("prompt")
    hits = hybrid_semantic_vector_search(prompt, k=5)
    context = build_context_from_hits(hits)
    rag_answer = generate_llm_response(context=context, prompt=prompt)
    
    # deliberate attempt to tamper rag answer for hallucination check
    # rag_answer["answer"] = str(rag_answer["answer"]).replace("Asset", "Insurance")
    
    validated_response = guardrail_validate(context=context, prompt=prompt, rag_answer=rag_answer)

    return validated_response