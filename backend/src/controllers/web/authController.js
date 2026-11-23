// Páginas de login, cadastro, painel e conta. O token JWT fica num cookie httpOnly,
// lido pelo mesmo middleware autenticar() da API.
const servico = require('../../services/auth');
const { gerarToken } = require('../../services/token');
const auth = require('../../config/auth');

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;
const guardarToken = (res, usuario) => res.cookie(auth.cookie, gerarToken(usuario), { httpOnly: true, sameSite: 'lax', maxAge: SETE_DIAS });

const formLogin = (req, res) => res.render('auth/login', { titulo: 'Entrar' });

async function login(req, res) {
  const usuario = await servico.entrar(req.body.email, req.body.senha);
  guardarToken(res, usuario);
  res.redirect('/');
}

const formCadastro = (req, res) => res.render('auth/cadastro', { titulo: 'Criar conta' });

// Campos da loja chegam como loja_nome, loja_endereco... e viram o objeto "loja" do service.
async function cadastrar(req, res) {
  const { nome, email, senha, perfil } = req.body;
  const loja = perfil === 'loja'
    ? Object.fromEntries(Object.entries(req.body).filter(([k]) => k.startsWith('loja_')).map(([k, v]) => [k.slice(5), v || null]))
    : undefined;
  const usuario = await servico.cadastrar({ nome, email, senha, perfil, loja });
  guardarToken(res, usuario);
  res.flash('ok', perfil === 'loja' ? 'Conta criada! Sua loja aguarda aprovação do administrador.' : 'Conta criada!');
  res.redirect('/');
}

function sair(req, res) {
  res.clearCookie(auth.cookie);
  res.redirect('/login');
}

async function painel(req, res) {
  res.render('painel', { titulo: 'Painel', resumo: await servico.resumoDoPerfil(req.usuario) });
}

const formConta = (req, res) => res.render('conta', { titulo: 'Minha conta' });

async function atualizarConta(req, res) {
  await servico.atualizarConta(req.usuario, req.body);
  res.flash('ok', 'Dados atualizados.');
  res.redirect('/conta');
}

async function alterarSenha(req, res) {
  await servico.alterarSenha(req.usuario, req.body);
  res.flash('ok', 'Senha alterada.');
  res.redirect('/conta');
}

module.exports = {
  formLogin, login, formCadastro, cadastrar, sair, painel, formConta, atualizarConta, alterarSenha,
};
