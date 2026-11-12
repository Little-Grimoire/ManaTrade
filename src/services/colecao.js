// Coleção do usuário logado (/api/colecao).
import { apiRequest } from './api';

export const CONDICOES = ['NM', 'SP', 'MP', 'HP', 'D'];

// Itens no formato da API: { id, quantidade, condicao, foil, observacao, carta: {...} }
export const listarColecao = () => apiRequest('/colecao');

// carta: { scryfall_id } | { nome } | { carta_id }; extras: { quantidade?, condicao?, foil?, observacao? }
// Se já existir a mesma carta com a mesma condição e foil, o backend soma a quantidade.
export const adicionarNaColecao = (carta, extras = {}) =>
  apiRequest('/colecao', { method: 'POST', body: { ...carta, ...extras } });

export const atualizarItemColecao = (id, dados) => apiRequest(`/colecao/${id}`, { method: 'PATCH', body: dados });

export const removerItemColecao = (id) => apiRequest(`/colecao/${id}`, { method: 'DELETE' });
