// API /api/cartas — catálogo local (cache do Scryfall). Leitura para todos; escrita só admin.
const { obterCarta, listarCartas, atualizarCarta, sincronizarCarta } = require('../services/cartas');

// GET /api/cartas?busca=&pagina=&limite=  → { total, pagina, cartas }
async function listar(req, res) {
  const { count, rows } = await listarCartas(req.query);
  res.json({ total: count, pagina: Number(req.query.pagina) || 1, cartas: rows });
}

// GET /api/cartas/:id
const obter = (req, res) => res.json(req.registro);

// POST /api/cartas  { scryfall_id | nome } — importa do Scryfall para o catálogo
async function criar(req, res) {
  const carta = await obterCarta({ scryfall_id: req.body?.scryfall_id, nome: req.body?.nome });
  res.status(201).location(`/api/cartas/${carta.id}`).json(carta);
}

// PATCH /api/cartas/:id
const atualizar = async (req, res) => res.json(await atualizarCarta(req.registro, req.body));

// POST /api/cartas/:id/sincronizar — recarrega preço/imagem/legalidades do Scryfall
const sincronizar = async (req, res) => res.json(await sincronizarCarta(req.registro));

// DELETE /api/cartas/:id — 409 se a carta estiver em uso (coleção, deck, acervo...)
async function remover(req, res) {
  await req.registro.destroy();
  res.status(204).end();
}

module.exports = {
  listar, obter, criar, atualizar, sincronizar, remover,
};
