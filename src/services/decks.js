// Decks do usuário logado (/api/decks). Os decks ficam no servidor (antes ficavam só no aparelho).
import { apiRequest } from './api';

export const listarFormatos = () => apiRequest('/decks/formatos');
export const listarDecks = () => apiRequest('/decks');
export const obterDeck = (id) => apiRequest(`/decks/${id}`);

// dados: { nome, formato, descricao?, comandante? (nome ou { scryfall_id }) }
export const criarDeck = (dados) => apiRequest('/decks', { method: 'POST', body: dados });
export const atualizarDeck = (id, dados) => apiRequest(`/decks/${id}`, { method: 'PATCH', body: dados });
export const excluirDeck = (id) => apiRequest(`/decks/${id}`, { method: 'DELETE' });

// As rotas de cartas devolvem o deck completo e atualizado (com validação).
export const adicionarCartaNoDeck = (id, carta, quantidade = 1) =>
  apiRequest(`/decks/${id}/cartas`, { method: 'POST', body: { ...carta, quantidade } });
export const alterarQuantidadeNoDeck = (id, cartaId, quantidade) =>
  apiRequest(`/decks/${id}/cartas/${cartaId}`, { method: 'PATCH', body: { quantidade } });
export const removerCartaDoDeck = (id, cartaId) => apiRequest(`/decks/${id}/cartas/${cartaId}`, { method: 'DELETE' });

// Lista colada (uma carta por linha). Devolve { deck, naoEncontradas }.
export const importarLista = (id, lista, substituir = false) =>
  apiRequest(`/decks/${id}/importar`, { method: 'POST', body: { lista, substituir } });

// Converte um deck oficial da API de ML ({ commander: [nomes], deck: [nomes com repetição] }) em lista de texto.
export function listaDoDeckOficial(oficial) {
  const contagem = new Map();
  for (const nome of oficial.deck || []) contagem.set(nome, (contagem.get(nome) || 0) + 1);
  const linhas = [...contagem].map(([nome, n]) => `${n} ${nome}`);
  return `Commander\n${(oficial.commander || []).map((c) => `1 ${c}`).join('\n')}\n\nDeck\n${linhas.join('\n')}`;
}

// Monta o pedido para a API de ML (avaliação carta × deck Commander).
export function deckParaAvaliacao(deck) {
  return {
    commander: deck.comandante ? [deck.comandante.nome] : [],
    deck: deck.cartas.flatMap((c) => Array(c.quantidade).fill(c.carta.nome)),
  };
}
