from typing import Any, Dict, List, Optional, Tuple

def build_units_normalized(result_dict: Dict[str, Any]) -> Tuple[str, List[Dict[str, Any]]]:
    paragraph_items = extract_paragraph_items(result_dict)
    table_items = extract_table_items(result_dict)

    strategy = choose_strategy(paragraph_items, table_items)
    if strategy == "spans":
        units = build_units_spans(paragraph_items, table_items)
    elif strategy == "polygon":
        units = build_units_polygon(paragraph_items, table_items, iou_threshold=0.35)
    else:
        units = (
            [{"type": "paragraph", "text": p["text"], "meta": {"index": p["index"]}} for p in paragraph_items]
            + [{"type": "table", "text": t["text"], "meta": {"index": t["index"]}} for t in table_items]
        )

    return strategy, units

def extract_paragraph_items(rd: Dict[str, Any]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for i, p in enumerate(rd.get("paragraphs") or []):
        text = (p.get("content") or "").strip()
        if not text:
            continue
        items.append({"kind": "paragraph", "index": i, "raw": p, "text": text})
    return items

def extract_table_items(rd: Dict[str, Any]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for i, t in enumerate(rd.get("tables") or []):
        cells = t.get("cells") or []
        if not cells:
            table_text = ""
        else:
            max_r = max(c.get("row_index", 0) for c in cells)
            max_c = max(c.get("column_index", 0) for c in cells)
            grid = [["" for _ in range(max_c + 1)] for __ in range(max_r + 1)]
            for c in cells:
                r = c.get("row_index", 0)
                col = c.get("column_index", 0)
                txt = (c.get("content") or "").strip()
                if txt:
                    grid[r][col] = (grid[r][col] + " " + txt).strip() if grid[r][col] else txt
            lines = [" | ".join(row).strip() for row in grid if any(x.strip() for x in row)]
            table_text = "\n".join(lines).strip()

        items.append({"kind": "table", "index": i, "raw": t, "text": table_text})
    return items

def choose_strategy(paragraph_items: List[Dict[str, Any]], table_items: List[Dict[str, Any]]) -> str:
    spans_ok = any(has_spans(p["raw"]) for p in paragraph_items) and any(has_spans(t["raw"]) for t in table_items)
    poly_ok = any(has_polygon(p["raw"]) for p in paragraph_items) and any(has_polygon(t["raw"]) for t in table_items)
    if spans_ok:
        return "spans"
    if poly_ok:
        return "polygon"
    return "none"

def has_spans(item_raw: Dict[str, Any]) -> bool:
    spans = item_raw.get("spans") or []
    return bool(spans) and "offset" in spans[0] and "length" in spans[0]


def has_polygon(item_raw: Dict[str, Any]) -> bool:
    brs = item_raw.get("boundingRegions") or []
    if not brs:
        return False
    poly = (brs[0].get("polygon") if isinstance(brs[0], dict) else None)
    return bool(poly)

def spans_range(item_raw: Dict[str, Any]) -> Tuple[int, int]:
    s = (item_raw.get("spans") or [])[0]
    return s["offset"], s["offset"] + s["length"]


def build_units_spans(paragraph_items: List[Dict[str, Any]], table_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []

    for p in paragraph_items:
        start, end = spans_range(p["raw"])
        items.append({**p, "start": start, "end": end})

    for t in table_items:
        start, end = spans_range(t["raw"])
        items.append({**t, "start": start, "end": end})

    items.sort(key=lambda x: x["start"])

    # Dedup: drop paragraph if it overlaps any table span
    table_spans = [(x["start"], x["end"]) for x in items if x["kind"] == "table"]

    def overlaps(a: Tuple[int, int], b: Tuple[int, int]) -> bool:
        return max(a[0], b[0]) < min(a[1], b[1])

    units: List[Dict[str, Any]] = []
    for it in items:
        if it["kind"] == "paragraph":
            pr = (it["start"], it["end"])
            if any(overlaps(pr, tr) for tr in table_spans):
                continue
        units.append({"type": it["kind"], "text": it["text"], "meta": {"index": it["index"]}})
    return units

def polygon_to_bbox(poly: List[float]) -> Tuple[float, float, float, float]:
    xs = poly[0::2]
    ys = poly[1::2]
    return (min(xs), min(ys), max(xs), max(ys))


def page_and_bbox(item_raw: Dict[str, Any]) -> Tuple[Optional[int], Optional[Tuple[float, float, float, float]]]:
    brs = item_raw.get("boundingRegions") or []
    if not brs:
        return None, None
    br0 = brs[0]
    page = br0.get("pageNumber")
    poly = br0.get("polygon")
    if not page or not poly:
        return page, None
    return page, polygon_to_bbox(poly)


def bbox_iou(a: Tuple[float, float, float, float], b: Tuple[float, float, float, float]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def build_units_polygon(
    paragraph_items: List[Dict[str, Any]],
    table_items: List[Dict[str, Any]],
    iou_threshold: float = 0.35
) -> List[Dict[str, Any]]:
    tables: List[Dict[str, Any]] = []
    for t in table_items:
        page, bbox = page_and_bbox(t["raw"])
        tables.append({**t, "page": page, "bbox": bbox})

    tables_by_page: Dict[int, List[Dict[str, Any]]] = {}
    for t in tables:
        if t["page"] and t["bbox"]:
            tables_by_page.setdefault(t["page"], []).append(t)

    kept_paras: List[Dict[str, Any]] = []
    for p in paragraph_items:
        page, bbox = page_and_bbox(p["raw"])
        if not page or not bbox:
            kept_paras.append({**p, "page": page, "bbox": bbox})
            continue
        overlapped = any(bbox_iou(bbox, t["bbox"]) >= iou_threshold for t in tables_by_page.get(page, []))
        if not overlapped:
            kept_paras.append({**p, "page": page, "bbox": bbox})

    def sort_key(x: Dict[str, Any]):
        page = x.get("page") or 10**9
        bbox = x.get("bbox")
        if bbox:
            x1, y1, _, _ = bbox
            return (page, y1, x1)
        return (page, 10**9, 10**9)

    merged = kept_paras + tables
    merged.sort(key=sort_key)

    units = [{"type": x["kind"], "text": x["text"], "meta": {"index": x["index"]}} for x in merged]
    return units

def build_blocks(units: List[Dict[str, Any]]) -> List[Dict[str, Any]]:

    blocks: List[Dict[str, Any]] = []
    para_buffer: List[str] = []

    for u in units:
        if u.get("type") == "paragraph":
            para_buffer.append(u.get("text", ""))
            continue

        if u.get("type") == "table":
            if para_buffer:
                blocks.append(
                    {
                        "kind": "paragraph",
                        "text": "\n\n".join([x for x in para_buffer if (x or "").strip()]).strip(),
                        "raw_table_content": "",
                    }
                )
                para_buffer = []

            blocks.append(
                {
                    "kind": "table",
                    "text": (u.get("text") or "").strip(),
                    "raw_table_content": (u.get("meta", {}).get("original_table_text") or "").strip(),
                }
            )

    if para_buffer:
        blocks.append(
            {
                "kind": "paragraph",
                "text": "\n\n".join([x for x in para_buffer if (x or "").strip()]).strip(),
                "raw_table_content": "",
            }
        )

    return blocks