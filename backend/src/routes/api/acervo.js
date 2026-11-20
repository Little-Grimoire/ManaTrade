// /api/acervo — estoque da loja logada. Só perfil loja, com a loja já aprovada pelo admin.
const { Router } = require('express');
const controller = require('../../controllers/acervoController');
const { autenticar, autorizar, exigirLojaAprovada } = require('../../middlewares/autenticacao');
const { carregar, regras } = require('../../middlewares/permissoes');
const { incluirCarta } = require('../../services/acervo');
const { ItemAcervo } = require('../../models');

const router = Router();
const item = carregar(ItemAcervo, { nome: 'Item do acervo', pode: regras.daMinhaLoja, include: incluirCarta });

router.use(autenticar, autorizar('loja'), exigirLojaAprovada);

router.get('/', controller.listar);
router.post('/', controller.criar);
router.get('/:id', item, controller.obter);
router.patch('/:id', item, controller.atualizar);
router.delete('/:id', item, controller.remover);

module.exports = router;
