// Página de notificações. Regras em services/notificacoes.js (as mesmas da API).
const servico = require('../../services/notificacoes');
const { Usuario } = require('../../models');

async function index(req, res) {
  const notificacoes = await servico.listar(req.usuario, req.query);
  // Admin escolhe o destinatário de um aviso.
  const usuarios = req.usuario.perfil === 'admin' ? await Usuario.findAll({ order: [['nome', 'ASC']] }) : [];
  res.render('notificacoes/index', { titulo: 'Notificações', notificacoes, usuarios });
}

async function criar(req, res) {
  await servico.criar(req.body);
  res.flash('ok', 'Aviso enviado.');
  res.redirect('/notificacoes');
}

async function atualizar(req, res) {
  await servico.atualizar(req.registro, req.body);
  res.redirect('/notificacoes');
}

async function marcarTodasLidas(req, res) {
  const alteradas = await servico.marcarTodasLidas(req.usuario);
  res.flash('ok', `${alteradas} notificação(ões) marcada(s) como lida(s).`);
  res.redirect('/notificacoes');
}

async function remover(req, res) {
  await servico.remover(req.registro);
  res.flash('ok', 'Notificação excluída.');
  res.redirect('/notificacoes');
}

module.exports = {
  index, criar, atualizar, marcarTodasLidas, remover,
};
