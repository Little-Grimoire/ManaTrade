// Testes da autenticação (cadastro, login, token) e da autorização por perfil. Rodar: npm test
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const app = require('../src/app');
const { sequelize, Usuario, Loja } = require('../src/models');
const { autenticar, autorizar, exigirLojaAprovada } = require('../src/middlewares/autenticacao');
const { tratarErros } = require('../src/middlewares/erros');
const { gerarToken } = require('../src/services/token');

let base; let servidor; let servidorProtegido; let baseProtegida;

// Mini-app só para testar os middlewares de perfil.
const protegido = express();
protegido.get('/logado', autenticar, (req, res) => res.json({ perfil: req.usuario.perfil }));
protegido.get('/admin', autenticar, autorizar('admin'), (req, res) => res.json({ ok: true }));
protegido.get('/loja', autenticar, autorizar('loja'), exigirLojaAprovada, (req, res) => res.json({ loja: req.loja.nome }));
protegido.use(tratarErros);

async function chamar(url, { method = 'GET', body, token } = {}) {
  const resposta = await fetch(url, {
    method,
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });
  const texto = await resposta.text();
  return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
}

const api = (caminho, opcoes) => chamar(`${base}/api${caminho}`, opcoes);
const rotaProtegida = (caminho, token) => chamar(`${baseProtegida}${caminho}`, { token });

before(async () => {
  await sequelize.sync({ force: true });
  await Usuario.create({ nome: 'Admin', email: 'admin@teste.dev', senha: 'segredo1', perfil: 'admin' });
  servidor = app.listen(0);
  servidorProtegido = protegido.listen(0);
  base = `http://127.0.0.1:${servidor.address().port}`;
  baseProtegida = `http://127.0.0.1:${servidorProtegido.address().port}`;
});

after(async () => {
  servidor.close();
  servidorProtegido.close();
  await sequelize.close();
});

test('cadastro de jogador devolve token e o perfil "usuario" com resumo', async () => {
  const { status, corpo } = await api('/auth/cadastro', {
    method: 'POST', body: { nome: 'Ana', email: 'Ana@Teste.dev', senha: 'segredo1' },
  });
  assert.equal(status, 201);
  assert.ok(corpo.token);
  assert.equal(corpo.usuario.perfil, 'usuario');
  assert.equal(corpo.usuario.email, 'ana@teste.dev');
  assert.equal(corpo.usuario.senha_hash, undefined);
  assert.deepEqual(corpo.usuario.resumo, { cartasColecao: 0, decks: 0, consignacoesAtivas: 0, notificacoesNaoLidas: 0 });
});

test('cadastro: valida dados, e-mail repetido e não permite virar admin', async () => {
  let r = await api('/auth/cadastro', { method: 'POST', body: { nome: 'X', email: 'ana@teste.dev', senha: 'segredo1' } });
  assert.equal(r.status, 409);
  assert.equal(r.corpo.erro, 'E-mail já cadastrado.');

  r = await api('/auth/cadastro', { method: 'POST', body: { nome: 'X', email: 'x@teste.dev', senha: '123' } });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.detalhes[0].campo, 'senha');

  r = await api('/auth/cadastro', { method: 'POST', body: { nome: 'X', email: 'x@teste.dev', senha: 'segredo1', perfil: 'admin' } });
  assert.equal(r.status, 400);
});

test('cadastro de loja cria usuário + loja não aprovada (ou nada, se a loja for inválida)', async () => {
  let r = await api('/auth/cadastro', {
    method: 'POST', body: { nome: 'Dono', email: 'semloja@teste.dev', senha: 'segredo1', perfil: 'loja', loja: { nome: 'Sem endereço' } },
  });
  assert.equal(r.status, 400);
  assert.equal(await Usuario.count({ where: { email: 'semloja@teste.dev' } }), 0, 'transação desfeita');

  r = await api('/auth/cadastro', {
    method: 'POST',
    body: { nome: 'Dono', email: 'dono@teste.dev', senha: 'segredo1', perfil: 'loja', loja: { nome: 'Loja X', endereco: 'Rua 1', aprovada: true } },
  });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.usuario.perfil, 'loja');
  assert.equal(r.corpo.usuario.loja.nome, 'Loja X');
  assert.equal(r.corpo.usuario.loja.aprovada, false, 'o cadastro não pode se autoaprovar');
});

test('login: credenciais corretas, erradas e conta bloqueada', async () => {
  let r = await api('/auth/login', { method: 'POST', body: { email: 'ANA@teste.dev', senha: 'segredo1' } });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.usuario.nome, 'Ana');

  r = await api('/auth/login', { method: 'POST', body: { email: 'ana@teste.dev', senha: 'errada' } });
  assert.equal(r.status, 401);
  r = await api('/auth/login', { method: 'POST', body: { email: 'ninguem@teste.dev', senha: 'segredo1' } });
  assert.equal(r.status, 401);
  assert.equal(r.corpo.erro, 'E-mail ou senha incorretos.');

  await Usuario.update({ ativo: false }, { where: { email: 'ana@teste.dev' } });
  r = await api('/auth/login', { method: 'POST', body: { email: 'ana@teste.dev', senha: 'segredo1' } });
  assert.equal(r.status, 403);
  await Usuario.update({ ativo: true }, { where: { email: 'ana@teste.dev' } });
});

test('/me: exige token válido e permite editar nome/e-mail, mas não o perfil', async () => {
  assert.equal((await api('/auth/me')).status, 401);
  assert.equal((await api('/auth/me', { token: 'lixo' })).status, 401);

  const { corpo } = await api('/auth/login', { method: 'POST', body: { email: 'ana@teste.dev', senha: 'segredo1' } });
  const r = await api('/auth/me', { method: 'PATCH', token: corpo.token, body: { nome: 'Ana Maria', perfil: 'admin' } });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.nome, 'Ana Maria');
  assert.equal(r.corpo.perfil, 'usuario');
});

test('alterar senha exige a senha atual', async () => {
  const { corpo } = await api('/auth/login', { method: 'POST', body: { email: 'ana@teste.dev', senha: 'segredo1' } });
  let r = await api('/auth/me/senha', { method: 'PATCH', token: corpo.token, body: { senhaAtual: 'errada', novaSenha: 'novasenha' } });
  assert.equal(r.status, 401);
  r = await api('/auth/me/senha', { method: 'PATCH', token: corpo.token, body: { senhaAtual: 'segredo1', novaSenha: 'novasenha' } });
  assert.equal(r.status, 204);
  r = await api('/auth/login', { method: 'POST', body: { email: 'ana@teste.dev', senha: 'novasenha' } });
  assert.equal(r.status, 200);
});

test('middlewares: cada perfil só acessa o que lhe é permitido', async () => {
  const admin = await Usuario.findOne({ where: { email: 'admin@teste.dev' } });
  const jogador = await Usuario.findOne({ where: { email: 'ana@teste.dev' } });
  const dono = await Usuario.findOne({ where: { email: 'dono@teste.dev' } });
  const [tAdmin, tJogador, tDono] = [admin, jogador, dono].map(gerarToken);

  assert.equal((await rotaProtegida('/logado', tJogador)).corpo.perfil, 'usuario');
  assert.equal((await rotaProtegida('/admin', tAdmin)).status, 200);
  assert.equal((await rotaProtegida('/admin', tJogador)).status, 403);
  assert.equal((await rotaProtegida('/admin', tDono)).status, 403);
  assert.equal((await rotaProtegida('/loja', tJogador)).status, 403);

  let r = await rotaProtegida('/loja', tDono);
  assert.equal(r.status, 403);
  assert.match(r.corpo.erro, /aguarda aprovação/);

  await Loja.update({ aprovada: true }, { where: { usuario_id: dono.id } });
  r = await rotaProtegida('/loja', tDono);
  assert.equal(r.status, 200);
  assert.equal(r.corpo.loja, 'Loja X');
});

test('bloqueio e mudança de perfil valem na hora, mesmo com token antigo', async () => {
  const jogador = await Usuario.findOne({ where: { email: 'ana@teste.dev' } });
  const token = gerarToken(jogador); // token diz perfil "usuario"

  await jogador.update({ perfil: 'admin' });
  assert.equal((await rotaProtegida('/admin', token)).status, 200, 'perfil lido do banco, não do token');

  await jogador.update({ ativo: false });
  assert.equal((await rotaProtegida('/logado', token)).status, 403);
});

test('erros genéricos: rota inexistente e JSON malformado', async () => {
  assert.equal((await api('/nao-existe')).status, 404);
  const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{ruim' });
  assert.equal(r.status, 400);
});

test('coleção: exige login e cada usuário só vê os próprios itens', async () => {
  const { Carta, ItemColecao } = require('../src/models');
  const carta = await Carta.create({ scryfall_id: crypto.randomUUID(), nome: 'Sol Ring', preco_usd: 1.5 });
  const dono = await Usuario.findOne({ where: { email: 'dono@teste.dev' } });
  const outro = await Usuario.create({ nome: 'Outro', email: 'outro@teste.dev', senha: 'segredo1' });
  await ItemColecao.create({ usuario_id: dono.id, carta_id: carta.id, quantidade: 2 });
  await ItemColecao.create({ usuario_id: outro.id, carta_id: carta.id, condicao: 'HP' });

  assert.equal((await api('/colecao')).status, 401);
  const r = await api('/colecao', { token: gerarToken(dono) });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.length, 1);
  assert.equal(r.corpo[0].quantidade, 2);
  assert.equal(r.corpo[0].carta.nome, 'Sol Ring');
});
