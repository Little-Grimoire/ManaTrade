"""ManaTrade ML API — avalia se uma carta melhora um deck Commander (TP FS26S).

Carrega o modelo exportado pelo notebook (ml/models/best_model.joblib) e usa o MESMO
pacote de features (ml/manatrade_ml). Rodar: uvicorn main:app --port 8000 (ver README).
"""
import base64, difflib, json, os, sys, urllib.request
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ML_DIR = Path(os.getenv("MANATRADE_ML_DIR", Path(__file__).resolve().parents[1] / "ml"))
sys.path.insert(0, str(ML_DIR))
from manatrade_ml.features import card_features, BASIC_NAMES  # noqa: E402
from manatrade_ml.recommend import score_members, score_candidates  # noqa: E402

bundle = joblib.load(ML_DIR / "models" / "best_model.joblib")
MODEL, DELTA = bundle["pipeline"], float(bundle["delta"])
cards = pd.read_csv(ML_DIR / "data" / "cards.csv.gz")
cards = cards[cards.legal_commander.notna()]
CF = card_features(cards)
BY_ID = cards.set_index("oracle_id")
CARD_CI = BY_ID.color_identity.fillna("")
NAME_TO_ID = {}
for oid, name in zip(cards.oracle_id, cards.name):
    NAME_TO_ID.setdefault(name.lower(), oid)
    if " // " in name:  # cartas de duas faces: aceita o nome da frente
        NAME_TO_ID.setdefault(name.split(" // ")[0].lower(), oid)
NAMES = list(NAME_TO_ID)
DECKS = pd.read_csv(ML_DIR / "data" / "commander_decks.csv.gz")

app = FastAPI(title="ManaTrade ML API", version="1.0",
              description="Score de adequação carta×deck (Commander) e sugestão de troca.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def resolve(name: str):
    key = name.strip().lower()
    if key in NAME_TO_ID:
        return NAME_TO_ID[key]
    m = difflib.get_close_matches(key, NAMES, n=1, cutoff=0.85)
    return NAME_TO_ID[m[0]] if m else None


def ci_of(ids):
    s = set("".join(CARD_CI.reindex(ids).fillna("")))
    return "".join(c for c in "WUBRG" if c in s)


class EvalRequest(BaseModel):
    commander: list[str] = Field(..., min_length=1, max_length=2, examples=[["Atraxa, Praetors' Voice"]])
    deck: list[str] = Field(..., description="Cartas dos 99 (uma por item; repetir para cópias)")
    candidate: str
    locked: list[str] = Field(default_factory=list, description="Cartas que o usuário não quer remover")


@app.get("/health")
def health():
    return {"ok": True, "model": bundle["model_name"], "delta": DELTA, "cards": len(cards)}


@app.get("/cards/match")
def match(q: str, limit: int = 5):
    """Fuzzy matching local de um texto (ex.: saída de OCR) contra os nomes de cartas."""
    found = difflib.get_close_matches(q.strip().lower(), NAMES, n=limit, cutoff=0.5)
    return [{"name": BY_ID.name[NAME_TO_ID[n]], "oracle_id": NAME_TO_ID[n]} for n in found]


@app.get("/decks/examples")
def examples(limit: int = 300):
    """Decks oficiais (MTGJSON) para importar na demo."""
    d = DECKS.drop_duplicates("deck_id")[["deck_id", "deck_name", "release_date"]].sort_values("release_date", ascending=False)
    return d.head(limit).to_dict("records")


@app.get("/decks/examples/{deck_id}")
def example(deck_id: str):
    d = DECKS[DECKS.deck_id == deck_id]
    if d.empty:
        raise HTTPException(404, "deck não encontrado")
    deck = [n for n, c in zip(d.card_name[d.is_commander == 0], d["count"][d.is_commander == 0]) for _ in range(c)]
    return {"name": d.deck_name.iloc[0], "commander": d.card_name[d.is_commander == 1].tolist(), "deck": deck}


@app.post("/evaluate")
def evaluate(req: EvalRequest):
    cmd_ids = [resolve(n) for n in req.commander]
    if None in cmd_ids:
        raise HTTPException(422, f"comandante não reconhecido: {req.commander[cmd_ids.index(None)]}")
    cand = resolve(req.candidate)
    if cand is None:
        raise HTTPException(422, f"carta não reconhecida: {req.candidate}")
    deck_ids, unknown = [], []
    for n in req.deck:
        oid = resolve(n)
        (deck_ids.append(oid) if oid else unknown.append(n))
    if len(set(deck_ids)) < 10:
        raise HTTPException(422, "deck precisa de pelo menos 10 cartas reconhecidas")
    dci = ci_of(cmd_ids)
    D = "user_deck"
    decks_main = pd.Series(deck_ids).value_counts().rename_axis("oracle_id").reset_index(name="count").assign(deck_id=D)
    deck_ci = pd.Series({D: dci})
    locked = {resolve(n) for n in req.locked} - {None}
    cand_name = BY_ID.name[cand]

    def card_out(oid, score=None):
        return {"name": BY_ID.name[oid], "oracle_id": oid, "score": None if score is None else round(float(score), 4)}

    # 1) Regras determinísticas de legalidade (antes do ML; ver notebook, Seção 11)
    illegal_in_deck = [o for o in decks_main.oracle_id if not set(CARD_CI.get(o, "")) <= set(dci)
                       or BY_ID.legal_commander.get(o) != "legal"]
    if not set(CARD_CI.get(cand, "")) <= set(dci):
        return {"verdict": "illegal", "message": f"{cand_name} está fora da identidade de cor do comandante ({dci or 'incolor'}).",
                "candidate": card_out(cand), "remove": None, "unknown": unknown, "delta": DELTA}
    if BY_ID.legal_commander.get(cand) != "legal":
        return {"verdict": "illegal", "message": f"{cand_name} não é legal em Commander.",
                "candidate": card_out(cand), "remove": None, "unknown": unknown, "delta": DELTA}
    if cand in set(deck_ids) and cand_name not in BASIC_NAMES:
        return {"verdict": "already_in_deck", "message": f"{cand_name} já está no deck (Commander é singleton).",
                "candidate": card_out(cand), "remove": None, "unknown": unknown, "delta": DELTA}

    # 2) Score do ML
    s_c = float(score_candidates(MODEL, CF, decks_main, deck_ci, CARD_CI,
                                 pd.DataFrame({"deck_id": [D], "oracle_id": [cand]}))[0])
    members = score_members(MODEL, CF, decks_main, deck_ci, CARD_CI, exclude=locked | set(cmd_ids))
    members = members.sort_values("score")
    weakest = [card_out(o, s) for o, s in zip(members.oracle_id.head(5), members.score.head(5))]
    if illegal_in_deck:
        worst = card_out(illegal_in_deck[0])
        return {"verdict": "improves", "message": f"Melhora o deck. Remova: {worst['name']} (ilegal neste deck).",
                "candidate": card_out(cand, s_c), "remove": worst, "weakest": weakest, "unknown": unknown, "delta": DELTA}
    w = members.iloc[0]
    improves = s_c > w.score + DELTA
    return {"verdict": "improves" if improves else "no_improvement",
            "message": f"Melhora o deck. Remova: {BY_ID.name[w.oracle_id]}" if improves else "Não melhora o deck.",
            "candidate": card_out(cand, s_c), "remove": card_out(w.oracle_id, w.score) if improves else None,
            "weakest": weakest, "unknown": unknown, "delta": DELTA}


class ScanRequest(BaseModel):
    image_base64: str = Field(..., description="JPEG/PNG em base64 (sem prefixo data:)")
    mime_type: str = "image/jpeg"


@app.post("/scan")
def scan(req: ScanRequest):
    """Identifica a carta numa foto com LLM multimodal (Gemini). Usado no mobile, onde
    Tesseract.js não roda. Sem GEMINI_API_KEY ou se a LLM falhar -> 503 e o app cai
    para digitação manual com busca fuzzy."""
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(503, "LLM não configurada (GEMINI_API_KEY ausente)")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    body = {"contents": [{"parts": [
        {"text": 'Esta é a foto de uma carta de Magic: The Gathering. Responda SOMENTE JSON: '
                 '{"name": "<nome em inglês impresso no topo da carta>", "confidence": <0..1>}'},
        {"inline_data": {"mime_type": req.mime_type, "data": req.image_base64}}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}
    try:
        r = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": key})
        out = json.load(urllib.request.urlopen(r, timeout=30))
        parsed = json.loads(out["candidates"][0]["content"]["parts"][0]["text"])
        raw_name = str(parsed["name"])
    except Exception as e:  # formato inesperado ou falha de rede -> fallback no app
        raise HTTPException(503, f"falha ao interpretar a imagem: {type(e).__name__}")
    return {"raw_text": raw_name, "confidence": parsed.get("confidence"), "matches": match(raw_name)}
