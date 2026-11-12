// Recria todas as tabelas a partir dos models (APAGA OS DADOS).
// Uso: npm run db:reset
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');

async function resetar() {
  if (sequelize.getDialect() === 'sqlite') {
    const arquivo = sequelize.options.storage;
    if (arquivo && arquivo !== ':memory:') fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  }
  await sequelize.sync({ force: true });
}

if (require.main === module) {
  resetar()
    .then(() => console.log(`Tabelas recriadas (${sequelize.getDialect()}).`))
    .catch((erro) => { console.error(erro); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = resetar;
