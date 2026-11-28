// Notificações do usuário (RF10, /api/notificacoes). O backend cria as automáticas
// quando uma consignação muda de status ou um chamado é respondido.
import { apiRequest } from './api';

export const listarNotificacoes = () => apiRequest('/notificacoes');
export const marcarComoLida = (id, lida = true) => apiRequest(`/notificacoes/${id}`, { method: 'PATCH', body: { lida } });
export const marcarTodasComoLidas = () => apiRequest('/notificacoes/lidas', { method: 'PATCH' });
export const excluirNotificacao = (id) => apiRequest(`/notificacoes/${id}`, { method: 'DELETE' });
