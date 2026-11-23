// Páginas de gestão de usuários (admin). Regras em services/usuarios.js (as mesmas da API).
const servico = require('../../services/usuarios');
const { booleano } = require('../../utils/campos');

async function index(req, res) {
  const usuarios = await servico.listar(req.query);
  res.render('usuarios/index', { titulo: 'Usuários', usuarios, filtros: req.query });
}

async function criar(req, res) {
  const usuario = await servico.criar(req.body);
  res.flash('ok', `Usuário ${usuario.nome} criado.`);
  res.redirect('/usuarios');
}

const editar = (req, res) => res.render('usuarios/editar', { titulo: `Editar ${req.registro.nome}`, alvo: req.registro });

async function atualizar(req, res) {
  await servico.atualizar(req.usuario, req.registro, { ...req.body, ativo: booleano(req.body.ativo) });
  res.flash('ok', 'Usuário atualizado.');
  res.redirect('/usuarios');
}

async function remover(req, res) {
  await servico.remover(req.usuario, req.registro);
  res.flash('ok', `Usuário ${req.registro.nome} excluído.`);
  res.redirect('/usuarios');
}

module.exports = {
  index, criar, editar, atualizar, remover,
};
