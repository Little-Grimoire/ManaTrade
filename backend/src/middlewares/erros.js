// Tratamento central de erros.
//   API (/api/...)  → JSON { erro, detalhes? } com o código HTTP.
//   Páginas web     → 401 manda para o login; erro ao enviar formulário volta para a página com a mensagem;
//                     erro ao abrir uma página mostra a view "erro".
const {
  ValidationError, UniqueConstraintError, ForeignKeyConstraintError,
} = require('sequelize');
const HttpError = require('../utils/HttpError');
const auth = require('../config/auth');

function naoEncontrado(req, res, next) {
  next(new HttpError(404, `${req.paginaWeb ? 'Página' : 'Rota'} não encontrada: ${req.method} ${req.originalUrl}`));
}

// Converte qualquer erro em { status, erro, detalhes? }.
function descrever(erro) {
  // Ordem importa: UniqueConstraintError é subclasse de ValidationError.
  if (erro instanceof UniqueConstraintError) {
    return { status: 409, erro: erro.errors?.[0]?.message || 'Registro duplicado.' };
  }
  if (erro instanceof ValidationError) {
    const detalhes = erro.errors.map((e) => ({ campo: e.path, mensagem: e.message }));
    return { status: 400, erro: detalhes[0]?.mensagem || 'Dados inválidos.', detalhes };
  }
  if (erro instanceof ForeignKeyConstraintError) {
    return { status: 409, erro: 'Operação viola um relacionamento (registro em uso ou inexistente).' };
  }
  if (erro.type === 'entity.parse.failed') {
    return { status: 400, erro: 'JSON inválido no corpo da requisição.' };
  }
  if (erro instanceof HttpError) {
    return { status: erro.status, erro: erro.message, ...(erro.detalhes && { detalhes: erro.detalhes }) };
  }
  console.error(erro);
  return { status: 500, erro: 'Erro interno do servidor.' };
}

function responderPagina(req, res, { status, erro }) {
  if (status === 401) {
    res.clearCookie(auth.cookie);
    res.flash?.('erro', erro);
    return res.redirect('/login');
  }
  // Formulário com problema: volta para a página de onde veio, mostrando a mensagem.
  if (req.method !== 'GET' && status < 500) {
    res.flash?.('erro', erro);
    return res.redirect(req.get('Referer') || '/');
  }
  return res.status(status).render('erro', { titulo: `Erro ${status}`, status, mensagem: erro });
}

// eslint-disable-next-line no-unused-vars
function tratarErros(erro, req, res, next) {
  const { status, ...corpo } = descrever(erro);
  if (req.paginaWeb) return responderPagina(req, res, { status, erro: corpo.erro });
  return res.status(status).json(corpo);
}

module.exports = { naoEncontrado, tratarErros };
