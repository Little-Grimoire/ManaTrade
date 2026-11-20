// Monta a aplicação Express (sem abrir porta: server.js faz isso; os testes usam o app direto).
//
// Duas "portas de entrada" para as mesmas regras (services) e os mesmos middlewares de permissão:
//   /api/...  API REST em JSON, autenticada por token JWT no cabeçalho Authorization (Entrega 2)
//   /...      Páginas web MVC renderizadas com EJS, token JWT guardado em cookie (Entrega 1)
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { naoEncontrado, tratarErros } = require('./middlewares/erros');
const { flash, metodoDoFormulario, locaisDasViews } = require('./middlewares/web');

const app = express();

// Views (o "V" do MVC).
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// CORS: o app Expo (web em localhost:8081 ou celular) chama a API de outra origem.
// CORS_ORIGIN aceita uma lista separada por vírgula; sem ela, libera qualquer origem (desenvolvimento).
const origens = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
app.use('/api', cors({ origin: origens?.length ? origens : true }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false })); // formulários das páginas web (MVC)
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Rota inexistente da API responde 404 em JSON aqui mesmo (não segue para as páginas).
app.use('/api', require('./routes/api'), naoEncontrado);

// Daqui para baixo são páginas: marca a requisição para o tratador de erros responder em HTML.
const paginaWeb = (req, res, next) => { req.paginaWeb = true; next(); };
app.use(paginaWeb, flash, metodoDoFormulario, locaisDasViews, require('./routes/web'));

app.use(naoEncontrado);
app.use(tratarErros);

module.exports = app;
