// Consignação (RF07, /api/consignacoes): o jogador deixa uma carta da coleção para a loja vender.
// As regras (quem pode o quê, transições válidas) ficam no backend; aqui só a apresentação.
import { apiRequest } from './api';

export const listarConsignacoes = () => apiRequest('/consignacoes');

// dados: { loja_id, item_colecao_id, quantidade, preco_pedido, observacao? }
export const criarConsignacao = (dados) => apiRequest('/consignacoes', { method: 'POST', body: dados });

// Jogador: { preco_pedido, quantidade, observacao } enquanto pendente, ou { status: 'cancelada' }.
// Loja: { status, resposta_loja?, preco_venda? }.
export const atualizarConsignacao = (id, dados) => apiRequest(`/consignacoes/${id}`, { method: 'PATCH', body: dados });

export const excluirConsignacao = (id) => apiRequest(`/consignacoes/${id}`, { method: 'DELETE' });

// Mesmos rótulos e transições do model Consignacao do backend.
export const ROTULOS = {
  pendente: 'Pendente', aceita: 'Aceita', recusada: 'Recusada', cancelada: 'Cancelada',
  a_venda: 'À venda', vendida: 'Vendida', devolvida: 'Devolvida',
};
export const ETAPAS = ['pendente', 'aceita', 'a_venda', 'vendida'];
export const ENCERRADAS = ['recusada', 'cancelada', 'vendida', 'devolvida'];

// Ações que a loja pode tomar em cada status (o backend valida de novo).
export const ACOES_DA_LOJA = {
  pendente: [{ status: 'aceita', rotulo: 'Aceitar' }, { status: 'recusada', rotulo: 'Recusar', perigo: true }],
  aceita: [{ status: 'a_venda', rotulo: 'Colocar à venda' }, { status: 'devolvida', rotulo: 'Devolver', perigo: true }],
  a_venda: [{ status: 'vendida', rotulo: 'Registrar venda' }, { status: 'devolvida', rotulo: 'Devolver', perigo: true }],
};
