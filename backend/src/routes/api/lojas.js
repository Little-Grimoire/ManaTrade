// /api/lojas
//   leitura: qualquer usuário logado (loja não aprovada só para o dono e o admin)
//   criação: perfil loja (a própria) ou admin
//   edição/exclusão: dono da loja ou admin (aprovar: só admin, verificado no service)
const { Router } = require('express');
const controller = require('../../controllers/lojasController');
const { autenticar, autorizar } = require('../../middlewares/autenticacao');
const { carregar, regras } = require('../../middlewares/permissoes');
const { podeVer, incluirDono } = require('../../services/lojas');
const { Loja } = require('../../models');

const router = Router();
const lojaVisivel = carregar(Loja, { nome: 'Loja', pode: podeVer, include: incluirDono });
const lojaDoUsuario = carregar(Loja, { nome: 'Loja', pode: regras.donoOuAdmin, include: incluirDono });

router.use(autenticar);

router.get('/', controller.listar);
router.get('/minha', autorizar('loja'), controller.minha); // antes de /:id
router.post('/', autorizar('loja', 'admin'), controller.criar);
router.get('/:id', lojaVisivel, controller.obter);
router.get('/:id/acervo', lojaVisivel, controller.acervo);
router.patch('/:id', autorizar('loja', 'admin'), lojaDoUsuario, controller.atualizar);
router.delete('/:id', autorizar('loja', 'admin'), lojaDoUsuario, controller.remover);

module.exports = router;
