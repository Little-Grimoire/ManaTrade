// Ponto de entrada: conecta no banco, cria as tabelas que faltarem e abre a porta.
const fs = require('fs');
const path = require('path');
const app = require('./app');
const { sequelize } = require('./models');
const atualizarEsquema = require('./database/atualizarEsquema');
const cotacao = require('./services/cotacao');

const PORTA = Number(process.env.PORT) || 3001;

async function iniciar() {
  if (sequelize.getDialect() === 'sqlite') {
    fs.mkdirSync(path.dirname(sequelize.options.storage), { recursive: true });
  }
  await sequelize.authenticate();
  // Cria tabelas e colunas novas sem apagar dados.
  const adicionadas = await atualizarEsquema(sequelize);
  if (adicionadas.length) console.log(`Colunas adicionadas: ${adicionadas.join(', ')}`);
  await cotacao.iniciar();
  await converterDesejosParaReais();
  app.listen(PORTA, () => {
    console.log(`ManaTrade backend em http://localhost:${PORTA} (banco: ${sequelize.getDialect()})`);
  });
}

// Bancos antigos guardavam o "pago até" da lista de desejos em US$ (preco_maximo_usd).
// Converte uma vez para R$ pela cotação atual; a coluna antiga fica sem uso.
async function converterDesejosParaReais() {
  const qi = sequelize.getQueryInterface();
  const colunas = await qi.describeTable('desejos');
  if (!colunas.preco_maximo_usd) return;
  const [[{ total }]] = await sequelize.query('SELECT COUNT(*) AS total FROM desejos WHERE preco_maximo_usd IS NOT NULL');
  if (!Number(total)) return;
  await sequelize.query(
    'UPDATE desejos SET preco_maximo_brl = ROUND(preco_maximo_usd * :taxa, 2), preco_maximo_usd = NULL WHERE preco_maximo_usd IS NOT NULL',
    { replacements: { taxa: cotacao.atual().usd_brl } },
  );
  const convertidos = Number(total);
  console.log(`Lista de desejos: ${convertidos} preço(s) máximo(s) convertido(s) de US$ para R$.`);
}

iniciar().catch((erro) => {
  console.error('Falha ao iniciar o servidor:', erro);
  process.exit(1);
});
