from fastapi import FastAPI
from fastapi import Request
import json
from helpers.blob import get_blobs
from helpers.chunking import generate_chunks_for_files
from helpers.open_ai import add_embeddings_to_chunks
from helpers.common import get_unique_source_urls
from helpers.search import fetch_keys_for_existing_source_urls, delete_keys_in_batches, upload_chunks_in_batches
from helpers.search import delete_all_chunks_from_index
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

@app.post("/ingest")
async def ingest():

    print("Getting blob contents....")
    blob_inputs = get_blobs()

    print("Generating chunks....")
    chunks = generate_chunks_for_files(blob_inputs)
    
    print("Generating embeddings....")
    chunks_with_embedding = add_embeddings_to_chunks(chunks)
    
    print("Checking existing chunks in search index....")
    source_urls = get_unique_source_urls(chunks_with_embedding)
    keys = fetch_keys_for_existing_source_urls(source_urls)

    if keys:
        print("Deleting existing chunks from search index....")
        delete_keys_in_batches(keys)
    
    print("Uploading all chunks into search index....")
    ingestion_response = upload_chunks_in_batches(chunks_with_embedding)
    print(ingestion_response)
    
    return ingestion_response

@app.post("/clear-index")
async def clear_index():
    response = delete_all_chunks_from_index()
    return response