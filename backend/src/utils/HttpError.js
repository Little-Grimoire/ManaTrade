// Erro com código HTTP. Lançado pelos controllers e middlewares e tratado em middlewares/erros.js.
class HttpError extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}

module.exports = HttpError;
