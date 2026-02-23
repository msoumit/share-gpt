from dotenv import load_dotenv
import os
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from typing import List, Dict, Any
from helpers.common import batched, build_source_url_filter

load_dotenv()

SEARCH_ENDPOINT = os.getenv("AZURE_SEARCH_ENDPOINT")
SEARCH_KEY = os.getenv("AZURE_SEARCH_ADMIN_KEY")
INDEX_NAME = os.getenv("AZURE_SEARCH_INDEX")
SEARCH_BATCH_SIZE = os.getenv("SEARCH_BATCH_SIZE")
SEARCH_FILTER_BATCH_SIZE = os.getenv("SEARCH_FILTER_BATCH_SIZE")

KEY_FIELD = "id"

search_client = SearchClient(
    endpoint=SEARCH_ENDPOINT,
    index_name=INDEX_NAME,
    credential=AzureKeyCredential(SEARCH_KEY)
)

def fetch_keys_for_existing_source_urls(source_urls: List[str], page_size: int = 1000) -> List[str]:
    
    keys: List[str] = []

    for su_batch in batched(source_urls, int(SEARCH_FILTER_BATCH_SIZE)):
        filt = build_source_url_filter(su_batch)

        results = search_client.search(
            search_text="*",
            filter=filt,
            select=[KEY_FIELD],
            top=page_size,
        )

        for page in results.by_page():
            for doc in page:
                keys.append(doc[KEY_FIELD])

    # de-dupe keys (preserve order)
    return list(dict.fromkeys(keys))

def delete_keys_in_batches(keys: List[str]):
    for batch_keys in batched(keys, int(SEARCH_BATCH_SIZE)):
        docs = [{KEY_FIELD: k} for k in batch_keys]

        result = search_client.delete_documents(documents=docs)
        failed = [r for r in result if not r.succeeded]
        if failed:
            raise RuntimeError(f"Delete failed for {len(failed)} chunks. First error: {failed[0].error_message}")
        
        print(f"Deleted {len(batch_keys)} chunks (total so far: {len(batch_keys)})....")
        
def upload_chunks_in_batches(chunks: List[Dict[str, Any]]):
    for i in range(0, len(chunks), int(SEARCH_BATCH_SIZE)):
        batch = chunks[i:i + int(SEARCH_BATCH_SIZE)]
        result = search_client.upload_documents(documents=batch)

        failed = [r for r in result if not r.succeeded]
        if failed:
            raise RuntimeError(f"Upload failed for {len(failed)} chunks. First error: {failed[0].error_message}")

        return f"Uploaded {len(batch)} chunks (total {min(i+int(SEARCH_BATCH_SIZE), len(chunks))}/{len(chunks)})"
    
def delete_all_chunks_from_index(page_size: int = 1000):
    results = search_client.search(
        search_text="*",
        select=KEY_FIELD,
    )

    total_deleted = 0
    batch = []

    for page in results.by_page():
        for doc in page:
            batch.append({KEY_FIELD: doc[KEY_FIELD]})

            if len(batch) >= page_size:
                search_client.delete_documents(documents=batch)
                total_deleted += len(batch)
                batch.clear()

    # delete remaining
    if batch:
        search_client.delete_documents(documents=batch)
        total_deleted += len(batch)

    return {
        "status": "completed",
        "documents_deleted": total_deleted,
    }