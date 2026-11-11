# ML — TP FS26S (adequação carta × deck Commander)

- `notebooks/manatrade_tp.ipynb`: notebook reprodutível (Colab ou local). "Reiniciar e executar tudo" leva ~4 min com 4 CPUs.
- `manatrade_ml/`: código de features e regras (fonte única, embutida no notebook via `%%writefile`).
- `data/`: snapshot (10/11/2026) do Scryfall Oracle Cards e dos 206 decks "Commander Deck" do MTGJSON.
- `models/best_model.joblib`: melhor modelo (MLP) + δ, consumido por `backend-ml/`.
- `scripts/build_notebook.py`: regenera o notebook a partir dos módulos. `scripts/build_dataset.py`: regenera o snapshot.

## Rodar localmente
```bash
pip install scikit-learn==1.9.1 pandas numpy matplotlib seaborn joblib jupyter
cd ml/notebooks && jupyter execute --inplace manatrade_tp.ipynb
```
No Colab: envie o notebook e a pasta `data/` (ou deixe a célula baixar de `DATA_URL`).

## Regerar os dados (opcional)
1. Baixe `oracle_cards` (jsonl.gz) de https://api.scryfall.com/bulk-data como `<raw>/oracle.jsonl.gz`.
2. Baixe cada deck do tipo "Commander Deck" de https://mtgjson.com/api/v5/DeckList.json em `<raw>/decks/<fileName>.json` (https://mtgjson.com/api/v5/decks/<fileName>.json).
3. `python ml/scripts/build_dataset.py <raw>`
