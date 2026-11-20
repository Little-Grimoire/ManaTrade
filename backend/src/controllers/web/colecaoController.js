// Páginas da coleção do jogador. Regras em services/colecao.js (as mesmas da API).
const servico = require('../../services/colecao');
const { booleano } = require('../../utils/campos');

async function index(req, res) {
  res.render('colecao/index', { titulo: 'Minha coleção', itens: await servico.listar(req.usuario) });
}

async function criar(req, res) {
  const { item, criado } = await servico.criar(req.usuario, req.body);
  res.flash('ok', criado ? `${item.carta.nome} adicionada à coleção.` : `Quantidade de ${item.carta.nome} atualizada para ${item.quantidade}.`);
  res.redirect('/colecao');
}

async function editar(req, res) {
  res.render('colecao/editar', { titulo: 'Editar item', item: await servico.detalhar(req.usuario, req.registro) });
}

async function atualizar(req, res) {
  // Checkbox desmarcado não é enviado pelo formulário: ausente = false.
  await servico.atualizar(req.usuario, req.registro, { ...req.body, foil: booleano(req.body.foil) });
  res.flash('ok', 'Item atualizado.');
  res.redirect('/colecao');
}

async function remover(req, res) {
  await servico.remover(req.registro);
  res.flash('ok', `${req.registro.carta.nome} removida da coleção.`);
  res.redirect('/colecao');
}

module.exports = {
  index, criar, editar, atualizar, remover,
};
