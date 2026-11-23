// Notificações (RF10). As automáticas vêm dos hooks de Consignacao e Chamado;
// o admin também pode enviar avisos do tipo "sistema".
const { Notificacao, Usuario } = require('../models');
const HttpError = require('../utils/HttpError');
const { escolher, booleano, idValido } = require('../utils/campos');

function listar(usuario, { lida } = {}) {
  const where = { usuario_id: usuario.id };
  if (lida !== undefined && lida !== '') where.lida = booleano(lida);
  return Notificacao.findAll({ where, order: [['created_at', 'DESC']] });
}

// Só admin (rota com autorizar('admin')). dados: { usuario_id, titulo, mensagem? }
async function criar(dados = {}) {
  const destinatario = await Usuario.findByPk(idValido(dados.usuario_id, 'Destinatário não encontrado.'));
  if (!destinatario) throw new HttpError(404, 'Destinatário não encontrado.');
  return Notificacao.create({ ...escolher(dados, ['titulo', 'mensagem']), usuario_id: destinatario.id, tipo: 'sistema' });
}

async function atualizar(notificacao, dados = {}) {
  if (dados.lida === undefined) throw new HttpError(400, 'Nada para atualizar. Campos aceitos: lida.');
  return notificacao.update({ lida: booleano(dados.lida) });
}

// Marca todas as notificações do usuário como lidas; devolve quantas mudaram.
async function marcarTodasLidas(usuario) {
  const [alteradas] = await Notificacao.update({ lida: true }, { where: { usuario_id: usuario.id, lida: false } });
  return alteradas;
}

const remover = (notificacao) => notificacao.destroy();

module.exports = {
  listar, criar, atualizar, marcarTodasLidas, remover,
};
