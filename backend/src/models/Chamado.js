const { DataTypes, Model } = require('sequelize');

// Chamado de suporte aberto por qualquer usuário e atendido por um admin (RF09).
const STATUS = ['aberto', 'em_atendimento', 'resolvido'];

class Chamado extends Model {}

module.exports = (sequelize) => {
  Chamado.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    // Admin que assumiu o chamado.
    atendente_id: { type: DataTypes.INTEGER },
    assunto: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { notEmpty: { msg: 'Informe o assunto.' } },
    },
    mensagem: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: { msg: 'Descreva o problema.' } },
    },
    status: {
      type: DataTypes.ENUM(...STATUS),
      allowNull: false,
      defaultValue: 'aberto',
      validate: { isIn: { args: [STATUS], msg: 'Status inválido.' } },
    },
    resposta: { type: DataTypes.TEXT },
  }, {
    sequelize,
    modelName: 'Chamado',
    tableName: 'chamados',
    hooks: {
      // Avisa quem abriu o chamado quando o admin responde ou resolve.
      async afterUpdate(chamado, options) {
        if (!chamado.changed('resposta') && !chamado.changed('status')) return;
        await sequelize.models.Notificacao.create({
          usuario_id: chamado.usuario_id,
          tipo: 'chamado',
          titulo: chamado.status === 'resolvido' ? 'Chamado resolvido' : 'Chamado atualizado',
          mensagem: `Seu chamado "${chamado.assunto}" foi atualizado pelo suporte.`,
          referencia_id: chamado.id,
        }, { transaction: options.transaction });
      },
    },
  });

  Chamado.STATUS = STATUS;
  return Chamado;
};
