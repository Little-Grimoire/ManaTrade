# Roteiro de testes manuais — Web 2

Siga na ordem: alguns passos dependem dos anteriores (ex.: a loja responde a consignação que o jogador enviou).
Cada item diz **o que fazer** → **o que deve acontecer**.

## 0. Preparação

- [ ] Faça uma cópia de `backend/data/manatrade.sqlite` se quiser guardar os dados atuais (`npm run db:seed` **apaga tudo**).
- [ ] `cd backend && npm install && npm run db:seed` (precisa de internet) → termina sem erro.
- [ ] `npm test` → `pass 54`, `fail 0`.
- [ ] `npm run dev` e abra `http://localhost:3001`.

Contas (senha `manatrade123`): `jogador@manatrade.dev`, `jogador2@manatrade.dev`, `loja@manatrade.dev`, `loja2@manatrade.dev` (pendente), `admin@manatrade.dev`.

Dica: use uma janela anônima para a segunda conta, assim dá para ficar com jogador e loja logados ao mesmo tempo.

## 1. Login, cadastro e sessão

- [ ] Abrir `/colecao` sem login → vai para `/login`.
- [ ] Login com senha errada → volta ao login com "E-mail ou senha incorretos".
- [ ] Login como jogador → painel com os números de coleção, decks, consignações e notificações.
- [ ] Clicar em **Sair** → volta ao login; `/` de novo pede login.
- [ ] `/cadastro` como **Jogador** → entra direto no painel do jogador.
- [ ] `/cadastro` como **Loja** → aparecem os campos da loja; ao criar, o painel avisa "aguarda aprovação".
- [ ] Cadastro com e-mail já usado → mensagem de e-mail já cadastrado.
- [ ] **Minha conta** (clicar no nome): mudar o nome → aparece no topo; trocar a senha com a senha atual errada → erro; com a certa → "Senha alterada" e o login novo funciona.

## 2. Jogador (`jogador@manatrade.dev`)

O menu deve mostrar: Coleção, Decks, Desejos, Lojas, Consignações, Suporte, Notificações.

**Coleção**
- [ ] Adicionar "lightnig bolt" (com erro de digitação) → encontra **Lightning Bolt** e adiciona.
- [ ] Adicionar a mesma carta, mesma condição → soma a quantidade em vez de criar outra linha.
- [ ] Mesma carta com condição **SP** → cria uma linha separada.
- [ ] Editar: quantidade 0 → erro; mudar para a condição de outra linha igual → erro "você já tem esta carta nessa condição".
- [ ] Editar: desmarcar foil e salvar → foil volta para "Não".
- [ ] A tela de edição mostra em quais decks a carta está.
- [ ] Remover → pede confirmação e some da lista.

**Lista de desejos**
- [ ] Adicionar "Sol Ring" com prioridade alta → aparece com o selo vermelho.
- [ ] Adicionar de novo a mesma carta → erro "já está na sua lista".
- [ ] Editar o preço máximo e remover.

**Decks**
- [ ] Criar deck Commander com um comandante (ex.: "Atraxa, Praetors' Voice") → abre o deck com o comandante.
- [ ] Adicionar cartas → aparecem agrupadas por tipo, com a coluna "Na coleção".
- [ ] Mudar a quantidade de uma carta para 2 em Commander → aparece o aviso de limite de cópias.
- [ ] Importar a lista `4 Lightning Bolt` + `1 Carta Inventada` → importa o Bolt e avisa que a outra não foi encontrada.
- [ ] Editar o deck: trocar o formato para Pauper → o comandante some.
- [ ] Excluir o deck → volta para a lista.

**Lojas e consignação**
- [ ] **Lojas** lista só a *Loja Demo Centro*; a *Loja Demo Bairro* (pendente) não aparece.
- [ ] Abrir a Loja Demo Centro → mostra o acervo e o formulário "Consignar uma carta".
- [ ] Consignar 1 carta da coleção por R$ 10 → abre a consignação com status **Pendente**.
- [ ] Tentar consignar uma quantidade maior do que a da coleção → erro.
- [ ] Na consignação pendente: mudar o preço → salva. **Anote o número (#)** para usar no passo 3.
- [ ] Criar uma segunda consignação e clicar **Cancelar** → status **Cancelada**; aparece o botão de excluir.

**Suporte e notificações**
- [ ] Abrir um chamado → aparece em Suporte como **Aberto**; dá para editar o texto.
- [ ] **Notificações**: marcar uma como lida/não lida; "Marcar todas como lidas"; excluir uma.

## 3. Loja (`loja@manatrade.dev`)

O menu deve mostrar: Minha loja, Acervo, Consignações recebidas, Suporte, Notificações.

- [ ] Notificações → existe "Nova consignação recebida" (da consignação do passo 2).
- [ ] **Minha loja** → abre a página da loja com o formulário de edição; mudar o horário → salva.
- [ ] **Acervo**: adicionar uma carta com preço R$ 5 → aparece como "Estoque próprio"; editar o preço; preço negativo → erro; remover.

**Fluxo da consignação** (abra a consignação anotada no passo 2)
- [ ] O seletor oferece só **Aceita / Recusada** → escolha **Aceita** com uma mensagem.
- [ ] Agora oferece **À venda / Devolvida** → escolha **À venda** com preço de venda R$ 12.
- [ ] **Acervo** → a carta aparece com origem "Consignação #N" e preço R$ 12.
- [ ] Volte e marque como **Vendida** → a carta sai do acervo e as datas de resposta e encerramento ficam preenchidas.
- [ ] Como **jogador**: a quantidade dessa carta na coleção diminuiu; há notificações de cada mudança de status; a consignação não pode mais ser editada.

**Loja pendente** (`loja2@manatrade.dev`)
- [ ] O painel avisa que aguarda aprovação.
- [ ] Abrir `/acervo` → erro 403 ("aguarda aprovação do administrador").

## 4. Admin (`admin@manatrade.dev`)

O menu deve mostrar: Usuários, Lojas, Cartas, Consignações, Suporte, Notificações.

**Lojas**
- [ ] Filtro "Aguardando aprovação" → mostra a Loja Demo Bairro → **Aprovar**.
- [ ] Como `loja2`: o painel não mostra mais o aviso e o `/acervo` abre.
- [ ] Como jogador: a Loja Demo Bairro agora aparece em Lojas.
- [ ] **Suspender** a loja de novo → ela some para o jogador.
- [ ] Criar um usuário com perfil Loja (em Usuários) e cadastrar a loja dele pelo formulário no fim de **Lojas**.

**Usuários**
- [ ] Filtrar por perfil e buscar por nome.
- [ ] Criar um usuário; editar; trocar a senha; excluir.
- [ ] Bloquear o `jogador2` (desmarcar "Conta ativa") → login dele dá "Conta bloqueada". Se ele já estiver logado em outra janela, a próxima página também bloqueia. Reative depois.
- [ ] Na própria conta: tentar desmarcar "ativo" ou mudar o perfil → erro; não há botão de excluir a si mesmo.
- [ ] Mudar o perfil de `loja@...` para Jogador → erro "exclua a loja antes".

**Cartas**
- [ ] Buscar "bolt"; abrir a carta; corrigir o preço → salva.
- [ ] **Atualizar com o Scryfall** → preço/imagem voltam aos do Scryfall.
- [ ] Excluir uma carta que está na coleção de alguém → erro (registro em uso).
- [ ] Importar uma carta nova pelo nome, depois excluí-la → funciona (não está em uso).

**Chamados, consignações e avisos**
- [ ] Suporte → abrir o chamado do jogador → responder e marcar **Resolvido**.
- [ ] Como jogador: chegou a notificação; o chamado mostra a resposta e não pode mais ser editado.
- [ ] Consignações → vê todas; não há formulário de status; consegue excluir.
- [ ] Notificações → enviar aviso para o jogador → aparece para ele como tipo "sistema".

## 5. Tentar burlar as permissões (digitar a URL na mão)

| Logado como | Abrir | Esperado |
|---|---|---|
| jogador | `/usuarios`, `/acervo` | Erro 403 |
| loja | `/colecao`, `/decks` | Erro 403 |
| admin | `/colecao`, `/decks/1` | Erro 403 |
| jogador2 | `/colecao/1`, `/decks/1`, `/consignacoes/1` (do jogador 1) | Erro 404 |
| loja2 | `/consignacoes/1` (de outra loja) | Erro 404 |
| jogador | `/lojas/2` com a loja pendente | Erro 404 |

## 6. API REST pelo Swagger (`http://localhost:3001/api/docs`)

- [ ] A página lista as rotas por grupo, com os perfis permitidos e os códigos de retorno.
- [ ] `POST /api/auth/login` (Try it out) com o jogador → 200 com `token`.
- [ ] Clicar **Authorize** e colar o token.
- [ ] `GET /api/colecao` → 200 com a lista.
- [ ] `POST /api/colecao` com `{"nome": "Sol Ring"}` → 201 (ou 200 se já tiver o mesmo item).
- [ ] `PATCH /api/colecao/{id}` com `{"quantidade": 0}` → 400 com `erro` e `detalhes`.
- [ ] `GET /api/usuarios` → 403 (jogador não é admin).
- [ ] `GET /api/colecao/{id}` com o id de um item do jogador2 → 404.
- [ ] Clicar **Logout** no Authorize e chamar `GET /api/colecao` → 401.
- [ ] Repetir com o token do admin: `GET /api/usuarios` → 200; `DELETE /api/cartas/{id}` de carta em uso → 409.
- [ ] `GET /api/nao-existe` → 404 em JSON.

## 7. App mobile (Expo)

- [ ] Login como **jogador** no navegador e no **Expo Go (Android)** → coleção, decks, desejos e ManaScan funcionam como antes.
- [ ] Login como **loja** → a aba Biblioteca dá erro 403. É esperado, mas está pendente esconder essa aba para loja e admin.
