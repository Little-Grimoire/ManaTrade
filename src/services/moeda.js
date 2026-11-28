// Preços sempre em reais. O backend já entrega carta.preco_brl; só o ManaScan, que lê o
// Scryfall direto (em US$), precisa converter, com a cotação que o backend usa (GET /api/cotacao).
import { config } from '../config';

const PADRAO_USD_BRL = 5.5; // só se o backend não responder
let cotacao = null;

// "R$ 1.234,56"; null/undefined/'' → fallback.
export function reais(valor, fallback = '–') {
  if (valor === null || valor === undefined || valor === '' || Number.isNaN(Number(valor))) return fallback;
  const [inteiro, centavos] = Number(valor).toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

// Cotação US$ → R$ (busca uma vez por sessão do app).
export async function obterCotacao() {
  if (cotacao) return cotacao;
  try {
    const resposta = await fetch(`${config.apiUrl}/api/cotacao`);
    const { usd_brl: valor } = await resposta.json();
    if (valor > 0) cotacao = valor;
  } catch {
    // usa o padrão abaixo
  }
  return cotacao || PADRAO_USD_BRL;
}

export async function dolarParaReais(usd) {
  if (usd === null || usd === undefined || usd === '') return null;
  return Math.round(Number(usd) * (await obterCotacao()) * 100) / 100;
}
