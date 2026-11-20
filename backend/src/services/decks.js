// Decks do jogador (decks + deck_cartas: N:N Deck ↔ Carta). Usado pela API e pelas páginas.
// As funções recebem o deck já conferido pelo middleware carregar() (só o dono).
const {
  sequelize, Deck, DeckCarta, Carta, ItemColecao,
} = require('../models');
const { FORMATOS, validarDeck, listaDeFormatos } = require('./formatos');
const { obterCarta, obterCartasPorNome, completarDetalhes } = require('./cartas');
const { lerLista } = require('./listaDeck');
const HttpError = require('../utils/HttpError');
const { idValido } = require('../utils/campos');

const MAX_CARTAS_DISTINTAS_IMPORTACAO = 250;
const incluirItens = { model: DeckCarta, as: 'itens', include: { model: Carta, as: 'carta' } };
const incluirComandante = { model: Carta, as: 'comandante' };

// ---------- auxiliares ----------

// Aceita a carta como objeto { carta_id | scryfall_id | nome } ou só o nome (string).
const referenciaDeCarta = (valor) => (typeof valor === 'string' ? { nome: valor } : valor);

const quantidadeValida = (valor) => {
  const quantidade = Number(valor ?? 1);
  if (!Number.isInteger(quantidade) || quantidade < 1) throw new HttpError(400, 'A quantidade deve ser um número inteiro maior que zero.');
  return quantidade;
};

// Recarrega o deck com comandante e cartas.
async function carregarCompleto(deckId, { transaction } = {}) {
  const deck = await Deck.findByPk(deckId, { include: [incluirComandante, incluirItens], transaction });
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

// Deck completo: cartas, validação pelo formato, posse na coleção e estatísticas.
async function detalhar(deckId) {
  const deck = await carregarCompleto(deckId);
  await completarDetalhes([deck.comandante, ...deck.itens.map((i) => i.carta)]);

  const colecao = await quantidadesNaColecao(deck.usuario_id);
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

// Comandante só existe em formatos com comandante; nos demais fica nulo.
async function resolverComandante(formato, valor) {
  if (!FORMATOS[formato]?.comandante || valor === undefined || valor === null || valor === '') return null;
  return (await obterCarta(referenciaDeCarta(valor))).id;
}

// Marca o deck como alterado (ordena a lista por "editado por último").
async function tocar(deck, transaction) {
  deck.changed('updated_at', true);
  await deck.save({ transaction });
}

// ---------- deck ----------

const formatos = () => listaDeFormatos();

// Resumo de cada deck do usuário (sem consultar o Scryfall).
async function listar(usuario) {
  const decks = await Deck.findAll({
    where: { usuario_id: usuario.id },
    include: [incluirComandante, incluirItens],
    order: [['updated_at', 'DESC']],
  });
  return decks.map((deck) => {
    const v = validarDeck(deck.formato, deck.comandante, deck.itens);
    return {
      id: deck.id,
      nome: deck.nome,
      formato: deck.formato,
      formatoNome: FORMATOS[deck.formato]?.nome,
      descricao: deck.descricao,
      comandante: deck.comandante && {
        id: deck.comandante.id, nome: deck.comandante.nome, imagem_url: deck.comandante.imagem_url, identidade_cor: deck.comandante.identidade_cor,
      },
      total: v.total,
      minimo: v.minimo,
      maximo: v.maximo,
      valido: v.valido,
      updated_at: deck.updated_at,
    };
  });
}

// dados: { nome, formato?, descricao?, comandante? }
async function criar(usuario, dados = {}) {
  const { nome, formato = 'commander', descricao, comandante } = dados;
  return Deck.create({
    nome,
    formato,
    descricao,
    usuario_id: usuario.id,
    comandante_id: FORMATOS[formato] ? await resolverComandante(formato, comandante) : null,
  });
}

// dados: { nome?, formato?, descricao?, comandante? (null ou "" remove) }
async function atualizar(deck, dados = {}) {
  const campos = {};
  for (const campo of ['nome', 'formato', 'descricao']) if (dados[campo] !== undefined) campos[campo] = dados[campo];
  const formato = campos.formato ?? deck.formato;
  if (dados.comandante !== undefined) campos.comandante_id = await resolverComandante(formato, dados.comandante);
  else if (campos.formato && !FORMATOS[campos.formato]?.comandante) campos.comandante_id = null;
  if (!Object.keys(campos).length) throw new HttpError(400, 'Nada para atualizar. Campos aceitos: nome, formato, descricao, comandante.');
  await deck.update(campos);
  return deck;
}

// deck_cartas vai junto (CASCADE).
const remover = (deck) => deck.destroy();

// ---------- cartas do deck ----------

// dados: { carta_id | scryfall_id | nome, quantidade? } — soma se a carta já estiver no deck.
async function adicionarCarta(deck, dados = {}) {
  const quantidade = quantidadeValida(dados.quantidade);
  const carta = await obterCarta(dados);
  const existente = await DeckCarta.findOne({ where: { deck_id: deck.id, carta_id: carta.id } });
  if (existente) await existente.update({ quantidade: existente.quantidade + quantidade });
  else await DeckCarta.create({ deck_id: deck.id, carta_id: carta.id, quantidade });
  await tocar(deck);
}

async function itemDoDeck(deck, cartaId) {
  const item = await DeckCarta.findOne({ where: { deck_id: deck.id, carta_id: idValido(cartaId) } });
  if (!item) throw new HttpError(404, 'Esta carta não está no deck.');
  return item;
}

async function atualizarCarta(deck, cartaId, quantidade) {
  const item = await itemDoDeck(deck, cartaId);
  if (quantidade === undefined || quantidade === '') throw new HttpError(400, 'Informe a quantidade.');
  await item.update({ quantidade });
}

async function removerCarta(deck, cartaId) {
  const item = await itemDoDeck(deck, cartaId);
  await item.destroy();
}

// dados: { lista, substituir? } — lista colada (uma carta por linha, nomes exatos em inglês).
// Devolve os nomes não encontrados.
async function importar(deck, { lista, substituir = false } = {}) {
  const { comandante, cartas } = lerLista(lista);
  if (!cartas.length && !comandante.length) throw new HttpError(400, 'A lista está vazia. Use uma carta por linha, ex.: "1 Sol Ring".');
  if (cartas.length > MAX_CARTAS_DISTINTAS_IMPORTACAO) throw new HttpError(400, `A lista tem mais de ${MAX_CARTAS_DISTINTAS_IMPORTACAO} cartas diferentes.`);

  const usaComandante = FORMATOS[deck.formato]?.comandante;
  const nomes = [...cartas.map((c) => c.nome), ...(usaComandante ? comandante.slice(0, 1) : [])];

  return sequelize.transaction(async (transaction) => {
    const { porNome, naoEncontradas } = await obterCartasPorNome(nomes, transaction);
    if (substituir === true || substituir === 'true' || substituir === 'on') {
      await DeckCarta.destroy({ where: { deck_id: deck.id }, transaction });
    }

    for (const { nome, quantidade } of cartas) {
      const carta = porNome.get(nome);
      if (!carta) continue;
      const existente = await DeckCarta.findOne({ where: { deck_id: deck.id, carta_id: carta.id }, transaction });
      if (existente) await existente.update({ quantidade: existente.quantidade + quantidade }, { transaction });
      else await DeckCarta.create({ deck_id: deck.id, carta_id: carta.id, quantidade }, { transaction });
    }

    if (usaComandante && comandante.length && porNome.get(comandante[0])) deck.comandante_id = porNome.get(comandante[0]).id;
    await tocar(deck, transaction);
    return naoEncontradas;
  });
}

module.exports = {
  formatos, listar, detalhar, criar, atualizar, remover, adicionarCarta, atualizarCarta, removerCarta, importar, FORMATOS,
};
