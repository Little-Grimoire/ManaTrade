// API /api/colecao — coleção do usuário logado. Regras em services/colecao.js.
// O item de :id chega em req.registro, já conferido pelo middleware carregar() (só o dono).
const servico = require('../services/colecao');

// GET /api/colecao
const listar = async (req, res) => res.json(await servico.listar(req.usuario));

// GET /api/colecao/:id — inclui em quais decks a carta está.
const obter = async (req, res) => res.json(await servico.detalhar(req.usuario, req.registro));

// POST /api/colecao  { carta_id | scryfall_id | nome, quantidade?, condicao?, foil?, observacao? }
// 201 item novo; 200 quando somou num item igual (mesma carta, condição e foil).
async function criar(req, res) {
  const { item, criado } = await servico.criar(req.usuario, req.body);
  if (!criado) return res.json(item);
  return res.status(201).location(`/api/colecao/${item.id}`).json(item);
}

// PATCH /api/colecao/:id  { quantidade?, condicao?, foil?, observacao? }
const atualizar = async (req, res) => res.json(await servico.atualizar(req.usuario, req.registro, req.body));

// DELETE /api/colecao/:id
async function remover(req, res) {
  await servico.remover(req.registro);
  res.status(204).end();
}

module.exports = { listar, obter, criar, atualizar, remover };
