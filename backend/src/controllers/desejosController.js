// API /api/desejos — lista de desejos do usuário logado. Regras em services/desejos.js.
// O desejo de :id chega em req.registro, já conferido pelo middleware carregar() (só o dono).
const servico = require('../services/desejos');

// GET /api/desejos
const listar = async (req, res) => res.json(await servico.listar(req.usuario));

// GET /api/desejos/:id
const obter = (req, res) => res.json(req.registro);

// POST /api/desejos  { carta_id | scryfall_id | nome, prioridade?, preco_maximo_brl?, observacao? }
async function criar(req, res) {
  const desejo = await servico.criar(req.usuario, req.body);
  res.status(201).location(`/api/desejos/${desejo.id}`).json(desejo);
}

// PATCH /api/desejos/:id  { prioridade?, preco_maximo_brl?, observacao? }
const atualizar = async (req, res) => res.json(await servico.atualizar(req.registro, req.body));

// DELETE /api/desejos/:id
async function remover(req, res) {
  await servico.remover(req.registro);
  res.status(204).end();
}

module.exports = { listar, obter, criar, atualizar, remover };
