const { DataTypes, Model } = require('sequelize');
const { condicao, quantidade } = require('./constantes');

// Tabela associativa Usuário N:N Carta (coleção do jogador, RF03).
class ItemColecao extends Model {}

module.exports = (sequelize) => {
  ItemColecao.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    carta_id: { type: DataTypes.INTEGER, allowNull: false },
    quantidade: quantidade(DataTypes),
    condicao: condicao(DataTypes),
    foil: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    observacao: { type: DataTypes.STRING(255) },
  }, {
    sequelize,
    modelName: 'ItemColecao',
    tableName: 'itens_colecao',
    // A mesma carta pode aparecer em linhas diferentes só se mudar condição ou foil.
    indexes: [{ unique: true, fields: ['usuario_id', 'carta_id', 'condicao', 'foil'] }],
  });

  return ItemColecao;
};
