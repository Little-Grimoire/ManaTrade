// API /api/lojas. As regras ficam em services/lojas.js.
const servico = require('../services/lojas');
const HttpError = require('../utils/HttpError');

// GET /api/lojas?aprovada=&cidade=
const listar = async (req, res) => res.json(await servico.listar(req.usuario, req.query));

// GET /api/lojas/:id
const obter = (req, res) => res.json(req.registro);

// GET /api/lojas/:id/acervo — vitrine (só de loja aprovada, a menos que seja o dono ou admin)
const acervo = async (req, res) => res.json(await servico.acervoDaLoja(req.registro.id));

// POST /api/lojas
async function criar(req, res) {
  const loja = await servico.criar(req.usuario, req.body || {});
  res.status(201).location(`/api/lojas/${loja.id}`).json(loja);
}

// PATCH /api/lojas/:id
const atualizar = async (req, res) => res.json(await servico.atualizar(req.usuario, req.registro, req.body));

// DELETE /api/lojas/:id
async function remover(req, res) {
  await servico.remover(req.registro);
  res.status(204).end();
}

// GET /api/lojas/minha — atalho para a loja do usuário logado (perfil loja)
function minha(req, res) {
  if (!req.usuario.loja) throw new HttpError(404, 'Você ainda não cadastrou sua loja.');
  res.json(req.usuario.loja);
}

module.exports = {
  listar, obter, acervo, criar, atualizar, remover, minha,
};
