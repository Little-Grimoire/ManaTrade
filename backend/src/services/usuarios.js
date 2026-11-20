// Gestão de usuários pelo administrador (RF09). Quem chama já passou por autorizar('admin').
const { Op } = require('sequelize');
const { Usuario, Loja } = require('../models');
const HttpError = require('../utils/HttpError');
const { escolher, booleano, exigirAlgum } = require('../utils/campos');

const CAMPOS = ['nome', 'email', 'senha', 'perfil', 'ativo'];
const incluirLoja = { model: Loja, as: 'loja' };

// Filtros opcionais: perfil, ativo, busca (nome ou e-mail).
async function listar({ perfil, ativo, busca } = {}) {
  const where = {};
  if (perfil) where.perfil = perfil;
  if (ativo !== undefined && ativo !== '') where.ativo = booleano(ativo);
  if (busca) where[Op.or] = [{ nome: { [Op.like]: `%${busca}%` } }, { email: { [Op.like]: `%${busca}%` } }];
  return Usuario.findAll({ where, include: incluirLoja, order: [['nome', 'ASC']] });
}

// O admin pode criar qualquer perfil, inclusive outro admin. A loja de um usuário "loja" é criada à parte (/lojas).
async function criar(dados) {
  const campos = escolher(dados, CAMPOS);
  if (campos.ativo !== undefined) campos.ativo = booleano(campos.ativo);
  const usuario = await Usuario.create(campos);
  return usuario.reload({ include: incluirLoja });
}

async function atualizar(admin, usuario, dados) {
  const campos = exigirAlgum(escolher(dados, CAMPOS), CAMPOS);
  if (campos.senha === null) delete campos.senha; // senha em branco no formulário = manter
  if (campos.ativo !== undefined) campos.ativo = booleano(campos.ativo);

  if (usuario.id === admin.id && ((campos.perfil && campos.perfil !== 'admin') || campos.ativo === false)) {
    throw new HttpError(409, 'Você não pode rebaixar nem bloquear a própria conta.');
  }
  if (campos.perfil && campos.perfil !== 'loja' && usuario.perfil === 'loja') {
    const loja = await Loja.findOne({ where: { usuario_id: usuario.id } });
    if (loja) throw new HttpError(409, 'Este usuário tem uma loja cadastrada. Exclua a loja antes de mudar o perfil.');
  }
  await usuario.update(campos);
  return usuario.reload({ include: incluirLoja });
}

// Apaga em cascata decks, coleção, desejos, loja, consignações, chamados e notificações do usuário.
async function remover(admin, usuario) {
  if (usuario.id === admin.id) throw new HttpError(409, 'Você não pode excluir a própria conta por aqui.');
  await usuario.destroy();
}

module.exports = { listar, criar, atualizar, remover, CAMPOS };
