import os
import re
from typing import List, Any, Dict, Set

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
    # source_url eq '...' or source_url eq '...'
    return " or ".join([f"source_url eq '{escape_odata_string(su)}'" for su in source_urls])



