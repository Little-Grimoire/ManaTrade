// /api/chamados — jogador e loja abrem chamados; o admin atende todos.
const { Router } = require('express');
const controller = require('../../controllers/chamadosController');
const { autenticar, autorizar } = require('../../middlewares/autenticacao');
const { carregar, regras } = require('../../middlewares/permissoes');
const { incluir } = require('../../services/chamados');
const { Chamado } = require('../../models');

const router = Router();
const chamado = carregar(Chamado, { nome: 'Chamado', pode: regras.donoOuAdmin, include: incluir });

router.use(autenticar);

router.get('/', controller.listar);
router.post('/', autorizar('usuario', 'loja'), controller.criar);
router.get('/:id', chamado, controller.obter);
router.patch('/:id', chamado, controller.atualizar);
router.delete('/:id', chamado, controller.remover);

module.exports = router;
