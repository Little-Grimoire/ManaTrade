# ManaTrade — backend (Programação para Web 2)

Node.js + Express + Sequelize + EJS. Um único servidor entrega as duas partes do trabalho:

| Entrega | Onde | Autenticação |
|---|---|---|
| 1 — Sistema web MVC | páginas em `http://localhost:3001/` | token JWT em cookie `httpOnly` |
| 2 — API REST | `http://localhost:3001/api/...` · documentação em **`/api/docs`** (Swagger) | token JWT em `Authorization: Bearer` |

As duas usam **os mesmos models, as mesmas regras (`services/`) e os mesmos middlewares de permissão**. Só muda a forma de responder: a página renderiza uma view ou redireciona, e a API devolve JSON.

## Como rodar

```bash
cd backend
npm install
cp .env.example .env     # opcional: sem .env usa SQLite em ./data/manatrade.sqlite
npm run db:seed          # ATENÇÃO: apaga e recria o banco com dados de demonstração (precisa de internet: Scryfall)
npm test                 # testes (SQLite em memória, sem internet)
npm run dev              # http://localhost:3001 (reinicia ao salvar)
```

| Script | O que faz |
|---|---|
| `npm run db:reset` | recria todas as tabelas, **vazias** (apaga os dados) |
| `npm run db:seed` | recria as tabelas e popula com dados de demonstração |
| `npm start` / `npm run dev` | sobe o servidor (`dev` reinicia ao salvar) |
| `npm test` | testes de models, API, permissões por perfil e páginas web |

Usuários do seed (senha `manatrade123`, ou o valor de `SEED_PASSWORD`):

| E-mail | Perfil |
|---|---|
| `admin@manatrade.dev` | admin |
| `loja@manatrade.dev` | loja (Loja Demo Centro, aprovada) |
| `loja2@manatrade.dev` | loja (Loja Demo Bairro, aguardando aprovação) |
| `jogador@manatrade.dev` | usuario (coleção, deck, consignações e chamado) |
| `jogador2@manatrade.dev` | usuario |

## Requisitos do trabalho → onde estão

| Requisito | Implementação |
|---|---|
| N:N | `Deck ↔ Carta` (`deck_cartas`), `Usuário ↔ Carta` (`itens_colecao` e `desejos`), `Loja ↔ Carta` (`itens_acervo`) — [`models/index.js`](src/models/index.js) |
| ≥ 3 relações 1:N | `Usuário → Deck, ItemColecao, Desejo, Consignação, Chamado, Notificação`, `Loja → ItemAcervo, Consignação`, `Carta → ItemColecao, Desejo, ItemAcervo, Consignação, DeckCarta` (+ 1:1 `Usuário → Loja`) |
| ≥ 3 perfis | `usuario` (jogador), `loja`, `admin` — tabela abaixo |
| CRUD de todas as tabelas | páginas em [`routes/web/index.js`](src/routes/web/index.js) e API em [`routes/api/`](src/routes/api/) (as 11 tabelas) |
| Permissões por middleware | [`middlewares/autenticacao.js`](src/middlewares/autenticacao.js) e [`middlewares/permissoes.js`](src/middlewares/permissoes.js) |
| MVC com front-end | Models em `models/`, Views EJS em `views/`, Controllers em `controllers/web/` |
| API REST com token | `controllers/*Controller.js` + `routes/api/`, JWT |
| Documentação da API | OpenAPI 3 em [`docs/openapi.js`](src/docs/openapi.js), servida em `/api/docs` (JSON em `/api/docs.json`) |

## Perfis e permissões

| Recurso | Jogador (`usuario`) | Loja | Admin |
|---|---|---|---|
| Coleção, decks, lista de desejos | CRUD dos próprios | — | — |
| Lojas | vê as aprovadas | cadastra/edita/exclui a própria | CRUD de todas + aprova/suspende |
| Acervo | vê a vitrine das lojas | CRUD do próprio (só com a loja aprovada) | — |
| Cartas (catálogo) | consulta | consulta | CRUD + sincronizar com o Scryfall |
| Consignações | envia; edita/cancela enquanto pendente | aceita, recusa, põe à venda, registra venda/devolução | consulta todas e exclui |
| Chamados | abre e edita enquanto aberto | abre e edita enquanto aberto | vê todos, responde, muda status |
| Notificações | as próprias | as próprias | as próprias + envia avisos |
| Usuários | — | — | CRUD, muda perfil, bloqueia |

### Como as permissões são verificadas (sempre por middleware)

```js
// routes/api/consignacoes.js (as páginas usam exatamente os mesmos)
const consignacao = carregar(Consignacao, { nome: 'Consignação', pode: participa });

router.use(autenticar);                                                  // 1. tem token válido?
router.post('/', autorizar('usuario'), controller.criar);                // 2. o perfil pode?
router.patch('/:id', autorizar('usuario', 'loja'), consignacao, controller.atualizar); // 3. participa deste registro?
```

| Middleware | Pergunta | Falha |
|---|---|---|
| `autenticar` | o token (cabeçalho ou cookie) é válido? Relê o usuário no banco, então bloquear/mudar perfil vale na hora | 401 (página: volta ao login) · 403 conta bloqueada |
| `autorizar(...perfis)` | o perfil do usuário está na lista? | 403 |
| `exigirLojaAprovada` | a loja do usuário já foi aprovada pelo admin? | 403 |
| `carregar(Model, { pode })` | busca o registro de `:id` e aplica a regra (`dono`, `donoOuAdmin`, `daMinhaLoja`, `participa`...); entrega em `req.registro` | 404 (não revela que o id existe) |

Regras que dependem do **estado** do registro (ex.: só editar chamado enquanto aberto, transições de status da consignação) ficam nos `services/` e respondem 409.

## Fluxo de uma requisição

```
Página:  navegador ──POST /consignacoes/7 (_method=PATCH)──► metodoDoFormulario ─► autenticar ─► autorizar ─► carregar
                                                            ─► controllers/web/consignacoesController ─► services/consignacoes ─► models
                                                            ◄── redirect + mensagem (flash) ou res.render(view EJS)

API:     app/cliente ──PATCH /api/consignacoes/7 + Bearer──► autenticar ─► autorizar ─► carregar
                                                            ─► controllers/consignacoesController ─► services/consignacoes ─► models
                                                            ◄── 200 JSON (ou erro JSON pelo middlewares/erros.js)
```

## Estrutura

```
src/
  app.js / server.js        aplicação Express / inicialização
  config/                   banco (SQLite ou PostgreSQL) e JWT
  models/                   um arquivo por tabela + index.js com os relacionamentos      (M)
  views/                    páginas EJS: partials/ (topo, rodapé) + uma pasta por recurso (V)
  controllers/web/          controllers das páginas: chamam o service e renderizam/redirecionam (C)
  controllers/*.js          controllers da API: chamam o service e respondem JSON
  services/                 regras de negócio, usadas pelos dois tipos de controller
  middlewares/              autenticacao, permissoes, web (flash, _method), erros
  routes/web/index.js       rotas das páginas
  routes/api/               rotas da API REST (/api)
  docs/openapi.js           documentação da API (Swagger em /api/docs)
  public/estilo.css         CSS das páginas
  database/                 reset, seed e atualização de esquema
test/                       models, auth, coleção, decks, desejos, perfis (API) e web (páginas)
```

## Banco de dados

- **Sem `DATABASE_URL`**: SQLite em arquivo (`DB_STORAGE`), sem instalar nada.
- **Com `DATABASE_URL`**: PostgreSQL (deploy). Use `DB_SSL=true` em serviços que exigem SSL (ex.: Neon, Render).
- **Testes** (`NODE_ENV=test`): sempre SQLite em memória.

Ao iniciar, o servidor cria as tabelas que faltam e adiciona colunas novas dos models (`database/atualizarEsquema.js`), sem apagar dados. O modelo completo está em [`docs/modelagem_dados.md`](../docs/modelagem_dados.md).

## Regras que ficam no model (valem para o site e para a API)

- **Senha**: o model recebe `senha` (campo virtual) e grava só `senha_hash` (bcrypt). O hash nunca sai em consultas nem no JSON.
- **Consignação**: nasce `pendente`; mudanças de status só pelas transições de `Consignacao.TRANSICOES`. `respondida_em` e `encerrada_em` são preenchidas sozinhas.
- **Notificações**: criadas por hooks quando uma consignação é criada (aviso à loja) ou muda de status (aviso ao jogador), e quando um chamado é respondido.
- **Exclusão**: carta em uso não pode ser apagada (`RESTRICT` → 409); apagar usuário/loja/deck apaga o que pertence a ele (`CASCADE`).
- Nos services, use `instancia.update(...)` e não `Model.update(...)` em massa: o update em massa não dispara os hooks.
