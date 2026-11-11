# Decisões de Arquitetura — complemento (ML / TP FS26S)

Continua o documento `decisoes_arquitetura.pdf` (DA01–DA04), no mesmo formato.

## DA05 — Serviço de ML separado em Python (FastAPI)
**Contexto:** o modelo do TP é treinado em scikit-learn (Python). O backend principal planejado é Node/Express (exigência de Web 2).
**Alternativas:** (a) reimplementar a inferência em JavaScript; (b) exportar para ONNX e rodar no Node; (c) microsserviço Python dedicado.
**Escolha:** (c) `backend-ml/` com FastAPI, que carrega `ml/models/best_model.joblib` e importa o mesmo pacote `ml/manatrade_ml` usado no notebook.
**Justificativa:** um único código de features no treino e na inferência elimina divergência treino/produção; reescrever as ~100 features em JS seria fonte de bugs; ONNX não cobre o transformador de popularidade customizado.
**Consequências:** dois runtimes (Node + Python) para subir; a versão do scikit-learn precisa ser a mesma do treino (fixada em `requirements.txt`); o Express pode atuar como proxy para `/evaluate` se for preciso autenticar.

## DA06 — Identificação da carta: OCR no navegador (web) e LLM multimodal (mobile), com fallback manual
**Contexto:** o ManaScan era simulado. Tesseract.js roda no navegador, mas não no Expo Go. A disciplina de Mobile exige uma funcionalidade de LLM útil e que o app continue utilizável se a LLM falhar.
**Alternativas:** (a) só Tesseract.js (sem mobile); (b) OCR nativo com ML Kit (exige dev build, fora do Expo Go); (c) LLM (Gemini) via backend para fotos do celular; (d) só digitação.
**Escolha:** web → Tesseract.js carregado sob demanda; mobile → `POST /scan` no backend-ml chama o Gemini (chave só em variável de ambiente do servidor); em ambos, o texto passa por fuzzy matching no Scryfall (`/cards/named?fuzzy=`), com fallback para o fuzzy local (`/cards/match`) e para digitação manual.
**Consequências:** nenhuma chave no repositório nem no app; sem `GEMINI_API_KEY` o `/scan` responde 503 e o app oferece a digitação; o OCR web depende do CDN jsDelivr na primeira carga.

## DA07 — Regra de decisão = regras determinísticas + score de ML com margem δ
**Contexto:** o classificador só viu cartas legais dentro da identidade de cor do deck; no teste prático, intrusos fora da cor foram detectados pior que os de dentro da cor (fora da distribuição).
**Alternativas:** (a) só ML; (b) incluir negativos fora da cor no treino (tarefa fica trivial e distorce as métricas); (c) regras de legalidade antes do ML.
**Escolha:** (c): carta fora da identidade ou não legal → "não pode entrar"; carta já no deck → singleton; carta ilegal no deck → é a primeira a sair. Só depois: `score(C) > score(pior) + δ`, com δ = 0,1 escolhido em decks de validação (nunca nos de teste).
**Consequências:** as decisões de legalidade são explicáveis e 100% corretas; o ML responde só pelo que é incerto. O δ depende da calibração do modelo e deve ser reavaliado ao re-treinar.

## DA08 — Deck do usuário salvo localmente em pedaços
**Contexto:** a demo precisa de um deck salvo; o SecureStore limita cerca de 2 KB por chave e uma lista de 99 cartas passa disso.
**Escolha:** salvar o JSON dividido em chaves de 1.800 caracteres (`src/services/decks.js`); importar decks oficiais via `GET /decks/examples`.
**Consequências:** simples e funciona em web e mobile; a persistência remota fica para o backend Node (fora do escopo do TP).
