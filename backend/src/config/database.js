// Conexão com o banco (Sequelize).
// - Com DATABASE_URL: PostgreSQL (produção / deploy).
// - Sem DATABASE_URL: SQLite em arquivo (desenvolvimento) ou em memória (testes).
const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const logging = process.env.DB_LOG === 'true' ? console.log : false;

// Nomes de colunas e tabelas em snake_case (usuario_id, created_at...).
const define = { underscored: true };

function criarConexao() {
  // Testes sempre usam SQLite em memória, mesmo com DATABASE_URL no .env (eles recriam as tabelas).
  if (process.env.DATABASE_URL && process.env.NODE_ENV !== 'test') {
    const ssl = process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : undefined;
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging,
      define,
      dialectOptions: ssl ? { ssl } : {},
    });
  }

  const storage = process.env.NODE_ENV === 'test'
    ? ':memory:'
    : path.resolve(__dirname, '..', '..', process.env.DB_STORAGE || './data/manatrade.sqlite');

  return new Sequelize({ dialect: 'sqlite', storage, logging, define });
}

const sequelize = criarConexao();

// O SQLite só respeita chaves estrangeiras (ON DELETE CASCADE etc.) com esta opção ligada.
if (sequelize.getDialect() === 'sqlite') {
  sequelize.addHook('afterConnect', (conn) => new Promise((resolve, reject) => {
    conn.run('PRAGMA foreign_keys = ON', (err) => (err ? reject(err) : resolve()));
  }));
}

module.exports = sequelize;
