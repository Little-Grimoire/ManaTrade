// API /api/decks — decks do usuário logado. Regras em services/decks.js.
// O deck de :id chega em req.registro, já conferido pelo middleware carregar() (só o dono).
const servico = require('../services/decks');

// Responde o deck completo (cartas, validação e estatísticas).
const responderDeck = async (res, deckId, status = 200) => res.status(status).json(await servico.detalhar(deckId));

// GET /api/decks/formatos
const formatos = (req, res) => res.json(servico.formatos());

// GET /api/decks — resumo de cada deck
const listar = async (req, res) => res.json(await servico.listar(req.usuario));

// GET /api/decks/:id
const obter = (req, res) => responderDeck(res, req.registro.id);

// POST /api/decks  { nome, formato?, descricao?, comandante? }
async function criar(req, res) {
  const deck = await servico.criar(req.usuario, req.body);
  res.location(`/api/decks/${deck.id}`);
  await responderDeck(res, deck.id, 201);
}

// PATCH /api/decks/:id  { nome?, formato?, descricao?, comandante? (null remove) }
async function atualizar(req, res) {
  await servico.atualizar(req.registro, req.body);
  await responderDeck(res, req.registro.id);
}

// DELETE /api/decks/:id
async function remover(req, res) {
  await servico.remover(req.registro);
  res.status(204).end();
}

// POST /api/decks/:id/cartas  { carta_id | scryfall_id | nome, quantidade? }
async function adicionarCarta(req, res) {
  await servico.adicionarCarta(req.registro, req.body);
  await responderDeck(res, req.registro.id, 201);
}

// PATCH /api/decks/:id/cartas/:cartaId  { quantidade }
async function atualizarCarta(req, res) {
  await servico.atualizarCarta(req.registro, req.params.cartaId, req.body?.quantidade);
  await responderDeck(res, req.registro.id);
}

// DELETE /api/decks/:id/cartas/:cartaId — devolve o deck atualizado.
async function removerCarta(req, res) {
  await servico.removerCarta(req.registro, req.params.cartaId);
  await responderDeck(res, req.registro.id);
}

// POST /api/decks/:id/importar  { lista, substituir? } → { deck, naoEncontradas }
async function importar(req, res) {
  const naoEncontradas = await servico.importar(req.registro, req.body);
  res.json({ deck: await servico.detalhar(req.registro.id), naoEncontradas });
}

module.exports = {
  formatos, listar, obter, criar, atualizar, remover, adicionarCarta, atualizarCarta, removerCarta, importar,
};
