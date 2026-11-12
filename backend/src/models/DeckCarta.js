const { DataTypes, Model } = require('sequelize');
const { quantidade } = require('./constantes');

// Tabela associativa Deck N:N Carta. Chave primária composta (deck_id, carta_id).
// Commander é singleton, mas terrenos básicos podem repetir: por isso a quantidade.
class DeckCarta extends Model {}

module.exports = (sequelize) => {
  DeckCarta.init({
    deck_id: { type: DataTypes.INTEGER, primaryKey: true },
    carta_id: { type: DataTypes.INTEGER, primaryKey: true },
    quantidade: quantidade(DataTypes),
  }, {
    sequelize,
    modelName: 'DeckCarta',
    tableName: 'deck_cartas',
  });

  return DeckCarta;
};
