// Chamados de suporte (RF09). Jogador ou loja abre; o admin atende e responde.
const { Chamado, Usuario } = require('../models');
const HttpError = require('../utils/HttpError');
const { escolher, exigirAlgum } = require('../utils/campos');

const CAMPOS_AUTOR = ['assunto', 'mensagem'];
const CAMPOS_ADMIN = ['status', 'resposta'];

const incluir = [
  { model: Usuario, as: 'usuario', attributes: ['id', 'nome', 'email', 'perfil'] },
  { model: Usuario, as: 'atendente', attributes: ['id', 'nome'] },
];

// Admin vê todos; os outros, só os próprios.
function listar(usuario, { status } = {}) {
  const where = {};
  if (usuario.perfil !== 'admin') where.usuario_id = usuario.id;
  if (status) where.status = status;
  return Chamado.findAll({ where, include: incluir, order: [['created_at', 'DESC']] });
}

async function criar(usuario, dados) {
  const chamado = await Chamado.create({ ...escolher(dados, CAMPOS_AUTOR), usuario_id: usuario.id });
  return chamado.reload({ include: incluir });
}

// Autor edita assunto/mensagem enquanto o chamado está aberto; admin muda status e responde (e vira o atendente).
async function atualizar(usuario, chamado, dados) {
  if (usuario.perfil === 'admin') {
    const campos = exigirAlgum(escolher(dados, CAMPOS_ADMIN), CAMPOS_ADMIN);
    await chamado.update({ ...campos, atendente_id: usuario.id });
  } else {
    if (chamado.status !== 'aberto') throw new HttpError(409, 'O chamado já está em atendimento e não pode ser editado.');
    await chamado.update(exigirAlgum(escolher(dados, CAMPOS_AUTOR), CAMPOS_AUTOR));
  }
  return chamado.reload({ include: incluir });
}

async function remover(usuario, chamado) {
  if (usuario.perfil !== 'admin' && chamado.status !== 'aberto') {
    throw new HttpError(409, 'Só é possível excluir chamados que ainda não foram atendidos.');
  }
  await chamado.destroy();
}

module.exports = {
  listar, criar, atualizar, remover, incluir,
};
