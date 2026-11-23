// Cadastro, login, resumo do perfil e dados da própria conta. Usado pela API e pelas páginas.
const { Op } = require('sequelize');
const {
  sequelize, Usuario, Loja, ItemColecao, Deck, Consignacao, Notificacao, ItemAcervo, Chamado,
} = require('../models');
const HttpError = require('../utils/HttpError');
const { escolher, exigirAlgum } = require('../utils/campos');

// Perfis que a própria pessoa pode escolher no cadastro. Admin só é criado por outro admin / seed.
const PERFIS_CADASTRO = ['usuario', 'loja'];
const CAMPOS_LOJA = ['nome', 'descricao', 'endereco', 'cidade', 'uf', 'latitude', 'longitude', 'horario', 'telefone', 'aceita_consignacao'];

// Números exibidos no painel; cada perfil vê o que faz sentido para ele.
async function resumoDoPerfil(usuario) {
  const naoLidas = await Notificacao.count({ where: { usuario_id: usuario.id, lida: false } });

  if (usuario.perfil === 'admin') {
    const [lojasPendentes, chamadosAbertos, usuariosBloqueados] = await Promise.all([
      Loja.count({ where: { aprovada: false } }),
      Chamado.count({ where: { status: { [Op.ne]: 'resolvido' } } }),
      Usuario.count({ where: { ativo: false } }),
    ]);
    return { lojasPendentes, chamadosAbertos, usuariosBloqueados, notificacoesNaoLidas: naoLidas };
  }

  if (usuario.perfil === 'loja') {
    const lojaId = usuario.loja?.id;
    if (!lojaId) return { itensAcervo: 0, consignacoesPendentes: 0, consignacoesAVenda: 0, notificacoesNaoLidas: naoLidas };
    const [itensAcervo, consignacoesPendentes, consignacoesAVenda] = await Promise.all([
      ItemAcervo.sum('quantidade', { where: { loja_id: lojaId } }),
      Consignacao.count({ where: { loja_id: lojaId, status: 'pendente' } }),
      Consignacao.count({ where: { loja_id: lojaId, status: 'a_venda' } }),
    ]);
    return { itensAcervo: itensAcervo || 0, consignacoesPendentes, consignacoesAVenda, notificacoesNaoLidas: naoLidas };
  }

  const [cartasColecao, decks, consignacoesAtivas] = await Promise.all([
    ItemColecao.sum('quantidade', { where: { usuario_id: usuario.id } }),
    Deck.count({ where: { usuario_id: usuario.id } }),
    Consignacao.count({ where: { usuario_id: usuario.id, status: ['pendente', 'aceita', 'a_venda'] } }),
  ]);
  return { cartasColecao: cartasColecao || 0, decks, consignacoesAtivas, notificacoesNaoLidas: naoLidas };
}

// dados: { nome, email, senha, perfil?: usuario|loja, loja?: { nome, endereco, ... } }
async function cadastrar(dados = {}) {
  const { nome, email, senha, perfil = 'usuario', loja } = dados;
  if (!PERFIS_CADASTRO.includes(perfil)) {
    throw new HttpError(400, 'Perfil inválido. No cadastro use "usuario" ou "loja".');
  }
  if (perfil === 'loja' && !loja) {
    throw new HttpError(400, 'Informe os dados da loja (nome e endereço).');
  }

  // Usuário e loja são criados juntos: se a loja for inválida, o usuário também não é criado.
  const usuario = await sequelize.transaction(async (transaction) => {
    const novo = await Usuario.create({ nome, email, senha, perfil }, { transaction });
    if (perfil === 'loja') {
      // A loja começa não aprovada; só aparece no app depois que o admin aprovar.
      await Loja.create({ ...escolher(loja, CAMPOS_LOJA), usuario_id: novo.id, aprovada: false }, { transaction });
    }
    return novo;
  });
  return usuario.reload({ include: { model: Loja, as: 'loja' } });
}

// Confere e-mail e senha. Mesma mensagem para e-mail inexistente e senha errada: não revela quais e-mails existem.
async function entrar(email, senha) {
  if (!email || !senha) throw new HttpError(400, 'Informe e-mail e senha.');
  const usuario = await Usuario.scope('comSenha').findOne({
    where: { email: String(email).trim().toLowerCase() },
    include: { model: Loja, as: 'loja' },
  });
  if (!usuario || !(await usuario.verificarSenha(String(senha)))) {
    throw new HttpError(401, 'E-mail ou senha incorretos.');
  }
  if (!usuario.ativo) throw new HttpError(403, 'Conta bloqueada. Procure o suporte.');
  return usuario;
}

// Só nome e e-mail. Perfil e "ativo" não podem ser alterados pela própria pessoa.
async function atualizarConta(usuario, dados) {
  await usuario.update(exigirAlgum(escolher(dados, ['nome', 'email']), ['nome', 'email']));
  return usuario;
}

async function alterarSenha(usuario, { senhaAtual, novaSenha } = {}) {
  if (!senhaAtual || !novaSenha) throw new HttpError(400, 'Informe a senha atual e a nova senha.');
  const comSenha = await Usuario.scope('comSenha').findByPk(usuario.id);
  if (!(await comSenha.verificarSenha(String(senhaAtual)))) throw new HttpError(401, 'Senha atual incorreta.');
  await comSenha.update({ senha: String(novaSenha) });
}

module.exports = {
  resumoDoPerfil, cadastrar, entrar, atualizarConta, alterarSenha, CAMPOS_LOJA,
};
