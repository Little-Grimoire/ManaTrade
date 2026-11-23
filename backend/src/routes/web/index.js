// Rotas das páginas web (MVC). Mesmos middlewares de permissão da API:
//   autenticar            – precisa estar logado (token no cookie)
//   autorizar(...perfis)  – o perfil pode usar esta página?
//   exigirLojaAprovada    – a loja do usuário já foi aprovada pelo admin?
//   carregar(Model, regra)– busca o registro de :id e confere se este usuário pode mexer nele
//
// Formulários usam POST com _method=PATCH/DELETE (middlewares/web.js → metodoDoFormulario).
const { Router } = require('express');
const { autenticar, autorizar, exigirLojaAprovada } = require('../../middlewares/autenticacao');
const { carregar, regras } = require('../../middlewares/permissoes');
const {
  Usuario, Loja, Carta, ItemColecao, Desejo, Deck, ItemAcervo, Consignacao, Chamado, Notificacao,
} = require('../../models');
const lojasServico = require('../../services/lojas');
const consignacoesServico = require('../../services/consignacoes');
const chamadosServico = require('../../services/chamados');

const auth = require('../../controllers/web/authController');
const colecao = require('../../controllers/web/colecaoController');
const desejos = require('../../controllers/web/desejosController');
const decks = require('../../controllers/web/decksController');
const lojas = require('../../controllers/web/lojasController');
const acervo = require('../../controllers/web/acervoController');
const consignacoes = require('../../controllers/web/consignacoesController');
const chamados = require('../../controllers/web/chamadosController');
const notificacoes = require('../../controllers/web/notificacoesController');
const usuarios = require('../../controllers/web/usuariosController');
const cartas = require('../../controllers/web/cartasController');

const router = Router();

// Perfis
const jogador = autorizar('usuario');
const lojista = autorizar('loja');
const admin = autorizar('admin');

// Registros de :id com a regra de acesso de cada um
const comCarta = { model: Carta, as: 'carta' };
const itemColecao = carregar(ItemColecao, { nome: 'Item', pode: regras.dono, include: comCarta });
const desejo = carregar(Desejo, { nome: 'Desejo', pode: regras.dono, include: comCarta });
const deck = carregar(Deck, { nome: 'Deck', pode: regras.dono });
const lojaVisivel = carregar(Loja, { nome: 'Loja', pode: lojasServico.podeVer, include: lojasServico.incluirDono });
const lojaDoUsuario = carregar(Loja, { nome: 'Loja', pode: regras.donoOuAdmin, include: lojasServico.incluirDono });
const itemAcervo = carregar(ItemAcervo, { nome: 'Item do acervo', pode: regras.daMinhaLoja, include: comCarta });
const consignacao = carregar(Consignacao, { nome: 'Consignação', pode: consignacoesServico.participa, include: consignacoesServico.incluir });
const chamado = carregar(Chamado, { nome: 'Chamado', pode: regras.donoOuAdmin, include: chamadosServico.incluir });
const notificacao = carregar(Notificacao, { nome: 'Notificação', pode: regras.dono });
const usuario = carregar(Usuario, { nome: 'Usuário', pode: regras.admin, include: { model: Loja, as: 'loja' } });
const carta = carregar(Carta, { nome: 'Carta', pode: () => true });

// ---------- Públicas ----------
router.get('/login', auth.formLogin);
router.post('/login', auth.login);
router.get('/cadastro', auth.formCadastro);
router.post('/cadastro', auth.cadastrar);
router.post('/sair', auth.sair);

// ---------- Daqui para baixo, só logado ----------
router.use(autenticar);

router.get('/', auth.painel);
router.get('/conta', auth.formConta);
router.patch('/conta', auth.atualizarConta);
router.patch('/conta/senha', auth.alterarSenha);

// Coleção (jogador)
router.get('/colecao', jogador, colecao.index);
router.post('/colecao', jogador, colecao.criar);
router.get('/colecao/:id', jogador, itemColecao, colecao.editar);
router.patch('/colecao/:id', jogador, itemColecao, colecao.atualizar);
router.delete('/colecao/:id', jogador, itemColecao, colecao.remover);

// Lista de desejos (jogador)
router.get('/desejos', jogador, desejos.index);
router.post('/desejos', jogador, desejos.criar);
router.get('/desejos/:id', jogador, desejo, desejos.editar);
router.patch('/desejos/:id', jogador, desejo, desejos.atualizar);
router.delete('/desejos/:id', jogador, desejo, desejos.remover);

// Decks e cartas do deck (jogador)
router.get('/decks', jogador, decks.index);
router.post('/decks', jogador, decks.criar);
router.get('/decks/:id', jogador, deck, decks.ver);
router.patch('/decks/:id', jogador, deck, decks.atualizar);
router.delete('/decks/:id', jogador, deck, decks.remover);
router.post('/decks/:id/cartas', jogador, deck, decks.adicionarCarta);
router.patch('/decks/:id/cartas/:cartaId', jogador, deck, decks.atualizarCarta);
router.delete('/decks/:id/cartas/:cartaId', jogador, deck, decks.removerCarta);
router.post('/decks/:id/importar', jogador, deck, decks.importar);

// Lojas (todos veem as aprovadas; loja cuida da sua; admin aprova e gerencia todas)
router.get('/lojas', lojas.index);
router.get('/minha-loja', lojista, lojas.minha);
router.post('/lojas', autorizar('loja', 'admin'), lojas.criar);
router.get('/lojas/:id', lojaVisivel, lojas.ver);
router.patch('/lojas/:id', autorizar('loja', 'admin'), lojaDoUsuario, lojas.atualizar);
router.patch('/lojas/:id/aprovacao', admin, lojaDoUsuario, lojas.aprovar);
router.delete('/lojas/:id', autorizar('loja', 'admin'), lojaDoUsuario, lojas.remover);

// Acervo (loja aprovada)
router.get('/acervo', lojista, exigirLojaAprovada, acervo.index);
router.post('/acervo', lojista, exigirLojaAprovada, acervo.criar);
router.get('/acervo/:id', lojista, exigirLojaAprovada, itemAcervo, acervo.editar);
router.patch('/acervo/:id', lojista, exigirLojaAprovada, itemAcervo, acervo.atualizar);
router.delete('/acervo/:id', lojista, exigirLojaAprovada, itemAcervo, acervo.remover);

// Consignações (jogador envia; loja responde; admin consulta e exclui)
router.get('/consignacoes', consignacoes.index);
router.post('/consignacoes', jogador, consignacoes.criar);
router.get('/consignacoes/:id', consignacao, consignacoes.ver);
router.patch('/consignacoes/:id', autorizar('usuario', 'loja'), consignacao, consignacoes.atualizar);
router.delete('/consignacoes/:id', autorizar('usuario', 'admin'), consignacao, consignacoes.remover);

// Chamados (jogador e loja abrem; admin atende)
router.get('/chamados', chamados.index);
router.post('/chamados', autorizar('usuario', 'loja'), chamados.criar);
router.get('/chamados/:id', chamado, chamados.ver);
router.patch('/chamados/:id', chamado, chamados.atualizar);
router.delete('/chamados/:id', chamado, chamados.remover);

// Notificações (cada um as suas; admin envia avisos)
router.get('/notificacoes', notificacoes.index);
router.post('/notificacoes', admin, notificacoes.criar);
router.patch('/notificacoes/lidas', notificacoes.marcarTodasLidas);
router.patch('/notificacoes/:id', notificacao, notificacoes.atualizar);
router.delete('/notificacoes/:id', notificacao, notificacoes.remover);

// Usuários (admin)
router.get('/usuarios', admin, usuarios.index);
router.post('/usuarios', admin, usuarios.criar);
router.get('/usuarios/:id', admin, usuario, usuarios.editar);
router.patch('/usuarios/:id', admin, usuario, usuarios.atualizar);
router.delete('/usuarios/:id', admin, usuario, usuarios.remover);

// Catálogo de cartas (todos leem; admin edita)
router.get('/cartas', cartas.index);
router.post('/cartas', admin, cartas.criar);
router.get('/cartas/:id', carta, cartas.ver);
router.patch('/cartas/:id', admin, carta, cartas.atualizar);
router.post('/cartas/:id/sincronizar', admin, carta, cartas.sincronizar);
router.delete('/cartas/:id', admin, carta, cartas.remover);

module.exports = router;
