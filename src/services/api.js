import { Platform } from 'react-native';
import { config } from '../config';
import { cards, stores, events, anuncios, consignacoes, propostas, notifications } from '../mocks/dados';

// ---------- Cliente da API do backend (backend/) ----------

let token = null;
let aoExpirarSessao = null;

// Chamado pelo AuthContext: o token passa a ir em todas as requisições.
export function definirToken(novoToken) { token = novoToken; }
// Chamado pelo AuthContext: o que fazer quando a API responder 401 (token vencido/inválido).
export function aoReceber401(callback) { aoExpirarSessao = callback; }

export class ApiError extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}

export async function apiRequest(caminho, { method = 'GET', body, autenticado = true } = {}) {
  let resposta;
  try {
    resposta = await fetch(`${config.apiUrl}/api${caminho}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(autenticado && token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // No celular, "localhost" é o próprio aparelho: a URL precisa ser o IP do computador.
    const dica = Platform.OS !== 'web' && /localhost|127\.0\.0\.1/.test(config.apiUrl)
      ? ' No celular, defina EXPO_PUBLIC_API_URL no .env com o IP do computador (ex.: http://192.168.0.10:3001) e reinicie o Expo.'
      : ' Verifique se o backend está rodando (cd backend && npm run dev).';
    throw new ApiError(0, `Não foi possível conectar ao servidor (${config.apiUrl}).${dica}`);
  }

  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    if (resposta.status === 401 && autenticado && token && aoExpirarSessao) aoExpirarSessao();
    throw new ApiError(resposta.status, dados?.erro || `Erro ${resposta.status}.`, dados?.detalhes);
  }
  return dados;
}

// ---------- Dados falsos (ainda usados por telas que não foram ligadas à API) ----------
// TODO: trocar cada mock pela rota real conforme a API for implementada.
const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getCards() { await wait(); return cards; }
export async function getStores() { await wait(); return stores; }
export async function getEvents() { await wait(); return events; }
export async function getAds() { await wait(); return anuncios; }
export async function getConsignments() { await wait(); return consignacoes; }
export async function getProposals() { await wait(); return propostas; }
export async function getNotifications() { await wait(); return notifications; }
