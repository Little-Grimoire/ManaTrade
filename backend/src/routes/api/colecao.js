const { Router } = require('express');
const controller = require('../../controllers/colecaoController');
const { autenticar, autorizar } = require('../../middlewares/autenticacao');
const { carregar, regras } = require('../../middlewares/permissoes');
const { ItemColecao, Carta } = require('../../models');

const router = Router();
// Cada usuário gerencia só a própria coleção: item de outra pessoa responde 404.
const item = carregar(ItemColecao, { nome: 'Item', pode: regras.dono, include: { model: Carta, as: 'carta' } });

router.use(autenticar, autorizar('usuario')); // só jogador (loja e admin usam outras áreas)

router.get('/', controller.listar);
router.post('/', controller.criar);
router.get('/:id', item, controller.obter);
router.patch('/:id', item, controller.atualizar);
router.delete('/:id', item, controller.remover);

module.exports = router;
