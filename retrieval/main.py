from fastapi import FastAPI
from fastapi import Request
import json
from helpers.search import hybrid_semantic_vector_search
from helpers.common import build_context_from_hits
from helpers.open_ai import generate_llm_response, guardrail_validate
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