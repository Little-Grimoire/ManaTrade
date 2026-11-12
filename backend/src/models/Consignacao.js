const { DataTypes, Model } = require('sequelize');
const { condicao, quantidade } = require('./constantes');

// Fluxo de status (RF07):
//   pendente ──► aceita ──► a_venda ──► vendida
//      │           │           └──────► devolvida
//      │           └──────────────────► devolvida
//      ├──► recusada   (loja recusou)
//      └──► cancelada  (usuário desistiu antes da resposta)
const STATUS = ['pendente', 'aceita', 'recusada', 'cancelada', 'a_venda', 'vendida', 'devolvida'];

const TRANSICOES = {
  pendente: ['aceita', 'recusada', 'cancelada'],
  aceita: ['a_venda', 'devolvida'],
  a_venda: ['vendida', 'devolvida'],
  recusada: [],
  cancelada: [],
  vendida: [],
  devolvida: [],
};

const ROTULOS = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  recusada: 'Recusada',
  cancelada: 'Cancelada',
  a_venda: 'À venda',
  vendida: 'Vendida',
  devolvida: 'Devolvida',
};

class Consignacao extends Model {
  static podeTransicionar(de, para) {
    return (TRANSICOES[de] || []).includes(para);
  }

  get encerrada() {
    return TRANSICOES[this.status]?.length === 0;
  }
}

module.exports = (sequelize) => {
  Consignacao.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    loja_id: { type: DataTypes.INTEGER, allowNull: false },
    carta_id: { type: DataTypes.INTEGER, allowNull: false },
    // Item da coleção de origem. Fica nulo se o item for apagado depois (o histórico continua).
    item_colecao_id: { type: DataTypes.INTEGER },
    quantidade: quantidade(DataTypes),
    condicao: condicao(DataTypes),
    foil: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    preco_pedido: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: { args: [0.01], msg: 'O preço pedido deve ser maior que zero.' } },
    },
    preco_venda: {
      type: DataTypes.DECIMAL(10, 2),
      validate: { min: { args: [0], msg: 'O preço de venda não pode ser negativo.' } },
    },
    status: {
      type: DataTypes.ENUM(...STATUS),
      allowNull: false,
      defaultValue: 'pendente',
      validate: { isIn: { args: [STATUS], msg: 'Status inválido.' } },
    },
    observacao: { type: DataTypes.TEXT }, // mensagem do usuário para a loja
    resposta_loja: { type: DataTypes.TEXT },
    respondida_em: { type: DataTypes.DATE },
    encerrada_em: { type: DataTypes.DATE },
  }, {
    sequelize,
    modelName: 'Consignacao',
    tableName: 'consignacoes',
    validate: {
      // Toda consignação nasce pendente; os demais status só por transição.
      statusInicial() {
        if (this.isNewRecord && this.status !== 'pendente') {
          throw new Error('Uma consignação nova deve começar com status "pendente".');
        }
      },
    },
    hooks: {
      beforeUpdate(consignacao) {
        if (!consignacao.changed('status')) return;
        const de = consignacao.previous('status');
        const para = consignacao.status;
        if (!Consignacao.podeTransicionar(de, para)) {
          throw new Error(`Transição de status inválida: ${ROTULOS[de]} → ${ROTULOS[para]}.`);
        }
        const agora = new Date();
        if (de === 'pendente') consignacao.respondida_em = agora;
        if (TRANSICOES[para].length === 0) consignacao.encerrada_em = agora;
      },

      // Notifica o dono da loja quando chega uma nova consignação.
      async afterCreate(consignacao, options) {
        const { Loja, Notificacao } = sequelize.models;
        const loja = await Loja.findByPk(consignacao.loja_id, { transaction: options.transaction });
        if (!loja) return;
        await Notificacao.create({
          usuario_id: loja.usuario_id,
          tipo: 'consignacao',
          titulo: 'Nova consignação recebida',
          mensagem: `Há uma nova proposta de consignação (#${consignacao.id}) aguardando resposta.`,
          referencia_id: consignacao.id,
        }, { transaction: options.transaction });
      },

      // Notifica o usuário a cada mudança de status (RF10).
      async afterUpdate(consignacao, options) {
        if (!consignacao.changed('status')) return;
        await sequelize.models.Notificacao.create({
          usuario_id: consignacao.usuario_id,
          tipo: 'consignacao',
          titulo: `Consignação ${ROTULOS[consignacao.status].toLowerCase()}`,
          mensagem: `Sua consignação #${consignacao.id} mudou para "${ROTULOS[consignacao.status]}".`,
          referencia_id: consignacao.id,
        }, { transaction: options.transaction });
      },
    },
  });

  Consignacao.STATUS = STATUS;
  Consignacao.TRANSICOES = TRANSICOES;
  Consignacao.ROTULOS = ROTULOS;
  return Consignacao;
};
