// Lista de desejos (desejos: N:N Usuário ↔ Carta). Usado pela API e pelas páginas.
const { Desejo, Carta } = require('../models');
const { obterCarta } = require('./cartas');
const HttpError = require('../utils/HttpError');
const { escolher, exigirAlgum } = require('../utils/campos');

const CAMPOS = ['prioridade', 'preco_maximo_usd', 'observacao'];
const incluirCarta = { model: Carta, as: 'carta' };

const listar = (usuario) => Desejo.findAll({
  where: { usuario_id: usuario.id },
  include: incluirCarta,
  order: [['created_at', 'DESC']],
});

// dados: { carta_id | scryfall_id | nome, prioridade?, preco_maximo_usd?, observacao? }
async function criar(usuario, dados = {}) {
  const carta = await obterCarta(dados);
  const existente = await Desejo.findOne({ where: { usuario_id: usuario.id, carta_id: carta.id } });
  if (existente) throw new HttpError(409, `${carta.nome} já está na sua lista de desejos.`);

  const desejo = await Desejo.create({
    ...escolher(dados, CAMPOS),
    usuario_id: usuario.id, // sempre do token, nunca do corpo
    carta_id: carta.id,
  });
  return desejo.reload({ include: incluirCarta });
}

async function atualizar(desejo, dados) {
  await desejo.update(exigirAlgum(escolher(dados, CAMPOS), CAMPOS));
  return desejo;
}

const remover = (desejo) => desejo.destroy();

module.exports = {
  listar, criar, atualizar, remover, incluirCarta,
};
