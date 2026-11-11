// API externa pública (sem chave). Scryfall pede até ~10 req/s.
const BASE = 'https://api.scryfall.com';

export async function fuzzyCard(name) {
  let res;
  try {
    res = await fetch(`${BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`, { headers: { Accept: 'application/json' } });
  } catch {
    throw new Error('Sem conexão com o Scryfall.');
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Scryfall respondeu ${res.status}.`);
  const c = await res.json();
  const img = c.image_uris || c.card_faces?.[0]?.image_uris || {};
  return { name: c.name, edition: c.set_name, image: img.normal || img.small, typeLine: c.type_line,
    colorIdentity: c.color_identity, priceUsd: c.prices?.usd };
}
