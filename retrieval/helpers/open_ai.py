from dotenv import load_dotenv
import os
from openai import AzureOpenAI
import json
from helpers.prompts import SYSTEM_PROMPT
from helpers.common import build_validation_prompt, compute_confidence_from_claims, compute_verdict, build_final_response

load_dotenv()

OAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
OAI_KEY = os.getenv("AZURE_OPENAI_API_KEY")
OAI_EMBED_DEPLOYMENT = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")
OAI_MODEL_DEPLOYMENT = os.getenv("AZURE_OPENAI_MODEL_DEPLOYMENT")

oai_client = AzureOpenAI(
    azure_endpoint=OAI_ENDPOINT,
    api_key=OAI_KEY,
    api_version="2024-10-21",
)

def embed_query(text: str) -> list[float]:
    response = oai_client.embeddings.create(
        model=OAI_EMBED_DEPLOYMENT,
        input=text,
    )
    return response.data[0].embedding

def generate_llm_response(context: str, prompt: str):
    response = oai_client.chat.completions.create(
        model=OAI_MODEL_DEPLOYMENT,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion:\n{prompt}"
            }
        ],
        temperature=0.1,
        max_completion_tokens=500
    )
    answer = response.choices[0].message.content
    parsed_answer = json.loads(answer)
    return parsed_answer
    

def guardrail_validate(context: str, prompt: str, rag_answer: dict):
    validation_prompt = build_validation_prompt(context=context, prompt=prompt, rag_answer=rag_answer)
    validation_response = oai_client.chat.completions.create(
        model=OAI_MODEL_DEPLOYMENT,
        messages=[
            {"role": "system", "content": "You are a strict JSON-only validation agent."},
            {"role": "user", "content": validation_prompt}
        ],
        temperature=0.0,
        max_completion_tokens=800
    )
    validation_answer = validation_response.choices[0].message.content
    validation_json = json.loads(validation_answer)

    claims = validation_json.get("claims", [])
    det_conf = compute_confidence_from_claims(claims)
    det_verdict = compute_verdict(det_conf, claims)
    validation_json["confidence"] = det_conf
    validation_json["verdict"] = det_verdict

    final_response = build_final_response(rag_answer=rag_answer, validation_json=validation_json)
    
    return final_response