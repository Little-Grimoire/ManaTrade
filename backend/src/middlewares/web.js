// Middlewares usados só pelas páginas web (MVC com EJS).
const { Consignacao } = require('../models');
const { CONDICOES } = require('../models/constantes');

// Mensagem de uma requisição para a próxima (depois de um redirect), guardada num cookie.
//   res.flash('ok', 'Carta adicionada.')  →  na próxima página: locals.flash = { tipo: 'ok', texto: '...' }
function flash(req, res, next) {
  const salvo = req.cookies?.flash;
  if (salvo) {
    try { res.locals.flash = JSON.parse(salvo); } catch { /* cookie inválido: ignora */ }
    res.clearCookie('flash');
  }
  res.flash = (tipo, texto) => res.cookie('flash', JSON.stringify({ tipo, texto }), { httpOnly: true, sameSite: 'lax' });
  next();
}

// Formulário HTML só envia GET/POST. Com <input type="hidden" name="_method" value="PATCH">
// a rota pode usar router.patch/router.delete, como na API REST.
function metodoDoFormulario(req, res, next) {
  const metodo = req.body?._method?.toUpperCase();
  if (req.method === 'POST' && ['PATCH', 'PUT', 'DELETE'].includes(metodo)) {
    req.method = metodo;
    delete req.body._method;
  }
  next();
}

const moeda = (valor, simbolo = 'R$') => (valor === null || valor === undefined || valor === ''
  ? '—'
  : `${simbolo} ${Number(valor).toFixed(2).replace('.', ',')}`);
const data = (valor) => (valor ? new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

// Variáveis e funções disponíveis em todas as views.
function locaisDasViews(req, res, next) {
  Object.assign(res.locals, {
    caminho: req.path,
    titulo: 'ManaTrade',
    moeda,
    data,
    CONDICOES,
    STATUS_CONSIGNACAO: Consignacao.ROTULOS,
    STATUS_CHAMADO: { aberto: 'Aberto', em_atendimento: 'Em atendimento', resolvido: 'Resolvido' },
    PERFIS: { usuario: 'Jogador', loja: 'Loja', admin: 'Administrador' },
  });
  next();
}

module.exports = { flash, metodoDoFormulario, locaisDasViews };
