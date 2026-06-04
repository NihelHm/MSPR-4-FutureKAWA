// ==========================================================
// CONFIGURATION DES PAYS - FUTUREKAWA
// ==========================================================

export const PAYS_CONFIG = {
  bresil: {
    id: "bresil",
    nom: "Brésil",
    flag: "🇧🇷",
    baseUrl: "http://localhost:8000",
    conditions: { temperature: 29, humidite: 55 },
    tolerances: { temperature: 3, humidite: 2 },
    couleur: "#2D6A4F",
  },
  equateur: {
    id: "equateur",
    nom: "Équateur",
    flag: "🇪🇨",
    baseUrl: "http://localhost:8001",
    conditions: { temperature: 31, humidite: 60 },
    tolerances: { temperature: 3, humidite: 2 },
    couleur: "#B5835A",
  },
  colombie: {
    id: "colombie",
    nom: "Colombie",
    flag: "🇨🇴",
    baseUrl: "http://localhost:8002",
    conditions: { temperature: 26, humidite: 80 },
    tolerances: { temperature: 3, humidite: 2 },
    couleur: "#6B4C3B",
  },
};

export const PAYS_LIST = Object.values(PAYS_CONFIG);

export const STATUT_COLORS = {
  stocké: { bg: "#1B4332", text: "#74C69D", label: "Stocké" },
  "en alerte": { bg: "#7B2D00", text: "#FF8C42", label: "En alerte" },
  périmé: { bg: "#3D0000", text: "#FF4D4D", label: "Périmé" },
  expédié: { bg: "#0D3B66", text: "#64B5F6", label: "Expédié" },
};

export const ALERTE_TYPES = {
  temperature: { icon: "🌡️", label: "Température" },
  humidite: { icon: "💧", label: "Humidité" },
  peremption: { icon: "⏰", label: "Péremption" },
};
