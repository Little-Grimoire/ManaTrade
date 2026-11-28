# ManaTrade

Aplicativo para jogadores de **Magic: The Gathering** identificarem cartas pela câmera, organizarem coleção e decks e descobrirem se uma carta **melhora o seu deck Commander**. O app também conecta jogadores a **lojas parceiras**, onde é possível deixar cartas em consignação.

O projeto é desenvolvido em conjunto para três disciplinas da UTFPR-DV (Engenharia de Software, 2026/2):

| Disciplina | O que é avaliado | Onde está |
|---|---|---|
| Programação para Dispositivos Móveis | aplicativo Expo funcional | `app/`, `src/` |
| Programação para Web 2 | sistema web MVC e API REST (é o back-end do app) | `backend/` |
| Fundamentos de Sistemas Inteligentes (TP) | classificador carta × deck (ML) | `ml/`, `backend-ml/` |

A funcionalidade de IA do aplicativo é o **classificador do TP**, combinado com o professor.

---

## Como funciona

1. **Identificar a carta (ManaScan):** o usuário fotografa a carta pela câmera ou escolhe uma foto da galeria. O `backend-ml` lê o nome com OCR (RapidOCR) e o app confirma a carta pela busca aproximada do [Scryfall](https://scryfall.com/docs/api). Se a leitura falhar, o usuário digita o nome, e a busca aceita erros de digitação.
2. **Coleção, decks e desejos:** cada carta identificada pode ir para a coleção (quantidade, condição, foil), para um deck ou para a lista de desejos. Os decks podem ser de vários formatos; a lista de cartas pode ser colada ou um deck Commander oficial pode ser importado.
3. **Avaliar no deck (IA):** o modelo de ML dá um score de adequação para a carta nova e para cada carta do deck. Se a carta nova superar a mais fraca por uma margem δ, o app sugere: *"Melhora o deck. Remova: X"*. Cartas fora da identidade de cor ou ilegais são barradas por regra antes do modelo. Se a API de ML falhar, o ManaScan continua funcionando e só a avaliação aparece como "sem avaliação".
4. **Lojas e consignação:** o jogador vê as lojas aprovadas, ordenadas pela distância (GPS), e o acervo de cada uma. Ele pode consignar uma carta da coleção, e a loja aceita, recusa, coloca à venda e registra a venda ou a devolução. Cada mudança de status gera uma notificação.

## Requisitos da disciplina de Mobile → onde estão

| Requisito | Implementação |
|---|---|
| Expo + Expo Go | Expo SDK 58, Expo Router (`app/`) |
| 5+ telas além de login e cadastro | Início, Biblioteca (coleção/decks), ManaScan, Desejos, Perfil, Novo deck, Deck, Lojas, Loja, Consignações, Notificações, Configurações |
| Autenticação com sessão persistente e telas privadas | JWT no SecureStore (`src/contexts/AuthContext.js`). O layout raiz (`app/_layout.js`) manda para o login quem não está autenticado |
| Persistência remota com CRUD na interface | Back-end da Web 2 (`backend/`, Node + Express + Sequelize): coleção, decks, desejos, consignações e notificações |
| Persistência local | Cópia das respostas da API no aparelho (AsyncStorage, `src/services/cacheLocal.js`): o app abre e consulta offline. Ver DA07 |
| Regras de acesso aos dados | Middlewares `autenticar`, `autorizar(perfis)` e `carregar` (dono do registro) em `backend/src/middlewares/` e `backend/src/routes/api/` |
| API externa com carregamento e erro | Scryfall (`src/services/scryfall.js`); estados de carregamento, vazio e erro nas listagens |
| Recurso nativo com permissão negada tratada | Câmera (ManaScan) e localização (Lojas). Se o usuário negar, o app explica e oferece alternativa: galeria/nome digitado, ou lista em ordem alfabética |
| Funcionalidade de IA | Classificador carta × deck (`backend-ml/`, `ml/`) |
| Nenhuma chave de API versionada | O app não usa chaves (o Scryfall é público); `.env` fica fora do Git |

## Estrutura

```
app/            telas (Expo Router)                                    ── Mobile
src/            componentes, contexto de autenticação, serviços (API, cache local, Scryfall, ML)
backend/        Node + Express + Sequelize: banco, site MVC (EJS) e API REST  ── Web 2
backend-ml/     API Python (FastAPI) que serve o modelo e o OCR       ── Sistemas Inteligentes
ml/             notebook do TP, dados, código de features, modelo exportado
scripts/dev.js  sobe backend, backend-ml e Expo com um comando
docs/           PRD, decisões de arquitetura, modelagem, diário de IA
```

## Pré-requisitos

- **Node.js 20+** e npm
- **Python 3.12** para o `backend-ml`. Sem Python instalado, use o [uv](https://docs.astral.sh/uv/), que baixa o Python sozinho.
- **Expo Go** no celular, na mesma rede Wi-Fi do computador
- Internet na primeira execução: o seed do banco busca as cartas no Scryfall

## Como executar (a partir de um clone limpo)

### 1. Instalar as dependências (só na primeira vez)

```bash
npm install
cd backend && npm install && npm run db:seed && cd ..
```

`npm run db:seed` **apaga e recria** o banco SQLite (`backend/data/`) com dados de demonstração. Rode só na primeira vez ou quando quiser voltar ao estado inicial.

Ambiente Python do `backend-ml` (cria `backend-ml/.venv`):

```bash
cd backend-ml
uv venv --python 3.12 .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt   # Linux/macOS: .venv/bin/python
cd ..
```

Com Python e pip já instalados, também funciona criar o `.venv` com `python -m venv .venv` e instalar com `pip install -r requirements.txt`.

### 2. Subir tudo

```bash
npm run dev
```

O script `scripts/dev.js`:
1. descobre o IP do computador na rede e grava `EXPO_PUBLIC_API_URL` e `EXPO_PUBLIC_ML_API_URL` no `.env` da raiz, criando o arquivo se ele não existir;
2. sobe o backend (porta 3001) e o `backend-ml` (porta 8000) e espera os dois responderem;
3. inicia o Expo com o cache limpo.

Escaneie o QR code com o Expo Go (Android) ou com a câmera (iOS). Para abrir no navegador, aperte `w`. `Ctrl+C` encerra tudo.

### Subir manualmente (alternativa)

Em três terminais:

```bash
cd backend && npm run dev                                                  # http://localhost:3001
cd backend-ml && .venv/Scripts/python -m uvicorn main:app --host 0.0.0.0 --port 8000
npx expo start -c
```

Nesse caso, copie `.env.example` para `.env` e, para usar no celular, troque `localhost` pelo IP do computador (ex.: `http://192.168.0.10:3001`). No celular, `localhost` é o próprio aparelho.

### Contas de demonstração

Senha `manatrade123` para todas:

| E-mail | Perfil |
|---|---|
| `jogador@manatrade.dev` | jogador: coleção, deck Commander, consignações |
| `loja@manatrade.dev` | loja aprovada (Loja Demo Centro), com acervo e consignações recebidas |
| `admin@manatrade.dev` | administrador |

O painel web (Web 2) fica em `http://localhost:3001/`, e a documentação da API REST em `http://localhost:3001/api/docs`.

## Variáveis de ambiente

App (`.env` na raiz, modelo em `.env.example`; o `npm run dev` preenche sozinho):

| Variável | Uso | Padrão |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | URL do backend (Web 2) | `http://localhost:3001` |
| `EXPO_PUBLIC_ML_API_URL` | URL da API de ML | `http://localhost:8000` |

Backend (`backend/.env`, opcional; modelo em `backend/.env.example`): `DATABASE_URL` (PostgreSQL; vazio = SQLite), `DB_STORAGE`, `PORT`, `JWT_SECRET` (obrigatório em produção), `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `SEED_PASSWORD`.

`backend-ml`: `MANATRADE_ML_DIR` (opcional, caminho da pasta `ml/`).

**Nenhuma chave de API é necessária.** Os arquivos `.env` não são versionados (`.gitignore`).

## Persistência local e remota

- **Remota:** banco do backend da Web 2. Em desenvolvimento é SQLite; em produção, PostgreSQL via `DATABASE_URL`. Toda criação, edição e exclusão passa pela API, que aplica as permissões por perfil. A modelagem está em `docs/modelagem_dados.md`.
- **Local:** o token fica no SecureStore. As respostas da API (perfil, coleção, decks, desejos, lojas, consignações, notificações) ficam em AsyncStorage, separadas por usuário. Sem conexão, o app mostra a última cópia com a faixa "Sem conexão · dados salvos em …"; alterações ficam indisponíveis até o servidor voltar. O logout apaga essa cópia do aparelho.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "Não foi possível conectar ao servidor" no celular | `.env` com `localhost` ou com IP antigo (o Wi-Fi mudou). Rode `npm run dev` de novo |
| ManaScan não reconhece a foto | `backend-ml` parado ou sem o OCR instalado; digite o nome da carta |
| Avaliação "sem avaliação" | `backend-ml` fora do ar; o restante do app continua funcionando |
| Mapa vazio | só lojas aprovadas e com latitude/longitude aparecem |

## Documentação

- `docs/prd.md`: problema, perfis, requisitos funcionais e fora do escopo
- `docs/decisoes_arquitetura.md`: decisões DA01–DA07, com alternativas e consequências
- `docs/modelagem_dados.md`: tabelas e relacionamentos
- `docs/diario_ia.md`: diário de uso de IA do semestre
- `backend/README.md`: banco, seed, testes e requisitos da Web 2
- `backend-ml/README.md`: rotas da API de ML
- `ml/README.md`: notebook do TP, dados e reprodução

## Equipe

*(preencher: nome e RA de cada integrante)*
