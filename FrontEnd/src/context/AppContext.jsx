// ==========================================================
// CONTEXT GLOBAL — AUTH (JWT backend siège) + THEME
// ==========================================================

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";
import { getRoleConfig, getAccessiblePays } from "../constants/pays";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("fk_token") || null);

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("fk_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState(() => localStorage.getItem("fk_theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("fk_theme", theme);
  }, [theme]);

  // Connexion réelle : appelle POST /login du siège, stocke le JWT + l'utilisateur
  const login = useCallback(async (email, password) => {
    const data = await authAPI.login(email, password);
    const fullUser = { ...data.utilisateur, loginAt: new Date().toISOString() };
    setToken(data.token);
    setUser(fullUser);
    localStorage.setItem("fk_token", data.token);
    localStorage.setItem("fk_user", JSON.stringify(fullUser));
    return fullUser;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("fk_token");
    localStorage.removeItem("fk_user");
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const roleConfig = user ? getRoleConfig(user.role) : null;
  const accessiblePays = getAccessiblePays(user);
  const isAdmin = Boolean(user?.is_admin);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        roleConfig,
        accessiblePays,
        isAdmin,
        login,
        logout,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp doit être dans AppProvider");
  return ctx;
}
