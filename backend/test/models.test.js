// Testes da camada de armazenamento (models, relacionamentos e regras). Rodar: npm test
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  sequelize, Usuario, Loja, Carta, ItemColecao, Deck, DeckCarta, ItemAcervo, Consignacao, Chamado, Notificacao,
} = require('../src/models');

let jogador; let lojista; let admin; let loja; let solRing; let bolt; let comandante;

const novaCarta = (nome, extra = {}) => Carta.create({ scryfall_id: crypto.randomUUID(), nome, ...extra });

before(async () => {
  await sequelize.sync({ force: true });
  jogador = await Usuario.create({ nome: 'Jogador', email: 'Jogador@Teste.dev ', senha: 'segredo1' });
  lojista = await Usuario.create({ nome: 'Lojista', email: 'loja@teste.dev', senha: 'segredo1', perfil: 'loja' });
  admin = await Usuario.create({ nome: 'Admin', email: 'admin@teste.dev', senha: 'segredo1', perfil: 'admin' });
  loja = await Loja.create({ usuario_id: lojista.id, nome: 'Loja', endereco: 'Rua 1', aprovada: true });
  solRing = await novaCarta('Sol Ring');
  bolt = await novaCarta('Lightning Bolt', { identidade_cor: 'R' });
  comandante = await novaCarta('Lathril, Blade of the Elves', { identidade_cor: 'BG' });
});

after(() => sequelize.close());

test('usuário: e-mail normalizado, senha com hash e fora das consultas e do JSON', async () => {
  assert.equal(jogador.email, 'jogador@teste.dev');
  const lido = await Usuario.findByPk(jogador.id);
  assert.equal(lido.senha_hash, undefined, 'defaultScope não deve trazer o hash');
  const comSenha = await Usuario.scope('comSenha').findByPk(jogador.id);
  assert.ok(await comSenha.verificarSenha('segredo1'));
  assert.ok(!(await comSenha.verificarSenha('errada')));
  assert.equal(JSON.stringify(comSenha).includes('senha'), false);
});

test('usuário: update({ senha }) troca o hash de fato', async () => {
  const u = await Usuario.create({ nome: 'Troca', email: 'troca@teste.dev', senha: 'antiga1' });
  await u.update({ senha: 'nova123' });
  const lido = await Usuario.scope('comSenha').findByPk(u.id);
  assert.ok(await lido.verificarSenha('nova123'));
  assert.ok(!(await lido.verificarSenha('antiga1')));
  await u.update({ nome: 'Troca 2' }); // update sem senha não mexe no hash
  assert.ok(await (await Usuario.scope('comSenha').findByPk(u.id)).verificarSenha('nova123'));
  await u.destroy();
});

test('usuário: valida e-mail único, perfil e senha obrigatória', async () => {
  await assert.rejects(Usuario.create({ nome: 'X', email: 'jogador@teste.dev', senha: 'segredo1' }), /SequelizeUniqueConstraintError/);
  await assert.rejects(Usuario.create({ nome: 'X', email: 'x@teste.dev', senha: 'segredo1', perfil: 'root' }), /Perfil inválido/);
  await assert.rejects(Usuario.create({ nome: 'X', email: 'y@teste.dev' }), /Informe a senha/);
  await assert.rejects(Usuario.create({ nome: 'X', email: 'z@teste.dev', senha: '123' }), /entre 6 e 72/);
});

test('loja: 1:1 com o dono e escopo de lojas aprovadas', async () => {
  await assert.rejects(Loja.create({ usuario_id: lojista.id, nome: 'Outra', endereco: 'Rua 2' }));
  const dono = await Usuario.findByPk(lojista.id, { include: 'loja' });
  assert.equal(dono.loja.id, loja.id);
  assert.equal(await Loja.scope('aprovadas').count(), 1);
});

test('carta: converte o JSON do Scryfall (inclusive cartas de duas faces)', () => {
  const campos = Carta.camposDoScryfall({
    id: 'a', name: 'Delver of Secrets // Insectile Aberration', set: 'isd', set_name: 'Innistrad',
    color_identity: ['U'], prices: { usd: '0.25' },
    card_faces: [{ oracle_id: 'o', type_line: 'Creature — Human Wizard', mana_cost: '{U}', image_uris: { normal: 'img' } }],
  });
  assert.equal(campos.identidade_cor, 'U');
  assert.equal(campos.imagem_url, 'img');
  assert.equal(campos.tipo, 'Creature — Human Wizard');
  assert.equal(campos.preco_usd, '0.25');
});

test('coleção: N:N Usuário ↔ Carta, mesma carta em condições diferentes', async () => {
  await ItemColecao.create({ usuario_id: jogador.id, carta_id: bolt.id, quantidade: 3, condicao: 'NM' });
  await ItemColecao.create({ usuario_id: jogador.id, carta_id: bolt.id, quantidade: 1, condicao: 'HP' });
  await assert.rejects(ItemColecao.create({ usuario_id: jogador.id, carta_id: bolt.id, condicao: 'NM' }));
  await assert.rejects(ItemColecao.create({ usuario_id: jogador.id, carta_id: bolt.id, condicao: 'XX' }), /Condição inválida/);
  await assert.rejects(ItemColecao.create({ usuario_id: jogador.id, carta_id: solRing.id, quantidade: 0 }), /no mínimo 1/);

  // Para listar a coleção use itensColecao + carta: traz uma linha por item (condição/foil).
  const itens = await ItemColecao.findAll({ where: { usuario_id: jogador.id }, include: 'carta' });
  assert.deepEqual(itens.map((i) => `${i.carta.nome}/${i.condicao}`).sort(), ['Lightning Bolt/HP', 'Lightning Bolt/NM']);

  // O include via belongsToMany ("colecao") agrupa pela carta: serve para "quais cartas distintas o usuário tem".
  const comColecao = await Usuario.findByPk(jogador.id, { include: 'colecao' });
  assert.deepEqual(comColecao.colecao.map((c) => c.nome), ['Lightning Bolt']);
});

test('deck: N:N Deck ↔ Carta com quantidade e comandante', async () => {
  const deck = await Deck.create({ usuario_id: jogador.id, nome: 'Elfos', comandante_id: comandante.id });
  await deck.addCarta(solRing, { through: { quantidade: 1 } });
  await DeckCarta.create({ deck_id: deck.id, carta_id: bolt.id, quantidade: 2 });
  await assert.rejects(DeckCarta.create({ deck_id: deck.id, carta_id: bolt.id }), 'chave composta impede duplicar a carta');

  const lido = await Deck.findByPk(deck.id, { include: ['cartas', 'comandante'] });
  assert.equal(lido.comandante.nome, 'Lathril, Blade of the Elves');
  assert.deepEqual(lido.cartas.map((c) => c.DeckCarta.quantidade).sort(), [1, 2]);
});

test('acervo: N:N Loja ↔ Carta com preço', async () => {
  await ItemAcervo.create({ loja_id: loja.id, carta_id: solRing.id, preco: 12.5, quantidade: 2 });
  await assert.rejects(ItemAcervo.create({ loja_id: loja.id, carta_id: solRing.id, preco: -1 }), /negativo/);
  const comAcervo = await Loja.findByPk(loja.id, { include: 'acervo' });
  assert.equal(comAcervo.acervo[0].nome, 'Sol Ring');
});

test('consignação: fluxo de status, datas e notificações', async () => {
  const antes = await Notificacao.count();
  const c = await Consignacao.create({ usuario_id: jogador.id, loja_id: loja.id, carta_id: bolt.id, preco_pedido: 20 });
  assert.equal(c.status, 'pendente');
  assert.equal(await Notificacao.count({ where: { usuario_id: lojista.id } }), 1, 'dono da loja é avisado');

  await assert.rejects(c.update({ status: 'vendida' }), /Transição de status inválida/);
  await c.reload();
  await c.update({ status: 'aceita' });
  assert.ok(c.respondida_em);
  await c.update({ status: 'a_venda' });
  await c.update({ status: 'vendida', preco_venda: 18 });
  assert.ok(c.encerrada);
  assert.ok(c.encerrada_em);
  await assert.rejects(c.update({ status: 'devolvida' }), /Transição de status inválida/);

  const doJogador = await Notificacao.findAll({ where: { usuario_id: jogador.id, tipo: 'consignacao' } });
  assert.deepEqual(doJogador.map((n) => n.titulo), ['Consignação aceita', 'Consignação à venda', 'Consignação vendida']);
  assert.equal(await Notificacao.count(), antes + 4);

  await assert.rejects(
    Consignacao.create({ usuario_id: jogador.id, loja_id: loja.id, carta_id: bolt.id, preco_pedido: 5, status: 'vendida' }),
    /começar com status "pendente"/,
  );
  await assert.rejects(Consignacao.create({ usuario_id: jogador.id, loja_id: loja.id, carta_id: bolt.id, preco_pedido: 0 }), /maior que zero/);
});

test('chamado: admin responde e o usuário é notificado', async () => {
  const chamado = await Chamado.create({ usuario_id: jogador.id, assunto: 'Ajuda', mensagem: 'Não consigo entrar.' });
  await chamado.update({ atendente_id: admin.id, status: 'resolvido', resposta: 'Resolvido.' });
  const n = await Notificacao.findOne({ where: { tipo: 'chamado', referencia_id: chamado.id } });
  assert.equal(n.titulo, 'Chamado resolvido');
  const lido = await Chamado.findByPk(chamado.id, { include: ['usuario', 'atendente'] });
  assert.equal(lido.atendente.perfil, 'admin');
});

test('exclusão: carta em uso é protegida; dados do usuário vão junto com ele', async () => {
  await assert.rejects(bolt.destroy(), /FOREIGN KEY/);

  const temp = await Usuario.create({ nome: 'Temp', email: 'temp@teste.dev', senha: 'segredo1' });
  const item = await ItemColecao.create({ usuario_id: temp.id, carta_id: solRing.id });
  const deck = await Deck.create({ usuario_id: temp.id, nome: 'D', comandante_id: comandante.id });
  await DeckCarta.create({ deck_id: deck.id, carta_id: solRing.id });
  const c = await Consignacao.create({ usuario_id: temp.id, loja_id: loja.id, carta_id: solRing.id, item_colecao_id: item.id, preco_pedido: 10 });

  await item.destroy();
  await c.reload();
  assert.equal(c.item_colecao_id, null, 'consignação mantém o histórico sem o item');

  await temp.destroy();
  assert.equal(await Deck.count({ where: { id: deck.id } }), 0);
  assert.equal(await DeckCarta.count({ where: { deck_id: deck.id } }), 0);
  assert.equal(await Consignacao.count({ where: { id: c.id } }), 0);
  assert.ok(await Carta.findByPk(solRing.id), 'a carta continua no cache');
});
