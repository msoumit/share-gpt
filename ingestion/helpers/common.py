import os
import re
from typing import List, Any, Dict, Set

from dotenv import load_dotenv

load_dotenv()

INDEX_NAME = os.getenv("AZURE_SEARCH_INDEX")
OAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
OAI_KEY = os.getenv("AZURE_OPENAI_API_KEY")
OAI_EMBED_DEPLOYMENT = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")

def guess_content_type(filename: str) -> str:
    ext = os.path.splitext(filename.lower())[1]
    if ext == ".pdf":
        return "application/pdf"
    if ext == ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    raise ValueError(f"Unsupported file type: {filename}")

def generate_chunk_id(filename: str, counter: int) -> str:
    base = os.path.splitext(os.path.basename(filename))[0]
    safe = re.sub(r"[^a-zA-Z0-9_-]", "_", base)
    return f"{safe}_chunk{counter}"

def escape_odata_string(s: str) -> str:
    return s.replace("'", "''")

def batched(seq: List[Any], batch_size: int):
    for i in range(0, len(seq), batch_size):
        yield seq[i:i + batch_size]

def get_unique_source_urls(chunks: List[Dict[str, Any]]) -> List[str]:
    seen: Set[str] = set()
    out: List[str] = []
    for c in chunks:
        su = c.get("source_url")
        if su and su not in seen:
            seen.add(su)
            out.append(su)
    return out

def build_source_url_filter(source_urls: List[str]) -> str:
    return " or ".join([f"source_url eq '{escape_odata_string(su)}'" for su in source_urls])

def build_index_payload() -> dict:
    index_name = INDEX_NAME

    algo_name = f"{index_name}-algorithm"
    vprofile_name = f"{index_name}-vprofile-hnsw-cosine"
    vectorizer_name = f"{index_name}-vectorizer"
    semantic_name = f"{index_name}-semantic-configuration"

    return {
        "name": index_name,
        "fields": [
            {
                "name": "id",
                "type": "Edm.String",
                "key": True,
                "searchable": False,
                "filterable": True,
                "sortable": False,
                "facetable": False,
                "retrievable": True,
                "stored": True,
            },
            {
                "name": "kind",
                "type": "Edm.String",
                "key": False,
                "searchable": False,
                "filterable": True,
                "sortable": False,
                "facetable": True,
                "retrievable": True,
                "stored": True,
            },
            {
                "name": "raw_table_content",
                "type": "Edm.String",
                "key": False,
                "searchable": True,
                "filterable": False,
                "sortable": False,
                "facetable": False,
                "retrievable": True,
                "stored": True,
                "analyzer": "standard.lucene",
            },
            {
                "name": "title",
                "type": "Edm.String",
                "key": False,
                "searchable": False,
                "filterable": True,
                "sortable": False,
                "facetable": True,
                "retrievable": True,
                "stored": True,
            },
            {
                "name": "source_url",
                "type": "Edm.String",
                "key": False,
                "searchable": False,
                "filterable": True,
                "sortable": False,
                "facetable": False,
                "retrievable": True,
                "stored": True,
            },
            {
                "name": "blob_url",
                "type": "Edm.String",
                "key": False,
                "searchable": False,
                "filterable": True,
                "sortable": False,
                "facetable": False,
                "retrievable": True,
                "stored": True,
            },
            {
                "name": "chunk",
                "type": "Edm.String",
                "key": False,
                "searchable": True,
                "filterable": False,
                "sortable": False,
                "facetable": False,
                "retrievable": True,
                "stored": True,
                "analyzer": "standard.lucene",
            },
            {
                "name": "chunk_id",
                "type": "Edm.String",
                "key": False,
                "searchable": False,
                "filterable": True,
                "sortable": False,
                "facetable": False,
                "retrievable": True,
                "stored": True,
            },
            {
                "name": "embedding",
                "type": "Collection(Edm.Single)",
                "key": False,
                "searchable": True,
                "filterable": False,
                "sortable": False,
                "facetable": False,
                "retrievable": True,
                "stored": True,
                "dimensions": 1536,
                "vectorSearchProfile": vprofile_name,
            },
        ],
        "scoringProfiles": [],
        "corsOptions": {"allowedOrigins": ["*"], "maxAgeInSeconds": 300},
        "suggesters": [],
        "similarity": {"@odata.type": "#Microsoft.Azure.Search.BM25Similarity"},
        "semantic": {
            "configurations": [
                {
                    "name": semantic_name,
                    "prioritizedFields": {
                        "titleField": {"fieldName": "title"},
                        "prioritizedContentFields": [{"fieldName": "chunk"}],
                        "prioritizedKeywordsFields": [],
                    },
                }
            ]
        },
        "vectorSearch": {
            "algorithms": [
                {
                    "name": algo_name,
                    "kind": "hnsw",
                    "hnswParameters": {
                        "metric": "cosine",
                        "m": 4,
                        "efConstruction": 400,
                        "efSearch": 500,
                    },
                }
            ],
            "profiles": [
                {
                    "name": vprofile_name,
                    "algorithm": algo_name,
                    "vectorizer": vectorizer_name,
                }
            ],
            "vectorizers": [
                {
                    "name": vectorizer_name,
                    "kind": "azureOpenAI",
                    "azureOpenAIParameters": {
                        "resourceUri": OAI_ENDPOINT,
                        "deploymentId": OAI_EMBED_DEPLOYMENT,
                        "apiKey": OAI_KEY,
                        "modelName": OAI_EMBED_DEPLOYMENT,
                    },
                }
            ],
            "compressions": [],
        },
    }



