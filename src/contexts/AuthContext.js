import { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../services/storage';

const AuthContext = createContext(null);
const SESSION_KEY = 'manatrade.session';

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    storage.getItem(SESSION_KEY).then((session) => {
      if (!active) return;
      if (session) {
        try {
          const parsed = JSON.parse(session);
          setUser(parsed);
          setAuthenticated(true);
        } catch {
          storage.removeItem(SESSION_KEY);
        }
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const signIn = async (profile = {}) => {
    const nextUser = { name: profile.name || 'Jonathan Silva', email: profile.email || 'j@manatrade.com' };
    await storage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    setAuthenticated(true);
  };

  const signOut = async () => {
    await storage.removeItem(SESSION_KEY);
    setUser(null);
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ authenticated, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
