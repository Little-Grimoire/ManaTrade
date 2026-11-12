const { DataTypes, Model } = require('sequelize');
const { FORMATOS } = require('../services/formatos');

// Deck do usuário (RF04) em um formato (Commander, Pauper...). As cartas ficam em deck_cartas (N:N com Carta).
class Deck extends Model {}

module.exports = (sequelize) => {
  Deck.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { notEmpty: { msg: 'Informe o nome do deck.' } },
    },
    // Chave de FORMATOS (commander, pauper, standard...). STRING + validação em vez de ENUM
    // para a coluna poder ser adicionada em bancos já existentes sem migração de tipo.
    formato: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'commander',
      validate: { isIn: { args: [Object.keys(FORMATOS)], msg: `Formato inválido. Use: ${Object.keys(FORMATOS).join(', ')}.` } },
    },
    descricao: { type: DataTypes.TEXT },
    // Comandante é uma carta (FK opcional: o deck pode ser criado antes de escolher).
    // Ele NÃO fica em deck_cartas; conta como +1 no total do deck.
    comandante_id: { type: DataTypes.INTEGER },
  }, {
    sequelize,
    modelName: 'Deck',
    tableName: 'decks',
  });

  return Deck;
};
