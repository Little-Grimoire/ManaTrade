// Páginas do acervo da loja logada. Regras em services/acervo.js (as mesmas da API).
const servico = require('../../services/acervo');
const { booleano } = require('../../utils/campos');

async function index(req, res) {
  res.render('acervo/index', { titulo: 'Acervo da loja', itens: await servico.listar(req.loja) });
}

async function criar(req, res) {
  const item = await servico.criar(req.loja, req.body);
  res.flash('ok', `${item.carta.nome} adicionada ao acervo.`);
  res.redirect('/acervo');
}

const editar = (req, res) => res.render('acervo/editar', { titulo: 'Editar item do acervo', item: req.registro });

async function atualizar(req, res) {
  await servico.atualizar(req.registro, { ...req.body, foil: booleano(req.body.foil) });
  res.flash('ok', 'Item atualizado.');
  res.redirect('/acervo');
}

async function remover(req, res) {
  await servico.remover(req.registro);
  res.flash('ok', `${req.registro.carta.nome} removida do acervo.`);
  res.redirect('/acervo');
}

module.exports = {
  index, criar, editar, atualizar, remover,
};
