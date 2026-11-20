// API /api/auth — cadastro, login e dados do próprio usuário. Regras em services/auth.js.
const servico = require('../services/auth');
const { gerarToken } = require('../services/token');

async function respostaDoUsuario(usuario) {
  const dados = usuario.toJSON();
  if (usuario.perfil !== 'loja') delete dados.loja;
  return { ...dados, resumo: await servico.resumoDoPerfil(usuario) };
}

// POST /api/auth/cadastro
async function cadastrar(req, res) {
  const usuario = await servico.cadastrar(req.body);
  res.status(201).json({ token: gerarToken(usuario), usuario: await respostaDoUsuario(usuario) });
}

// POST /api/auth/login
async function login(req, res) {
  const usuario = await servico.entrar(req.body?.email, req.body?.senha);
  res.json({ token: gerarToken(usuario), usuario: await respostaDoUsuario(usuario) });
}

// GET /api/auth/me
const meusDados = async (req, res) => res.json(await respostaDoUsuario(req.usuario));

// PATCH /api/auth/me  { nome?, email? }
async function atualizarMeusDados(req, res) {
  await servico.atualizarConta(req.usuario, req.body);
  res.json(await respostaDoUsuario(req.usuario));
}

// PATCH /api/auth/me/senha  { senhaAtual, novaSenha }
async function alterarSenha(req, res) {
  await servico.alterarSenha(req.usuario, req.body);
  res.status(204).end();
}

module.exports = {
  cadastrar, login, meusDados, atualizarMeusDados, alterarSenha,
};
