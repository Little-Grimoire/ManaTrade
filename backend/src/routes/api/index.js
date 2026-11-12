// Rotas da API REST (JSON), montadas em /api.
const { Router } = require('express');

const router = Router();

router.get('/saude', (req, res) => res.json({ status: 'ok' }));
router.use('/auth', require('./auth'));
router.use('/colecao', require('./colecao'));
router.use('/desejos', require('./desejos'));
router.use('/decks', require('./decks'));

module.exports = router;
