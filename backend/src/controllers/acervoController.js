// API /api/acervo — estoque da loja logada. req.loja vem do middleware exigirLojaAprovada.
const servico = require('../services/acervo');

const listar = async (req, res) => res.json(await servico.listar(req.loja));

const obter = (req, res) => res.json(req.registro);

async function criar(req, res) {
  const item = await servico.criar(req.loja, req.body || {});
  res.status(201).location(`/api/acervo/${item.id}`).json(item);
}

const atualizar = async (req, res) => res.json(await servico.atualizar(req.registro, req.body));

async function remover(req, res) {
  await servico.remover(req.registro);
  res.status(204).end();
}

module.exports = { listar, obter, criar, atualizar, remover };
