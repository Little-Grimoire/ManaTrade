import { storage } from './storage';

// SecureStore limita ~2 KB por chave: o deck é salvo em pedaços.
const KEY = 'manatrade_deck';
const CHUNK = 1800;

export async function saveDeck(deck) {
  const json = JSON.stringify(deck);
  const parts = Math.ceil(json.length / CHUNK);
  for (let i = 0; i < parts; i += 1) await storage.setItem(`${KEY}_${i}`, json.slice(i * CHUNK, (i + 1) * CHUNK));
  await storage.setItem(`${KEY}_n`, String(parts));
}

export async function loadDeck() {
  const n = Number(await storage.getItem(`${KEY}_n`));
  if (!n) return null;
  let json = '';
  for (let i = 0; i < n; i += 1) json += (await storage.getItem(`${KEY}_${i}`)) || '';
  try { return JSON.parse(json); } catch { return null; }
}

export async function clearDeck() {
  const n = Number(await storage.getItem(`${KEY}_n`)) || 0;
  for (let i = 0; i < n; i += 1) await storage.removeItem(`${KEY}_${i}`);
  await storage.removeItem(`${KEY}_n`);
}

/** "1 Sol Ring" / "Sol Ring" por linha -> lista com repetições. */
export function parseDecklist(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).flatMap((l) => {
    const m = l.match(/^(\d+)x?\s+(.+)$/i);
    return m ? Array(Number(m[1])).fill(m[2].trim()) : [l];
  });
}
