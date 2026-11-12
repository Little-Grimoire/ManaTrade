// Obtém cartas do cache local (tabela cartas) ou, se não existirem, busca no Scryfall e salva.
const { Carta } = require('../models');
const HttpError = require('../utils/HttpError');

const SCRYFALL = 'https://api.scryfall.com';
const LOTE_SCRYFALL = 75; // máximo de cartas por chamada de /cards/collection
const HEADERS = { Accept: 'application/json', 'User-Agent': 'ManaTrade/1.0' };

async function chamarScryfall(caminho, opcoes = {}) {
  let resposta;
  try {
    resposta = await fetch(`${SCRYFALL}${caminho}`, { ...opcoes, headers: { ...HEADERS, ...opcoes.headers } });
  } catch {
    throw new HttpError(502, 'Não foi possível consultar o Scryfall.');
  }
  if (resposta.status === 404) throw new HttpError(404, 'Carta não encontrada no Scryfall.');
  if (!resposta.ok) throw new HttpError(502, `Scryfall respondeu ${resposta.status}.`);
  return resposta.json();
}

// Busca em lotes de 75. identificadores: [{ name }] ou [{ id }].
// Devolve { encontradas: [json do Scryfall na mesma ordem dos identificadores encontrados], naoEncontradas: [...] }.
async function buscarColecaoNoScryfall(identificadores) {
  const encontradas = [];
  const naoEncontradas = [];
  for (let i = 0; i < identificadores.length; i += LOTE_SCRYFALL) {
    const lote = identificadores.slice(i, i + LOTE_SCRYFALL);
    const { data, not_found: faltando = [] } = await chamarScryfall('/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: lote }),
    });
    encontradas.push(...data);
    naoEncontradas.push(...faltando);
  }
  return { encontradas, naoEncontradas };
}

// Aceita { carta_id } (carta já no banco), { scryfall_id } ou { nome } (busca aproximada, aceita erros de digitação).
async function obterCarta({ carta_id: cartaId, scryfall_id: scryfallId, nome } = {}) {
  if (cartaId) {
    const carta = await Carta.findByPk(cartaId);
    if (!carta) throw new HttpError(404, 'Carta não encontrada.');
    return carta;
  }
  if (scryfallId) {
    const emCache = await Carta.findOne({ where: { scryfall_id: scryfallId } });
    if (emCache?.legalidades) return emCache;
    return Carta.salvarDoScryfall(await chamarScryfall(`/cards/${encodeURIComponent(scryfallId)}`));
  }
  if (nome && String(nome).trim()) {
    const json = await chamarScryfall(`/cards/named?fuzzy=${encodeURIComponent(String(nome).trim())}`);
    return Carta.salvarDoScryfall(json);
  }
  throw new HttpError(400, 'Informe a carta: carta_id, scryfall_id ou nome.');
}

// Nome exato (como numa lista de deck). Cartas de duas faces aceitam só a primeira face ("Delver of Secrets").
const mesmoNome = (pedido, nomeScryfall) => {
  const a = pedido.toLowerCase();
  const b = nomeScryfall.toLowerCase();
  return a === b || b.startsWith(`${a} // `);
};

// Várias cartas por nome exato (importação de lista). Devolve { porNome: Map(nome pedido -> Carta), naoEncontradas: [nomes] }.
async function obterCartasPorNome(nomes, transaction) {
  const unicos = [...new Set(nomes)];
  const { encontradas } = await buscarColecaoNoScryfall(unicos.map((name) => ({ name })));
  const porNome = new Map();
  for (const json of encontradas) {
    const pedido = unicos.find((n) => !porNome.has(n) && mesmoNome(n, json.name));
    if (pedido) porNome.set(pedido, await Carta.salvarDoScryfall(json, { transaction }));
  }
  return { porNome, naoEncontradas: unicos.filter((n) => !porNome.has(n)) };
}

// Cartas salvas antes de existir legalidades/cmc: completa com o Scryfall. Falhas são ignoradas
// (a validação só não verifica legalidade dessas cartas).
async function completarDetalhes(cartas) {
  const incompletas = cartas.filter((c) => c && !c.legalidades);
  if (!incompletas.length) return;
  try {
    const { encontradas } = await buscarColecaoNoScryfall(incompletas.map((c) => ({ id: c.scryfall_id })));
    const porId = new Map(encontradas.map((j) => [j.id, j]));
    for (const carta of incompletas) {
      const json = porId.get(carta.scryfall_id);
      if (json) await carta.update(Carta.camposDoScryfall(json));
    }
  } catch (erro) {
    console.warn('Não foi possível completar dados das cartas:', erro.message);
  }
}

module.exports = { obterCarta, obterCartasPorNome, completarDetalhes };
