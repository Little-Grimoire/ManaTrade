// Persistência local (AsyncStorage): cópia das respostas da API no aparelho.
//
// O banco de verdade é o do backend (Web 2). Aqui fica só o último estado que o usuário viu,
// separado por usuário, para o app abrir e mostrar coleção, decks, desejos, lojas,
// consignações e notificações mesmo sem conexão. As alterações (criar, editar, excluir)
// sempre vão para o servidor; sem conexão elas falham com mensagem de erro.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIXO = 'manatrade.cache';
let usuarioAtual = null;

const chave = (caminho) => `${PREFIXO}.${usuarioAtual}.${caminho}`;

// Chamado pelo AuthContext ao iniciar a sessão (o cache de um usuário não aparece para outro).
export function definirUsuarioCache(id) { usuarioAtual = id ?? null; }

export async function salvarNoCache(caminho, dados) {
  if (usuarioAtual == null) return;
  try {
    await AsyncStorage.setItem(chave(caminho), JSON.stringify({ salvoEm: new Date().toISOString(), dados }));
  } catch { /* armazenamento cheio ou indisponível: o app segue só com a rede */ }
}

// Devolve { dados, salvoEm } ou null.
export async function lerDoCache(caminho) {
  if (usuarioAtual == null) return null;
  try {
    const bruto = await AsyncStorage.getItem(chave(caminho));
    return bruto ? JSON.parse(bruto) : null;
  } catch { return null; }
}

// Depois de uma alteração, as leituras salvas daquele recurso ficam velhas: remove-as.
// Ex.: POST /colecao invalida "/colecao" e "/colecao/12". O "/auth/me" é mantido (é ele que
// permite abrir o app offline); a próxima leitura online o atualiza.
export async function invalidarCache(caminho) {
  if (usuarioAtual == null) return;
  const recurso = caminho.split('?')[0].split('/')[1];
  if (recurso === 'auth') return;
  try {
    const todas = await AsyncStorage.getAllKeys();
    const base = `${PREFIXO}.${usuarioAtual}.`;
    const velhas = todas.filter((k) => k.startsWith(`${base}/${recurso}`));
    if (velhas.length) await AsyncStorage.multiRemove(velhas);
  } catch { /* ignore */ }
}

// Logout: apaga todos os dados salvos do usuário neste aparelho.
export async function limparCacheDoUsuario(id = usuarioAtual) {
  if (id == null) return;
  try {
    const todas = await AsyncStorage.getAllKeys();
    const doUsuario = todas.filter((k) => k.startsWith(`${PREFIXO}.${id}.`));
    if (doUsuario.length) await AsyncStorage.multiRemove(doUsuario);
  } catch { /* ignore */ }
}

// ---------- estado da conexão (para o aviso "sem conexão" no topo do app) ----------
let offline = null; // null | { salvoEm }
const ouvintes = new Set();

export function marcarOffline(salvoEm) {
  offline = { salvoEm };
  ouvintes.forEach((f) => f(offline));
}
export function marcarOnline() {
  if (!offline) return;
  offline = null;
  ouvintes.forEach((f) => f(offline));
}
export function observarConexao(f) {
  ouvintes.add(f);
  f(offline);
  return () => ouvintes.delete(f);
}
