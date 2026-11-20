// API /api/usuarios — gestão de contas pelo admin. As regras ficam em services/usuarios.js.
const servico = require('../services/usuarios');

// GET /api/usuarios?perfil=&ativo=&busca=
const listar = async (req, res) => res.json(await servico.listar(req.query));

// GET /api/usuarios/:id  (req.registro vem do middleware carregar)
const obter = (req, res) => res.json(req.registro);

// POST /api/usuarios
async function criar(req, res) {
  const usuario = await servico.criar(req.body);
  res.status(201).location(`/api/usuarios/${usuario.id}`).json(usuario);
}

// PATCH /api/usuarios/:id
const atualizar = async (req, res) => res.json(await servico.atualizar(req.usuario, req.registro, req.body));

// DELETE /api/usuarios/:id
async function remover(req, res) {
  await servico.remover(req.usuario, req.registro);
  res.status(204).end();
}

module.exports = { listar, obter, criar, atualizar, remover };
