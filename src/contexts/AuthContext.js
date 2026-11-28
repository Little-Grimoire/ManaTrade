import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { storage } from '../services/storage';
import { aoReceber401, definirToken } from '../services/api';
import * as authApi from '../services/auth';
import { definirUsuarioCache, limparCacheDoUsuario } from '../services/cacheLocal';

// Sessão: o token JWT fica no armazenamento seguro (SecureStore no celular, localStorage na web).
// Os dados do usuário (nome, perfil, loja, resumo) vêm da API (/auth/me); sem conexão, vêm da
// última cópia salva no aparelho (cacheLocal), então o app abre mesmo offline.
const AuthContext = createContext(null);
const TOKEN_KEY = 'manatrade.token';
const USUARIO_KEY = 'manatrade.usuarioId'; // de quem é o cache local, para lê-lo antes de falar com o servidor

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Logout ou token inválido: apaga a sessão e os dados salvos deste usuário no aparelho.
  const limparSessao = useCallback(async () => {
    definirToken(null);
    setUser(null);
    await limparCacheDoUsuario();
    definirUsuarioCache(null);
    await storage.removeItem(TOKEN_KEY);
    await storage.removeItem(USUARIO_KEY);
  }, []);

  const iniciarSessao = async ({ token, usuario }) => {
    definirToken(token);
    definirUsuarioCache(usuario.id);
    await storage.setItem(TOKEN_KEY, token);
    await storage.setItem(USUARIO_KEY, String(usuario.id));
    setUser(usuario);
    return usuario;
  };

  // Ao abrir o app: se há token salvo, valida no servidor e carrega o perfil.
  useEffect(() => {
    let ativo = true;
    aoReceber401(() => { limparSessao(); });
    (async () => {
      const token = await storage.getItem(TOKEN_KEY);
      if (token) {
        definirToken(token);
        definirUsuarioCache(await storage.getItem(USUARIO_KEY));
        try {
          // Sem conexão, apiRequest devolve o /auth/me salvo no aparelho (se houver).
          const usuario = await authApi.meusDados();
          if (ativo) setUser(usuario);
        } catch (erro) {
          // 401/403: token vencido ou conta bloqueada -> limpa tudo e volta ao login.
          // Sem conexão e sem cópia local: vai ao login, mas mantém token e cache para a próxima vez.
          if (erro.status === 0) definirToken(null);
          else await limparSessao();
        }
      }
      if (ativo) setLoading(false);
    })();
    return () => { ativo = false; };
  }, [limparSessao]);

  const signIn = async (email, senha) => iniciarSessao(await authApi.login(email, senha));
  const signUp = async (dados) => iniciarSessao(await authApi.cadastrar(dados));
  const signOut = () => limparSessao();

  // Recarrega nome, loja e números do resumo (ex.: ao abrir a tela de perfil).
  // useCallback: telas usam esta função em efeitos; sem ela o efeito rodaria a cada render.
  const refreshUser = useCallback(async () => {
    const usuario = await authApi.meusDados();
    setUser(usuario);
    return usuario;
  }, []);

  const updateUser = async (dados) => {
    const usuario = await authApi.atualizarMeusDados(dados);
    setUser(usuario);
    return usuario;
  };

  const value = {
    user,
    authenticated: !!user,
    loading,
    perfil: user?.perfil ?? null, // 'usuario' | 'loja' | 'admin'
    temPerfil: (...perfis) => !!user && perfis.includes(user.perfil),
    signIn,
    signUp,
    signOut,
    refreshUser,
    updateUser,
    changePassword: authApi.alterarSenha,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
