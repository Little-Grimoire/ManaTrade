const { Router } = require('express');
const controller = require('../../controllers/desejosController');
const { autenticar } = require('../../middlewares/autenticacao');

const router = Router();

router.use(autenticar); // cada usuário gerencia só a própria lista

router.get('/', controller.listar);
router.post('/', controller.criar);
router.get('/:id', controller.obter);
router.patch('/:id', controller.atualizar);
router.delete('/:id', controller.remover);

module.exports = router;
