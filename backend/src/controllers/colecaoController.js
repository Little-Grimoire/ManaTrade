// Coleção do usuário logado (itens_colecao: N:N Usuário ↔ Carta). CRUD completo.
const { Op } = require('sequelize');
const { ItemColecao, Carta, DeckCarta, Deck } = require('../models');
const { obterCarta } = require('../services/cartas');
const HttpError = require('../utils/HttpError');

const CAMPOS_EDITAVEIS = ['quantidade', 'condicao', 'foil', 'observacao'];
const incluirCarta = { model: Carta, as: 'carta' };

const escolher = (objeto, campos) => Object.fromEntries(
  campos.filter((c) => objeto?.[c] !== undefined).map((c) => [c, objeto[c] === '' ? null : objeto[c]]),
);

// Busca o item garantindo que pertence ao usuário logado (de outra pessoa: 404).
async function itemDoUsuario(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(404, 'Item não encontrado.');
  const item = await ItemColecao.findOne({ where: { id, usuario_id: req.usuario.id }, include: incluirCarta });
  if (!item) throw new HttpError(404, 'Item não encontrado.');
  return item;
}

// GET /api/colecao — cada usuário só vê a própria coleção (filtra pelo id do token).
async function listar(req, res) {
  const itens = await ItemColecao.findAll({
    where: { usuario_id: req.usuario.id },
    include: incluirCarta,
    order: [[{ model: Carta, as: 'carta' }, 'nome', 'ASC'], ['condicao', 'ASC']],
  });
  res.json(itens);
}

// GET /api/colecao/:id — inclui em quais decks do usuário a carta está.
async function obter(req, res) {
  const item = await itemDoUsuario(req);
  const usos = await DeckCarta.findAll({
    include: [
      { model: Deck, as: 'deck', where: { usuario_id: req.usuario.id }, attributes: ['id', 'nome', 'formato'] },
      { model: Carta, as: 'carta', where: { [Op.or]: [{ id: item.carta_id }, ...(item.carta.oracle_id ? [{ oracle_id: item.carta.oracle_id }] : [])] }, attributes: [] },
    ],
  });
  res.json({ ...item.toJSON(), decks: usos.map((u) => ({ ...u.deck.toJSON(), quantidade: u.quantidade })) });
}

// POST /api/colecao  { carta_id | scryfall_id | nome, quantidade?, condicao?, foil?, observacao? }
// Se já existir um item da mesma carta com a mesma condição e foil, soma a quantidade.
async function criar(req, res) {
  const dados = escolher(req.body, CAMPOS_EDITAVEIS);
  const condicao = dados.condicao ?? 'NM';
  const foil = !!dados.foil;
  const quantidade = Number(dados.quantidade ?? 1);
  // Valida antes de consultar o Scryfall.
  if (!Number.isInteger(quantidade) || quantidade < 1) throw new HttpError(400, 'A quantidade deve ser um número inteiro maior que zero.');
  const carta = await obterCarta(req.body || {});

  const existente = await ItemColecao.findOne({ where: { usuario_id: req.usuario.id, carta_id: carta.id, condicao, foil } });
  if (existente) {
    await existente.update({ quantidade: existente.quantidade + quantidade });
    await existente.reload({ include: incluirCarta });
    return res.json(existente);
  }

  const item = await ItemColecao.create({
    ...dados, quantidade, condicao, foil, usuario_id: req.usuario.id, carta_id: carta.id,
  });
  await item.reload({ include: incluirCarta });
  return res.status(201).location(`/api/colecao/${item.id}`).json(item);
}

// PATCH /api/colecao/:id  { quantidade?, condicao?, foil?, observacao? }
async function atualizar(req, res) {
  const item = await itemDoUsuario(req);
  const dados = escolher(req.body, CAMPOS_EDITAVEIS);
  if (!Object.keys(dados).length) throw new HttpError(400, `Nada para atualizar. Campos aceitos: ${CAMPOS_EDITAVEIS.join(', ')}.`);

  // Mudar condição/foil pode colidir com outro item igual: avisa em vez de erro genérico.
  const condicao = dados.condicao ?? item.condicao;
  const foil = dados.foil ?? item.foil;
  const conflito = await ItemColecao.findOne({
    where: { usuario_id: req.usuario.id, carta_id: item.carta_id, condicao, foil, id: { [Op.ne]: item.id } },
  });
  if (conflito) throw new HttpError(409, 'Você já tem esta carta nessa condição. Edite a quantidade do outro item.');

  await item.update(dados);
  res.json(item);
}

// DELETE /api/colecao/:id
async function remover(req, res) {
  const item = await itemDoUsuario(req);
  await item.destroy();
  res.status(204).end();
}

module.exports = { listar, obter, criar, atualizar, remover };
