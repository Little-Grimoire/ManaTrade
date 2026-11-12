const { DataTypes, Model } = require('sequelize');
const { condicao, quantidade } = require('./constantes');

// Tabela associativa Loja N:N Carta: o estoque que a loja mostra no app (RF06/RF08).
class ItemAcervo extends Model {}

module.exports = (sequelize) => {
  ItemAcervo.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    loja_id: { type: DataTypes.INTEGER, allowNull: false },
    carta_id: { type: DataTypes.INTEGER, allowNull: false },
    quantidade: quantidade(DataTypes),
    condicao: condicao(DataTypes),
    foil: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Preço em reais definido pela loja.
    preco: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: { args: [0], msg: 'O preço não pode ser negativo.' } },
    },
    // Preenchido quando o item veio de uma consignação colocada à venda.
    consignacao_id: { type: DataTypes.INTEGER },
  }, {
    sequelize,
    modelName: 'ItemAcervo',
    tableName: 'itens_acervo',
  });

  return ItemAcervo;
};
