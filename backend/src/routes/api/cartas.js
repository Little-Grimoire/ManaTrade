// /api/cartas — leitura para qualquer usuário logado; criação, edição e exclusão só admin.
const { Router } = require('express');
const controller = require('../../controllers/cartasController');
const { autenticar, autorizar } = require('../../middlewares/autenticacao');
const { carregar } = require('../../middlewares/permissoes');
const { Carta } = require('../../models');

const router = Router();
const carta = carregar(Carta, { nome: 'Carta', pode: () => true }); // catálogo é público para quem está logado
const soAdmin = autorizar('admin');

router.use(autenticar);

router.get('/', controller.listar);
router.get('/:id', carta, controller.obter);
router.post('/', soAdmin, controller.criar);
router.patch('/:id', soAdmin, carta, controller.atualizar);
router.post('/:id/sincronizar', soAdmin, carta, controller.sincronizar);
router.delete('/:id', soAdmin, carta, controller.remover);

module.exports = router;
