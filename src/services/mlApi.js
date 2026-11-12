import { config } from '../config';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${config.mlApiUrl}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    throw new Error('Não foi possível conectar à API de avaliação. Verifique se o backend-ml está rodando.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.detail || `Erro ${res.status} na API de avaliação.`), { status: res.status });
  return body;
}

export const evaluateCard = (payload) => request('/evaluate', { method: 'POST', body: JSON.stringify(payload) });
export const listExampleDecks = () => request('/decks/examples');
export const getExampleDeck = (id) => request(`/decks/examples/${encodeURIComponent(id)}`);
export const matchCardName = (q) => request(`/cards/match?q=${encodeURIComponent(q)}`);

// Foto da carta (base64 ou data URI) -> { candidates: [{ name, oracle_id, score, ocr_text }], lines }.
export const scanCard = (image) => request('/scan', { method: 'POST', body: JSON.stringify({ image }) });
// Avalia a carta (dados do Scryfall em card.mlData) em vários decks Commander de uma vez.
export const evaluateInDecks = (card, decks) => request('/evaluate/decks', { method: 'POST', body: JSON.stringify({ card, decks }) });
