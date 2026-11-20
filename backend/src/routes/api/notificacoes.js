// /api/notificacoes — cada um gerencia as próprias; só o admin envia avisos.
const { Router } = require('express');
const controller = require('../../controllers/notificacoesController');
const { autenticar, autorizar } = require('../../middlewares/autenticacao');
const { carregar, regras } = require('../../middlewares/permissoes');
const { Notificacao } = require('../../models');

const router = Router();
const notificacao = carregar(Notificacao, { nome: 'Notificação', pode: regras.dono });

router.use(autenticar);

router.get('/', controller.listar);
router.post('/', autorizar('admin'), controller.criar);
router.patch('/lidas', controller.marcarTodasLidas); // antes de /:id
router.get('/:id', notificacao, controller.obter);
router.patch('/:id', notificacao, controller.atualizar);
router.delete('/:id', notificacao, controller.remover);

module.exports = router;
