// Middlewares de permissão sobre um registro específico (o ":id" da rota).
//
// autorizar(...perfis) (em autenticacao.js) responde "este PERFIL pode usar esta rota?".
// carregar(...) responde "este USUÁRIO pode mexer NESTE registro?" (dono, loja destinatária, admin...).
//
// Uso:
//   router.patch('/:id', autenticar, carregar(Chamado, { pode: regras.donoOuAdmin }), controller.atualizar)
// O controller recebe o registro pronto em req.registro.
const HttpError = require('../utils/HttpError');

// Regras reutilizáveis: recebem (usuario, registro) e devolvem true/false.
const regras = {
  admin: (u) => u.perfil === 'admin',
  dono: (u, r) => r.usuario_id === u.id,
  donoOuAdmin: (u, r) => u.perfil === 'admin' || r.usuario_id === u.id,
  // Registro de uma loja (acervo, consignação recebida): vale para o dono da loja.
  daMinhaLoja: (u, r) => !!u.loja && r.loja_id === u.loja.id,
};

// Combina regras: basta uma permitir.
const qualquer = (...lista) => (u, r) => lista.some((regra) => regra(u, r));

/**
 * Busca o registro pelo parâmetro da rota e verifica a permissão.
 * - id inválido, registro inexistente ou sem permissão => 404 (não revela que o id existe).
 * - opcoes.include: associações a carregar junto.
 * - opcoes.pode(usuario, registro): regra de acesso (padrão: dono ou admin).
 * - opcoes.nome: usado na mensagem de erro ("Chamado não encontrado.").
 */
function carregar(Model, { pode = regras.donoOuAdmin, include, nome = 'Registro', param = 'id' } = {}) {
  return async (req, res, next) => {
    const naoEncontrado = new HttpError(404, `${nome} não encontrado.`);
    const id = Number(req.params[param]);
    if (!Number.isInteger(id) || id < 1) return next(naoEncontrado);

    const registro = await Model.findByPk(id, { include });
    if (!registro || !pode(req.usuario, registro)) return next(naoEncontrado);

    req.registro = registro;
    return next();
  };
}

module.exports = { carregar, regras, qualquer };
