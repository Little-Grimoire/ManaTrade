# Diário de bordo de uso de IA — ManaTrade

A disciplina é AI-first: usamos ferramentas de IA da concepção ao código. Este diário registra, para cada uso relevante, **o que foi pedido, o que veio, o que aceitamos, o que recusamos e por quê**. O grupo é responsável por tudo o que foi entregue, inclusive pelo que a IA gerou.

**Como ler:** uma entrada por pedido ou sessão relevante, em ordem cronológica. As entradas marcadas com *(preencher)* ainda precisam ser completadas pela equipe com o histórico das conversas.

**Ferramentas usadas no semestre**

| Ferramenta | Uso principal |
|---|---|
| Claude Code (Claude Opus 5.5) | código do app, do backend e do ML; revisão de documentação; auditoria contra os requisitos. Commits com `Co-Authored-By: Claude` no histórico |
| *(preencher: ferramenta de protótipo, ex.: Google Stitch / v0)* | protótipos das telas (Etapa 1) |
| *(preencher: outras, ex.: ChatGPT/Gemini para pesquisa)* | |

---

## Etapa 1 — Tema, PRD e protótipos (até 28/09)

### 1.1 Definição do tema e PRD *(preencher)*
- **Pedido:** *(o que foi perguntado à IA para definir problema, público e requisitos)*
- **Veio:** *(sugestões de tema e de requisitos)*
- **Aceito:** *(o que entrou em `definicao_tema.md` e `prd.md`)*
- **Recusado e por quê:** *(ex.: requisitos cortados por escopo)*
- **Registro no Git:** o README inicial (27/09) previa o ManaScan com Google Gemini via AI Studio, para identificar e precificar cartas por foto. A integração nunca chegou a ser configurada (ver 3.1 e 3.2).

### 1.2 Protótipos das telas *(preencher)*
- **Pedido:** *(prompt usado na ferramenta de protótipo)*
- **Veio:** *(telas geradas)*
- **Aceito / recusado:** *(o que mudou no Figma ou à mão e por quê)*

---

## Etapa 2 — Codificação das telas (até 30/10)

### 2.1 Interface do app com dados falsos (24/10, commit `e3565f1`)
- **Pedido:** gerar a interface Expo Router a partir dos protótipos, com navegação e persistência local. *(confirmar a ferramenta e o prompt)*
- **Veio:** app responsivo com abas, login/cadastro, telas de carta, loja, anúncios, propostas, consignações, eventos e configurações, tudo alimentado por um arquivo de dados falsos com **vários TCGs** (não só Magic).
- **Aceito:** a estrutura de navegação, os componentes reutilizáveis (`Cabecalho`, `ListaItem`, estados de carregamento/vazio/erro) e o tema visual.
- **Recusado depois:** o suporte a vários jogos (DA06: o classificador e o Scryfall são específicos de Magic) e as telas de anúncios, propostas e comunidade, que não estavam no PRD (removidas em 26/11, ver 3.5).

### 2.2 Atualização de pacotes e do SDK Expo (28/10) *(preencher se houve uso de IA)*

---

## Etapa 3 — Aplicativo final (até 30/11)

### 3.1 Classificador do TP, API de ML e ManaScan (10–11/11, commit `9e0a4f5`)
- **Pedido:** montar o notebook do TP (EDA, pares carta × deck, modelos clássicos e MLP com validação cruzada agrupada), exportar o melhor modelo, servi-lo numa API e ligar o ManaScan.
- **Veio:** notebook reprodutível, pacote `ml/manatrade_ml` com as features, `backend-ml/` em FastAPI com `/evaluate` e `/cards/match`, e a tela de avaliação no deck. A IA também gerou um `/scan` que leria a foto chamando o Gemini, seguindo o plano inicial do README, mas que só funcionaria com uma `GEMINI_API_KEY`.
- **Aceito:** notebook, features, API e regra de decisão com margem δ (DA04, DA05).
- **Recusado:** o `/scan` com Gemini. Nunca criamos projeto nem chave no Google AI Studio, então esse código nunca rodou; foi removido no dia seguinte (3.2).

### 3.2 Remoção do código do Gemini (11/11, commit `fe041c5`)
- **Pedido:** tirar do app e da documentação a dependência de LLM que constava desde o plano inicial.
- **Veio:** remoção do código do Gemini no `/scan`, no app e das menções no README.
- **Por quê:** a integração nunca foi configurada (sem projeto nem chave) e combinamos com o professor que a funcionalidade de IA do app é o classificador do TP. A leitura da carta passou a ser OCR sem chave (DA03).

### 3.3 Documentação em Markdown (11/11, commits `2039004` e `8368f4a`)
- **Pedido:** converter os documentos antigos (PDF) para Markdown e organizar a pasta `docs/`.
- **Veio:** tema, PRD, modelagem proposta e decisões DA01–DA06 em Markdown, índice de documentos e lista de pendências.
- **Aceito:** a estrutura.
- **Recusado:** a modelagem antiga com persistência poliglota (PostgreSQL + MongoDB) ficou registrada só como alternativa descartada na DA01: dois bancos traziam complexidade sem ganho.
- **Revisado pela equipe:** *(preencher: o que foi reescrito à mão no commit "Redocumentation", 12/11)*

### 3.4 Backend da Web 2 e app ligado à API (12/11 a 24/11) *(completar)*
- **Pedido:** *(preencher: como foi pedido o backend — banco, JWT, perfis, MVC com EJS, API REST)*
- **Veio:** 11 tabelas com relacionamentos N:N e 1:N, autenticação JWT, middlewares `autenticar`/`autorizar`/`carregar`, páginas EJS, API REST com OpenAPI e testes; coleção, decks e desejos do app passaram a usar a API.
- **Aceito / recusado:** *(preencher: o que foi ajustado — ex.: correções na API do Scryfall em 12/11, script `npm run dev` que descobre o IP em 23/11)*

### 3.5 Auditoria contra os requisitos da Etapa 3 (26/11)
- **Pedido:** comparar o projeto com o enunciado da Etapa 3 e deixar código e documentação coerentes.
- **Veio:** lista de lacunas: telas ainda com dados falsos, localização fingida (um `useState`, sem GPS), `expo-notifications` instalado mas nunca usado, persistência local limitada ao token, README desatualizado (dizia que o OCR não rodava no celular), DA03 descrevendo Tesseract no Node quando o código usa RapidOCR no `backend-ml`, e falta de diário de IA e de tutorial.
- **Recusado:** a sugestão de adicionar uma funcionalidade com LLM (Gemini) para estruturar listas de deck coladas. Mantivemos o classificador, já combinado com o professor (3.2).
- **Aceito:**
  - Lojas, loja/acervo, consignações e notificações passaram a usar a API real. A localização virou real (`expo-location`), com tratamento de permissão negada.
  - Removidas as telas fora do PRD (anúncios, propostas, comunidade, detalhe de carta), os dados falsos e o `expo-notifications`.

### 3.6 Persistência local (26/11)
- **Pedido:** uma persistência local concreta, mantendo o banco remoto do backend da Web 2.
- **Veio:** três opções: (a) só o token (situação atual); (b) banco local completo com `expo-sqlite`, com sincronização e fila de escritas offline; (c) cópia das respostas da API em AsyncStorage, por usuário.
- **Aceito:** (c), registrada na DA07. O app abre e consulta offline com a faixa "Sem conexão"; as escritas continuam só no servidor.
- **Recusado:** (b). Duplicaria no aparelho as regras de permissão e de status que estão no backend e exigiria resolver conflitos de sincronização, sem ganho que compensasse no prazo.
- **Verificação:** fluxo completo testado contra a API num banco temporário (consignar → aceitar → à venda → vendida → notificação). *(preencher: teste no Expo Go — mapa, permissões e modo offline)*

### 3.7 README e decisões de arquitetura (26/11)
- **Pedido:** corrigir o README e criar este diário.
- **Veio:** README reescrito para rodar a partir de um clone limpo, com tabela "requisito → onde está"; DA03 corrigida (OCR com RapidOCR no `backend-ml`, Gemini como alternativa descartada); DA02 deixou de ser "proposta".
- **Recusado:**
  - Na primeira versão da DA03, a IA justificou a escolha dizendo que "o RapidOCR leu melhor o título das cartas que o Tesseract". **Não havia medição que sustentasse isso**, então a frase saiu; a justificativa ficou só com o que é verificável (o catálogo de nomes e o Python já estavam no serviço de ML).
  - Na primeira versão deste diário e da DA03, a IA escreveu que o Gemini "chegou a ser implementado" e foi removido por "ter custo". A equipe corrigiu: nunca houve projeto nem chave, o código nunca rodou, e o custo não foi o motivo. O texto foi reescrito conforme o histórico do Git (3.1, 3.2).

---

## Lições do semestre *(preencher pela equipe)*
- *(ex.: a IA gera telas rápido, mas com dados falsos que parecem reais; conferir contra o PRD a cada entrega)*
- *(ex.: justificativas escritas pela IA precisam de evidência antes de ir para a documentação)*
- *(ex.: o que funcionou melhor como forma de pedir: dar o enunciado e o código atual juntos)*
