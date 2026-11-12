// Lista de desejos do usuário logado (desejos: N:N Usuário ↔ Carta). CRUD completo.
const { Desejo, Carta } = require('../models');
const { obterCarta } = require('../services/cartas');
const HttpError = require('../utils/HttpError');

const CAMPOS_EDITAVEIS = ['prioridade', 'preco_maximo_usd', 'observacao'];
const incluirCarta = { model: Carta, as: 'carta' };

const escolher = (objeto, campos) => Object.fromEntries(
  campos.filter((c) => objeto?.[c] !== undefined).map((c) => [c, objeto[c] === '' ? null : objeto[c]]),
);

// Busca o desejo garantindo que ele pertence ao usuário logado.
// Desejo de outra pessoa responde 404 (não revela que o id existe).
async function desejoDoUsuario(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(404, 'Desejo não encontrado.');
  const desejo = await Desejo.findOne({
    where: { id, usuario_id: req.usuario.id },
    include: incluirCarta,
  });
  if (!desejo) throw new HttpError(404, 'Desejo não encontrado.');
  return desejo;
}

// GET /api/desejos
async function listar(req, res) {
  const desejos = await Desejo.findAll({
    where: { usuario_id: req.usuario.id },
    include: incluirCarta,
    order: [['created_at', 'DESC']],
  });
  res.json(desejos);
}

// GET /api/desejos/:id
async function obter(req, res) {
  res.json(await desejoDoUsuario(req));
}

// POST /api/desejos  { carta_id | scryfall_id | nome, prioridade?, preco_maximo_usd?, observacao? }
async function criar(req, res) {
  const carta = await obterCarta(req.body || {});
  const existente = await Desejo.findOne({ where: { usuario_id: req.usuario.id, carta_id: carta.id } });
  if (existente) throw new HttpError(409, `${carta.nome} já está na sua lista de desejos.`);

  const desejo = await Desejo.create({
    ...escolher(req.body, CAMPOS_EDITAVEIS),
    usuario_id: req.usuario.id, // sempre do token, nunca do corpo
    carta_id: carta.id,
  });
  await desejo.reload({ include: incluirCarta });
  res.status(201).location(`/api/desejos/${desejo.id}`).json(desejo);
}

// PATCH /api/desejos/:id  { prioridade?, preco_maximo_usd?, observacao? }
async function atualizar(req, res) {
  const desejo = await desejoDoUsuario(req);
  const dados = escolher(req.body, CAMPOS_EDITAVEIS);
  if (!Object.keys(dados).length) throw new HttpError(400, `Nada para atualizar. Campos aceitos: ${CAMPOS_EDITAVEIS.join(', ')}.`);
  await desejo.update(dados);
  res.json(desejo);
}

// DELETE /api/desejos/:id
async function remover(req, res) {
  const desejo = await desejoDoUsuario(req);
  await desejo.destroy();
  res.status(204).end();
}

module.exports = { listar, obter, criar, atualizar, remover };
