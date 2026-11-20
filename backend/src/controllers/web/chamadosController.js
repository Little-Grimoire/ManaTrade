// Páginas de chamados de suporte. Regras em services/chamados.js (as mesmas da API).
const servico = require('../../services/chamados');

async function index(req, res) {
  const chamados = await servico.listar(req.usuario, req.query);
  res.render('chamados/index', { titulo: 'Suporte', chamados, filtro: req.query.status || '' });
}

async function criar(req, res) {
  const chamado = await servico.criar(req.usuario, req.body);
  res.flash('ok', 'Chamado aberto. Você será notificado quando houver resposta.');
  res.redirect(`/chamados/${chamado.id}`);
}

const ver = (req, res) => res.render('chamados/ver', { titulo: `Chamado #${req.registro.id}`, chamado: req.registro });

async function atualizar(req, res) {
  await servico.atualizar(req.usuario, req.registro, req.body);
  res.flash('ok', 'Chamado atualizado.');
  res.redirect(`/chamados/${req.registro.id}`);
}

async function remover(req, res) {
  await servico.remover(req.usuario, req.registro);
  res.flash('ok', 'Chamado excluído.');
  res.redirect('/chamados');
}

module.exports = {
  index, criar, ver, atualizar, remover,
};
