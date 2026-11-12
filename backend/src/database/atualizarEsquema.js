// Cria as tabelas que faltam e adiciona colunas novas dos models em tabelas que já existem,
// sem apagar dados. Cobre o caso comum de evolução do projeto (campo novo opcional ou com padrão).
// Não remove nem altera colunas existentes: para isso, recrie o banco com "npm run db:seed".
const { DataTypes } = require('sequelize');

async function atualizarEsquema(sequelize) {
  await sequelize.sync(); // cria só as tabelas inexistentes
  const qi = sequelize.getQueryInterface();
  const adicionadas = [];

  for (const model of Object.values(sequelize.models)) {
    const colunas = await qi.describeTable(model.getTableName());
    for (const atributo of Object.values(model.rawAttributes)) {
      if (atributo.type instanceof DataTypes.VIRTUAL || colunas[atributo.field]) continue;
      await qi.addColumn(model.getTableName(), atributo.field, {
        type: atributo.type,
        allowNull: atributo.allowNull !== false || atributo.defaultValue !== undefined,
        defaultValue: atributo.defaultValue,
      });
      adicionadas.push(`${model.getTableName()}.${atributo.field}`);
    }
  }
  return adicionadas;
}

module.exports = atualizarEsquema;
