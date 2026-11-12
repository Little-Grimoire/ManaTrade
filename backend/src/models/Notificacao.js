const { DataTypes, Model } = require('sequelize');

// Notificações exibidas no app (RF10). Geradas pelos hooks de Consignacao e Chamado.
const TIPOS = ['consignacao', 'chamado', 'sistema'];

class Notificacao extends Model {}

module.exports = (sequelize) => {
  Notificacao.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo: {
      type: DataTypes.ENUM(...TIPOS),
      allowNull: false,
      defaultValue: 'sistema',
      validate: { isIn: { args: [TIPOS], msg: 'Tipo inválido.' } },
    },
    titulo: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { notEmpty: { msg: 'Informe o título.' } },
    },
    mensagem: { type: DataTypes.TEXT },
    // id da consignação ou do chamado a que a notificação se refere (conforme o tipo).
    referencia_id: { type: DataTypes.INTEGER },
    lida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    sequelize,
    modelName: 'Notificacao',
    tableName: 'notificacoes',
    indexes: [{ fields: ['usuario_id', 'lida'] }],
  });

  Notificacao.TIPOS = TIPOS;
  return Notificacao;
};
