// Rotas de autenticação do backend (/api/auth).
import { apiRequest } from './api';

export const login = (email, senha) =>
  apiRequest('/auth/login', { method: 'POST', body: { email, senha }, autenticado: false });

// dados: { nome, email, senha, perfil: 'usuario' | 'loja', loja?: { nome, endereco, cidade, uf, ... } }
export const cadastrar = (dados) =>
  apiRequest('/auth/cadastro', { method: 'POST', body: dados, autenticado: false });

export const meusDados = () => apiRequest('/auth/me');

export const atualizarMeusDados = (dados) => apiRequest('/auth/me', { method: 'PATCH', body: dados });

export const alterarSenha = (senhaAtual, novaSenha) =>
  apiRequest('/auth/me/senha', { method: 'PATCH', body: { senhaAtual, novaSenha } });

export const ROTULO_PERFIL = { usuario: 'Jogador', loja: 'Loja', admin: 'Administrador' };

// Números do resumo (vindos de /api/auth/me) que cada perfil vê no Início e no Perfil.
export const RESUMO_POR_PERFIL = {
  usuario: [['cartasColecao', 'Cartas na coleção'], ['decks', 'Decks'], ['consignacoesAtivas', 'Consignações ativas']],
  loja: [['itensAcervo', 'Cartas no acervo'], ['consignacoesPendentes', 'Consignações pendentes'], ['consignacoesAVenda', 'À venda (consignadas)']],
  admin: [['lojasPendentes', 'Lojas a aprovar'], ['chamadosAbertos', 'Chamados abertos'], ['usuariosBloqueados', 'Usuários bloqueados']],
};
