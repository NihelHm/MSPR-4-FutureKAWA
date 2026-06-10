// ==========================================================
// CONFIGURATION PAYS + RÔLES — FUTUREKAWA
// ==========================================================

const env = import.meta.env || {};

// URL du backend central siège (authentification + administration)
export const SIEGE_URL = env.VITE_SIEGE_URL || "http://localhost:8003";

export const PAYS_CONFIG = {
  bresil: {
    id: "bresil",
    nom: "Brésil",
    flag: "🇧🇷",
    baseUrl: env.VITE_URL_BRESIL || "http://localhost:8000",
    conditions: { temperature: 29, humidite: 55 },
    tolerances: { temperature: 3, humidite: 2 },
    couleur: "#2D6A4F",
  },
  equateur: {
    id: "equateur",
    nom: "Équateur",
    flag: "🇪🇨",
    baseUrl: env.VITE_URL_EQUATEUR || "http://localhost:8001",
    conditions: { temperature: 31, humidite: 60 },
    tolerances: { temperature: 3, humidite: 2 },
    couleur: "#B5835A",
  },
  colombie: {
    id: "colombie",
    nom: "Colombie",
    flag: "🇨🇴",
    baseUrl: env.VITE_URL_COLOMBIE || "http://localhost:8002",
    conditions: { temperature: 26, humidite: 80 },
    tolerances: { temperature: 3, humidite: 2 },
    couleur: "#6B4C3B",
  },
};

export const PAYS_LIST = Object.values(PAYS_CONFIG);
export const PAYS_IDS = Object.keys(PAYS_CONFIG);

// ==========================================================
// RÔLES — alignés sur les `role` du backend siège (init.sql)
// Chaque rôle pays est séparé : un responsable ne voit QUE son pays.
// `scope: "all"` = accès à tous les pays (direction siège / admin).
// ==========================================================
export const ROLES = {
  direction_siege: { id: "direction_siege", label: "Direction Siège", icon: "◈", scope: "all" },
  admin: { id: "admin", label: "Administrateur", icon: "🛡", scope: "all" },
  responsable_bresil: { id: "responsable_bresil", label: "Responsable Brésil", icon: "🇧🇷", scope: "bresil" },
  responsable_equateur: { id: "responsable_equateur", label: "Responsable Équateur", icon: "🇪🇨", scope: "equateur" },
  responsable_colombie: { id: "responsable_colombie", label: "Responsable Colombie", icon: "🇨🇴", scope: "colombie" },
};

export function getRoleConfig(role) {
  return ROLES[role] || { id: role, label: role || "Inconnu", icon: "•", scope: "all" };
}

// Liste des pays accessibles selon le rôle de l'utilisateur
export function getAccessiblePays(user) {
  if (!user) return [];
  const conf = getRoleConfig(user.role);
  if (conf.scope === "all" || user.is_admin) return PAYS_IDS;
  return PAYS_IDS.includes(conf.scope) ? [conf.scope] : [];
}

export function canAccessPays(user, paysId) {
  return getAccessiblePays(user).includes(paysId);
}

export const STATUT_COLORS = {
  "stocké": { bg: "#1B4332", text: "#74C69D", label: "Stocké" },
  "en alerte": { bg: "#7B2D00", text: "#FF8C42", label: "En alerte" },
  "périmé": { bg: "#3D0000", text: "#FF4D4D", label: "Périmé" },
  "expédié": { bg: "#0D3B66", text: "#64B5F6", label: "Expédié" },
};

export const ALERTE_TYPES = {
  temperature: { icon: "🌡️", label: "Température" },
  humidite: { icon: "💧", label: "Humidité" },
  peremption: { icon: "⏰", label: "Péremption" },
};

export const CAPTEUR_TYPES = {
  temperature: { icon: "🌡", label: "Température", unit: "°C", color: "#FF8C42" },
  humidite: { icon: "💧", label: "Humidité", unit: "%", color: "#64B5F6" },
};
