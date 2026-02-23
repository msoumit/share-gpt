from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
import os
from helpers.common import guess_content_type, generate_chunk_id
from helpers.document_intelligence import analyze_layout
from helpers.document_parser import build_units_normalized, build_blocks
from helpers.open_ai import summarize_table_text_via_llm
from helpers.langchain import create_text_splitter
import uuid

load_dotenv()

def generate_chunks(filename: str, file_bytes: bytes, source_url: Optional[str] = None) -> List[Dict[str, Any]]:

    if not source_url:
        source_url = filename

    content_type = guess_content_type(filename)
    result_dict = analyze_layout(file_bytes, content_type)

    _, units = build_units_normalized(result_dict)

    # Summarize tables via LLM and preserve original raw table text
    for unit in units:
        if unit.get("type") != "table":
            continue

        raw_table = (unit.get("text") or "").strip()
        if not raw_table:
            continue

        unit.setdefault("meta", {})
        unit["meta"]["original_table_text"] = raw_table

        summarized = summarize_table_text_via_llm(raw_table)
        unit["text"] = summarized if summarized else raw_table

    blocks = build_blocks(units)
    splitter = create_text_splitter()

    title = os.path.basename(filename)
    chunk_items: List[Dict[str, Any]] = []
    chunk_counter = 1

    for block in blocks:
        split_texts = splitter.split_text(block.get("text", "") or "")
        for chunk_text in split_texts:
            chunk_text = (chunk_text or "").strip()
            if not chunk_text:
                continue

            chunk_items.append(
                {
                    "id": str(uuid.uuid4()),
                    "kind": block["kind"],
                    "raw_table_content": block.get("raw_table_content", ""),
                    "title": title,
                    "source_url": source_url,
                    "chunk": chunk_text,
                    "chunk_id": generate_chunk_id(filename, chunk_counter),
                }
            )
            chunk_counter += 1

    return chunk_items


def generate_chunks_for_files(files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    
    all_items: List[Dict[str, Any]] = []
    for f in files:
        all_items.extend(
            generate_chunks(
                filename=f["filename"],
                file_bytes=f["file_bytes"],
                source_url=f.get("source_url")
            )
        )
    return all_items