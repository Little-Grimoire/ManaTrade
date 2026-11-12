// Estado de conservação da carta (padrão do mercado).
// NM = Near Mint, SP = Slightly Played, MP = Moderately Played, HP = Heavily Played, D = Damaged
const CONDICOES = ['NM', 'SP', 'MP', 'HP', 'D'];

const condicao = (DataTypes) => ({
  type: DataTypes.ENUM(...CONDICOES),
  allowNull: false,
  defaultValue: 'NM',
  validate: { isIn: { args: [CONDICOES], msg: `Condição inválida. Use: ${CONDICOES.join(', ')}.` } },
});

const quantidade = (DataTypes) => ({
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 1,
  validate: { min: { args: [1], msg: 'A quantidade deve ser no mínimo 1.' }, isInt: true },
});

module.exports = { CONDICOES, condicao, quantidade };
