// Páginas de decks e das cartas do deck. Regras em services/decks.js (as mesmas da API).
const servico = require('../../services/decks');

const formatos = () => servico.formatos();

async function index(req, res) {
  res.render('decks/index', { titulo: 'Meus decks', decks: await servico.listar(req.usuario), formatos: formatos() });
}

async function criar(req, res) {
  const deck = await servico.criar(req.usuario, req.body);
  res.flash('ok', 'Deck criado.');
  res.redirect(`/decks/${deck.id}`);
}

async function ver(req, res) {
  const deck = await servico.detalhar(req.registro.id);
  res.render('decks/ver', { titulo: deck.nome, deck, formatos: formatos() });
}

const voltarAoDeck = (req, res, texto) => {
  res.flash('ok', texto);
  res.redirect(`/decks/${req.registro.id}`);
};

async function atualizar(req, res) {
  const { comandante_atual: atual, ...dados } = req.body;
  if (dados.comandante === atual) delete dados.comandante; // não mudou: evita consultar o Scryfall
  await servico.atualizar(req.registro, dados);
  voltarAoDeck(req, res, 'Deck atualizado.');
}

async function remover(req, res) {
  await servico.remover(req.registro);
  res.flash('ok', `Deck "${req.registro.nome}" excluído.`);
  res.redirect('/decks');
}

async function adicionarCarta(req, res) {
  await servico.adicionarCarta(req.registro, req.body);
  voltarAoDeck(req, res, 'Carta adicionada.');
}

async function atualizarCarta(req, res) {
  await servico.atualizarCarta(req.registro, req.params.cartaId, req.body.quantidade);
  voltarAoDeck(req, res, 'Quantidade atualizada.');
}

async function removerCarta(req, res) {
  await servico.removerCarta(req.registro, req.params.cartaId);
  voltarAoDeck(req, res, 'Carta removida do deck.');
}

async function importar(req, res) {
  const naoEncontradas = await servico.importar(req.registro, req.body);
  voltarAoDeck(req, res, naoEncontradas.length
    ? `Lista importada. Não encontradas: ${naoEncontradas.join(', ')}.`
    : 'Lista importada.');
}

module.exports = {
  index, criar, ver, atualizar, remover, adicionarCarta, atualizarCarta, removerCarta, importar,
};
