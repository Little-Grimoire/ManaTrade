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
| `POST /scan` | foto em base64 → nome da carta via Gemini (precisa de `GEMINI_API_KEY`; sem ela responde 503) |

Variáveis: `GEMINI_API_KEY` (opcional, nunca versionar), `GEMINI_MODEL` (padrão `gemini-2.5-flash`), `MANATRADE_ML_DIR`.
No app, configure `EXPO_PUBLIC_ML_API_URL` (no celular, use o IP da máquina na rede local, ex.: `http://192.168.0.10:8000`).
