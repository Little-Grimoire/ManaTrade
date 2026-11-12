// Tratamento central de erros: converte qualquer erro em resposta JSON { erro, detalhes? }.
const {
  ValidationError, UniqueConstraintError, ForeignKeyConstraintError,
} = require('sequelize');
const HttpError = require('../utils/HttpError');

function naoEncontrado(req, res, next) {
  next(new HttpError(404, `Rota não encontrada: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function tratarErros(erro, req, res, next) {
  // Ordem importa: UniqueConstraintError é subclasse de ValidationError.
  if (erro instanceof UniqueConstraintError) {
    return res.status(409).json({ erro: erro.errors?.[0]?.message || 'Registro duplicado.' });
  }
  if (erro instanceof ValidationError) {
    const detalhes = erro.errors.map((e) => ({ campo: e.path, mensagem: e.message }));
    return res.status(400).json({ erro: detalhes[0]?.mensagem || 'Dados inválidos.', detalhes });
  }
  if (erro instanceof ForeignKeyConstraintError) {
    return res.status(409).json({ erro: 'Operação viola um relacionamento (registro em uso ou inexistente).' });
  }
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  if (erro instanceof HttpError) {
    return res.status(erro.status).json({ erro: erro.message, ...(erro.detalhes && { detalhes: erro.detalhes }) });
  }

  console.error(erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = { naoEncontrado, tratarErros };
