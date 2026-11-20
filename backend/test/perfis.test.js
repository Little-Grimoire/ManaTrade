// Testes das rotas de usuários, lojas, cartas, acervo, consignações, chamados e notificações,
// com foco nas permissões de cada perfil (usuario, loja, admin). Sem internet.
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const {
  sequelize, Usuario, Loja, Carta, ItemColecao, ItemAcervo, Notificacao,
} = require('../src/models');
const { gerarToken } = require('../src/services/token');

let servidor; let base;
const t = {}; // tokens por nome
let loja; let lojaPendente; let bolt; let itemAna; let jogadorAna; let donoLoja;

async function api(caminho, { method = 'GET', body, token } = {}) {
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
  const criar = (nome, perfil) => Usuario.create({ nome, email: `${nome.toLowerCase()}@teste.dev`, senha: 'segredo1', perfil });
  const admin = await criar('Admin', 'admin');
  jogadorAna = await criar('Ana', 'usuario');
  const bia = await criar('Bia', 'usuario');
  donoLoja = await criar('Lojista', 'loja');
  const lojista2 = await criar('Lojista2', 'loja');
  const lojista3 = await criar('Lojista3', 'loja'); // ainda sem loja

  loja = await Loja.create({ usuario_id: donoLoja.id, nome: 'Loja Centro', endereco: 'Rua A, 1', aprovada: true });
  lojaPendente = await Loja.create({ usuario_id: lojista2.id, nome: 'Loja Nova', endereco: 'Rua B, 2' });
  bolt = await Carta.create({ scryfall_id: crypto.randomUUID(), nome: 'Lightning Bolt', preco_usd: 1.1 });
  itemAna = await ItemColecao.create({ usuario_id: jogadorAna.id, carta_id: bolt.id, quantidade: 3, condicao: 'NM' });

  Object.assign(t, {
    admin: gerarToken(admin), ana: gerarToken(jogadorAna), bia: gerarToken(bia),
    loja: gerarToken(donoLoja), lojaPendente: gerarToken(lojista2), lojaSemCadastro: gerarToken(lojista3),
  });
  servidor = app.listen(0);
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  servidor.close();
  await sequelize.close();
});

test('usuários: só o admin gerencia; não pode bloquear a si mesmo', async () => {
  assert.equal((await api('/usuarios', { token: t.ana })).status, 403);
  assert.equal((await api('/usuarios', { token: t.loja })).status, 403);
  assert.equal((await api('/usuarios')).status, 401);

  const lista = await api('/usuarios?perfil=loja', { token: t.admin });
  assert.equal(lista.status, 200);
  assert.ok(lista.corpo.every((u) => u.perfil === 'loja'));

  const novo = await api('/usuarios', { method: 'POST', token: t.admin, body: { nome: 'Novo Admin', email: 'novo@teste.dev', senha: 'segredo1', perfil: 'admin' } });
  assert.equal(novo.status, 201);
  assert.equal(novo.corpo.senha_hash, undefined);

  const bloqueado = await api(`/usuarios/${novo.corpo.id}`, { method: 'PATCH', token: t.admin, body: { ativo: false } });
  assert.equal(bloqueado.corpo.ativo, false);

  const eu = (await api('/auth/me', { token: t.admin })).corpo;
  assert.equal((await api(`/usuarios/${eu.id}`, { method: 'PATCH', token: t.admin, body: { ativo: false } })).status, 409);
  assert.equal((await api(`/usuarios/${eu.id}`, { method: 'DELETE', token: t.admin })).status, 409);
  assert.equal((await api(`/usuarios/${novo.corpo.id}`, { method: 'DELETE', token: t.admin })).status, 204);
  assert.equal((await api('/usuarios/9999', { token: t.admin })).status, 404);
});

test('lojas: jogador vê só aprovadas; dono edita mas não aprova; admin aprova', async () => {
  const doJogador = await api('/lojas', { token: t.ana });
  assert.deepEqual(doJogador.corpo.map((l) => l.nome), ['Loja Centro']);
  assert.equal((await api(`/lojas/${lojaPendente.id}`, { token: t.ana })).status, 404);
  assert.equal((await api(`/lojas/${lojaPendente.id}`, { token: t.lojaPendente })).status, 200);
  assert.equal((await api('/lojas', { token: t.admin })).corpo.length, 2);

  assert.equal((await api(`/lojas/${lojaPendente.id}`, { method: 'PATCH', token: t.lojaPendente, body: { aprovada: true } })).status, 403);
  assert.equal((await api(`/lojas/${lojaPendente.id}`, { method: 'PATCH', token: t.loja, body: { nome: 'Invasão' } })).status, 404);
  assert.equal((await api(`/lojas/${lojaPendente.id}`, { method: 'PATCH', token: t.ana, body: { nome: 'x' } })).status, 403);
  const editada = await api(`/lojas/${lojaPendente.id}`, { method: 'PATCH', token: t.lojaPendente, body: { horario: '10h–20h' } });
  assert.equal(editada.corpo.horario, '10h–20h');

  const aprovada = await api(`/lojas/${lojaPendente.id}`, { method: 'PATCH', token: t.admin, body: { aprovada: true } });
  assert.equal(aprovada.corpo.aprovada, true);

  // Lojista sem loja cadastra a sua; não pode ter duas.
  const criada = await api('/lojas', { method: 'POST', token: t.lojaSemCadastro, body: { nome: 'Terceira', endereco: 'Rua C', aprovada: true } });
  assert.equal(criada.status, 201);
  assert.equal(criada.corpo.aprovada, false, 'loja ignora "aprovada" no cadastro');
  assert.equal((await api('/lojas', { method: 'POST', token: t.lojaSemCadastro, body: { nome: 'Quarta', endereco: 'Rua D' } })).status, 409);
  assert.equal((await api('/lojas', { method: 'POST', token: t.ana, body: { nome: 'x', endereco: 'y' } })).status, 403);
  assert.equal((await api(`/lojas/${criada.corpo.id}`, { method: 'DELETE', token: t.lojaSemCadastro })).status, 204);
});

test('cartas: todos leem; só admin cria, edita e exclui; carta em uso não é excluída', async () => {
  const lista = await api('/cartas?busca=bolt', { token: t.ana });
  assert.equal(lista.corpo.total, 1);
  assert.equal((await api(`/cartas/${bolt.id}`, { token: t.loja })).corpo.nome, 'Lightning Bolt');

  assert.equal((await api(`/cartas/${bolt.id}`, { method: 'PATCH', token: t.ana, body: { preco_usd: 9 } })).status, 403);
  const editada = await api(`/cartas/${bolt.id}`, { method: 'PATCH', token: t.admin, body: { preco_usd: 2.5, scryfall_id: 'x' } });
  assert.equal(Number(editada.corpo.preco_usd), 2.5);
  assert.equal(editada.corpo.scryfall_id, bolt.scryfall_id, 'scryfall_id não é editável');

  assert.equal((await api(`/cartas/${bolt.id}`, { method: 'DELETE', token: t.admin })).status, 409);
  const solta = await Carta.create({ scryfall_id: crypto.randomUUID(), nome: 'Sem Uso' });
  assert.equal((await api(`/cartas/${solta.id}`, { method: 'DELETE', token: t.ana })).status, 403);
  assert.equal((await api(`/cartas/${solta.id}`, { method: 'DELETE', token: t.admin })).status, 204);
});

test('acervo: só loja aprovada, e só os próprios itens', async () => {
  assert.equal((await api('/acervo', { token: t.ana })).status, 403);
  assert.equal((await api('/acervo', { token: t.lojaSemCadastro })).status, 403);

  const criado = await api('/acervo', { method: 'POST', token: t.loja, body: { carta_id: bolt.id, quantidade: 4, preco: 7.5 } });
  assert.equal(criado.status, 201);
  assert.equal(criado.corpo.carta.nome, 'Lightning Bolt');
  const { id } = criado.corpo;

  assert.equal((await api(`/acervo/${id}`, { token: t.lojaPendente })).status, 404, 'outra loja não vê');
  assert.equal((await api(`/acervo/${id}`, { method: 'PATCH', token: t.loja, body: { preco: -1 } })).status, 400);
  assert.equal(Number((await api(`/acervo/${id}`, { method: 'PATCH', token: t.loja, body: { preco: 6 } })).corpo.preco), 6);

  const vitrine = await api(`/lojas/${loja.id}/acervo`, { token: t.ana });
  assert.equal(vitrine.corpo.length, 1);
  assert.equal((await api(`/acervo/${id}`, { method: 'DELETE', token: t.loja })).status, 204);
});

test('consignação: jogador envia, loja conduz, carta vai para a vitrine e sai da coleção', async () => {
  const corpo = { loja_id: loja.id, item_colecao_id: itemAna.id, quantidade: 2, preco_pedido: 10 };
  assert.equal((await api('/consignacoes', { method: 'POST', token: t.loja, body: corpo })).status, 403);
  assert.equal((await api('/consignacoes', { method: 'POST', token: t.bia, body: corpo })).status, 404, 'item de outra pessoa');
  assert.equal((await api('/consignacoes', { method: 'POST', token: t.ana, body: { ...corpo, quantidade: 9 } })).status, 400);

  const criada = await api('/consignacoes', { method: 'POST', token: t.ana, body: corpo });
  assert.equal(criada.status, 201);
  assert.equal(criada.corpo.status, 'pendente');
  assert.equal(criada.corpo.carta.nome, 'Lightning Bolt');
  const { id } = criada.corpo;
  assert.equal(await Notificacao.count({ where: { usuario_id: donoLoja.id } }), 1, 'loja foi avisada');

  // Quem não participa não vê.
  assert.equal((await api(`/consignacoes/${id}`, { token: t.bia })).status, 404);
  assert.equal((await api(`/consignacoes/${id}`, { token: t.lojaPendente })).status, 404);
  assert.equal((await api('/consignacoes', { token: t.loja })).corpo.length, 1);

  // Jogador não pode aceitar; loja não pode mudar o preço pedido; admin não altera.
  assert.equal((await api(`/consignacoes/${id}`, { method: 'PATCH', token: t.ana, body: { status: 'aceita' } })).status, 403);
  assert.equal((await api(`/consignacoes/${id}`, { method: 'PATCH', token: t.loja, body: { preco_pedido: 1 } })).status, 400);
  assert.equal((await api(`/consignacoes/${id}`, { method: 'PATCH', token: t.admin, body: { status: 'aceita' } })).status, 403);
  assert.equal((await api(`/consignacoes/${id}`, { method: 'PATCH', token: t.loja, body: { status: 'vendida' } })).status, 409, 'pula etapas');

  assert.equal((await api(`/consignacoes/${id}`, { method: 'PATCH', token: t.loja, body: { status: 'aceita', resposta_loja: 'Pode trazer' } })).corpo.status, 'aceita');
  assert.equal((await api(`/consignacoes/${id}`, { method: 'PATCH', token: t.ana, body: { preco_pedido: 12 } })).status, 409, 'já respondida');
  assert.equal((await api(`/consignacoes/${id}`, { method: 'DELETE', token: t.ana })).status, 409, 'em andamento');

  await api(`/consignacoes/${id}`, { method: 'PATCH', token: t.loja, body: { status: 'a_venda', preco_venda: 11 } });
  const naVitrine = await ItemAcervo.findOne({ where: { consignacao_id: id } });
  assert.equal(Number(naVitrine.preco), 11);
  assert.equal(naVitrine.quantidade, 2);

  const vendida = await api(`/consignacoes/${id}`, { method: 'PATCH', token: t.loja, body: { status: 'vendida' } });
  assert.equal(vendida.corpo.status, 'vendida');
  assert.ok(vendida.corpo.encerrada_em);
  assert.equal(await ItemAcervo.count({ where: { consignacao_id: id } }), 0);
  assert.equal((await itemAna.reload()).quantidade, 1, 'saiu da coleção');

  assert.equal((await api(`/consignacoes/${id}`, { method: 'DELETE', token: t.loja })).status, 403);
  assert.equal((await api(`/consignacoes/${id}`, { method: 'DELETE', token: t.ana })).status, 204, 'encerrada pode ser apagada');
});

test('consignação: jogador cancela a pendente', async () => {
  const criada = await api('/consignacoes', { method: 'POST', token: t.ana, body: { loja_id: loja.id, item_colecao_id: itemAna.id, preco_pedido: 5 } });
  const r = await api(`/consignacoes/${criada.corpo.id}`, { method: 'PATCH', token: t.ana, body: { status: 'cancelada' } });
  assert.equal(r.corpo.status, 'cancelada');
  assert.equal((await api(`/consignacoes/${criada.corpo.id}`, { method: 'PATCH', token: t.loja, body: { status: 'aceita' } })).status, 409);
});

test('chamados: autor edita enquanto aberto; admin responde e o autor é notificado', async () => {
  assert.equal((await api('/chamados', { method: 'POST', token: t.admin, body: { assunto: 'x', mensagem: 'y' } })).status, 403);
  const criado = await api('/chamados', { method: 'POST', token: t.bia, body: { assunto: 'Erro no deck', mensagem: 'Não salva' } });
  assert.equal(criado.status, 201);
  const { id } = criado.corpo;

  assert.equal((await api(`/chamados/${id}`, { token: t.ana })).status, 404);
  assert.equal((await api('/chamados', { token: t.admin })).corpo.length, 1);
  assert.equal((await api(`/chamados/${id}`, { method: 'PATCH', token: t.bia, body: { status: 'resolvido' } })).status, 400, 'autor não muda status');
  assert.equal((await api(`/chamados/${id}`, { method: 'PATCH', token: t.bia, body: { mensagem: 'Não salva o nome' } })).status, 200);

  const respondido = await api(`/chamados/${id}`, { method: 'PATCH', token: t.admin, body: { status: 'resolvido', resposta: 'Corrigido' } });
  assert.equal(respondido.corpo.atendente.nome, 'Admin');
  assert.equal((await api(`/chamados/${id}`, { method: 'PATCH', token: t.bia, body: { mensagem: 'z' } })).status, 409);
  assert.equal((await api(`/chamados/${id}`, { method: 'DELETE', token: t.bia })).status, 409);

  const avisos = await api('/notificacoes?lida=false', { token: t.bia });
  assert.equal(avisos.corpo[0].tipo, 'chamado');
  assert.equal((await api(`/chamados/${id}`, { method: 'DELETE', token: t.admin })).status, 204);
});

test('notificações: só o admin envia; cada um lê e apaga as próprias', async () => {
  const corpo = { usuario_id: jogadorAna.id, titulo: 'Manutenção', mensagem: 'Domingo às 22h' };
  assert.equal((await api('/notificacoes', { method: 'POST', token: t.bia, body: corpo })).status, 403);
  const enviada = await api('/notificacoes', { method: 'POST', token: t.admin, body: corpo });
  assert.equal(enviada.status, 201);
  assert.equal(enviada.corpo.tipo, 'sistema');

  const { id } = enviada.corpo;
  assert.equal((await api(`/notificacoes/${id}`, { token: t.admin })).status, 404, 'nem o admin lê a de outra pessoa');
  assert.equal((await api(`/notificacoes/${id}`, { method: 'PATCH', token: t.ana, body: { lida: true } })).corpo.lida, true);
  assert.equal((await api('/notificacoes/lidas', { method: 'PATCH', token: t.ana })).status, 200);
  assert.equal((await api('/notificacoes?lida=false', { token: t.ana })).corpo.length, 0);
  assert.equal((await api(`/notificacoes/${id}`, { method: 'DELETE', token: t.bia })).status, 404);
  assert.equal((await api(`/notificacoes/${id}`, { method: 'DELETE', token: t.ana })).status, 204);
});
