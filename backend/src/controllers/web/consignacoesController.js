// Páginas de consignações. Regras por perfil em services/consignacoes.js (as mesmas da API).
const servico = require('../../services/consignacoes');
const { Consignacao } = require('../../models');

async function index(req, res) {
  const consignacoes = await servico.listar(req.usuario, req.query);
  res.render('consignacoes/index', { titulo: 'Consignações', consignacoes, filtro: req.query.status || '' });
}

async function criar(req, res) {
  const consignacao = await servico.criar(req.usuario, req.body);
  res.flash('ok', `Consignação enviada para ${consignacao.loja.nome}.`);
  res.redirect(`/consignacoes/${consignacao.id}`);
}

function ver(req, res) {
  const c = req.registro;
  const souDono = c.usuario_id === req.usuario.id;
  const souLoja = !!req.usuario.loja && c.loja_id === req.usuario.loja.id;
  // Próximos status que a loja pode escolher a partir do atual.
  const proximos = souLoja ? Consignacao.TRANSICOES[c.status].filter((s) => servico.STATUS_DA_LOJA.includes(s)) : [];
  res.render('consignacoes/ver', {
    titulo: `Consignação #${c.id}`, c, souDono, souLoja, proximos,
  });
}

async function atualizar(req, res) {
  const c = await servico.atualizar(req.usuario, req.registro, req.body);
  res.flash('ok', `Consignação #${c.id}: ${Consignacao.ROTULOS[c.status]}.`);
  res.redirect(`/consignacoes/${c.id}`);
}

async function remover(req, res) {
  await servico.remover(req.usuario, req.registro);
  res.flash('ok', `Consignação #${req.registro.id} excluída.`);
  res.redirect('/consignacoes');
}

module.exports = {
  index, criar, ver, atualizar, remover,
};
