import React, { createContext, useContext, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

function getInitialUserFromMockToken() {
  const token = api.getToken();
  if (!token) return null;
  if (!api.isMockMode()) return { email: "Logged in", id: "unknown" }; // minimal placeholder for real backend
  if (!token.startsWith("mock_")) return null;
  return { id: token.replace("mock_", ""), email: "mock-user" };
}

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  const [user, setUser] = useState(getInitialUserFromMockToken());
  const [token, setTokenState] = useState(api.getToken());

  const value = useMemo(() => {
    return {
      user,
      token,
      // PUBLIC_INTERFACE
      async login(email, password) {
        const res = await api.login({ email, password });
        api.setToken(res.token);
        setTokenState(res.token);
        setUser(res.user || { email, id: "unknown" });
        return res;
      },
      // PUBLIC_INTERFACE
      async register(email, password) {
        const res = await api.register({ email, password });
        api.setToken(res.token);
        setTokenState(res.token);
        setUser(res.user || { email, id: "unknown" });
        return res;
      },
      // PUBLIC_INTERFACE
      logout() {
        api.logout();
        setTokenState("");
        setUser(null);
      },
      // PUBLIC_INTERFACE
      isAuthed() {
        return Boolean(api.getToken());
      },
    };
  }, [user, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
