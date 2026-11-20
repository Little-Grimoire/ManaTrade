// Páginas de lojas (lista, vitrine, cadastro e edição). Regras em services/lojas.js (as mesmas da API).
const servico = require('../../services/lojas');
const { Usuario, ItemColecao, Carta } = require('../../models');
const { booleano } = require('../../utils/campos');

async function index(req, res) {
  const filtros = { aprovada: req.query.aprovada };
  const lojas = await servico.listar(req.usuario, filtros);
  // Admin cadastra loja para um usuário de perfil "loja" que ainda não tem uma.
  const semLoja = req.usuario.perfil === 'admin'
    ? (await Usuario.findAll({ where: { perfil: 'loja' }, include: 'loja', order: [['nome', 'ASC']] })).filter((u) => !u.loja)
    : [];
  res.render('lojas/index', { titulo: 'Lojas', lojas, filtros, semLoja });
}

async function ver(req, res) {
  const loja = req.registro;
  const acervo = await servico.acervoDaLoja(loja.id);
  // Jogador pode consignar um item da própria coleção nesta loja.
  const colecao = req.usuario.perfil === 'usuario' && loja.aprovada && loja.aceita_consignacao
    ? await ItemColecao.findAll({ where: { usuario_id: req.usuario.id }, include: { model: Carta, as: 'carta' } })
    : [];
  const podeEditar = req.usuario.perfil === 'admin' || loja.usuario_id === req.usuario.id;
  res.render('lojas/ver', { titulo: loja.nome, loja, acervo, colecao, podeEditar });
}

// Perfil loja: abre a própria loja ou o formulário para cadastrá-la.
function minha(req, res) {
  if (req.usuario.loja) return res.redirect(`/lojas/${req.usuario.loja.id}`);
  return res.render('lojas/nova', { titulo: 'Cadastrar minha loja' });
}

async function criar(req, res) {
  // Checkbox desmarcado não é enviado: ausente = false.
  const dados = { ...req.body, aceita_consignacao: booleano(req.body.aceita_consignacao), aprovada: booleano(req.body.aprovada) };
  const loja = await servico.criar(req.usuario, dados);
  res.flash('ok', req.usuario.perfil === 'admin' ? 'Loja cadastrada.' : 'Loja cadastrada! Aguarde a aprovação do administrador.');
  res.redirect(`/lojas/${loja.id}`);
}

async function atualizar(req, res) {
  const dados = { ...req.body, aceita_consignacao: booleano(req.body.aceita_consignacao) };
  if (req.usuario.perfil === 'admin') dados.aprovada = booleano(req.body.aprovada);
  await servico.atualizar(req.usuario, req.registro, dados);
  res.flash('ok', 'Loja atualizada.');
  res.redirect(`/lojas/${req.registro.id}`);
}

// Atalho do admin na lista: aprovar ou suspender sem abrir a loja.
async function aprovar(req, res) {
  await servico.atualizar(req.usuario, req.registro, { aprovada: booleano(req.body.aprovada) });
  res.flash('ok', `Loja "${req.registro.nome}" ${req.registro.aprovada ? 'aprovada' : 'suspensa'}.`);
  res.redirect('/lojas');
}

async function remover(req, res) {
  await servico.remover(req.registro);
  res.flash('ok', `Loja "${req.registro.nome}" excluída.`);
  res.redirect(req.usuario.perfil === 'admin' ? '/lojas' : '/');
}

module.exports = {
  index, ver, minha, criar, atualizar, aprovar, remover,
};
