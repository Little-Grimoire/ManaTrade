// Acervo da loja (itens_acervo: N:N Loja ↔ Carta). Quem chama já passou por autorizar('loja') + exigirLojaAprovada.
const { ItemAcervo, Carta } = require('../models');
const { obterCarta } = require('./cartas');
const { escolher, booleano, exigirAlgum } = require('../utils/campos');

const CAMPOS = ['quantidade', 'condicao', 'foil', 'preco'];
const incluirCarta = { model: Carta, as: 'carta' };

const listar = (loja) => ItemAcervo.findAll({
  where: { loja_id: loja.id },
  include: incluirCarta,
  order: [[{ model: Carta, as: 'carta' }, 'nome', 'ASC']],
});

// dados: { carta_id | scryfall_id | nome, quantidade?, condicao?, foil?, preco }
async function criar(loja, dados) {
  const carta = await obterCarta(dados);
  const campos = escolher(dados, CAMPOS);
  if (campos.foil !== undefined) campos.foil = booleano(campos.foil);
  const item = await ItemAcervo.create({ ...campos, loja_id: loja.id, carta_id: carta.id });
  return item.reload({ include: incluirCarta });
}

async function atualizar(item, dados) {
  const campos = exigirAlgum(escolher(dados, CAMPOS), CAMPOS);
  if (campos.foil !== undefined) campos.foil = booleano(campos.foil);
  await item.update(campos);
  return item.reload({ include: incluirCarta });
}

const remover = (item) => item.destroy();

module.exports = {
  listar, criar, atualizar, remover, incluirCarta, CAMPOS,
};
