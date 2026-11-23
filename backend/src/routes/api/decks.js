const { Router } = require('express');
const controller = require('../../controllers/decksController');
const { autenticar, autorizar } = require('../../middlewares/autenticacao');
const { carregar, regras } = require('../../middlewares/permissoes');
const { Deck } = require('../../models');

const router = Router();
// Cada usuário gerencia só os próprios decks: deck de outra pessoa responde 404.
const deck = carregar(Deck, { nome: 'Deck', pode: regras.dono });

router.use(autenticar, autorizar('usuario')); // só jogador (loja e admin usam outras áreas)

router.get('/formatos', controller.formatos); // antes de /:id
router.get('/', controller.listar);
router.post('/', controller.criar);
router.get('/:id', deck, controller.obter);
router.patch('/:id', deck, controller.atualizar);
router.delete('/:id', deck, controller.remover);

// Cartas do deck (tabela associativa deck_cartas)
router.post('/:id/cartas', deck, controller.adicionarCarta);
router.patch('/:id/cartas/:cartaId', deck, controller.atualizarCarta);
router.delete('/:id/cartas/:cartaId', deck, controller.removerCarta);
router.post('/:id/importar', deck, controller.importar);

module.exports = router;
