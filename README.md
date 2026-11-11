# ManaTrade

Aplicativo para jogadores de **Magic: The Gathering** identificarem cartas e descobrirem se uma carta **melhora o seu deck Commander**, ajudando a decidir trocas.

O projeto é desenvolvido em conjunto para três disciplinas da UTFPR-DV (Engenharia de Software, 2026/2):

| Disciplina | O que é avaliado | Onde está |
|---|---|---|
| Programação para Dispositivos Móveis | aplicativo Expo funcional | `app/`, `src/` |
| Programação para Web 2 | sistema web publicado, modelagem com relacionamentos e API REST | `backend/` *(a definir)* |
| Fundamentos de Sistemas Inteligentes (TP) | classificador carta × deck (ML) | `ml/`, `backend-ml/` |

O classificador do TP é a **funcionalidade de IA do aplicativo** (combinado com o professor).

---

## Como funciona

1. **Identificar a carta:** foto da carta → OCR no navegador (Tesseract.js) → busca aproximada no [Scryfall](https://scryfall.com/docs/api). No celular (Expo Go) o OCR não roda, então o usuário digita o nome (aceita erros de digitação).
2. **Montar o deck:** colar a lista de cartas ou importar um deck Commander oficial.
3. **Avaliar no deck:** o modelo de ML dá um score de adequação para a carta e para cada carta do deck. Se a carta nova superar a mais fraca por uma margem δ, o app sugere: *"Melhora o deck. Remova: X"*.

## Estrutura

```
app/            telas (Expo Router)       ── Mobile
src/            componentes, serviços (Scryfall, OCR, API de ML, deck local)
ml/             notebook do TP, dados, código de features, modelo exportado ── Sistemas Inteligentes
backend-ml/     API Python (FastAPI) que serve o modelo
backend/        (a criar) sistema web + API REST ── Web 2
docs/           decisões de arquitetura e documentos das disciplinas
```

## Pré-requisitos

- Node.js 20+ e npm
- Python 3.11+ (para `backend-ml/` e o notebook)
- Expo Go no celular (opcional)

## Como executar

API de ML:
```bash
pip install -r backend-ml/requirements.txt
```
```bash
cd backend-ml && uvicorn main:app --host 0.0.0.0 --port 8000
```

App (em outro terminal):
```bash
npm install
```
```bash
npx expo start
```

Copie `.env.example` para `.env`. No celular, `EXPO_PUBLIC_ML_API_URL` precisa apontar para o IP da máquina na rede local (ex.: `http://192.168.0.10:8000`), não para `localhost`.

## Variáveis de ambiente

| Variável | Uso | Padrão |
|---|---|---|
| `EXPO_PUBLIC_ML_API_URL` | URL da API de ML | `http://localhost:8000` |
| `EXPO_PUBLIC_API_URL` | URL do backend web (Web 2) | `http://localhost:3001` |

Nenhuma chave de API é necessária; o Scryfall é público. O arquivo `.env` não é versionado.

## Documentação

- `ml/README.md`: notebook do TP, dados e reprodução
- `backend-ml/README.md`: rotas da API de ML
- `docs/decisoes_arquitetura_ml.md`: decisões de arquitetura

## Equipe

*(preencher)*
