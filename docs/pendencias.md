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
- [x] Remover a parte de vários TCGs (mocks e filtros por jogo) — DA06
- [x] Trocar os dados falsos pela API real: lojas (com localização e mapa), loja + acervo, consignações (RF07) e notificações (RF10); anúncios, propostas, comunidade e detalhe de carta removidos (fora do PRD)
- [x] Persistência local (DA07): cache por usuário em AsyncStorage, app abre e consulta offline
- [x] Autenticação real (RF01): login, cadastro (jogador ou loja), sessão persistente, tela de perfil e configurações ligadas à API
- [x] Coleção (RF03): adicionar por nome ou ManaScan, editar quantidade/condição/foil, remover
- [x] Decks (RF04): vários decks em vários formatos, validação, importação de lista e de deck oficial, ManaScan adicionando direto no deck, avaliação de ML nos decks Commander do servidor
- [x] Consignação (RF07): jogador consigna pela tela da loja, edita preço, desiste e exclui; loja aceita, recusa, põe à venda, registra venda ou devolução
- [ ] Sideboard nos formatos de 60 cartas
- [ ] Scanner pela câmera via `/api/scan` (DA03)
- [x] Diário de uso de IA (`docs/diario_ia.md`): equipe completa as entradas marcadas
- [ ] Testar no Expo Go em dispositivo real; tutorial de uso

## Web 2
- [x] Camada de armazenamento: 10 tabelas, 3 N:N, 1:N e 1:1, regras de integridade, seed e testes (`backend/`)
- [x] Lista de desejos: tabela N:N, CRUD `/api/desejos`, tela no app e botão no ManaScan
- [x] Autenticação JWT, 3 perfis e middlewares `autenticar` / `autorizar(...)` / `exigirLojaAprovada`
- [ ] Testar o schema num PostgreSQL real (até agora só SQLite)
- [x] `backend/` Express MVC: views EJS + controllers com CRUD de todas as tabelas, 3 perfis, permissões por middleware (`autorizar`, `carregar`)
- [x] API REST com JWT e CRUD de todas as tabelas; documentação OpenAPI em `/api/docs`
- [x] App: abas Biblioteca e Desejos escondidas para loja/admin
- [ ] Publicar na web
