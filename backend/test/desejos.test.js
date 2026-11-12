// Testes da lista de desejos (CRUD /api/desejos). O Scryfall é simulado: não precisa de internet.
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { sequelize, Usuario, Carta, Desejo } = require('../src/models');
const { gerarToken } = require('../src/services/token');

const SCRYFALL_SOL_RING = {
  id: '11111111-1111-4111-8111-111111111111', oracle_id: '22222222-2222-4222-8222-222222222222',
  name: 'Sol Ring', set: 'cmm', set_name: 'Commander Masters', type_line: 'Artifact', mana_cost: '{1}',
  color_identity: [], rarity: 'uncommon', prices: { usd: '1.50' }, image_uris: { normal: 'https://img/sol.jpg' },
  cmc: 1, legalities: { commander: 'legal' },
};

// Simula só as chamadas ao Scryfall; as chamadas ao servidor de teste passam direto.
const fetchReal = global.fetch;
let chamadasScryfall = 0;
global.fetch = async (url, opcoes) => {
  if (!String(url).startsWith('https://api.scryfall.com')) return fetchReal(url, opcoes);
  chamadasScryfall += 1;
  const acha = /fuzzy=sol(%20|\+)?r/i.test(url) || url.includes(SCRYFALL_SOL_RING.id);
  return new Response(JSON.stringify(acha ? SCRYFALL_SOL_RING : { object: 'error' }), { status: acha ? 200 : 404 });
};

let servidor; let base; let tokenAna; let tokenBia; let bolt;

async function api(caminho, { method = 'GET', body, token = tokenAna } = {}) {
  const r = await fetch(`${base}/api${caminho}`, {
    method,
    headers: { ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const texto = await r.text();
  return { status: r.status, corpo: texto ? JSON.parse(texto) : null, location: r.headers.get('location') };
}

before(async () => {
  await sequelize.sync({ force: true });
  const ana = await Usuario.create({ nome: 'Ana', email: 'ana@teste.dev', senha: 'segredo1' });
  const bia = await Usuario.create({ nome: 'Bia', email: 'bia@teste.dev', senha: 'segredo1' });
  [tokenAna, tokenBia] = [ana, bia].map(gerarToken);
  bolt = await Carta.create({ scryfall_id: crypto.randomUUID(), nome: 'Lightning Bolt', preco_usd: 1.1 });
  servidor = app.listen(0);
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  global.fetch = fetchReal;
  servidor.close();
  await sequelize.close();
});

test('exige login', async () => {
  assert.equal((await api('/desejos', { token: null })).status, 401);
});

test('criar por nome busca no Scryfall, salva a carta no cache e não duplica', async () => {
  const r = await api('/desejos', { method: 'POST', body: { nome: 'sol rng', preco_maximo_usd: 2, prioridade: 'alta' } });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.carta.nome, 'Sol Ring');
  assert.equal(r.corpo.prioridade, 'alta');
  assert.equal(r.location, `/api/desejos/${r.corpo.id}`);
  assert.equal(await Carta.count({ where: { scryfall_id: SCRYFALL_SOL_RING.id } }), 1);

  const repetido = await api('/desejos', { method: 'POST', body: { scryfall_id: SCRYFALL_SOL_RING.id } });
  assert.equal(repetido.status, 409);
  assert.equal(chamadasScryfall, 1, 'scryfall_id já em cache não consulta o Scryfall de novo');
});

test('criar: carta inexistente, sem carta e dados inválidos', async () => {
  assert.equal((await api('/desejos', { method: 'POST', body: { nome: 'carta que não existe' } })).status, 404);
  assert.equal((await api('/desejos', { method: 'POST', body: {} })).status, 400);
  const r = await api('/desejos', { method: 'POST', body: { carta_id: bolt.id, prioridade: 'urgente' } });
  assert.equal(r.status, 400);
  assert.match(r.corpo.erro, /Prioridade inválida/);
});

test('listar, obter, atualizar e remover só os próprios desejos', async () => {
  const criado = await api('/desejos', { method: 'POST', body: { carta_id: bolt.id } });
  assert.equal(criado.status, 201);
  const { id } = criado.corpo;

  const lista = await api('/desejos');
  assert.deepEqual(lista.corpo.map((d) => d.carta.nome).sort(), ['Lightning Bolt', 'Sol Ring']);
  assert.equal((await api('/desejos', { token: tokenBia })).corpo.length, 0, 'Bia não vê a lista da Ana');

  assert.equal((await api(`/desejos/${id}`)).corpo.carta.nome, 'Lightning Bolt');
  assert.equal((await api(`/desejos/${id}`, { token: tokenBia })).status, 404);
  assert.equal((await api('/desejos/abc')).status, 404);

  const editado = await api(`/desejos/${id}`, { method: 'PATCH', body: { preco_maximo_usd: 0.9, observacao: 'Versão antiga', usuario_id: 999 } });
  assert.equal(editado.status, 200);
  assert.equal(Number(editado.corpo.preco_maximo_usd), 0.9);
  assert.equal(editado.corpo.observacao, 'Versão antiga');
  assert.notEqual(editado.corpo.usuario_id, 999, 'dono não pode ser trocado');
  assert.equal((await api(`/desejos/${id}`, { method: 'PATCH', body: { preco_maximo_usd: -1 } })).status, 400);
  assert.equal((await api(`/desejos/${id}`, { method: 'PATCH', body: {} })).status, 400);
  assert.equal((await api(`/desejos/${id}`, { method: 'PATCH', token: tokenBia, body: { observacao: 'x' } })).status, 404);

  assert.equal((await api(`/desejos/${id}`, { method: 'DELETE', token: tokenBia })).status, 404);
  assert.equal((await api(`/desejos/${id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await api(`/desejos/${id}`)).status, 404);
});

test('carta desejada não pode ser apagada do cache; apagar o usuário apaga os desejos', async () => {
  const sol = await Carta.findOne({ where: { scryfall_id: SCRYFALL_SOL_RING.id } });
  await assert.rejects(sol.destroy(), /FOREIGN KEY/);
  await Usuario.destroy({ where: { email: 'ana@teste.dev' } });
  assert.equal(await Desejo.count(), 0);
});
