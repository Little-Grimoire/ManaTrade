// Páginas do catálogo de cartas. Leitura para todos; edição só admin. Regras em services/cartas.js.
const {
  obterCarta, listarCartas, atualizarCarta, sincronizarCarta,
} = require('../../services/cartas');

const POR_PAGINA = 30;

async function index(req, res) {
  const pagina = Math.max(Number(req.query.pagina) || 1, 1);
  const { count, rows } = await listarCartas({ busca: req.query.busca, pagina, limite: POR_PAGINA });
  res.render('cartas/index', {
    titulo: 'Cartas', cartas: rows, total: count, pagina, paginas: Math.max(Math.ceil(count / POR_PAGINA), 1), busca: req.query.busca || '',
  });
}

async function criar(req, res) {
  const carta = await obterCarta({ nome: req.body.nome, scryfall_id: req.body.scryfall_id || undefined });
  res.flash('ok', `${carta.nome} está no catálogo.`);
  res.redirect(`/cartas/${carta.id}`);
}

const ver = (req, res) => res.render('cartas/ver', { titulo: req.registro.nome, carta: req.registro });

async function atualizar(req, res) {
  await atualizarCarta(req.registro, req.body);
  res.flash('ok', 'Carta atualizada.');
  res.redirect(`/cartas/${req.registro.id}`);
}

async function sincronizar(req, res) {
  await sincronizarCarta(req.registro);
  res.flash('ok', 'Dados atualizados com o Scryfall.');
  res.redirect(`/cartas/${req.registro.id}`);
}

async function remover(req, res) {
  await req.registro.destroy();
  res.flash('ok', `${req.registro.nome} excluída do catálogo.`);
  res.redirect('/cartas');
}

module.exports = {
  index, criar, ver, atualizar, sincronizar, remover,
};
