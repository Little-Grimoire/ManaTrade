# ManaTrade

Aplicativo mobile para colecionadores e jogadores de **Magic: The Gathering** avaliarem, anunciarem e negociarem suas cartas físicas — e para lojas especializadas gerenciarem cartas recebidas em consignação.

O diferencial do app é o **ManaScan**: o usuário fotografa a carta e recebe, via IA generativa, uma sugestão de identificação (nome e edição), condição e preço justo, cruzando dados oficiais da API Scryfall com o histórico de preços do sistema.

> Status: 🚧 em desenvolvimento — Etapa 1 (tema, PRD e decisões de arquitetura definidos; protótipos em andamento).

---

## Sumário

- [Problema](#problema)
- [Funcionalidades](#funcionalidades)
- [Stack Tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Como Executar](#como-executar)
- [Documentação](#documentação)
- [Equipe](#equipe)

---

## Problema

Avaliar corretamente uma carta de Magic — identificar edição, condição de conservação e preço justo de mercado — é uma tarefa manual, trabalhosa e sujeita a erro. Além disso, não existe hoje um canal simples que conecte colecionadores a lojas parceiras para consignação, nem uma forma prática de acompanhar o status dessas consignações.

## Funcionalidades

- 🔐 Cadastro e autenticação de usuários, com sessão persistente e telas privadas protegidas
- 📸 **ManaScan** — identificação e precificação de cartas por foto, via IA generativa (Google Gemini)
- 🔎 Consulta a dados oficiais de cartas (nome, edição, raridade, imagem, preço médio) via API Scryfall
- 📋 CRUD completo de anúncios de cartas para venda
- 📍 Localização de lojas parceiras próximas via geolocalização
- 🔔 Notificações sobre propostas, vendas e repasses de consignação
- 🖥️ Painel web administrativo para lojas gerenciarem estoque, consignações e vendas

A lista completa de requisitos funcionais está no [PRD](#documentação).

## Stack Tecnológica

**Mobile**
- React Native + Expo
- Expo Router / React Navigation
- AsyncStorage (cache local) + SecureStore (tokens)
- `expo-camera`, `expo-location`, `expo-notifications`

**Backend**
- Node.js + Express, em padrão MVC
- Express-Handlebars (painel web das lojas)
- Autenticação via JWT + Refresh Token
- `dotenv` para variáveis de ambiente

**Dados**
- PostgreSQL + Sequelize — dados transacionais (`Usuario`, `Loja`, `Anuncio`, `Consignacao`, `Transacao`, `Avaliacao`)
- MongoDB + Mongoose — catálogo de cartas, histórico de preços e logs (`Carta`, `LogPreco`, `Comentario`), usado como cache da Scryfall com TTL de 7 dias

**Serviços externos**
- [Scryfall API](https://scryfall.com/docs/api) — dados oficiais de cartas
- Google Gemini (`gemini-1.5-flash`), via Google AI Studio — funcionalidade ManaScan

## Arquitetura

```
┌─────────────────┐        ┌─────────────────┐
│  App Mobile      │        │  Painel Web     │
│  React Native    │        │  Handlebars     │
│  + Expo          │        │  (Lojas)        │
└────────┬─────────┘        └────────┬────────┘
         │                           │
         │      HTTP/REST + JWT      │
         └────────────┬──────────────┘
                       │
               ┌───────▼────────┐
               │  API REST      │
               │  Node.js +     │
               │  Express + MVC │
               └───┬────────┬───┘
                    │        │
          ┌─────────▼──┐  ┌──▼─────────┐
          │ PostgreSQL │  │  MongoDB   │
          │ Sequelize  │  │  Mongoose  │
          └────────────┘  └────────────┘
                    │
          ┌─────────▼──────────────┐
          │  APIs Externas          │
          │  Scryfall + Gemini      │
          └─────────────────────────┘
```

As decisões de arquitetura (modelagem de dados, autenticação, IA generativa e organização do backend), com alternativas consideradas e consequências, estão documentadas em [`docs/decisoes_arquitetura.pdf`](#documentação).

## Estrutura do Projeto

```
manatrade/
├── mobile/                 # App React Native + Expo
│   ├── app/                 # Rotas (Expo Router)
│   ├── components/
│   ├── services/             # Consumo da API REST, Scryfall e Gemini
│   └── store/                 # AsyncStorage / SecureStore
├── backend/                 # API REST (Node.js + Express)
│   ├── config/
│   ├── controllers/
│   ├── models/               # Sequelize (PostgreSQL) e Mongoose (MongoDB)
│   ├── routers/
│   └── views/                 # Handlebars (painel das lojas)
└── docs/                     # Tema, PRD e decisões de arquitetura
```

> Ajustem esta estrutura conforme a organização real do repositório assim que o código for criado.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) / app **Expo Go** no celular
- [PostgreSQL](https://www.postgresql.org/) e [MongoDB](https://www.mongodb.com/) (local ou em nuvem, ex. Neon/Atlas)
- Uma chave de API do [Google AI Studio](https://aistudio.google.com/) (Gemini)

## Instalação e Configuração

```bash
# Clonar o repositório
git clone https://github.com/<usuario-ou-org>/manatrade.git
cd manatrade

# Instalar dependências do backend
cd backend
npm install

# Instalar dependências do app mobile
cd ../mobile
npm install
```

## Variáveis de Ambiente

Nenhuma chave de API é versionada no repositório. Crie um arquivo `.env` em `backend/` (e em `mobile/` se necessário) a partir do `.env.example`:

```bash
# backend/.env.example
DATABASE_URL=postgres://usuario:senha@localhost:5432/manatrade
MONGODB_URI=mongodb://localhost:27017/manatrade
JWT_SECRET=defina-um-segredo-forte
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
GEMINI_API_KEY=sua-chave-aqui
SCRYFALL_API_BASE=https://api.scryfall.com
```

## Como Executar

```bash
# Backend (API REST + painel web)
cd backend
npm run dev

# App mobile (em outro terminal)
cd mobile
npx expo start
```

Escaneie o QR Code exibido com o app **Expo Go** para rodar em um dispositivo real.

## Documentação

- [`docs/definicao_tema.pdf`](./docs/definicao_tema.pdf) — Definição do tema
- [`docs/prd.pdf`](./docs/prd.pdf) — PRD (problema, público-alvo, requisitos funcionais, escopo)
- [`docs/decisoes_arquitetura.pdf`](./docs/decisoes_arquitetura.pdf) — Decisões de arquitetura

## Equipe

- Gustavo Colet
- Jonathan Oliveira
- Nome do integrante 3

---

<!-- Preencham/ajustem nomes de integrantes, URL do repositório e a estrutura de pastas conforme o projeto avançar. -->
# ManaTrade

Aplicativo mobile para colecionadores e jogadores de **Magic: The Gathering** avaliarem, anunciarem e negociarem suas cartas físicas — e para lojas especializadas gerenciarem cartas recebidas em consignação.

O diferencial do app é o **ManaScan**: o usuário fotografa a carta e recebe, via IA generativa, uma sugestão de identificação (nome e edição), condição e preço justo, cruzando dados oficiais da API Scryfall com o histórico de preços do sistema.

> Status: 🚧 em desenvolvimento — Etapa 1 (tema, PRD e decisões de arquitetura definidos; protótipos em andamento).

---

## Sumário

- [Problema](#problema)
- [Funcionalidades](#funcionalidades)
- [Stack Tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Como Executar](#como-executar)
- [Documentação](#documentação)
- [Equipe](#equipe)

---

## Problema

Avaliar corretamente uma carta de Magic — identificar edição, condição de conservação e preço justo de mercado — é uma tarefa manual, trabalhosa e sujeita a erro. Além disso, não existe hoje um canal simples que conecte colecionadores a lojas parceiras para consignação, nem uma forma prática de acompanhar o status dessas consignações.

## Funcionalidades

- 🔐 Cadastro e autenticação de usuários, com sessão persistente e telas privadas protegidas
- 📸 **ManaScan** — identificação e precificação de cartas por foto, via IA generativa (Google Gemini)
- 🔎 Consulta a dados oficiais de cartas (nome, edição, raridade, imagem, preço médio) via API Scryfall
- 📋 CRUD completo de anúncios de cartas para venda
- 📍 Localização de lojas parceiras próximas via geolocalização
- 🔔 Notificações sobre propostas, vendas e repasses de consignação
- 🖥️ Painel web administrativo para lojas gerenciarem estoque, consignações e vendas

A lista completa de requisitos funcionais está no [PRD](#documentação).

## Stack Tecnológica

**Mobile**
- React Native + Expo
- Expo Router / React Navigation
- AsyncStorage (cache local) + SecureStore (tokens)
- `expo-camera`, `expo-location`, `expo-notifications`

**Backend**
- Node.js + Express, em padrão MVC
- Express-Handlebars (painel web das lojas)
- Autenticação via JWT + Refresh Token
- `dotenv` para variáveis de ambiente

**Dados**
- PostgreSQL + Sequelize — dados transacionais (`Usuario`, `Loja`, `Anuncio`, `Consignacao`, `Transacao`, `Avaliacao`)
- MongoDB + Mongoose — catálogo de cartas, histórico de preços e logs (`Carta`, `LogPreco`, `Comentario`), usado como cache da Scryfall com TTL de 7 dias

**Serviços externos**
- [Scryfall API](https://scryfall.com/docs/api) — dados oficiais de cartas
- Google Gemini (`gemini-1.5-flash`), via Google AI Studio — funcionalidade ManaScan

## Arquitetura

```
┌─────────────────┐        ┌─────────────────┐
│  App Mobile      │        │  Painel Web     │
│  React Native    │        │  Handlebars     │
│  + Expo          │        │  (Lojas)        │
└────────┬─────────┘        └────────┬────────┘
         │                           │
         │      HTTP/REST + JWT      │
         └────────────┬──────────────┘
                       │
               ┌───────▼────────┐
               │  API REST      │
               │  Node.js +     │
               │  Express + MVC │
               └───┬────────┬───┘
                    │        │
          ┌─────────▼──┐  ┌──▼─────────┐
          │ PostgreSQL │  │  MongoDB   │
          │ Sequelize  │  │  Mongoose  │
          └────────────┘  └────────────┘
                    │
          ┌─────────▼──────────────┐
          │  APIs Externas          │
          │  Scryfall + Gemini      │
          └─────────────────────────┘
```

As decisões de arquitetura (modelagem de dados, autenticação, IA generativa e organização do backend), com alternativas consideradas e consequências, estão documentadas em [`docs/decisoes_arquitetura.pdf`](#documentação).

## Estrutura do Projeto

```
manatrade/
├── mobile/                 # App React Native + Expo
│   ├── app/                 # Rotas (Expo Router)
│   ├── components/
│   ├── services/             # Consumo da API REST, Scryfall e Gemini
│   └── store/                 # AsyncStorage / SecureStore
├── backend/                 # API REST (Node.js + Express)
│   ├── config/
│   ├── controllers/
│   ├── models/               # Sequelize (PostgreSQL) e Mongoose (MongoDB)
│   ├── routers/
│   └── views/                 # Handlebars (painel das lojas)
└── docs/                     # Tema, PRD e decisões de arquitetura
```

> Ajustem esta estrutura conforme a organização real do repositório assim que o código for criado.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) / app **Expo Go** no celular
- [PostgreSQL](https://www.postgresql.org/) e [MongoDB](https://www.mongodb.com/) (local ou em nuvem, ex. Neon/Atlas)
- Uma chave de API do [Google AI Studio](https://aistudio.google.com/) (Gemini)

## Instalação e Configuração

```bash
# Clonar o repositório
git clone https://github.com/<usuario-ou-org>/manatrade.git
cd manatrade

# Instalar dependências do backend
cd backend
npm install

# Instalar dependências do app mobile
cd ../mobile
npm install
```

## Variáveis de Ambiente

Nenhuma chave de API é versionada no repositório. Crie um arquivo `.env` em `backend/` (e em `mobile/` se necessário) a partir do `.env.example`:

```bash
# backend/.env.example
DATABASE_URL=postgres://usuario:senha@localhost:5432/manatrade
MONGODB_URI=mongodb://localhost:27017/manatrade
JWT_SECRET=defina-um-segredo-forte
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
GEMINI_API_KEY=sua-chave-aqui
SCRYFALL_API_BASE=https://api.scryfall.com
```

## Como Executar

```bash
# Backend (API REST + painel web)
cd backend
npm run dev

# App mobile (em outro terminal)
cd mobile
npx expo start
```

Escaneie o QR Code exibido com o app **Expo Go** para rodar em um dispositivo real.

## Documentação

- [`docs/definicao_tema.pdf`](./docs/definicao_tema.pdf) — Definição do tema
- [`docs/prd.pdf`](./docs/prd.pdf) — PRD (problema, público-alvo, requisitos funcionais, escopo)
- [`docs/decisoes_arquitetura.pdf`](./docs/decisoes_arquitetura.pdf) — Decisões de arquitetura

## Equipe

- Gustavo Colet
- Jonathan Oliveira
- Nome do integrante 3

---

<!-- Preencham/ajustem nomes de integrantes, URL do repositório e a estrutura de pastas conforme o projeto avançar. -->
