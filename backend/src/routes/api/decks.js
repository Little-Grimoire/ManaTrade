const { Router } = require('express');
const controller = require('../../controllers/decksController');
const { autenticar } = require('../../middlewares/autenticacao');

const router = Router();

router.use(autenticar); // cada usuário gerencia só os próprios decks

router.get('/formatos', controller.formatos); // antes de /:id
router.get('/', controller.listar);
router.post('/', controller.criar);
router.get('/:id', controller.obter);
router.patch('/:id', controller.atualizar);
router.delete('/:id', controller.remover);

// Cartas do deck (tabela associativa deck_cartas)
router.post('/:id/cartas', controller.adicionarCarta);
router.patch('/:id/cartas/:cartaId', controller.atualizarCarta);
router.delete('/:id/cartas/:cartaId', controller.removerCarta);
router.post('/:id/importar', controller.importar);

module.exports = router;
