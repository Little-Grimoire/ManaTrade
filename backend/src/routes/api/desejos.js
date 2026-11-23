const { Router } = require('express');
const controller = require('../../controllers/desejosController');
const { autenticar, autorizar } = require('../../middlewares/autenticacao');
const { carregar, regras } = require('../../middlewares/permissoes');
const { Desejo, Carta } = require('../../models');

const router = Router();
// Cada usuário gerencia só a própria lista: desejo de outra pessoa responde 404.
const desejo = carregar(Desejo, { nome: 'Desejo', pode: regras.dono, include: { model: Carta, as: 'carta' } });

router.use(autenticar, autorizar('usuario')); // só jogador (loja e admin usam outras áreas)

router.get('/', controller.listar);
router.post('/', controller.criar);
router.get('/:id', desejo, controller.obter);
router.patch('/:id', desejo, controller.atualizar);
router.delete('/:id', desejo, controller.remover);

module.exports = router;
