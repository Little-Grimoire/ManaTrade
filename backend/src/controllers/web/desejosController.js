// Páginas da lista de desejos. Regras em services/desejos.js (as mesmas da API).
const servico = require('../../services/desejos');
const { Desejo } = require('../../models');

async function index(req, res) {
  res.render('desejos/index', { titulo: 'Lista de desejos', desejos: await servico.listar(req.usuario), PRIORIDADES: Desejo.PRIORIDADES });
}

async function criar(req, res) {
  const desejo = await servico.criar(req.usuario, req.body);
  res.flash('ok', `${desejo.carta.nome} adicionada à lista de desejos.`);
  res.redirect('/desejos');
}

const editar = (req, res) => res.render('desejos/editar', { titulo: 'Editar desejo', desejo: req.registro, PRIORIDADES: Desejo.PRIORIDADES });

async function atualizar(req, res) {
  await servico.atualizar(req.registro, req.body);
  res.flash('ok', 'Desejo atualizado.');
  res.redirect('/desejos');
}

async function remover(req, res) {
  await servico.remover(req.registro);
  res.flash('ok', `${req.registro.carta.nome} removida da lista.`);
  res.redirect('/desejos');
}

module.exports = {
  index, criar, editar, atualizar, remover,
};
