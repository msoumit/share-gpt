import json
import re
from helpers.prompts import VALIDATION_SCHEMA, VALIDATION_PROMPT

_ANSWER_KEY_PATTERN = re.compile(r'"answer"\s*:\s*"')
_CITATION_OBJECT_PATTERN = re.compile(
    r'\{\s*"title"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"(?:sourceUrl|source_url)"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"(?:chunkId|chunk_id)"\s*:\s*"((?:\\.|[^"\\])*)"\s*\}'
)

def parse_json_response(raw_text: str) -> dict:
    text = (raw_text or "").strip()
    if not text:
        raise ValueError("Empty model response")

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        return json.loads(text[start:end + 1])

def _decode_partial_json_string(raw_text: str, start_index: int) -> tuple[str, bool]:
    decoded_chars = []
    i = start_index

    while i < len(raw_text):
        ch = raw_text[i]

        if ch == "\\":
            if i + 1 >= len(raw_text):
                break

            esc = raw_text[i + 1]
            if esc == "u":
                if i + 5 >= len(raw_text):
                    break
                hex_value = raw_text[i + 2:i + 6]
                try:
                    decoded_chars.append(chr(int(hex_value, 16)))
                    i += 6
                    continue
                except ValueError:
                    decoded_chars.append("\\u")
                    i += 2
                    continue

            escape_map = {
                '"': '"',
                "\\": "\\",
                "/": "/",
                "b": "\b",
                "f": "\f",
                "n": "\n",
                "r": "\r",
                "t": "\t",
            }
            decoded_chars.append(escape_map.get(esc, esc))
            i += 2
            continue

        if ch == '"':
            return "".join(decoded_chars), True

        decoded_chars.append(ch)
        i += 1

    return "".join(decoded_chars), False

def extract_answer_delta_from_stream(raw_text: str, emitted_length: int) -> tuple[str, int]:
    marker = _ANSWER_KEY_PATTERN.search(raw_text)
    if not marker:
        return "", emitted_length

    answer_start = marker.end()
    decoded_answer, _ = _decode_partial_json_string(raw_text, answer_start)

    if len(decoded_answer) <= emitted_length:
        return "", emitted_length

    return decoded_answer[emitted_length:], len(decoded_answer)

def _decode_json_string(value: str) -> str:
    return json.loads(f'"{value}"')

def extract_citation_deltas_from_stream(raw_text: str, emitted_count: int) -> tuple[list[dict], int]:
    matches = _CITATION_OBJECT_PATTERN.findall(raw_text)
    if len(matches) <= emitted_count:
        return [], emitted_count

    new_citations = []
    for title_raw, source_raw, chunk_raw in matches[emitted_count:]:
        new_citations.append(
            {
                "title": _decode_json_string(title_raw),
                "sourceUrl": _decode_json_string(source_raw),
                "chunkId": _decode_json_string(chunk_raw),
            }
        )

    return new_citations, len(matches)

def normalize_citations(citations: list) -> list[dict]:
    output = []
    for citation in citations or []:
        if not isinstance(citation, dict):
            continue
        output.append(
            {
                "title": citation.get("title", ""),
                "sourceUrl": citation.get("sourceUrl", citation.get("source_url", "")),
                "chunkId": citation.get("chunkId", citation.get("chunk_id", "")),
            }
        )
    return output

def build_context_from_hits(hits, max_chunks=5):
    blocks = []
    for i, h in enumerate(hits[:max_chunks], 1):
        title = h.get("title", "unknown")
        source_url = h.get("source_url", "unknown")
        blob_url = h.get("blob_url", "unknown")
        kind = h.get("kind", "unknown")
        chunk_id = h.get("chunk_id", "unknown")
        chunk = h.get("chunk", "")
        blocks.append(
            f"[{i}]\n"
            f"title={title}\n"
            f"source_url={source_url}\n"
            f"blob_url={blob_url}\n"
            f"kind={kind}\n"
            f"chunk_id={chunk_id}\n"
            f"content:\n{chunk} \n"
            f"------------------------ \n"
        )
    return "\n\n".join(blocks)

def build_validation_prompt(context: str, prompt: str, rag_answer: dict) -> str:
    rag_str = json.dumps(rag_answer, ensure_ascii=False)

    return f"""
{VALIDATION_PROMPT}

Schema (must match exactly):
{VALIDATION_SCHEMA}

Inputs:
User question:
{prompt}

Context:
{context}

RAG output (JSON):
{rag_str}
""".strip()

def support_to_score(s: str) -> float:
    return {"supported": 1.0, "partially_supported": 0.5, "unsupported": 0.0}.get(s, 0.0)

def compute_confidence_from_claims(claims: list) -> float:
    if not claims:
        return 0.0
    scores = [support_to_score(c.get("support", "")) for c in claims]
    return round(sum(scores) / len(scores), 3)

def compute_verdict(confidence: float, claims: list) -> str:
    if not claims:
        return "unknown"
    if confidence == 1.0:
        return "grounded"
    if confidence >= 0.5:
        return "partially_grounded"
    return "not_grounded"

def build_final_response(rag_answer: dict, validation_json: dict) -> dict:
    raw_citations = rag_answer.get("citations", [])
    citations = []
    for citation in raw_citations:
        if not isinstance(citation, dict):
            continue
        citations.append(
            {
                "title": citation.get("title", ""),
                "sourceUrl": citation.get("sourceUrl", citation.get("source_url", "")),
                "chunkId": citation.get("chunkId", citation.get("chunk_id", "")),
            }
        )

    unsupported_claims = [
        {
            "claim": c["claim"],
            "support": c["support"],
            "missing_info": c["missing_info"]
        }
        for c in validation_json.get("claims", [])
        if c.get("support") != "supported"
    ]

    return {
        "answer": rag_answer.get("answer"),
        "citations": citations,
        "guardrail": {
            "verdict": validation_json.get("verdict"),
            "confidence": validation_json.get("confidence"),
            "issues": unsupported_claims,
            "notes": validation_json.get("notes")
        }
    }
