// Decks do usuário logado (decks + deck_cartas: N:N Deck ↔ Carta). CRUD do deck e das cartas do deck.
const {
  sequelize, Deck, DeckCarta, Carta, ItemColecao,
} = require('../models');
const { FORMATOS, validarDeck, listaDeFormatos } = require('../services/formatos');
const { obterCarta, obterCartasPorNome, completarDetalhes } = require('../services/cartas');
const { lerLista } = require('../services/listaDeck');
const HttpError = require('../utils/HttpError');

const MAX_CARTAS_DISTINTAS_IMPORTACAO = 250;
const incluirItens = { model: DeckCarta, as: 'itens', include: { model: Carta, as: 'carta' } };
const incluirComandante = { model: Carta, as: 'comandante' };

// ---------- auxiliares ----------

// Aceita a carta como objeto { carta_id | scryfall_id | nome } ou só o nome (string).
const referenciaDeCarta = (valor) => (typeof valor === 'string' ? { nome: valor } : valor);

const idValido = (valor) => {
  const id = Number(valor);
  if (!Number.isInteger(id)) throw new HttpError(404, 'Não encontrado.');
  return id;
};

// Busca o deck garantindo que pertence ao usuário logado (de outra pessoa: 404).
async function deckDoUsuario(req, { comItens = true, transaction } = {}) {
  const deck = await Deck.findOne({
    where: { id: idValido(req.params.id), usuario_id: req.usuario.id },
    include: comItens ? [incluirComandante, incluirItens] : [incluirComandante],
    transaction,
  });
  if (!deck) throw new HttpError(404, 'Deck não encontrado.');
  return deck;
}

// Categoria para agrupar a lista (a ordem dos testes importa: "Artifact Creature" é criatura).
function categoria(tipo = '') {
  if (/\bLand\b/.test(tipo)) return 'Terrenos';
  if (/\bCreature\b/.test(tipo)) return 'Criaturas';
  if (/\bPlaneswalker\b/.test(tipo)) return 'Planeswalkers';
  if (/\bBattle\b/.test(tipo)) return 'Batalhas';
  if (/\bInstant\b/.test(tipo)) return 'Mágicas instantâneas';
  if (/\bSorcery\b/.test(tipo)) return 'Feitiços';
  if (/\bArtifact\b/.test(tipo)) return 'Artefatos';
  if (/\bEnchantment\b/.test(tipo)) return 'Encantamentos';
  return 'Outros';
}

// Quantas cópias de cada carta o usuário tem na coleção (qualquer edição: compara pelo oracle_id).
async function quantidadesNaColecao(usuarioId) {
  const itens = await ItemColecao.findAll({ where: { usuario_id: usuarioId }, include: { model: Carta, as: 'carta' } });
  const mapa = new Map();
  for (const item of itens) {
    const chave = item.carta.oracle_id || item.carta.nome;
    mapa.set(chave, (mapa.get(chave) || 0) + item.quantidade);
  }
  return mapa;
}

// Monta a resposta completa do deck: cartas, validação pelo formato, posse na coleção e estatísticas.
async function detalharDeck(deck, usuarioId) {
  await completarDetalhes([deck.comandante, ...deck.itens.map((i) => i.carta)]);

  const colecao = await quantidadesNaColecao(usuarioId);
  const naColecao = (carta) => colecao.get(carta.oracle_id || carta.nome) || 0;
  const itens = [...deck.itens].sort((a, b) => a.carta.nome.localeCompare(b.carta.nome));
  const validacao = validarDeck(deck.formato, deck.comandante, itens);

  const porTipo = {};
  const curva = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, '7+': 0 };
  let possuidas = deck.comandante && naColecao(deck.comandante) ? 1 : 0;
  for (const { carta, quantidade } of itens) {
    const cat = categoria(carta.tipo);
    porTipo[cat] = (porTipo[cat] || 0) + quantidade;
    if (cat !== 'Terrenos' && carta.cmc != null) {
      const cmc = Math.floor(Number(carta.cmc));
      curva[cmc >= 7 ? '7+' : cmc] += quantidade;
    }
    possuidas += Math.min(naColecao(carta), quantidade);
  }

  return {
    id: deck.id,
    nome: deck.nome,
    formato: deck.formato,
    formatoNome: FORMATOS[deck.formato]?.nome,
    descricao: deck.descricao,
    comandante: deck.comandante,
    comandanteNaColecao: deck.comandante ? naColecao(deck.comandante) : 0,
    cartas: itens.map(({ carta, quantidade }) => ({
      carta,
      quantidade,
      categoria: categoria(carta.tipo),
      naColecao: naColecao(carta),
      problemas: validacao.porCarta[carta.id] || [],
    })),
    validacao: { ...validacao, porCarta: undefined },
    estatisticas: { porTipo, curva, possuidas, total: validacao.total },
    created_at: deck.created_at,
    updated_at: deck.updated_at,
  };
}

async function responderDeck(req, res, status = 200) {
  const deck = await deckDoUsuario(req);
  res.status(status).json(await detalharDeck(deck, req.usuario.id));
}

// Comandante só existe em formatos com comandante; nos demais fica nulo.
async function resolverComandante(formato, valor) {
  if (!FORMATOS[formato]?.comandante || valor === undefined || valor === null || valor === '') return null;
  return (await obterCarta(referenciaDeCarta(valor))).id;
}

// ---------- deck ----------

// GET /api/decks/formatos
function formatos(req, res) {
  res.json(listaDeFormatos());
}

// GET /api/decks — resumo de cada deck (sem consultar o Scryfall).
async function listar(req, res) {
  const decks = await Deck.findAll({
    where: { usuario_id: req.usuario.id },
    include: [incluirComandante, incluirItens],
    order: [['updated_at', 'DESC']],
  });
  res.json(decks.map((deck) => {
    const v = validarDeck(deck.formato, deck.comandante, deck.itens);
    return {
      id: deck.id,
      nome: deck.nome,
      formato: deck.formato,
      formatoNome: FORMATOS[deck.formato]?.nome,
      descricao: deck.descricao,
      comandante: deck.comandante && { id: deck.comandante.id, nome: deck.comandante.nome, imagem_url: deck.comandante.imagem_url, identidade_cor: deck.comandante.identidade_cor },
      total: v.total,
      minimo: v.minimo,
      maximo: v.maximo,
      valido: v.valido,
      updated_at: deck.updated_at,
    };
  }));
}

// GET /api/decks/:id
async function obter(req, res) {
  await responderDeck(req, res);
}

// POST /api/decks  { nome, formato?, descricao?, comandante? }
async function criar(req, res) {
  const { nome, formato = 'commander', descricao, comandante } = req.body || {};
  const deck = await Deck.create({
    nome,
    formato,
    descricao,
    usuario_id: req.usuario.id,
    comandante_id: FORMATOS[formato] ? await resolverComandante(formato, comandante) : null,
  });
  req.params.id = deck.id;
  res.location(`/api/decks/${deck.id}`);
  await responderDeck(req, res, 201);
}

// PATCH /api/decks/:id  { nome?, formato?, descricao?, comandante? (null remove) }
async function atualizar(req, res) {
  const deck = await deckDoUsuario(req, { comItens: false });
  const body = req.body || {};
  const dados = {};
  for (const campo of ['nome', 'formato', 'descricao']) if (body[campo] !== undefined) dados[campo] = body[campo];
  const formato = dados.formato ?? deck.formato;
  if (body.comandante !== undefined) dados.comandante_id = await resolverComandante(formato, body.comandante);
  else if (dados.formato && !FORMATOS[dados.formato]?.comandante) dados.comandante_id = null;
  if (!Object.keys(dados).length) throw new HttpError(400, 'Nada para atualizar. Campos aceitos: nome, formato, descricao, comandante.');
  await deck.update(dados);
  await responderDeck(req, res);
}

// DELETE /api/decks/:id
async function remover(req, res) {
  const deck = await deckDoUsuario(req, { comItens: false });
  await deck.destroy(); // deck_cartas vai junto (CASCADE)
  res.status(204).end();
}

// ---------- cartas do deck ----------

// POST /api/decks/:id/cartas  { carta_id | scryfall_id | nome, quantidade? } — soma se a carta já estiver no deck.
async function adicionarCarta(req, res) {
  const deck = await deckDoUsuario(req, { comItens: false });
  const quantidade = Number(req.body?.quantidade ?? 1);
  if (!Number.isInteger(quantidade) || quantidade < 1) throw new HttpError(400, 'A quantidade deve ser um número inteiro maior que zero.');
  const carta = await obterCarta(req.body || {});
  const existente = await DeckCarta.findOne({ where: { deck_id: deck.id, carta_id: carta.id } });
  if (existente) await existente.update({ quantidade: existente.quantidade + Number(quantidade) });
  else await DeckCarta.create({ deck_id: deck.id, carta_id: carta.id, quantidade });
  deck.changed('updated_at', true);
  await deck.save();
  await responderDeck(req, res, 201);
}

async function itemDoDeck(req) {
  const deck = await deckDoUsuario(req, { comItens: false });
  const item = await DeckCarta.findOne({ where: { deck_id: deck.id, carta_id: idValido(req.params.cartaId) } });
  if (!item) throw new HttpError(404, 'Esta carta não está no deck.');
  return { deck, item };
}

// PATCH /api/decks/:id/cartas/:cartaId  { quantidade }
async function atualizarCarta(req, res) {
  const { item } = await itemDoDeck(req);
  if (req.body?.quantidade === undefined) throw new HttpError(400, 'Informe a quantidade.');
  await item.update({ quantidade: req.body.quantidade });
  await responderDeck(req, res);
}

// DELETE /api/decks/:id/cartas/:cartaId — devolve o deck atualizado.
async function removerCarta(req, res) {
  const { item } = await itemDoDeck(req);
  await item.destroy();
  await responderDeck(req, res);
}

// POST /api/decks/:id/importar  { lista, substituir? }
// Lista colada (uma carta por linha). Nomes exatos, em inglês. Devolve o deck e os nomes não encontrados.
async function importar(req, res) {
  const { lista, substituir = false } = req.body || {};
  const { comandante, cartas } = lerLista(lista);
  if (!cartas.length && !comandante.length) throw new HttpError(400, 'A lista está vazia. Use uma carta por linha, ex.: "1 Sol Ring".');
  if (cartas.length > MAX_CARTAS_DISTINTAS_IMPORTACAO) throw new HttpError(400, `A lista tem mais de ${MAX_CARTAS_DISTINTAS_IMPORTACAO} cartas diferentes.`);

  const deckAtual = await deckDoUsuario(req, { comItens: false });
  const usaComandante = FORMATOS[deckAtual.formato]?.comandante;
  const nomes = [...cartas.map((c) => c.nome), ...(usaComandante ? comandante.slice(0, 1) : [])];

  const naoEncontradas = await sequelize.transaction(async (transaction) => {
    const { porNome, naoEncontradas: faltando } = await obterCartasPorNome(nomes, transaction);
    if (substituir) await DeckCarta.destroy({ where: { deck_id: deckAtual.id }, transaction });

    for (const { nome, quantidade } of cartas) {
      const carta = porNome.get(nome);
      if (!carta) continue;
      const existente = await DeckCarta.findOne({ where: { deck_id: deckAtual.id, carta_id: carta.id }, transaction });
      if (existente) await existente.update({ quantidade: existente.quantidade + quantidade }, { transaction });
      else await DeckCarta.create({ deck_id: deckAtual.id, carta_id: carta.id, quantidade }, { transaction });
    }

    const dados = {};
    if (usaComandante && comandante.length && porNome.get(comandante[0])) dados.comandante_id = porNome.get(comandante[0]).id;
    deckAtual.changed('updated_at', true);
    await deckAtual.update(dados, { transaction });
    return faltando;
  });

  const deck = await deckDoUsuario(req);
  res.json({ deck: await detalharDeck(deck, req.usuario.id), naoEncontradas });
}

module.exports = {
  formatos, listar, obter, criar, atualizar, remover, adicionarCarta, atualizarCarta, removerCarta, importar,
};
