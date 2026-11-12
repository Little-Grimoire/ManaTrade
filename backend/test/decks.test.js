// Testes de /api/decks e do CRUD de /api/colecao. O Scryfall é simulado: não precisa de internet.
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { sequelize, Usuario, Carta, DeckCarta } = require('../src/models');
const { gerarToken } = require('../src/services/token');

// "Banco" falso do Scryfall.
let seq = 0;
const scry = (name, typeLine, cores, extra = {}) => {
  seq += 1;
  const n = String(seq).padStart(12, '0');
  return {
    id: `00000000-0000-4000-8000-${n}`, oracle_id: `10000000-0000-4000-8000-${n}`, name, type_line: typeLine,
    color_identity: cores, cmc: extra.cmc ?? 2, set: 'tst', set_name: 'Teste', prices: { usd: '1.00' },
    legalities: { commander: 'legal', pauper: 'legal', ...extra.legalities }, image_uris: { normal: `https://img/${seq}.jpg` },
  };
};
const CARTAS = [
  scry('Lathril, Blade of the Elves', 'Legendary Creature — Elf Noble', ['B', 'G'], { cmc: 4 }),
  scry('Sol Ring', 'Artifact', [], { cmc: 1, legalities: { pauper: 'not_legal' } }),
  scry('Lightning Bolt', 'Instant', ['R'], { cmc: 1 }),
  scry('Forest', 'Basic Land — Forest', ['G'], { cmc: 0 }),
  scry('Llanowar Elves', 'Creature — Elf Druid', ['G'], { cmc: 1 }),
];
const porNome = (n) => CARTAS.find((c) => c.name.toLowerCase() === n.toLowerCase());

const fetchReal = global.fetch;
global.fetch = async (url, opcoes = {}) => {
  const u = String(url);
  if (!u.startsWith('https://api.scryfall.com')) return fetchReal(url, opcoes);
  const json = (corpo, status = 200) => new Response(JSON.stringify(corpo), { status });
  if (u.includes('/cards/named')) {
    const q = decodeURIComponent(u.split('fuzzy=')[1]).toLowerCase();
    const c = CARTAS.find((x) => x.name.toLowerCase().startsWith(q.slice(0, 5)));
    return c ? json(c) : json({ object: 'error' }, 404);
  }
  if (u.endsWith('/cards/collection')) {
    const { identifiers } = JSON.parse(opcoes.body);
    const data = []; const naoAchou = [];
    for (const id of identifiers) {
      const c = id.name ? porNome(id.name) : CARTAS.find((x) => x.id === id.id);
      if (c) data.push(c); else naoAchou.push(id);
    }
    return json({ data, not_found: naoAchou });
  }
  return json({ object: 'error' }, 404);
};

let servidor; let base; let tokenAna; let tokenBia;

async function api(caminho, { method = 'GET', body, token = tokenAna } = {}) {
  const r = await fetch(`${base}/api${caminho}`, {
    method,
    headers: { ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const texto = await r.text();
  return { status: r.status, corpo: texto ? JSON.parse(texto) : null };
}

before(async () => {
  await sequelize.sync({ force: true });
  const ana = await Usuario.create({ nome: 'Ana', email: 'ana@teste.dev', senha: 'segredo1' });
  const bia = await Usuario.create({ nome: 'Bia', email: 'bia@teste.dev', senha: 'segredo1' });
  [tokenAna, tokenBia] = [ana, bia].map(gerarToken);
  servidor = app.listen(0);
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  global.fetch = fetchReal;
  servidor.close();
  await sequelize.close();
});

test('formatos disponíveis', async () => {
  const r = await api('/decks/formatos');
  assert.equal(r.status, 200);
  assert.ok(r.corpo.find((f) => f.chave === 'commander' && f.comandante && f.minimo === 100));
  assert.ok(r.corpo.find((f) => f.chave === 'pauper' && f.copias === 4));
});

test('coleção: CRUD, soma itens iguais e evita duplicar ao editar', async () => {
  let r = await api('/colecao', { method: 'POST', body: { nome: 'Lightning Bolt', quantidade: 2, condicao: 'SP' } });
  assert.equal(r.status, 201);
  const id = r.corpo.id;
  r = await api('/colecao', { method: 'POST', body: { nome: 'Lightning Bolt', quantidade: 3, condicao: 'SP' } });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.quantidade, 5, 'mesma carta e condição: soma');
  r = await api('/colecao', { method: 'POST', body: { nome: 'Lightning Bolt', condicao: 'NM', foil: true } });
  assert.equal(r.status, 201);
  const foilId = r.corpo.id;

  assert.equal((await api('/colecao', { method: 'POST', body: { nome: 'Bolt', quantidade: 0 } })).status, 400);
  assert.equal((await api(`/colecao/${id}`, { method: 'PATCH', body: { condicao: 'NM', foil: true } })).status, 409);
  r = await api(`/colecao/${id}`, { method: 'PATCH', body: { quantidade: 4, observacao: 'Pasta 2' } });
  assert.equal(r.corpo.quantidade, 4);
  assert.equal((await api(`/colecao/${id}`, { token: tokenBia })).status, 404);
  assert.equal((await api(`/colecao/${foilId}`, { method: 'DELETE' })).status, 204);
  assert.equal((await api('/colecao')).corpo.length, 1);
});

let deckId;

test('criar deck commander com comandante por nome', async () => {
  const r = await api('/decks', { method: 'POST', body: { nome: 'Elfos', formato: 'commander', comandante: 'Lathril' } });
  assert.equal(r.status, 201);
  deckId = r.corpo.id;
  assert.equal(r.corpo.comandante.nome, 'Lathril, Blade of the Elves');
  assert.equal(r.corpo.validacao.total, 1);
  assert.ok(r.corpo.validacao.problemas.includes('Faltam 99 cartas (1/100).'));
  assert.equal((await api('/decks', { method: 'POST', body: { nome: 'X', formato: 'tiny' } })).status, 400);
});

test('adicionar, alterar e remover cartas do deck, com validação por carta', async () => {
  let r = await api(`/decks/${deckId}/cartas`, { method: 'POST', body: { nome: 'Sol Ring' } });
  assert.equal(r.status, 201);
  r = await api(`/decks/${deckId}/cartas`, { method: 'POST', body: { nome: 'Sol Ring' } });
  const sol = r.corpo.cartas.find((c) => c.carta.nome === 'Sol Ring');
  assert.equal(sol.quantidade, 2, 'adicionar de novo soma');
  assert.deepEqual(sol.problemas, ['Só pode ter 1 cópia']);

  r = await api(`/decks/${deckId}/cartas`, { method: 'POST', body: { nome: 'Lightning Bolt' } });
  const bolt = r.corpo.cartas.find((c) => c.carta.nome === 'Lightning Bolt');
  assert.deepEqual(bolt.problemas, ['Fora da identidade de cor do comandante']);
  assert.equal(bolt.naColecao, 4, 'mostra quantas a Ana tem na coleção');

  r = await api(`/decks/${deckId}/cartas/${sol.carta.id}`, { method: 'PATCH', body: { quantidade: 1 } });
  assert.deepEqual(r.corpo.cartas.find((c) => c.carta.nome === 'Sol Ring').problemas, []);
  r = await api(`/decks/${deckId}/cartas/${bolt.carta.id}`, { method: 'DELETE' });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.cartas.length, 1);
  assert.equal((await api(`/decks/${deckId}/cartas/${bolt.carta.id}`, { method: 'DELETE' })).status, 404);
  assert.equal((await api(`/decks/${deckId}/cartas`, { method: 'POST', body: { nome: 'Sol Ring', quantidade: -3 } })).status, 400);
});

test('importar lista: comandante, soma, substituir e nomes não encontrados', async () => {
  let r = await api(`/decks/${deckId}/importar`, {
    method: 'POST',
    body: { lista: 'Commander\n1 Lathril, Blade of the Elves\n\nDeck\n1 Llanowar Elves (M19) 314\n97 Forest\n1 Carta Inventada' },
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.corpo.naoEncontradas, ['Carta Inventada']);
  assert.equal(r.corpo.deck.validacao.total, 100); // comandante + Sol Ring + Llanowar + 97 Forest
  assert.equal(r.corpo.deck.validacao.valido, true);
  assert.deepEqual(r.corpo.deck.estatisticas.porTipo, { Artefatos: 1, Criaturas: 1, Terrenos: 97 });
  assert.equal(r.corpo.deck.estatisticas.curva[1], 2);

  r = await api(`/decks/${deckId}/importar`, { method: 'POST', body: { lista: '10 Forest', substituir: true } });
  assert.equal(r.corpo.deck.cartas.length, 1);
  assert.equal(r.corpo.deck.validacao.total, 11);
  assert.equal((await api(`/decks/${deckId}/importar`, { method: 'POST', body: { lista: '' } })).status, 400);
});

test('trocar formato: pauper remove o comandante e valida legalidade', async () => {
  await api(`/decks/${deckId}/cartas`, { method: 'POST', body: { nome: 'Sol Ring' } });
  const r = await api(`/decks/${deckId}`, { method: 'PATCH', body: { formato: 'pauper', nome: 'Elfos Pauper' } });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.formatoNome, 'Pauper');
  assert.equal(r.corpo.comandante, null);
  assert.deepEqual(r.corpo.cartas.find((c) => c.carta.nome === 'Sol Ring').problemas, ['Não é legal no Pauper']);
});

test('lista de decks, isolamento entre usuários e exclusão', async () => {
  const lista = await api('/decks');
  assert.equal(lista.corpo.length, 1);
  assert.equal(lista.corpo[0].nome, 'Elfos Pauper');
  assert.equal(lista.corpo[0].minimo, 60);

  assert.equal((await api('/decks', { token: tokenBia })).corpo.length, 0);
  assert.equal((await api(`/decks/${deckId}`, { token: tokenBia })).status, 404);
  assert.equal((await api(`/decks/${deckId}`, { method: 'DELETE', token: tokenBia })).status, 404);
  assert.equal((await api(`/decks/${deckId}/cartas`, { method: 'POST', token: tokenBia, body: { nome: 'Forest' } })).status, 404);

  assert.equal((await api(`/decks/${deckId}`, { method: 'DELETE' })).status, 204);
  assert.equal(await DeckCarta.count({ where: { deck_id: deckId } }), 0);
  assert.ok(await Carta.count() > 0, 'cartas continuam no cache');
});
