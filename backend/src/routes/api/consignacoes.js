// /api/consignacoes
//   criar: só jogador (perfil usuario)
//   ver/editar/excluir: quem participa (jogador que enviou, loja que recebeu, admin)
//   o que cada participante pode alterar é decidido no service (jogador cancela, loja responde, admin só exclui)
const { Router } = require('express');
const controller = require('../../controllers/consignacoesController');
const { autenticar, autorizar } = require('../../middlewares/autenticacao');
const { carregar } = require('../../middlewares/permissoes');
const { participa, incluir } = require('../../services/consignacoes');
const { Consignacao } = require('../../models');

const router = Router();
const consignacao = carregar(Consignacao, { nome: 'Consignação', pode: participa, include: incluir });

router.use(autenticar);

router.get('/', controller.listar);
router.post('/', autorizar('usuario'), controller.criar);
router.get('/:id', consignacao, controller.obter);
router.patch('/:id', autorizar('usuario', 'loja'), consignacao, controller.atualizar);
router.delete('/:id', autorizar('usuario', 'admin'), consignacao, controller.remover);

module.exports = router;
