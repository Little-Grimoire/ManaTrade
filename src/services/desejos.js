// Lista de desejos do usuário logado (/api/desejos).
import { apiRequest } from './api';

export const PRIORIDADES = [
  { valor: 'alta', rotulo: 'Alta' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'baixa', rotulo: 'Baixa' },
];

export const listarDesejos = () => apiRequest('/desejos');

// carta: { scryfall_id } ou { nome } (o backend busca no Scryfall e aceita erros de digitação).
// extras: { prioridade?, preco_maximo_usd?, observacao? }
export const adicionarDesejo = (carta, extras = {}) =>
  apiRequest('/desejos', { method: 'POST', body: { ...carta, ...extras } });

export const atualizarDesejo = (id, dados) => apiRequest(`/desejos/${id}`, { method: 'PATCH', body: dados });

export const removerDesejo = (id) => apiRequest(`/desejos/${id}`, { method: 'DELETE' });
