// Configuração do token JWT.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const SEGREDO_DEV = 'manatrade-dev-inseguro';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('Defina JWT_SECRET no ambiente de produção.');
}

module.exports = {
  segredo: process.env.JWT_SECRET || SEGREDO_DEV,
  // Validade do token (formato do jsonwebtoken: "7d", "12h"...). Depois disso o usuário entra de novo.
  expiraEm: process.env.JWT_EXPIRES_IN || '7d',
  // Nome do cookie usado pelas páginas web (MVC). A API usa o cabeçalho Authorization.
  cookie: 'manatrade_token',
};
