"""Identificação da carta a partir de uma foto: OCR (RapidOCR) + fuzzy matching com o catálogo.

O nome da carta fica no topo, então as linhas lidas mais acima pesam mais. O OCR é
opcional: sem o pacote instalado a rota /scan responde 503 e o app usa o nome digitado.
"""
import base64, difflib, io

import numpy as np

_engine = None
MAX_SIDE = 1280  # reduz fotos grandes do celular (mais rápido e suficiente para o nome)


def _get_engine():
    global _engine
    if _engine is None:
        try:
            from rapidocr import RapidOCR  # rapidocr >= 2
        except ImportError:
            from rapidocr_onnxruntime import RapidOCR  # pacote antigo (1.x)
        _engine = RapidOCR()
    return _engine


def ocr_available() -> bool:
    try:
        _get_engine()
        return True
    except Exception:
        return False


def decode_image(data: str) -> np.ndarray:
    """Aceita base64 puro ou data URI (data:image/jpeg;base64,...)."""
    from PIL import Image, ImageOps
    if data.startswith("data:"):
        data = data.split(",", 1)[1]
    img = Image.open(io.BytesIO(base64.b64decode(data)))
    img = ImageOps.exif_transpose(img).convert("RGB")  # fotos do celular vêm com rotação no EXIF
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    return np.array(img)


def read_lines(img: np.ndarray):
    """Devolve [(texto, y_relativo_do_topo, confiança)] ordenado de cima para baixo."""
    out = _get_engine()(img)
    if hasattr(out, "txts"):  # rapidocr >= 2
        items = list(zip(out.boxes if out.boxes is not None else [], out.txts or [], out.scores or []))
    else:  # rapidocr_onnxruntime: (resultado, tempo); resultado = [[caixa, texto, conf], ...]
        items = [(b, t, s) for b, t, s in (out[0] or [])]
    h = img.shape[0] or 1
    lines = [(str(t).strip(), float(np.min(np.asarray(b)[:, 1])) / h, float(s)) for b, t, s in items if str(t).strip()]
    return sorted(lines, key=lambda l: l[1])


def match_lines(lines, names, name_to_id, display_name, limit=5):
    """Casa as linhas lidas com os nomes do catálogo. Score = similaridade, com bônus para linhas no topo."""
    best = {}
    for text, y, conf in lines[:12]:
        q = "".join(ch for ch in text.lower() if ch.isalnum() or ch in " ,'-").strip()
        if sum(ch.isalpha() for ch in q) < 3:
            continue
        for n in difflib.get_close_matches(q, names, n=3, cutoff=0.6):
            ratio = difflib.SequenceMatcher(None, q, n).ratio()
            score = ratio * (1.0 - 0.3 * min(y, 1.0))  # nome no topo da carta
            oid = name_to_id[n]
            if score > best.get(oid, {}).get("score", 0):
                best[oid] = {"name": display_name(oid), "oracle_id": oid, "score": round(score, 4), "ocr_text": text}
    return sorted(best.values(), key=lambda c: -c["score"])[:limit]
