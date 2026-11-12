import { Platform } from 'react-native';
// API externa pública (sem chave). Scryfall pede até ~10 req/s.
const BASE = 'https://api.scryfall.com';
// O Scryfall recusa (400) pedidos sem User-Agent próprio, e o padrão do Android (okhttp) é recusado.
// No navegador o User-Agent é do browser (o cabeçalho é ignorado), o que o Scryfall aceita.
const HEADERS = { Accept: 'application/json', ...(Platform.OS !== 'web' && { 'User-Agent': 'ManaTrade/1.0' }) };

export async function fuzzyCard(name) {
  let res;
  try {
    res = await fetch(`${BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`, { headers: HEADERS });
  } catch {
    throw new Error('Sem conexão com o Scryfall.');
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Scryfall respondeu ${res.status}.`);
  const c = await res.json();
  const img = c.image_uris || c.card_faces?.[0]?.image_uris || {};
  return { id: c.id, name: c.name, edition: c.set_name, image: img.normal || img.small, typeLine: c.type_line,
    colorIdentity: c.color_identity, priceUsd: c.prices?.usd, mlData: paraML(c) };
}

// Dados da carta no formato do modelo de ML (mesmos campos do snapshot ml/data/cards.csv.gz).
// Enviados ao backend-ml, que calcula as features mesmo para cartas mais novas que o snapshot.
function paraML(c) {
  const faces = c.card_faces || [];
  const face = (k) => c[k] ?? (faces.some((x) => x[k] != null) ? faces.map((x) => x[k]).filter((v) => v != null).join(' // ') : null);
  return {
    name: c.name, oracle_id: c.oracle_id || faces[0]?.oracle_id, layout: c.layout, cmc: c.cmc,
    mana_cost: face('mana_cost'), color_identity: c.color_identity || [], type_line: c.type_line,
    oracle_text: face('oracle_text'), power: face('power'), toughness: face('toughness'), loyalty: face('loyalty'),
    rarity: c.rarity, keywords: c.keywords || [], edhrec_rank: c.edhrec_rank ?? null,
    legal_commander: c.legalities?.commander ?? null,
  };
}
