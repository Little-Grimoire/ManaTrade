# backend-ml — API de avaliação carta × deck

Com [uv](https://docs.astral.sh/uv/) (não precisa ter Python instalado):

```bash
cd backend-ml
uv venv --python 3.12 .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt   # Linux/macOS: .venv/bin/python
.venv/Scripts/python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Com Python/pip já instalados: `pip install -r backend-ml/requirements.txt` e `cd backend-ml && uvicorn main:app --host 0.0.0.0 --port 8000`.
Documentação interativa: http://localhost:8000/docs

| Rota | Uso |
|---|---|
| `GET /health` | modelo carregado, δ e se o OCR está disponível |
| `POST /scan` | `{image: "<base64>"}` → nomes candidatos lidos na foto (OCR RapidOCR + fuzzy matching com o catálogo). Usado pela câmera do ManaScan |
| `POST /evaluate/decks` | `{card: {dados do Scryfall}, decks: [{id, name, commander, deck}]}` → veredito por deck (positivos primeiro). Cartas mais novas que o snapshot têm as features calculadas a partir dos dados do Scryfall |
| `POST /evaluate` | `{commander: [..], deck: [..], candidate: ".." ou card: {..}, locked: [..]}` → veredito, carta a remover, 5 mais fracas |
| `GET /cards/match?q=` | fuzzy matching local de nomes (fallback do OCR) |
| `GET /decks/examples`, `GET /decks/examples/{id}` | decks oficiais para importar na demo |

Variável opcional: `MANATRADE_ML_DIR` (caminho da pasta `ml/`).
No app, configure `EXPO_PUBLIC_ML_API_URL` (no celular, use o IP da máquina na rede local, ex.: `http://192.168.0.10:8000`).
