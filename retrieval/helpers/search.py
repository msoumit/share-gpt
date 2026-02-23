from dotenv import load_dotenv
import os
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from helpers.open_ai import embed_query

load_dotenv()

SEARCH_ENDPOINT = os.getenv("AZURE_SEARCH_ENDPOINT")
SEARCH_KEY = os.getenv("AZURE_SEARCH_ADMIN_KEY")
INDEX_NAME = os.getenv("AZURE_SEARCH_INDEX")

VECTOR_FIELD = "embedding"
SELECT_FIELDS = ["id", "kind", "title", "source_url", "chunk", "chunk_id"]
SEMANTIC_CONFIG_NAME = "index-03-semantic-configuration"
TOP_K = 5

search_client = SearchClient(
    endpoint=SEARCH_ENDPOINT,
    index_name=INDEX_NAME,
    credential=AzureKeyCredential(SEARCH_KEY)
)

def hybrid_semantic_vector_search(prompt: str, k: int = TOP_K):
    qvec = embed_query(prompt)

    results = search_client.search(
        search_text=prompt,
        vector_queries=[{
            "kind": "vector",
            "vector": qvec,
            "fields": VECTOR_FIELD,
            "k": k
        }],
        query_type="semantic",
        semantic_configuration_name=SEMANTIC_CONFIG_NAME,
        query_caption="extractive",
        top=k,
        select=SELECT_FIELDS
    )

    out = []
    for r in results:
        out.append({
            "score": r.get("@search.score"),
            "rerankerScore": r.get("@search.reranker_score"),
            **{f: r.get(f) for f in SELECT_FIELDS}
        })
    return out