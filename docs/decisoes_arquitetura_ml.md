# Decisões de Arquitetura — complemento (ML / TP FS26S)

Decisões vigentes do projeto. O `decisoes_arquitetura.pdf` antigo está sendo revisto.

## DA05 — Serviço de ML separado em Python (FastAPI)
**Contexto:** o modelo do TP é treinado em scikit-learn (Python). O backend principal planejado é Node/Express (exigência de Web 2).
**Alternativas:** (a) reimplementar a inferência em JavaScript; (b) exportar para ONNX e rodar no Node; (c) microsserviço Python dedicado.
**Escolha:** (c) `backend-ml/` com FastAPI, que carrega `ml/models/best_model.joblib` e importa o mesmo pacote `ml/manatrade_ml` usado no notebook.
**Justificativa:** um único código de features no treino e na inferência elimina divergência treino/produção; reescrever as ~100 features em JS seria fonte de bugs; ONNX não cobre o transformador de popularidade customizado.
**Consequências:** dois runtimes (Node + Python) para subir; a versão do scikit-learn precisa ser a mesma do treino (fixada em `requirements.txt`); o Express pode atuar como proxy para `/evaluate` se for preciso autenticar.

## DA06 — Identificação da carta: OCR no navegador + busca aproximada, sem IA generativa
**Contexto:** o ManaScan era simulado. A "IA" do aplicativo passa a ser o classificador do TP (acordado com o professor), então a identificação da carta só precisa ser confiável e barata.
**Alternativas:** (a) LLM multimodal (ex.: Gemini) para ler a foto; (b) OCR nativo com ML Kit (exige build nativo, fora do Expo Go); (c) Tesseract.js no navegador + digitação no celular; (d) só digitação.
**Escolha:** (c). Web: Tesseract.js carregado sob demanda lê o topo da carta. Celular: o usuário digita o nome. Nos dois casos o texto passa pela busca aproximada do Scryfall (`/cards/named?fuzzy=`), com fallback para a busca local do backend-ml (`/cards/match`).
**Justificativa:** a LLM foi descartada porque não é mais requisito, exigiria chave de API e custo, e duplicaria o papel de "IA" que já é do classificador.
**Consequências:** nenhuma chave de API no projeto; no celular a identificação exige digitação; o OCR web depende do CDN jsDelivr na primeira carga.

## DA07 — Regra de decisão = regras determinísticas + score de ML com margem δ
**Contexto:** o classificador só viu cartas legais dentro da identidade de cor do deck; no teste prático, intrusos fora da cor foram detectados pior que os de dentro da cor (fora da distribuição).
**Alternativas:** (a) só ML; (b) incluir negativos fora da cor no treino (tarefa fica trivial e distorce as métricas); (c) regras de legalidade antes do ML.
**Escolha:** (c): carta fora da identidade ou não legal → "não pode entrar"; carta já no deck → singleton; carta ilegal no deck → é a primeira a sair. Só depois: `score(C) > score(pior) + δ`, com δ = 0,1 escolhido em decks de validação (nunca nos de teste).
**Consequências:** as decisões de legalidade são explicáveis e 100% corretas; o ML responde só pelo que é incerto. O δ depende da calibração do modelo e deve ser reavaliado ao re-treinar.

## DA08 — Deck do usuário salvo localmente em pedaços
**Contexto:** a demo precisa de um deck salvo; o SecureStore limita cerca de 2 KB por chave e uma lista de 99 cartas passa disso.
**Escolha:** salvar o JSON dividido em chaves de 1.800 caracteres (`src/services/decks.js`); importar decks oficiais via `GET /decks/examples`.
**Consequências:** simples e funciona em web e mobile; a persistência remota fica para o backend Node (fora do escopo do TP).
