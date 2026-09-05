import { createContext, useContext, useEffect, useState } from "react";
import { fetchMe, login as apiLogin, setToken, clearToken, getToken } from "@/lib/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anon, object = auth

  useEffect(() => {
    // Skip the /me check while returning from a Google OAuth callback —
    // the callback screen exchanges the session first.
    if (window.location.hash?.includes("session_id=")) { setUser(false); return; }
    if (!getToken()) { setUser(false); return; }
    fetchMe().then(setUser).catch(() => { clearToken(); setUser(false); });
  }, []);

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  // Used by the Google callback: store the JWT we minted from the session.
  const setSession = ({ token, user: u }) => { setToken(token); setUser(u); };

  const logout = () => { clearToken(); setUser(false); };

  return <AuthCtx.Provider value={{ user, login, setSession, logout }}>{children}</AuthCtx.Provider>;
}
