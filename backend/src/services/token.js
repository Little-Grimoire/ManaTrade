const jwt = require('jsonwebtoken');
const auth = require('../config/auth');

// O token leva o id (sub) e o perfil do usuário. O perfil no token é só informativo para o cliente:
// o middleware sempre relê o usuário no banco, então bloqueios e mudanças de perfil valem na hora.
function gerarToken(usuario) {
  return jwt.sign({ perfil: usuario.perfil }, auth.segredo, {
    subject: String(usuario.id),
    expiresIn: auth.expiraEm,
  });
}

// Lança JsonWebTokenError / TokenExpiredError se o token for inválido ou vencido.
function verificarToken(token) {
  return jwt.verify(token, auth.segredo);
}

module.exports = { gerarToken, verificarToken };
