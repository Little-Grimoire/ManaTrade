// /api/usuarios — só administrador.
const { Router } = require('express');
const controller = require('../../controllers/usuariosController');
const { autenticar, autorizar } = require('../../middlewares/autenticacao');
const { carregar, regras } = require('../../middlewares/permissoes');
const { Usuario, Loja } = require('../../models');

const router = Router();
const usuario = carregar(Usuario, { nome: 'Usuário', pode: regras.admin, include: { model: Loja, as: 'loja' } });

router.use(autenticar, autorizar('admin'));

router.get('/', controller.listar);
router.post('/', controller.criar);
router.get('/:id', usuario, controller.obter);
router.patch('/:id', usuario, controller.atualizar);
router.delete('/:id', usuario, controller.remover);

module.exports = router;
