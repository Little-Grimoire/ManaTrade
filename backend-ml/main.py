"""ManaTrade ML API — avalia se uma carta melhora um deck Commander (TP FS26S).

Carrega o modelo exportado pelo notebook (ml/models/best_model.joblib) e usa o MESMO
pacote de features (ml/manatrade_ml). Rodar: uvicorn main:app --port 8000 (ver README).
"""
import difflib, os, sys, threading
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
import scan  # noqa: E402  (OCR da foto, opcional)

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

_lock = threading.Lock()

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


class CardIn(BaseModel):
    """Dados da carta vindos da API do Scryfall (mesmos campos do snapshot ml/data/cards.csv.gz).

    Se o oracle_id já estiver no catálogo, usa o catálogo; senão (carta lançada depois do
    snapshot) as features são calculadas na hora a partir destes dados.
    """
    name: str
    oracle_id: str | None = None
    layout: str | None = None
    cmc: float | None = None
    mana_cost: str | None = None
    color_identity: list[str] | str = ""
    type_line: str | None = None
    oracle_text: str | None = None
    power: str | None = None
    toughness: str | None = None
    loyalty: str | None = None
    rarity: str | None = None
    keywords: list[str] | str = ""
    edhrec_rank: float | None = None
    legal_commander: str | None = None


class EvalRequest(BaseModel):
    commander: list[str] = Field(..., min_length=1, max_length=2, examples=[["Atraxa, Praetors' Voice"]])
    deck: list[str] = Field(..., description="Cartas dos 99 (uma por item; repetir para cópias)")
    candidate: str | None = Field(None, description="Nome da carta (use este OU card)")
    card: CardIn | None = Field(None, description="Dados do Scryfall da carta escaneada")
    locked: list[str] = Field(default_factory=list, description="Cartas que o usuário não quer remover")


class DeckIn(BaseModel):
    id: str | int | None = None
    name: str | None = None
    commander: list[str] = Field(default_factory=list, max_length=2)
    deck: list[str] = Field(default_factory=list)
    locked: list[str] = Field(default_factory=list)


class EvalDecksRequest(BaseModel):
    candidate: str | None = None
    card: CardIn | None = None
    decks: list[DeckIn] = Field(..., min_length=1, max_length=50)


class ScanRequest(BaseModel):
    image: str = Field(..., description="Foto da carta em base64 (ou data URI)")
    limit: int = 5


def ensure_card(card: CardIn):
    """Devolve o oracle_id da carta, incluindo-a no catálogo em memória se for nova."""
    global CF, BY_ID, CARD_CI
    if card.oracle_id and card.oracle_id in BY_ID.index:
        return card.oracle_id
    if not card.oracle_id:
        return resolve(card.name)
    j = lambda v: "".join(v) if isinstance(v, list) else (v or "")  # noqa: E731
    row = card.model_dump()
    row.update(color_identity=j(card.color_identity), keywords="|".join(card.keywords) if isinstance(card.keywords, list) else card.keywords)
    new = pd.DataFrame([row])
    for col in ("cmc", "edhrec_rank"):  # None vira NaN (imputado no Pipeline)
        new[col] = pd.to_numeric(new[col], errors="coerce")
    with _lock:
        if card.oracle_id not in BY_ID.index:
            CF = pd.concat([CF, card_features(new)])
            BY_ID = pd.concat([BY_ID, new.set_index("oracle_id")])
            CARD_CI = BY_ID.color_identity.fillna("")
            NAME_TO_ID.setdefault(card.name.lower(), card.oracle_id)
    return card.oracle_id


def candidate_id(candidate, card):
    if card is not None:
        oid = ensure_card(card)
        if oid is None:
            raise HTTPException(422, f"carta não reconhecida: {card.name}")
        return oid
    if not candidate:
        raise HTTPException(422, "informe candidate (nome) ou card (dados do Scryfall)")
    oid = resolve(candidate)
    if oid is None:
        raise HTTPException(422, f"carta não reconhecida: {candidate}")
    return oid


@app.get("/health")
def health():
    return {"ok": True, "model": bundle["model_name"], "delta": DELTA, "cards": len(BY_ID), "ocr": scan.ocr_available()}


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


@app.post("/scan")
def scan_card(req: ScanRequest):
    """Foto da carta -> nomes candidatos (OCR + fuzzy matching com o catálogo)."""
    if not scan.ocr_available():
        raise HTTPException(503, "OCR indisponível no servidor: instale as dependências (pip install -r requirements.txt).")
    try:
        img = scan.decode_image(req.image)
    except Exception:
        raise HTTPException(422, "imagem inválida")
    lines = scan.read_lines(img)
    cands = scan.match_lines(lines, NAMES, NAME_TO_ID, lambda oid: BY_ID.name[oid], limit=req.limit)
    print(f"[scan] {img.shape[1]}x{img.shape[0]} lido={[t for t, _, _ in lines[:6]]} -> {[c['name'] for c in cands[:3]]}", flush=True)
    return {"candidates": cands, "lines": [t for t, _, _ in lines[:12]]}


@app.post("/evaluate")
def evaluate(req: EvalRequest):
    return evaluate_core(req.commander, req.deck, candidate_id(req.candidate, req.card), req.locked)


@app.post("/evaluate/decks")
def evaluate_decks(req: EvalDecksRequest):
    """Avalia a mesma carta em vários decks Commander do usuário (um resultado por deck)."""
    cand = candidate_id(req.candidate, req.card)
    results = []
    for d in req.decks:
        base = {"deck_id": d.id, "deck_name": d.name}
        try:
            if not d.commander:
                raise HTTPException(422, "deck sem comandante definido")
            results.append({**base, **evaluate_core(d.commander, d.deck, cand, d.locked)})
        except HTTPException as e:
            results.append({**base, "verdict": "error", "message": e.detail})
    order = {"improves": 0, "no_improvement": 1, "already_in_deck": 2, "illegal": 3, "error": 4}
    results.sort(key=lambda r: (order.get(r["verdict"], 9), -((r.get("candidate") or {}).get("score") or 0)))
    return {"candidate": {"name": BY_ID.name[cand], "oracle_id": cand}, "results": results, "delta": DELTA}


def evaluate_core(commander, deck, cand, locked_names=()):
    cmd_ids = [resolve(n) for n in commander]
    if None in cmd_ids:
        raise HTTPException(422, f"comandante não reconhecido: {commander[cmd_ids.index(None)]}")
    deck_ids, unknown = [], []
    for n in deck:
        oid = resolve(n)
        (deck_ids.append(oid) if oid else unknown.append(n))
    if len(set(deck_ids)) < 10:
        raise HTTPException(422, "deck precisa de pelo menos 10 cartas reconhecidas")
    dci = ci_of(cmd_ids)
    D = "user_deck"
    decks_main = pd.Series(deck_ids).value_counts().rename_axis("oracle_id").reset_index(name="count").assign(deck_id=D)
    deck_ci = pd.Series({D: dci})
    locked = {resolve(n) for n in locked_names} - {None}
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
