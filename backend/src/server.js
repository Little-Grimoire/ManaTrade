// Ponto de entrada: conecta no banco, cria as tabelas que faltarem e abre a porta.
const fs = require('fs');
const path = require('path');
const app = require('./app');
const { sequelize } = require('./models');
const atualizarEsquema = require('./database/atualizarEsquema');

const PORTA = Number(process.env.PORT) || 3001;

async function iniciar() {
  if (sequelize.getDialect() === 'sqlite') {
    fs.mkdirSync(path.dirname(sequelize.options.storage), { recursive: true });
  }
  await sequelize.authenticate();
  // Cria tabelas e colunas novas sem apagar dados.
  const adicionadas = await atualizarEsquema(sequelize);
  if (adicionadas.length) console.log(`Colunas adicionadas: ${adicionadas.join(', ')}`);
  app.listen(PORTA, () => {
    console.log(`ManaTrade backend em http://localhost:${PORTA} (banco: ${sequelize.getDialect()})`);
  });
}

iniciar().catch((erro) => {
  console.error('Falha ao iniciar o servidor:', erro);
  process.exit(1);
});
