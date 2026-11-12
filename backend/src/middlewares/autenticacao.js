// Middlewares de autenticação (quem é você?) e autorização (o seu perfil pode fazer isto?).
//
// Uso nas rotas:
//   router.get('/rota', autenticar, handler)                         qualquer usuário logado
//   router.get('/rota', autenticar, autorizar('admin'), handler)     só admin
//   router.get('/rota', autenticar, autorizar('loja'), exigirLojaAprovada, handler)
const { Usuario, Loja } = require('../models');
const { verificarToken } = require('../services/token');
const auth = require('../config/auth');
const HttpError = require('../utils/HttpError');

// Token vem do cabeçalho "Authorization: Bearer <token>" (API/app) ou do cookie (páginas web).
function extrairToken(req) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo === 'Bearer' && token) return token;
  return req.cookies?.[auth.cookie] || null;
}

async function autenticar(req, res, next) {
  const token = extrairToken(req);
  if (!token) return next(new HttpError(401, 'Faça login para continuar.'));

  let payload;
  try {
    payload = verificarToken(token);
  } catch (erro) {
    const mensagem = erro.name === 'TokenExpiredError' ? 'Sessão expirada. Faça login novamente.' : 'Token inválido.';
    return next(new HttpError(401, mensagem));
  }

  // Relê o usuário no banco: o perfil e o status "ativo" valem pelo que está gravado agora.
  const usuario = await Usuario.findByPk(payload.sub, {
    include: { model: Loja, as: 'loja' },
  });
  if (!usuario) return next(new HttpError(401, 'Usuário não encontrado.'));
  if (!usuario.ativo) return next(new HttpError(403, 'Conta bloqueada. Procure o suporte.'));

  req.usuario = usuario;
  res.locals.usuario = usuario; // disponível nas views (MVC)
  return next();
}

// Libera só os perfis informados. Deve vir depois de autenticar.
function autorizar(...perfis) {
  return (req, res, next) => {
    if (!req.usuario) return next(new HttpError(401, 'Faça login para continuar.'));
    if (!perfis.includes(req.usuario.perfil)) {
      return next(new HttpError(403, 'Seu perfil não tem permissão para esta ação.'));
    }
    return next();
  };
}

// Para ações de loja que só valem depois da aprovação do admin (ex.: aparecer no app, receber consignações).
function exigirLojaAprovada(req, res, next) {
  const { loja } = req.usuario || {};
  if (!loja) return next(new HttpError(403, 'Cadastre os dados da sua loja primeiro.'));
  if (!loja.aprovada) return next(new HttpError(403, 'Sua loja ainda aguarda aprovação do administrador.'));
  req.loja = loja;
  return next();
}

module.exports = { autenticar, autorizar, exigirLojaAprovada };
