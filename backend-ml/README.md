# backend-ml — API de avaliação carta × deck

```bash
pip install -r backend-ml/requirements.txt
cd backend-ml && uvicorn main:app --host 0.0.0.0 --port 8000
```
Documentação interativa: http://localhost:8000/docs

| Rota | Uso |
|---|---|
| `GET /health` | modelo carregado e δ |
| `POST /evaluate` | `{commander: [..], deck: [..], candidate: "..", locked: [..]}` → veredito, carta a remover, 5 mais fracas |
| `GET /cards/match?q=` | fuzzy matching local de nomes (fallback do OCR) |
| `GET /decks/examples`, `GET /decks/examples/{id}` | decks oficiais para importar na demo |

Variável opcional: `MANATRADE_ML_DIR` (caminho da pasta `ml/`).
No app, configure `EXPO_PUBLIC_ML_API_URL` (no celular, use o IP da máquina na rede local, ex.: `http://192.168.0.10:8000`).
