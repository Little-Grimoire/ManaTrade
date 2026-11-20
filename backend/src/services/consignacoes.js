// Consignação (RF07): o jogador deixa uma carta da coleção para a loja vender.
//
// Quem pode o quê (a rota já garantiu, via middleware, que o usuário participa da consignação):
//   jogador (dono)  – cria; enquanto "pendente" edita preço/quantidade/observação ou cancela
//   loja            – aceita, recusa, coloca à venda, registra venda ou devolução; responde
//   admin           – consulta tudo e exclui
// As transições válidas estão em Consignacao.TRANSICOES; o model também as valida.
const {
  sequelize, Consignacao, Loja, ItemColecao, ItemAcervo, Carta, Usuario,
} = require('../models');
const HttpError = require('../utils/HttpError');
const { escolher, exigirAlgum, idValido } = require('../utils/campos');

const CAMPOS_DONO = ['quantidade', 'preco_pedido', 'observacao', 'status'];
const CAMPOS_LOJA = ['status', 'resposta_loja', 'preco_venda'];
const STATUS_DO_DONO = ['cancelada'];
const STATUS_DA_LOJA = ['aceita', 'recusada', 'a_venda', 'vendida', 'devolvida'];

const incluir = [
  { model: Carta, as: 'carta' },
  { model: Loja, as: 'loja', attributes: ['id', 'nome', 'cidade', 'uf', 'usuario_id'] },
  { model: Usuario, as: 'usuario', attributes: ['id', 'nome', 'email'] },
];

// Cada perfil vê as suas: jogador as que enviou, loja as que recebeu, admin todas.
function listar(usuario, { status } = {}) {
  const where = {};
  if (usuario.perfil === 'usuario') where.usuario_id = usuario.id;
  if (usuario.perfil === 'loja') where.loja_id = usuario.loja?.id ?? -1;
  if (status) where.status = status;
  return Consignacao.findAll({ where, include: incluir, order: [['created_at', 'DESC']] });
}

// Usada pelo middleware carregar(): participa quem enviou, a loja que recebeu e o admin.
const participa = (u, c) => u.perfil === 'admin' || c.usuario_id === u.id || (!!u.loja && c.loja_id === u.loja.id);

// dados: { loja_id, item_colecao_id, quantidade?, preco_pedido, observacao? }
async function criar(usuario, dados = {}) {
  const loja = await Loja.findByPk(idValido(dados.loja_id, 'Loja não encontrada.'));
  if (!loja || !loja.aprovada) throw new HttpError(404, 'Loja não encontrada.');
  if (!loja.aceita_consignacao) throw new HttpError(409, 'Esta loja não está aceitando consignações.');

  const item = await ItemColecao.findOne({
    where: { id: idValido(dados.item_colecao_id, 'Item da coleção não encontrado.'), usuario_id: usuario.id },
  });
  if (!item) throw new HttpError(404, 'Item da coleção não encontrado.');

  const quantidade = Number(dados.quantidade ?? 1);
  if (!Number.isInteger(quantidade) || quantidade < 1) throw new HttpError(400, 'A quantidade deve ser um número inteiro maior que zero.');
  if (quantidade > item.quantidade) throw new HttpError(400, `Você só tem ${item.quantidade} cópia(s) deste item.`);

  // Carta, condição e foil vêm do item da coleção, não do corpo.
  const consignacao = await Consignacao.create({
    usuario_id: usuario.id,
    loja_id: loja.id,
    carta_id: item.carta_id,
    item_colecao_id: item.id,
    condicao: item.condicao,
    foil: item.foil,
    quantidade,
    preco_pedido: dados.preco_pedido,
    observacao: dados.observacao || null,
  });
  return consignacao.reload({ include: incluir });
}

// Efeitos de cada status novo, na mesma transação da mudança.
async function aplicarEfeitos(c, transaction) {
  if (c.status === 'a_venda') {
    // Vai para a vitrine da loja, ligado à consignação.
    await ItemAcervo.create({
      loja_id: c.loja_id, carta_id: c.carta_id, quantidade: c.quantidade, condicao: c.condicao, foil: c.foil,
      preco: c.preco_venda ?? c.preco_pedido, consignacao_id: c.id,
    }, { transaction });
  }
  if (c.status === 'vendida' || c.status === 'devolvida') {
    await ItemAcervo.destroy({ where: { consignacao_id: c.id }, transaction });
  }
  if (c.status === 'vendida' && c.item_colecao_id) {
    // A carta saiu da coleção do jogador.
    const item = await ItemColecao.findByPk(c.item_colecao_id, { transaction });
    if (item && item.quantidade > c.quantidade) await item.update({ quantidade: item.quantidade - c.quantidade }, { transaction });
    else if (item) await item.destroy({ transaction });
  }
}

async function atualizar(usuario, c, dados) {
  let campos;
  if (usuario.perfil === 'admin') {
    throw new HttpError(403, 'O administrador apenas consulta e exclui consignações.');
  } else if (c.usuario_id === usuario.id) {
    campos = exigirAlgum(escolher(dados, CAMPOS_DONO), CAMPOS_DONO);
    if (campos.status && !STATUS_DO_DONO.includes(campos.status)) throw new HttpError(403, 'Você só pode cancelar a consignação; o restante é decidido pela loja.');
    if (c.status !== 'pendente') throw new HttpError(409, 'A consignação já foi respondida pela loja e não pode mais ser alterada.');
  } else {
    campos = exigirAlgum(escolher(dados, CAMPOS_LOJA), CAMPOS_LOJA);
    if (campos.status && !STATUS_DA_LOJA.includes(campos.status)) throw new HttpError(403, 'Status não permitido para a loja.');
  }

  if (campos.status && campos.status !== c.status && !Consignacao.podeTransicionar(c.status, campos.status)) {
    const { ROTULOS } = Consignacao;
    throw new HttpError(409, `Transição de status inválida: ${ROTULOS[c.status]} → ${ROTULOS[campos.status] || campos.status}.`);
  }
  if (campos.status === c.status) delete campos.status;

  await sequelize.transaction(async (transaction) => {
    await c.update(campos, { transaction });
    if (campos.status) await aplicarEfeitos(c, transaction);
  });
  return c.reload({ include: incluir });
}

// Admin exclui qualquer uma; o jogador só a pendente (desistência) ou já encerrada (limpar histórico).
async function remover(usuario, c) {
  if (usuario.perfil !== 'admin') {
    if (c.usuario_id !== usuario.id) throw new HttpError(403, 'Só quem enviou a consignação pode excluí-la.');
    if (c.status !== 'pendente' && !c.encerrada) throw new HttpError(409, 'Consignação em andamento não pode ser excluída.');
  }
  await sequelize.transaction(async (transaction) => {
    await ItemAcervo.destroy({ where: { consignacao_id: c.id }, transaction });
    await c.destroy({ transaction });
  });
}

module.exports = {
  listar, participa, criar, atualizar, remover, incluir, STATUS_DA_LOJA,
};
