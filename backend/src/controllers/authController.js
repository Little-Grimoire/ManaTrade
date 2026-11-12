// Cadastro, login e dados do próprio usuário (perfil).
const { Op } = require('sequelize');
const {
  sequelize, Usuario, Loja, ItemColecao, Deck, Consignacao, Notificacao, ItemAcervo, Chamado,
} = require('../models');
const { gerarToken } = require('../services/token');
const HttpError = require('../utils/HttpError');

// Perfis que a própria pessoa pode escolher no cadastro. Admin só é criado por outro admin / seed.
const PERFIS_CADASTRO = ['usuario', 'loja'];
const CAMPOS_LOJA = ['nome', 'descricao', 'endereco', 'cidade', 'uf', 'latitude', 'longitude', 'horario', 'telefone', 'aceita_consignacao'];

const escolher = (objeto, campos) => Object.fromEntries(
  campos.filter((c) => objeto?.[c] !== undefined).map((c) => [c, objeto[c]]),
);

// Números exibidos na tela de perfil; cada perfil vê o que faz sentido para ele.
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

async function respostaDoUsuario(usuario) {
  const dados = usuario.toJSON();
  if (usuario.perfil !== 'loja') delete dados.loja;
  return { ...dados, resumo: await resumoDoPerfil(usuario) };
}

// POST /api/auth/cadastro
async function cadastrar(req, res) {
  const { nome, email, senha, perfil = 'usuario', loja } = req.body || {};
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

  await usuario.reload({ include: { model: Loja, as: 'loja' } });
  res.status(201).json({ token: gerarToken(usuario), usuario: await respostaDoUsuario(usuario) });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, senha } = req.body || {};
  if (!email || !senha) throw new HttpError(400, 'Informe e-mail e senha.');

  const usuario = await Usuario.scope('comSenha').findOne({
    where: { email: String(email).trim().toLowerCase() },
    include: { model: Loja, as: 'loja' },
  });
  // Mesma mensagem para e-mail inexistente e senha errada: não revela quais e-mails existem.
  if (!usuario || !(await usuario.verificarSenha(String(senha)))) {
    throw new HttpError(401, 'E-mail ou senha incorretos.');
  }
  if (!usuario.ativo) throw new HttpError(403, 'Conta bloqueada. Procure o suporte.');

  res.json({ token: gerarToken(usuario), usuario: await respostaDoUsuario(usuario) });
}

// GET /api/auth/me
async function meusDados(req, res) {
  res.json(await respostaDoUsuario(req.usuario));
}

// PATCH /api/auth/me — só nome e e-mail. Perfil e "ativo" não podem ser alterados pela própria pessoa.
async function atualizarMeusDados(req, res) {
  const dados = escolher(req.body, ['nome', 'email']);
  if (!Object.keys(dados).length) throw new HttpError(400, 'Nada para atualizar. Envie nome e/ou email.');
  await req.usuario.update(dados);
  res.json(await respostaDoUsuario(req.usuario));
}

// PATCH /api/auth/me/senha
async function alterarSenha(req, res) {
  const { senhaAtual, novaSenha } = req.body || {};
  if (!senhaAtual || !novaSenha) throw new HttpError(400, 'Informe senhaAtual e novaSenha.');

  const usuario = await Usuario.scope('comSenha').findByPk(req.usuario.id);
  if (!(await usuario.verificarSenha(String(senhaAtual)))) throw new HttpError(401, 'Senha atual incorreta.');
  await usuario.update({ senha: String(novaSenha) });
  res.status(204).end();
}

module.exports = { cadastrar, login, meusDados, atualizarMeusDados, alterarSenha, resumoDoPerfil };
