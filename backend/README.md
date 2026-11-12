# ManaTrade — backend (Programação para Web 2)

Node.js + Express + Sequelize. Pronto até aqui: **camada de armazenamento** (models, relacionamentos, regras, seed) e **autenticação com perfis** (JWT + middlewares de autorização). Os CRUDs, as views (MVC) e o restante da API REST vêm em cima disso.

## Como rodar

```bash
cd backend
npm install
cp .env.example .env     # opcional: sem .env usa SQLite em ./data/manatrade.sqlite
npm run db:seed          # recria as tabelas e insere dados de demonstração (precisa de internet: busca cartas no Scryfall)
npm test                 # testes de models e autenticação (SQLite em memória, sem internet)
npm run dev              # API em http://localhost:3001 (reinicia ao salvar)
```

| Script | O que faz |
|---|---|
| `npm run db:reset` | recria todas as tabelas, **vazias** (apaga os dados) |
| `npm run db:seed` | recria as tabelas e popula com dados de demonstração |
| `npm start` / `npm run dev` | sobe o servidor (`dev` reinicia ao salvar) |
| `npm test` | testes de models, relacionamentos, regras e autenticação |

Usuários do seed (senha `manatrade123`, ou o valor de `SEED_PASSWORD`):

| E-mail | Perfil |
|---|---|
| `admin@manatrade.dev` | admin |
| `loja@manatrade.dev` | loja (Loja Demo Centro, aprovada) |
| `loja2@manatrade.dev` | loja (Loja Demo Bairro, aguardando aprovação) |
| `jogador@manatrade.dev` | usuario (coleção, deck, consignações e chamado) |
| `jogador2@manatrade.dev` | usuario |

## Autenticação e perfis

Login gera um **token JWT** (validade `JWT_EXPIRES_IN`, padrão 7 dias) com o id e o perfil do usuário. O cliente envia o token em `Authorization: Bearer <token>`; as páginas web (MVC) poderão usar o cookie `manatrade_token`, lido pelo mesmo middleware.

| Rota | Acesso | Corpo | Respostas |
|---|---|---|---|
| `POST /api/auth/cadastro` | público | `{ nome, email, senha, perfil?: "usuario" \| "loja", loja?: { nome, endereco, cidade, uf, horario, telefone, latitude, longitude } }` | 201 `{ token, usuario }` · 400 dados inválidos · 409 e-mail já cadastrado |
| `POST /api/auth/login` | público | `{ email, senha }` | 200 `{ token, usuario }` · 401 credenciais erradas · 403 conta bloqueada |
| `GET /api/auth/me` | logado | — | 200 usuário + `loja` (perfil loja) + `resumo` · 401 |
| `PATCH /api/auth/me` | logado | `{ nome?, email? }` | 200 usuário atualizado · 400 · 409 |
| `PATCH /api/auth/me/senha` | logado | `{ senhaAtual, novaSenha }` | 204 · 401 senha atual errada |

### Coleção, lista de desejos e decks

Todas exigem login; cada usuário só enxerga e altera os próprios registros (registro de outra pessoa responde 404).

| Rota | Corpo | Respostas |
|---|---|---|
| `GET /api/colecao` | — | 200 itens da coleção com `carta` |
| `GET /api/colecao/:id` | — | 200 item + `decks` em que a carta está · 404 |
| `POST /api/colecao` | `{ carta_id | scryfall_id | nome, quantidade?, condicao?, foil?, observacao? }` | 201 novo item · 200 somou num item igual (mesma carta, condição e foil) · 400 · 404 |
| `PATCH /api/colecao/:id` | `{ quantidade?, condicao?, foil?, observacao? }` | 200 · 400 · 404 · 409 já existe item igual |
| `DELETE /api/colecao/:id` | — | 204 · 404 |
| `GET /api/desejos` | — | 200 desejos com `carta` |
| `GET /api/desejos/:id` | — | 200 · 404 |
| `POST /api/desejos` | `{ carta_id | scryfall_id | nome, prioridade?, preco_maximo_usd?, observacao? }` | 201 + `Location` · 400 · 404 carta não encontrada · 409 já está na lista · 502 Scryfall fora |
| `PATCH /api/desejos/:id` | `{ prioridade?, preco_maximo_usd?, observacao? }` | 200 · 400 · 404 |
| `DELETE /api/desejos/:id` | — | 204 · 404 |

Decks (formatos: `commander`, `pauper`, `standard`, `pioneer`, `modern`, `legacy`, `vintage`, `casual`):

| Rota | Corpo | Respostas |
|---|---|---|
| `GET /api/decks/formatos` | — | 200 regras de cada formato |
| `GET /api/decks` | — | 200 resumo de cada deck (total, válido, comandante) |
| `GET /api/decks/:id` | — | 200 deck completo · 404 |
| `POST /api/decks` | `{ nome, formato?, descricao?, comandante? }` | 201 + `Location` · 400 · 404 comandante não encontrado |
| `PATCH /api/decks/:id` | `{ nome?, formato?, descricao?, comandante? (null remove) }` | 200 · 400 · 404 |
| `DELETE /api/decks/:id` | — | 204 · 404 |
| `POST /api/decks/:id/cartas` | `{ carta_id | scryfall_id | nome, quantidade? }` (soma se já existir) | 201 deck completo · 400 · 404 |
| `PATCH /api/decks/:id/cartas/:cartaId` | `{ quantidade }` | 200 deck completo · 400 · 404 |
| `DELETE /api/decks/:id/cartas/:cartaId` | — | 200 deck completo · 404 |
| `POST /api/decks/:id/importar` | `{ lista, substituir? }` | 200 `{ deck, naoEncontradas }` · 400 |

O deck completo traz `cartas` (com `categoria`, `naColecao` e `problemas` de cada carta), `validacao` (`valido`, `total`, `problemas`) e `estatisticas` (`porTipo`, `curva`, `possuidas`). As regras ficam em `src/services/formatos.js`: tamanho mínimo/máximo, limite de cópias (terrenos básicos livres; "restricted" no Vintage = 1), legalidade pelo Scryfall e identidade de cor do comandante. Problemas não bloqueiam a edição: o deck pode ficar incompleto enquanto é montado. A importação aceita listas do Moxfield/Archidekt/Arena (`src/services/listaDeck.js`).

No `POST`, `nome` faz busca aproximada no Scryfall (aceita erros de digitação); a carta encontrada é salva no cache (`cartas`) e reaproveitada nas próximas vezes.

Erros sempre no formato `{ "erro": "mensagem", "detalhes"?: [{ campo, mensagem }] }`.

Regras de perfil:
- O cadastro só aceita `usuario` (jogador) ou `loja`. **Admin não se cadastra**: vem do seed ou será criado por outro admin.
- Perfil `loja` exige os dados da loja; usuário e loja são criados na mesma transação, e a loja nasce **não aprovada**.
- Ninguém altera o próprio perfil nem o status `ativo` pelo `PATCH /me`.
- O `resumo` muda conforme o perfil: jogador (cartas, decks, consignações ativas), loja (acervo, consignações pendentes e à venda), admin (lojas a aprovar, chamados abertos, usuários bloqueados).

Middlewares (`src/middlewares/autenticacao.js`), usados em todas as rotas protegidas:

```js
router.get('/rota', autenticar, handler);                                   // qualquer usuário logado
router.get('/rota', autenticar, autorizar('admin'), handler);               // só admin
router.post('/rota', autenticar, autorizar('loja'), exigirLojaAprovada, h); // loja aprovada (req.loja)
```

`autenticar` relê o usuário no banco a cada requisição: **bloquear um usuário ou mudar o perfil vale na hora**, mesmo para tokens já emitidos. Respostas: 401 sem token/token inválido ou vencido, 403 conta bloqueada ou perfil sem permissão.

## Banco de dados

- **Sem `DATABASE_URL`**: SQLite em arquivo (`DB_STORAGE`), sem instalar nada. Bom para desenvolvimento.
- **Com `DATABASE_URL`**: PostgreSQL (deploy). Use `DB_SSL=true` em serviços que exigem SSL (ex.: Neon, Render).
- **Testes** (`NODE_ENV=test`): sempre SQLite em memória, mesmo se houver `DATABASE_URL`.

Ao iniciar, o servidor cria as tabelas que faltam e adiciona colunas novas dos models (`database/atualizarEsquema.js`), sem apagar dados. Mudanças de tipo ou remoção de colunas exigem `npm run db:seed` (recria o banco). O modelo completo está em [`docs/modelagem_dados.md`](../docs/modelagem_dados.md).

## Estrutura

```
src/
  config/database.js     conexão (SQLite ou PostgreSQL)
  models/                um arquivo por tabela + index.js com os relacionamentos
  database/reset.js      recria as tabelas
  database/seed.js       dados de demonstração
  app.js / server.js     aplicação Express / inicialização
  config/auth.js         segredo e validade do JWT
  controllers/           regras de cada rota (authController.js)
  middlewares/           autenticar, autorizar(perfis), exigirLojaAprovada, tratamento de erros
  routes/api/            rotas da API REST (/api)
  services/token.js      gera e valida o JWT
  services/cartas.js     acha a carta no cache local ou no Scryfall (uma ou em lote)
  services/formatos.js   regras dos formatos e validação do deck
  services/listaDeck.js  leitura de lista de deck colada
  database/atualizarEsquema.js  adiciona colunas novas sem apagar dados (roda ao iniciar)
test/                    testes (models, autenticação, coleção, decks, formatos e desejos; Scryfall simulado)
```

## Regras que já ficam no model (valem para o site e para a API)

- **Senha**: o model recebe `senha` (campo virtual) e grava só `senha_hash` (bcrypt). O hash não vem nas consultas (`defaultScope`) nem no JSON. Para login: `Usuario.scope('comSenha').findOne(...)` e `usuario.verificarSenha(senha)`.
- **Consignação**: nasce `pendente`; mudanças de status só pelas transições de `Consignacao.TRANSICOES`. As datas `respondida_em` e `encerrada_em` são preenchidas sozinhas.
- **Notificações (RF10)**: criadas por hooks quando uma consignação é criada (aviso à loja) ou muda de status (aviso ao usuário), e quando um chamado é respondido.
- **Exclusão**: carta em uso não pode ser apagada (`RESTRICT`); apagar usuário/loja/deck apaga o que pertence a ele (`CASCADE`).

Atenção nos controllers:
- Use `instancia.update(...)`, não `Model.update(...)` em massa: o update em massa não dispara os hooks (validação de status e notificações), a menos que se passe `individualHooks: true`.
- Para listar a coleção ou o acervo, use `itensColecao`/`itensAcervo` com `include: 'carta'`. O include via `belongsToMany` (`colecao`, `acervo`) agrupa pela carta e esconde linhas da mesma carta em condições diferentes.
