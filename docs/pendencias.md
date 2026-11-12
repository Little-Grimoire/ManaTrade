# Pendências — onde continuar

## Decisões em aberto
1. Onde publicar (ex.: Render + Neon)?
2. O que será a API REST de Web 2 (escopo das rotas).
3. Revisar as decisões de modelagem tomadas em `modelagem_dados.md` (loja com um dono, chamado entra, lista de desejos entra).

## Sistemas Inteligentes (TP) — entrega 24/11
- [x] Notebook com EDA, preparação, baseline, 4 clássicos + MLP, CV agrupada, regra de remoção e exportação
- [x] API de ML (`backend-ml/`) consumida pelo app
- [ ] Preencher a equipe no notebook e revisar o texto das conclusões
- [ ] Redigir o relatório (4–6 p.) e montar os slides

## Mobile — entrega 30/11
- [x] ManaScan: identificação (OCR na web, nome digitado no celular) e avaliação no deck
- [ ] Remover a parte de vários TCGs (`src/mocks/dados.js`, filtros por jogo)
- [ ] Trocar os dados falsos (lojas, anúncios, consignações) pela API real
- [x] Autenticação real (RF01): login, cadastro (jogador ou loja), sessão persistente, tela de perfil e configurações ligadas à API
- [x] Coleção (RF03): adicionar por nome ou ManaScan, editar quantidade/condição/foil, remover
- [x] Decks (RF04): vários decks em vários formatos, validação, importação de lista e de deck oficial, ManaScan adicionando direto no deck, avaliação de ML nos decks Commander do servidor
- [ ] Consignação (RF07)
- [ ] Sideboard nos formatos de 60 cartas
- [ ] Scanner pela câmera via `/api/scan` (DA03)
- [ ] Testar no Expo Go em dispositivo real; tutorial de uso; diário de uso de IA

## Web 2
- [x] Camada de armazenamento: 10 tabelas, 3 N:N, 1:N e 1:1, regras de integridade, seed e testes (`backend/`)
- [x] Lista de desejos: tabela N:N, CRUD `/api/desejos`, tela no app e botão no ManaScan
- [x] Autenticação JWT, 3 perfis e middlewares `autenticar` / `autorizar(...)` / `exigirLojaAprovada`
- [ ] Testar o schema num PostgreSQL real (até agora só SQLite)
- [ ] `backend/` Express MVC: controllers + views com CRUD de todas as tabelas, 3 perfis, middleware de autorização
- [ ] API REST com JWT e documentação das rotas
- [ ] Publicar na web
