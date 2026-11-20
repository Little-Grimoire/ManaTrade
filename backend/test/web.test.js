// Testes das páginas web (MVC): login por cookie, permissões por perfil, formulários com _method
// e renderização de todas as views. Sem internet (as cartas já estão no banco).
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const {
  sequelize, Usuario, Loja, Carta, ItemColecao, Deck, DeckCarta, Desejo, ItemAcervo, Consignacao, Chamado, Notificacao,
} = require('../src/models');

let servidor; let base;
const cookies = {};
const ids = {};

// Envia formulário (urlencoded) ou GET; devolve status, location, html e o cookie de sessão.
async function pagina(caminho, { cookie, form, method } = {}) {
  const r = await fetch(`${base}${caminho}`, {
    method: method || (form ? 'POST' : 'GET'),
    redirect: 'manual',
    headers: {
      ...(cookie && { Cookie: cookie }),
      ...(form && { 'Content-Type': 'application/x-www-form-urlencoded' }),
    },
    body: form && new URLSearchParams(form).toString(),
  });
  const setCookie = r.headers.getSetCookie?.() || [];
  const sessao = setCookie.find((c) => c.startsWith('manatrade_token=') && !c.startsWith('manatrade_token=;'));
  const flash = setCookie.find((c) => c.startsWith('flash=') && !c.startsWith('flash=;'));
  return {
    status: r.status,
    location: r.headers.get('location'),
    html: await r.text(),
    sessao: sessao?.split(';')[0],
    flash: flash && decodeURIComponent(flash.split(';')[0].slice(6)),
  };
}

async function entrar(email) {
  const r = await pagina('/login', { form: { email, senha: 'segredo1' } });
  assert.equal(r.status, 302);
  assert.ok(r.sessao, `login de ${email} deve gravar o cookie`);
  return r.sessao;
}

before(async () => {
  await sequelize.sync({ force: true });
  const criar = (nome, perfil) => Usuario.create({ nome, email: `${nome.toLowerCase()}@web.dev`, senha: 'segredo1', perfil });
  const admin = await criar('Admin', 'admin');
  const ana = await criar('Ana', 'usuario');
  const lojista = await criar('Lojista', 'loja');
  const loja = await Loja.create({ usuario_id: lojista.id, nome: 'Loja Web', endereco: 'Rua 1', aprovada: true });
  const bolt = await Carta.create({ scryfall_id: crypto.randomUUID(), nome: 'Lightning Bolt', tipo: 'Instant', cmc: 1, imagem_url: 'https://img/bolt.jpg' });
  const item = await ItemColecao.create({ usuario_id: ana.id, carta_id: bolt.id, quantidade: 2 });
  const deck = await Deck.create({ usuario_id: ana.id, nome: 'Burn', formato: 'casual' });
  await DeckCarta.create({ deck_id: deck.id, carta_id: bolt.id, quantidade: 4 });
  const desejo = await Desejo.create({ usuario_id: ana.id, carta_id: bolt.id });
  const acervo = await ItemAcervo.create({ loja_id: loja.id, carta_id: bolt.id, preco: 5 });
  const consignacao = await Consignacao.create({ usuario_id: ana.id, loja_id: loja.id, carta_id: bolt.id, item_colecao_id: item.id, preco_pedido: 10 });
  const chamado = await Chamado.create({ usuario_id: ana.id, assunto: 'Dúvida', mensagem: 'Como consigno?' });
  Object.assign(ids, {
    admin: admin.id, ana: ana.id, loja: loja.id, bolt: bolt.id, item: item.id, deck: deck.id, desejo: desejo.id,
    acervo: acervo.id, consignacao: consignacao.id, chamado: chamado.id,
  });

  servidor = app.listen(0);
  base = `http://127.0.0.1:${servidor.address().port}`;
  cookies.admin = await entrar('admin@web.dev');
  cookies.ana = await entrar('ana@web.dev');
  cookies.loja = await entrar('lojista@web.dev');
});

after(async () => {
  servidor.close();
  await sequelize.close();
});

test('sem login, as páginas mandam para /login; login errado volta com mensagem', async () => {
  const r = await pagina('/colecao');
  assert.equal(r.status, 302);
  assert.equal(r.location, '/login');
  assert.equal((await pagina('/login')).status, 200);
  assert.equal((await pagina('/cadastro')).status, 200);

  const errado = await pagina('/login', { form: { email: 'ana@web.dev', senha: 'errada' } });
  assert.equal(errado.location, '/login');
  assert.match(errado.flash, /incorretos/);
});

test('cada perfil abre as próprias páginas', async () => {
  const paginas = {
    ana: ['/', '/conta', '/colecao', `/colecao/${ids.item}`, '/desejos', `/desejos/${ids.desejo}`, '/decks', `/decks/${ids.deck}`,
      '/lojas', `/lojas/${ids.loja}`, '/consignacoes', `/consignacoes/${ids.consignacao}`, '/chamados', `/chamados/${ids.chamado}`,
      '/notificacoes', '/cartas', `/cartas/${ids.bolt}`],
    loja: ['/', '/acervo', `/acervo/${ids.acervo}`, `/lojas/${ids.loja}`, '/consignacoes', `/consignacoes/${ids.consignacao}`, '/chamados', '/notificacoes'],
    admin: ['/', '/usuarios', `/usuarios/${ids.ana}`, '/lojas', '/lojas?aprovada=false', `/lojas/${ids.loja}`, '/cartas', `/cartas/${ids.bolt}`,
      '/consignacoes', `/consignacoes/${ids.consignacao}`, '/chamados', `/chamados/${ids.chamado}`, '/notificacoes'],
  };
  for (const [quem, lista] of Object.entries(paginas)) {
    for (const caminho of lista) {
      const r = await pagina(caminho, { cookie: cookies[quem] });
      assert.equal(r.status, 200, `${quem} ${caminho} → ${r.status} ${r.html.slice(0, 300)}`);
    }
  }
  assert.equal((await pagina('/minha-loja', { cookie: cookies.loja })).location, `/lojas/${ids.loja}`);
});

test('perfil errado recebe 403; registro de outra pessoa, 404', async () => {
  assert.equal((await pagina('/usuarios', { cookie: cookies.ana })).status, 403);
  assert.equal((await pagina('/acervo', { cookie: cookies.ana })).status, 403);
  assert.equal((await pagina('/colecao', { cookie: cookies.loja })).status, 403);
  assert.equal((await pagina('/decks', { cookie: cookies.admin })).status, 403);
  assert.equal((await pagina(`/colecao/${ids.item}`, { cookie: cookies.loja })).status, 403);
  // Admin entra em /usuarios, mas não na coleção da Ana (rota de jogador).
  assert.equal((await pagina(`/decks/${ids.deck}`, { cookie: cookies.admin })).status, 403);

  const bia = await Usuario.create({ nome: 'Bia', email: 'bia@web.dev', senha: 'segredo1' });
  const cookieBia = await entrar(bia.email);
  assert.equal((await pagina(`/colecao/${ids.item}`, { cookie: cookieBia })).status, 404);
  assert.equal((await pagina(`/consignacoes/${ids.consignacao}`, { cookie: cookieBia })).status, 404);
});

test('formulários: criar, editar (_method=PATCH) e excluir (_method=DELETE)', async () => {
  const novo = await pagina('/decks', { cookie: cookies.ana, form: { nome: 'Teste Web', formato: 'pauper' } });
  assert.equal(novo.status, 302);
  const deckId = Number(novo.location.split('/').pop());

  const editado = await pagina(`/decks/${deckId}`, { cookie: cookies.ana, form: { _method: 'PATCH', nome: 'Renomeado', formato: 'pauper', comandante: '', comandante_atual: '' } });
  assert.equal(editado.location, `/decks/${deckId}`);
  assert.equal((await Deck.findByPk(deckId)).nome, 'Renomeado');

  const qtd = await pagina(`/decks/${ids.deck}/cartas/${ids.bolt}`, { cookie: cookies.ana, form: { _method: 'PATCH', quantidade: '3' } });
  assert.equal(qtd.status, 302);
  assert.equal((await DeckCarta.findOne({ where: { deck_id: ids.deck } })).quantidade, 3);

  const excluido = await pagina(`/decks/${deckId}`, { cookie: cookies.ana, form: { _method: 'DELETE' } });
  assert.equal(excluido.location, '/decks');
  assert.equal(await Deck.findByPk(deckId), null);

  // Edição da coleção com checkbox desmarcado (foil ausente = false).
  await ItemColecao.update({ foil: true }, { where: { id: ids.item } });
  await pagina(`/colecao/${ids.item}`, { cookie: cookies.ana, form: { _method: 'PATCH', quantidade: '5', condicao: 'SP' } });
  const item = await ItemColecao.findByPk(ids.item);
  assert.equal(item.quantidade, 5);
  assert.equal(item.foil, false);
});

test('erro de validação no formulário volta para a página com a mensagem', async () => {
  const r = await pagina('/acervo', {
    cookie: cookies.loja,
    form: { carta_id: String(ids.bolt), preco: '-3' },
  });
  // O form de acervo usa "nome", mas carta_id também é aceito pelo service.
  assert.equal(r.status, 302);
  assert.match(r.flash, /negativo/);
});

test('fluxo pelas páginas: loja aceita a consignação, admin responde chamado e aprova loja', async () => {
  const aceitar = await pagina(`/consignacoes/${ids.consignacao}`, { cookie: cookies.loja, form: { _method: 'PATCH', status: 'aceita', resposta_loja: 'Ok' } });
  assert.equal(aceitar.location, `/consignacoes/${ids.consignacao}`);
  assert.equal((await Consignacao.findByPk(ids.consignacao)).status, 'aceita');

  await pagina(`/chamados/${ids.chamado}`, { cookie: cookies.admin, form: { _method: 'PATCH', status: 'resolvido', resposta: 'Pela página da loja.' } });
  assert.equal((await Chamado.findByPk(ids.chamado)).atendente_id, ids.admin);
  assert.ok(await Notificacao.findOne({ where: { usuario_id: ids.ana, tipo: 'chamado' } }));

  await pagina(`/lojas/${ids.loja}/aprovacao`, { cookie: cookies.admin, form: { _method: 'PATCH', aprovada: 'false' } });
  assert.equal((await Loja.findByPk(ids.loja)).aprovada, false);
  assert.equal((await pagina('/acervo', { cookie: cookies.loja })).status, 403, 'loja suspensa perde o acervo');
});

test('cadastro de loja pela página cria usuário e loja pendente; sair limpa o cookie', async () => {
  const r = await pagina('/cadastro', {
    form: { nome: 'Nova', email: 'nova@web.dev', senha: 'segredo1', perfil: 'loja', loja_nome: 'Nova Loja', loja_endereco: 'Rua 9' },
  });
  assert.equal(r.status, 302);
  assert.ok(r.sessao);
  const loja = await Loja.findOne({ where: { nome: 'Nova Loja' } });
  assert.equal(loja.aprovada, false);

  const painel = await pagina('/', { cookie: r.sessao });
  assert.match(painel.html, /aguarda aprovação/);

  const sair = await pagina('/sair', { cookie: r.sessao, form: {} });
  assert.equal(sair.location, '/login');
});
