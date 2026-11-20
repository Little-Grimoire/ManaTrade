// Coleção do jogador (itens_colecao: N:N Usuário ↔ Carta). Usado pela API e pelas páginas.
const { Op } = require('sequelize');
const {
  ItemColecao, Carta, DeckCarta, Deck,
} = require('../models');
const { obterCarta } = require('./cartas');
const HttpError = require('../utils/HttpError');
const { escolher, booleano, exigirAlgum } = require('../utils/campos');

const CAMPOS = ['quantidade', 'condicao', 'foil', 'observacao'];
const incluirCarta = { model: Carta, as: 'carta' };

const listar = (usuario) => ItemColecao.findAll({
  where: { usuario_id: usuario.id },
  include: incluirCarta,
  order: [[{ model: Carta, as: 'carta' }, 'nome', 'ASC'], ['condicao', 'ASC']],
});

// Item + em quais decks do usuário a carta está (qualquer edição).
async function detalhar(usuario, item) {
  const usos = await DeckCarta.findAll({
    include: [
      { model: Deck, as: 'deck', where: { usuario_id: usuario.id }, attributes: ['id', 'nome', 'formato'] },
      { model: Carta, as: 'carta', where: { [Op.or]: [{ id: item.carta_id }, ...(item.carta.oracle_id ? [{ oracle_id: item.carta.oracle_id }] : [])] }, attributes: [] },
    ],
  });
  return { ...item.toJSON(), decks: usos.map((u) => ({ ...u.deck.toJSON(), quantidade: u.quantidade })) };
}

// dados: { carta_id | scryfall_id | nome, quantidade?, condicao?, foil?, observacao? }
// Se já existir item da mesma carta com a mesma condição e foil, soma. Devolve { item, criado }.
async function criar(usuario, dados = {}) {
  const campos = escolher(dados, CAMPOS);
  const condicao = campos.condicao ?? 'NM';
  const foil = booleano(campos.foil);
  const quantidade = Number(campos.quantidade ?? 1);
  // Valida antes de consultar o Scryfall.
  if (!Number.isInteger(quantidade) || quantidade < 1) throw new HttpError(400, 'A quantidade deve ser um número inteiro maior que zero.');
  const carta = await obterCarta(dados);

  const existente = await ItemColecao.findOne({ where: { usuario_id: usuario.id, carta_id: carta.id, condicao, foil } });
  if (existente) {
    await existente.update({ quantidade: existente.quantidade + quantidade });
    return { item: await existente.reload({ include: incluirCarta }), criado: false };
  }
  const item = await ItemColecao.create({
    ...campos, quantidade, condicao, foil, usuario_id: usuario.id, carta_id: carta.id,
  });
  return { item: await item.reload({ include: incluirCarta }), criado: true };
}

async function atualizar(usuario, item, dados) {
  const campos = exigirAlgum(escolher(dados, CAMPOS), CAMPOS);
  if (campos.foil !== undefined) campos.foil = booleano(campos.foil);

  // Mudar condição/foil pode colidir com outro item igual: avisa em vez de erro genérico.
  const condicao = campos.condicao ?? item.condicao;
  const foil = campos.foil ?? item.foil;
  const conflito = await ItemColecao.findOne({
    where: { usuario_id: usuario.id, carta_id: item.carta_id, condicao, foil, id: { [Op.ne]: item.id } },
  });
  if (conflito) throw new HttpError(409, 'Você já tem esta carta nessa condição. Edite a quantidade do outro item.');

  await item.update(campos);
  return item;
}

const remover = (item) => item.destroy();

module.exports = {
  listar, detalhar, criar, atualizar, remover, incluirCarta,
};
