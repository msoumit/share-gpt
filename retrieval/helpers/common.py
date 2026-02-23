import json
from helpers.prompts import VALIDATION_SCHEMA, VALIDATION_PROMPT

def build_context_from_hits(hits, max_chunks=5):
    blocks = []
    for i, h in enumerate(hits[:max_chunks], 1):
        title = h.get("title", "unknown")
        source_url = h.get("source_url", "unknown")
        kind = h.get("kind", "unknown")
        chunk_id = h.get("chunk_id", "unknown")
        chunk = h.get("chunk", "")
        blocks.append(
            f"[{i}]\n"
            f"title={title}\n"
            f"source_url={source_url}\n"
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
        "citations": rag_answer.get("citations", []),
        "guardrail": {
            "verdict": validation_json.get("verdict"),
            "confidence": validation_json.get("confidence"),
            "issues": unsupported_claims,
            "notes": validation_json.get("notes")
        }
    }