// Monta a aplicação Express (sem abrir porta: server.js faz isso; os testes usam o app direto).
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { naoEncontrado, tratarErros } = require('./middlewares/erros');

const app = express();

// CORS: o app Expo (web em localhost:8081 ou celular) chama a API de outra origem.
// CORS_ORIGIN aceita uma lista separada por vírgula; sem ela, libera qualquer origem (desenvolvimento).
const origens = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: origens?.length ? origens : true }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false })); // formulários das páginas web (MVC)
app.use(cookieParser());

app.use('/api', require('./routes/api'));

app.use(naoEncontrado);
app.use(tratarErros);

module.exports = app;
