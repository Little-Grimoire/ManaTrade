const { DataTypes, Model } = require('sequelize');

// Tabela associativa Usuário N:N Carta: cartas que o usuário procura (lista de desejos).
// Diferente da coleção, cada carta aparece uma vez só por usuário.
const PRIORIDADES = ['baixa', 'media', 'alta'];

class Desejo extends Model {}

module.exports = (sequelize) => {
  Desejo.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    carta_id: { type: DataTypes.INTEGER, allowNull: false },
    prioridade: {
      type: DataTypes.ENUM(...PRIORIDADES),
      allowNull: false,
      defaultValue: 'media',
      validate: { isIn: { args: [PRIORIDADES], msg: 'Prioridade inválida. Use: baixa, media ou alta.' } },
    },
    // Quanto o usuário aceita pagar (em US$, para comparar com o preço de referência do Scryfall).
    preco_maximo_usd: {
      type: DataTypes.DECIMAL(10, 2),
      validate: { min: { args: [0], msg: 'O preço máximo não pode ser negativo.' } },
    },
    observacao: { type: DataTypes.STRING(255) },
  }, {
    sequelize,
    modelName: 'Desejo',
    tableName: 'desejos',
    indexes: [{ unique: true, fields: ['usuario_id', 'carta_id'] }],
  });

  Desejo.PRIORIDADES = PRIORIDADES;
  return Desejo;
};
