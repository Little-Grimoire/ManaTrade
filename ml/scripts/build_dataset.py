"""Gera os snapshots compactos usados pelo notebook (ml/data/*.csv.gz).

Uso: python ml/scripts/build_dataset.py <dir_raw>
<dir_raw> contém oracle.jsonl.gz (Scryfall Oracle Cards bulk) e decks/*.json
(MTGJSON, decks do tipo "Commander Deck"). Ver ml/README.md para os downloads.
"""
import gzip, json, sys
from pathlib import Path
import pandas as pd

raw = Path(sys.argv[1])
out = Path(__file__).resolve().parents[1] / "data"
out.mkdir(exist_ok=True)

def face_text(c, key):
    if c.get(key) is not None:
        return c[key]
    faces = c.get("card_faces") or []
    vals = [f.get(key) for f in faces if f.get(key) is not None]
    return " // ".join(vals) if vals else None

rows = []
with gzip.open(raw / "oracle.jsonl.gz", "rt", encoding="utf-8") as fh:
    for line in fh:
        line = line.strip().rstrip(",")
        if not line or line in "[]":
            continue
        c = json.loads(line)
        if c.get("layout") in {"token", "double_faced_token", "emblem", "art_series", "vanguard", "scheme", "planar"}:
            continue
        faces = c.get("card_faces") or []
        rows.append({
            "oracle_id": c["oracle_id"], "name": c["name"], "layout": c.get("layout"),
            "cmc": c.get("cmc"), "mana_cost": face_text(c, "mana_cost"),
            "colors": "".join(c.get("colors") or (faces[0].get("colors", []) if faces else [])),
            "color_identity": "".join(c.get("color_identity", [])),
            "type_line": c.get("type_line"), "oracle_text": face_text(c, "oracle_text"),
            "power": face_text(c, "power"), "toughness": face_text(c, "toughness"),
            "loyalty": face_text(c, "loyalty"), "rarity": c.get("rarity"),
            "keywords": "|".join(c.get("keywords", [])), "edhrec_rank": c.get("edhrec_rank"),
            "legal_commander": c.get("legalities", {}).get("commander"),
            "released_at": c.get("released_at"),
        })
cards = pd.DataFrame(rows).drop_duplicates("oracle_id")
cards.to_csv(out / "cards.csv.gz", index=False)

drows = []
for f in sorted((raw / "decks").glob("*.json")):
    d = json.load(open(f, encoding="utf-8"))["data"]
    for board, is_cmd in (("commander", 1), ("mainBoard", 0)):
        for c in d.get(board, []):
            oid = c.get("identifiers", {}).get("scryfallOracleId")
            drows.append({"deck_id": f.stem, "deck_name": d["name"], "release_date": d.get("releaseDate"),
                          "oracle_id": oid, "card_name": c["name"], "count": c.get("count", 1),
                          "is_commander": is_cmd})
decks = pd.DataFrame(drows)
decks.to_csv(out / "commander_decks.csv.gz", index=False)
print(cards.shape, decks.shape, decks.deck_id.nunique(), decks.oracle_id.isna().sum())
