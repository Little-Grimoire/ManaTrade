# Pendências — onde continuar

## Decisões em aberto
1. Loja: um dono ou vários funcionários? (`modelagem_dados.md`)
2. Consignação aceita vira item do acervo da loja automaticamente?
3. Chamado de suporte entra agora ou depois?
4. A tela "Desejos" fica ou sai?
5. Banco e deploy: PostgreSQL + Sequelize? Onde publicar (ex.: Render, Neon)?
6. O que será a API REST de Web 2 (escopo das rotas).

## Sistemas Inteligentes (TP) — entrega 24/11
- [x] Notebook com EDA, preparação, baseline, 4 clássicos + MLP, CV agrupada, regra de remoção e exportação
- [x] API de ML (`backend-ml/`) consumida pelo app
- [ ] Preencher a equipe no notebook e revisar o texto das conclusões
- [ ] Redigir o relatório (4–6 p.) e montar os slides

## Mobile — entrega 30/11
- [x] ManaScan: identificação (OCR na web, nome digitado no celular) e avaliação no deck
- [ ] Remover a parte de vários TCGs (`src/mocks/dados.js`, filtros por jogo)
- [ ] Trocar os dados falsos (lojas, anúncios, consignações) pela API real
- [ ] Coleção (RF03), consignação (RF07), autenticação real (RF01)
- [ ] Scanner pela câmera via `/api/scan` (DA03)
- [ ] Testar no Expo Go em dispositivo real; tutorial de uso; diário de uso de IA

## Web 2
- [ ] Fechar a modelagem e as decisões acima
- [ ] `backend/` Node + Express MVC: CRUD de todas as tabelas, 3 perfis, middleware de autorização
- [ ] API REST com JWT e documentação das rotas
- [ ] Publicar na web
