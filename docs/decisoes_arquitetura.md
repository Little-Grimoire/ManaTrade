# Decisões de Arquitetura — ManaTrade

Formato: contexto, alternativas, escolha, justificativa, consequências.

## DA01 — Modelagem relacional com PostgreSQL
**Contexto:** usuários, lojas, coleções, decks e consignações têm relações fortes (N:N e 1:N, exigidas em Web 2) e consignações precisam de integridade.
**Alternativas:** (a) PostgreSQL; (b) MongoDB; (c) Firebase Firestore; (d) persistência poliglota (Postgres + Mongo, decisão antiga).
**Escolha:** (a) PostgreSQL com ORM Sequelize. Modelo em `modelagem_dados.md`.
**Justificativa:** um banco só, relacional, atende integridade e relacionamentos; o cache de cartas do Scryfall cabe numa tabela simples (`carta`). Dois bancos traziam complexidade sem ganho.
**Consequências:** precisa de hospedagem de Postgres no deploy. Em desenvolvimento e testes o mesmo código roda em SQLite (sem instalar nada). As tabelas são criadas com `sync()`; migrações só se o schema mudar com dados em produção.

## DA02 — Backend Node.js + Express em MVC, servindo o site e a API REST
**Contexto:** Web 2 exige Node.js, MVC com front-end, controle de acesso por middleware e uma API REST com token.
**Alternativas:** (a) um backend com views server-side (EJS) + rotas `/api`; (b) API pura + front SPA separado; (c) Firebase.
**Escolha:** (a) `backend/` em Express: views EJS para o painel web (loja e admin) e `/api/*` em JSON para o app. Autenticação com JWT; autorização por middleware conforme o perfil.
**Consequências:** o app mobile e o site usam o mesmo backend e as mesmas regras de acesso.

## DA03 — Scanner pela câmera com OCR no servidor de ML
**Contexto:** o app deve identificar a carta pela câmera do celular. OCR em JavaScript (Tesseract.js) não roda dentro do Expo Go.
**Alternativas:** (a) LLM multimodal (Gemini), prevista no plano inicial. A IA chegou a gerar um `/scan` que dependeria de `GEMINI_API_KEY`, mas nenhum projeto ou chave foi criado, então ele nunca rodou e o código foi removido em 11/11, quando a IA do app passou a ser o classificador; (b) ML Kit nativo (exige build nativo, fora do Expo Go); (c) OCR com Tesseract.js no backend Node; (d) OCR com RapidOCR no `backend-ml` (Python), que já tem o catálogo de nomes das cartas; (e) só digitação.
**Escolha:** (d) `POST /scan` no `backend-ml`: o app envia a foto em base64, o servidor reduz a imagem, lê as linhas (as do topo pesam mais) e faz o fuzzy matching com o catálogo local; o app confirma o candidato no Scryfall. Na web, se o servidor não responder, o OCR roda no navegador (Tesseract.js). Se tudo falhar, o usuário digita o nome.
**Justificativa:** o catálogo de nomes e o Python já estavam no serviço de ML (DA04); ficar com o OCR ali evitou um terceiro ponto de processamento de imagem.
**Consequências:** sem chaves de API; o OCR consome CPU do servidor de ML; sem o pacote de OCR instalado, `/scan` responde 503 e o app oferece a digitação.

## DA04 — Serviço de ML separado em Python (FastAPI)
**Contexto:** o classificador do TP é treinado em scikit-learn e é a funcionalidade de IA do app.
**Alternativas:** (a) reimplementar a inferência em JavaScript; (b) exportar para ONNX e rodar em Node; (c) microsserviço Python.
**Escolha:** (c) `backend-ml/` com FastAPI, que carrega `ml/models/best_model.joblib` e importa o mesmo pacote de features do notebook.
**Justificativa:** um só código de features no treino e na inferência; ONNX não cobre o transformador de popularidade customizado.
**Consequências:** dois runtimes (Node + Python); o backend Node pode repassar as chamadas de `/evaluate`; o scikit-learn fica fixado na versão do treino.

## DA05 — Decisão de troca = regras de legalidade + score do ML com margem δ
**Contexto:** o classificador só viu cartas legais dentro da identidade de cor; no teste, intrusos fora da cor foram detectados pior (fora da distribuição).
**Alternativas:** (a) só ML; (b) treinar com negativos fora da cor (tarefa trivial, métricas distorcidas); (c) regras antes do ML.
**Escolha:** (c): carta fora da identidade ou ilegal → "não pode entrar"; carta repetida → singleton; carta ilegal no deck → sai primeiro. Depois: `score(C) > score(pior) + δ`, com δ = 0,1 escolhido em decks de validação.
**Consequências:** a legalidade é sempre correta e explicável; o δ deve ser reavaliado a cada novo treino.

## DA06 — Apenas Magic: The Gathering
**Contexto:** o protótipo antigo listava vários TCGs.
**Escolha:** só Magic. **Justificativa:** o classificador e o Scryfall são específicos de Magic; suportar outros jogos multiplicaria catálogo e regras sem benefício para as entregas.
**Consequências:** filtros e campos de "jogo" saem do app.

## DA07 — Persistência local: cópia das respostas da API no aparelho (AsyncStorage)
**Contexto:** a disciplina de Mobile exige persistência local e remota. A remota é o backend da Web 2 (DA01/DA02), que concentra as regras de acesso por perfil. O app precisa continuar útil quando o servidor não responde (sem Wi-Fi, backend fora do ar).
**Alternativas:** (a) guardar só o token (situação anterior: offline o app voltava ao login); (b) banco local completo (expo-sqlite) com sincronização bidirecional e fila de escritas offline; (c) cache de leitura das respostas da API em AsyncStorage, separado por usuário.
**Escolha:** (c). `src/services/cacheLocal.js` guarda cada GET autenticado (`/auth/me`, `/colecao`, `/decks`, `/desejos`, `/lojas`, `/consignacoes`, `/notificacoes`…) com a data em que foi salvo. Sem conexão, `apiRequest` devolve a última cópia e o app mostra a faixa "Sem conexão · dados salvos em …". O token continua no SecureStore (dado sensível); o cache vai para o AsyncStorage (sem limite de 2 KB por valor).
**Justificativa:** (b) duplicaria no aparelho as regras de permissão e de transição de status que já estão no backend e exigiria resolver conflitos; o ganho não compensa no prazo. (c) não cria uma segunda fonte de verdade: o servidor continua sendo o único lugar onde se escreve.
**Consequências:** offline é possível consultar tudo o que já foi aberto, mas criar, editar e excluir exige o servidor (a mensagem de erro diz que a alteração não foi salva). Cada escrita invalida as cópias daquele recurso. No logout, ou se o token for recusado, o cache do usuário é apagado do aparelho.
