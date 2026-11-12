import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { storage } from '../services/storage';
import { aoReceber401, definirToken } from '../services/api';
import * as authApi from '../services/auth';

// Sessão: o token JWT fica no armazenamento seguro (SecureStore no celular, localStorage na web).
// Os dados do usuário (nome, perfil, loja, resumo) sempre vêm da API (/auth/me).
const AuthContext = createContext(null);
const TOKEN_KEY = 'manatrade.token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const limparSessao = useCallback(async () => {
    definirToken(null);
    setUser(null);
    await storage.removeItem(TOKEN_KEY);
  }, []);

  const iniciarSessao = async ({ token, usuario }) => {
    definirToken(token);
    await storage.setItem(TOKEN_KEY, token);
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
        try {
          const usuario = await authApi.meusDados();
          if (ativo) setUser(usuario);
        } catch (erro) {
          // 401/403: token vencido ou conta bloqueada -> volta ao login.
          // Sem conexão (status 0): também volta ao login, mostrando o erro lá ao tentar entrar.
          await limparSessao();
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
