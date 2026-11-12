const { Router } = require('express');
const controller = require('../../controllers/authController');
const { autenticar } = require('../../middlewares/autenticacao');

const router = Router();

// Públicas
router.post('/cadastro', controller.cadastrar);
router.post('/login', controller.login);

// Exigem token
router.get('/me', autenticar, controller.meusDados);
router.patch('/me', autenticar, controller.atualizarMeusDados);
router.patch('/me/senha', autenticar, controller.alterarSenha);

module.exports = router;
