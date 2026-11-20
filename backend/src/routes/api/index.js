// Rotas da API REST (JSON), montadas em /api.
const { Router } = require('express');

const swaggerUi = require('swagger-ui-express');
const especificacao = require('../../docs/openapi');

const router = Router();

// Documentação (OpenAPI 3): interface em /api/docs, JSON em /api/docs.json.
router.get('/docs.json', (req, res) => res.json(especificacao));
router.use('/docs', swaggerUi.serve, swaggerUi.setup(especificacao, { customSiteTitle: 'ManaTrade API' }));

router.get('/saude', (req, res) => res.json({ status: 'ok' }));
router.use('/auth', require('./auth'));
router.use('/colecao', require('./colecao'));
router.use('/desejos', require('./desejos'));
router.use('/decks', require('./decks'));
router.use('/usuarios', require('./usuarios'));
router.use('/lojas', require('./lojas'));
router.use('/cartas', require('./cartas'));
router.use('/acervo', require('./acervo'));
router.use('/consignacoes', require('./consignacoes'));
router.use('/chamados', require('./chamados'));
router.use('/notificacoes', require('./notificacoes'));

module.exports = router;
