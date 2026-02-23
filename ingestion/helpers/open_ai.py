from dotenv import load_dotenv
import os
from openai import AzureOpenAI
from helpers.prompts import TABLE_SUMMARY_SYSTEM_PROMPT
from typing import List, Dict, Any

load_dotenv()

OAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
OAI_KEY = os.getenv("AZURE_OPENAI_API_KEY")
OAI_EMBED_DEPLOYMENT = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")
OAI_MODEL_DEPLOYMENT = os.getenv("AZURE_OPENAI_MODEL_DEPLOYMENT")
EMBEDDING_BATCH_SIZE = os.getenv("EMBEDDING_BATCH_SIZE")

oai_client = AzureOpenAI(
    azure_endpoint=OAI_ENDPOINT,
    api_key=OAI_KEY,
    api_version="2024-10-21",
)

def summarize_table_text_via_llm(table_text: str) -> str:
    user_prompt = f"""Convert the following table into structured descriptive sentences.

Table:
{table_text}
"""
    resp = oai_client.chat.completions.create(
        model=OAI_MODEL_DEPLOYMENT,
        temperature=0,
        messages=[
            {"role": "system", "content": TABLE_SUMMARY_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    return (resp.choices[0].message.content or "").strip()

def embed_texts_batch(texts: List[str]) -> List[List[float]]:

    embeddings: List[List[float]] = []

    for start in range(0, len(texts), int(EMBEDDING_BATCH_SIZE)):
        batch = texts[start : start + int(EMBEDDING_BATCH_SIZE)]

        # One API call for many inputs (cheaper + faster than per-chunk calls)
        resp = oai_client.embeddings.create(
            model=OAI_EMBED_DEPLOYMENT,
            input=batch,
        )

        # resp.data is in the same order as `batch`
        embeddings.extend([item.embedding for item in resp.data])

    return embeddings

def add_embeddings_to_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:

    # Collect texts + indexes so we can skip empty strings safely
    idx_and_text = [(i, (c.get("chunk") or "").strip()) for i, c in enumerate(chunks)]
    idx_and_text = [(i, t) for i, t in idx_and_text if t]  # keep only non-empty

    # Default embedding=None for all
    for c in chunks:
        c["embedding"] = None

    if not idx_and_text:
        return chunks

    # Embed only the non-empty texts
    texts = [t for _, t in idx_and_text]
    embs = embed_texts_batch(texts)

    # Put embeddings back into original chunk objects
    for (i, _), emb in zip(idx_and_text, embs):
        chunks[i]["embedding"] = emb

    return chunks