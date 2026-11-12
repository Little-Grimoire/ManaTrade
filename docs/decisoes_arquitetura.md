# Decisões de Arquitetura — ManaTrade

Formato: contexto, alternativas, escolha, justificativa, consequências. Itens marcados **(proposta)** ainda não foram confirmados pela equipe.

## DA01 — Modelagem relacional com PostgreSQL (proposta)
**Contexto:** usuários, lojas, coleções, decks e consignações têm relações fortes (N:N e 1:N, exigidas em Web 2) e consignações precisam de integridade.
**Alternativas:** (a) PostgreSQL; (b) MongoDB; (c) Firebase Firestore; (d) persistência poliglota (Postgres + Mongo, decisão antiga).
**Escolha:** (a) PostgreSQL com ORM Sequelize. Modelo em `modelagem_dados.md`.
**Justificativa:** um banco só, relacional, atende integridade e relacionamentos; o cache de cartas do Scryfall cabe numa tabela simples (`carta`). Dois bancos traziam complexidade sem ganho.
**Consequências:** precisa de hospedagem de Postgres no deploy; migrações versionadas.

## DA02 — Backend Node.js + Express em MVC, servindo o site e a API REST (proposta)
**Contexto:** Web 2 exige Node.js, MVC com front-end, controle de acesso por middleware e uma API REST com token.
**Alternativas:** (a) um backend com views server-side (EJS) + rotas `/api`; (b) API pura + front SPA separado; (c) Firebase.
**Escolha:** (a) `backend/` em Express: views EJS para o painel web (loja e admin) e `/api/*` em JSON para o app. Autenticação com JWT; autorização por middleware conforme o perfil.
**Consequências:** o app mobile e o site usam o mesmo backend e as mesmas regras de acesso.

## DA03 — Scanner pela câmera com OCR no servidor (proposta)
**Contexto:** o app deve identificar a carta pela câmera do celular. Tesseract.js não roda dentro do Expo Go, mas roda em Node.
**Alternativas:** (a) LLM multimodal (descartada: não é mais requisito e exige chave e custo); (b) ML Kit nativo (exige build nativo, fora do Expo Go); (c) o app envia a foto e o backend Node faz o OCR com Tesseract.js; (d) só digitação.
**Escolha:** (c) `POST /api/scan`: o backend lê o nome no topo da carta e confirma pela busca aproximada do Scryfall. Na web, o OCR também pode rodar no navegador. Se falhar, o usuário digita o nome.
**Consequências:** sem chaves de API; o OCR consome CPU do servidor (imagem reduzida antes do envio).

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
