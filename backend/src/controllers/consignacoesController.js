// API /api/consignacoes. As regras por perfil ficam em services/consignacoes.js.
const servico = require('../services/consignacoes');

// GET /api/consignacoes?status=
const listar = async (req, res) => res.json(await servico.listar(req.usuario, req.query));

const obter = (req, res) => res.json(req.registro);

// POST /api/consignacoes  { loja_id, item_colecao_id, quantidade?, preco_pedido, observacao? }
async function criar(req, res) {
  const consignacao = await servico.criar(req.usuario, req.body || {});
  res.status(201).location(`/api/consignacoes/${consignacao.id}`).json(consignacao);
}

const atualizar = async (req, res) => res.json(await servico.atualizar(req.usuario, req.registro, req.body));

async function remover(req, res) {
  await servico.remover(req.usuario, req.registro);
  res.status(204).end();
}

module.exports = { listar, obter, criar, atualizar, remover };
