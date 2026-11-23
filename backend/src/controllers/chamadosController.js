// API /api/chamados. As regras ficam em services/chamados.js.
const servico = require('../services/chamados');

// GET /api/chamados?status=
const listar = async (req, res) => res.json(await servico.listar(req.usuario, req.query));

const obter = (req, res) => res.json(req.registro);

// POST /api/chamados  { assunto, mensagem }
async function criar(req, res) {
  const chamado = await servico.criar(req.usuario, req.body);
  res.status(201).location(`/api/chamados/${chamado.id}`).json(chamado);
}

const atualizar = async (req, res) => res.json(await servico.atualizar(req.usuario, req.registro, req.body));

async function remover(req, res) {
  await servico.remover(req.usuario, req.registro);
  res.status(204).end();
}

module.exports = { listar, obter, criar, atualizar, remover };
