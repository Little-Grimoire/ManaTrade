import { Platform } from 'react-native';
import { config } from '../config';
import { invalidarCache, lerDoCache, marcarOffline, marcarOnline, salvarNoCache } from './cacheLocal';

// ---------- Cliente da API do backend (backend/, disciplina Web 2) ----------

const TIMEOUT_MS = 15000;
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

// Leituras autenticadas (GET) são guardadas no aparelho (cacheLocal). Se o servidor não
// responder, a última cópia salva é devolvida e o app mostra o aviso "sem conexão".
// Escritas (POST/PATCH/DELETE) sempre exigem o servidor e invalidam as cópias do recurso.
export async function apiRequest(caminho, { method = 'GET', body, autenticado = true } = {}) {
  const usaCache = autenticado && !!token;
  let resposta;
  // Sem timeout, um servidor inalcançável (IP errado, firewall, rede isolada) deixa o fetch
  // pendurado por minutos no celular e a tela fica travada sem erro.
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TIMEOUT_MS);
  try {
    resposta = await fetch(`${config.apiUrl}/api${caminho}`, {
      signal: controle.signal,
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(autenticado && token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    if (usaCache && method === 'GET') {
      const salvo = await lerDoCache(caminho);
      if (salvo) { marcarOffline(salvo.salvoEm); return salvo.dados; }
    }
    // No celular, "localhost" é o próprio aparelho: a URL precisa ser o IP do computador.
    const dica = Platform.OS !== 'web' && /localhost|127\.0\.0\.1/.test(config.apiUrl)
      ? ' No celular, defina EXPO_PUBLIC_API_URL no .env com o IP do computador (ex.: http://192.168.0.10:3001) e reinicie o Expo.'
      : Platform.OS !== 'web'
        ? ' Confira se o celular está na mesma rede do computador, se esse IP ainda é o do computador e se o backend está rodando.'
        : ' Verifique sua conexão e se o backend está rodando (cd backend && npm run dev).';
    const acao = method === 'GET' ? '' : ' A alteração não foi salva.';
    throw new ApiError(0, `Não foi possível conectar ao servidor (${config.apiUrl}).${acao}${dica}`);
  } finally {
    clearTimeout(timer);
  }

  marcarOnline();
  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  if (!resposta.ok) {
    if (resposta.status === 401 && autenticado && token && aoExpirarSessao) aoExpirarSessao();
    throw new ApiError(resposta.status, dados?.erro || `Erro ${resposta.status}.`, dados?.detalhes);
  }
  if (usaCache) {
    if (method === 'GET') await salvarNoCache(caminho, dados);
    else await invalidarCache(caminho);
  }
  return dados;
}
