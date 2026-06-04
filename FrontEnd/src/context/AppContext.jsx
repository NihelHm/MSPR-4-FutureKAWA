// ==========================================================
// CONTEXT GLOBAL - AUTH + THEME
// ==========================================================

import { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext(null);

export const ROLES = {
  siege: { id: "siege", label: "Direction Siège", icon: "◈", pays: null },
  bresil: { id: "bresil", label: "Responsable Brésil", icon: "🇧🇷", pays: "bresil" },
  equateur: { id: "equateur", label: "Responsable Équateur", icon: "🇪🇨", pays: "equateur" },
  colombie: { id: "colombie", label: "Responsable Colombie", icon: "🇨🇴", pays: "colombie" },
};

export const THEMES = {
  dark: "dark",
  light: "light",
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("fk_user");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("fk_theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("fk_theme", theme);
  }, [theme]);

  const login = (userData) => {
    const fullUser = { ...userData, loginAt: new Date().toISOString() };
    setUser(fullUser);
    localStorage.setItem("fk_user", JSON.stringify(fullUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("fk_user");
  };

  const toggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  return (
    <AppContext.Provider value={{ user, login, logout, theme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp doit être dans AppProvider");
  return ctx;
}
