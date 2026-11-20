// API /api/notificacoes. As regras ficam em services/notificacoes.js.
const servico = require('../services/notificacoes');

// GET /api/notificacoes?lida=false
const listar = async (req, res) => res.json(await servico.listar(req.usuario, req.query));

const obter = (req, res) => res.json(req.registro);

// POST /api/notificacoes  { usuario_id, titulo, mensagem? }  (admin)
async function criar(req, res) {
  const notificacao = await servico.criar(req.body);
  res.status(201).location(`/api/notificacoes/${notificacao.id}`).json(notificacao);
}

// PATCH /api/notificacoes/:id  { lida }
const atualizar = async (req, res) => res.json(await servico.atualizar(req.registro, req.body));

// PATCH /api/notificacoes/lidas — marca todas como lidas
const marcarTodasLidas = async (req, res) => res.json({ alteradas: await servico.marcarTodasLidas(req.usuario) });

async function remover(req, res) {
  await servico.remover(req.registro);
  res.status(204).end();
}

module.exports = {
  listar, obter, criar, atualizar, marcarTodasLidas, remover,
};
