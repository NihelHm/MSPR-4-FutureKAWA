// ==========================================================
// SERVICE API — FUTUREKAWA
// ----------------------------------------------------------
// - authAPI / adminAPI  → backend central SIÈGE (auth JWT + utilisateurs)
// - PAYS_API            → backends locaux par pays (sites, lots, capteurs, mesures)
// - siegeAPI            → consolidation multi-pays côté client
//
// HIÉRARCHIE MÉTIER : pays → sites → lots → capteurs → mesures
//   * un capteur appartient à un lot via `capteur.lot_id`
//   * un lot appartient à un site via `lot.site_id`
//   * une mesure appartient à un capteur via `mesure.capteur_id`
// ==========================================================

import { PAYS_CONFIG, SIEGE_URL } from "../constants/pays";

// ----------------------------------------------------------
// HELPERS HTTP
// ----------------------------------------------------------

function authHeaders() {
  const token = localStorage.getItem("fk_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res, endpoint) {
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${detail} (${endpoint})`);
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

async function fetchAPI(baseUrl, endpoint, withAuth = false) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    headers: { ...(withAuth ? authHeaders() : {}) },
  });
  return handle(res, endpoint);
}

async function sendAPI(method, baseUrl, endpoint, body, withAuth = false) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(withAuth ? authHeaders() : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle(res, endpoint);
}

// ==========================================================
// AUTHENTIFICATION (backend siège)
// ==========================================================

export const authAPI = {
  // POST /login → { message, token, utilisateur }
  login: (email, password) => sendAPI("POST", SIEGE_URL, "/login", { email, password }),
  // GET /utilisateurs → utilisateurs non-admin (public)
  listPublic: () => fetchAPI(SIEGE_URL, "/utilisateurs").then((r) => r.utilisateurs),
};

// ==========================================================
// ADMINISTRATION DES UTILISATEURS (backend siège, JWT admin requis)
// ==========================================================

export const adminAPI = {
  // GET /admin/utilisateurs
  listUsers: () => fetchAPI(SIEGE_URL, "/admin/utilisateurs", true).then((r) => r.utilisateurs),
  // POST /admin/utilisateurs
  createUser: (data) => sendAPI("POST", SIEGE_URL, "/admin/utilisateurs", data, true),
  // PUT /admin/utilisateurs/{id}
  updateUser: (id, data) => sendAPI("PUT", SIEGE_URL, `/admin/utilisateurs/${id}`, data, true),
  // DELETE /admin/utilisateurs/{id}
  deleteUser: (id) => sendAPI("DELETE", SIEGE_URL, `/admin/utilisateurs/${id}`, undefined, true),
  // Raccourci : bascule du flag is_admin
  setAdmin: (id, isAdmin) =>
    sendAPI("PUT", SIEGE_URL, `/admin/utilisateurs/${id}`, { is_admin: isAdmin }, true),
};

// ==========================================================
// FACTORY API PAR PAYS (backend local)
// ==========================================================

function createPaysAPI(paysId) {
  const config = PAYS_CONFIG[paysId];
  if (!config) throw new Error(`Pays inconnu : ${paysId}`);
  const { baseUrl } = config;

  const api = {
    // SANTÉ
    ping: () => fetchAPI(baseUrl, "/"),

    // SITES (un pays → plusieurs sites)
    getSites: () => fetchAPI(baseUrl, "/sites").then((r) => r.sites || []),
    getSite: (id) => fetchAPI(baseUrl, `/sites/${id}`).then((r) => r.site),
    createSite: (data) => sendAPI("POST", baseUrl, "/sites", data),
    updateSite: (id, data) => sendAPI("PUT", baseUrl, `/sites/${id}`, data),
    deleteSite: (id) => sendAPI("DELETE", baseUrl, `/sites/${id}`),

    // LOTS (un site → plusieurs lots)
    getLots: () => fetchAPI(baseUrl, "/lots").then((r) => r.lots || []),
    getLot: (id) => fetchAPI(baseUrl, `/lots/${id}`).then((r) => r.lot),
    getLotsBySite: async (siteId) => {
      const lots = await api.getLots();
      return lots.filter((l) => String(l.site_id) === String(siteId));
    },
    createLot: (data) => sendAPI("POST", baseUrl, "/lots", data),
    updateLot: (id, data) => sendAPI("PUT", baseUrl, `/lots/${id}`, data),
    deleteLot: (id) => sendAPI("DELETE", baseUrl, `/lots/${id}`),

    // CAPTEURS (un lot → plusieurs capteurs ; capteur.lot_id)
    getCapteurs: () => fetchAPI(baseUrl, "/capteurs").then((r) => r.capteurs || []),
    getCapteur: (id) => fetchAPI(baseUrl, `/capteurs/${id}`).then((r) => r.capteur),
    getCapteursByLot: async (lotId) => {
      const capteurs = await api.getCapteurs();
      return capteurs.filter((c) => String(c.lot_id) === String(lotId));
    },
    getCapteursBySite: async (siteId) => {
      const capteurs = await api.getCapteurs();
      return capteurs.filter((c) => String(c.site_id) === String(siteId));
    },
    createCapteur: (data) => sendAPI("POST", baseUrl, "/capteurs", data),
    updateCapteur: (id, data) => sendAPI("PUT", baseUrl, `/capteurs/${id}`, data),
    deleteCapteur: (id) => sendAPI("DELETE", baseUrl, `/capteurs/${id}`),

    // Lier / délier un capteur à un lot (met à jour capteur.lot_id)
    linkCapteurToLot: (capteurId, lotId) => api.updateCapteur(capteurId, { lot_id: lotId }),
    unlinkCapteur: (capteurId) => api.updateCapteur(capteurId, { lot_id: null }),

    // MESURES (une mesure → un capteur via capteur_id)
    getTemperatures: () => fetchAPI(baseUrl, "/temperature").then((r) => r.temperature || []),
    getHumidites: () => fetchAPI(baseUrl, "/humidite").then((r) => r.humidite || []),

    // ALERTES
    getAlertes: () => fetchAPI(baseUrl, "/alertes").then((r) => r.alertes || []),
    getAlerte: (id) => fetchAPI(baseUrl, `/alertes/${id}`).then((r) => r.alerte),
    deleteAlerte: (id) => sendAPI("DELETE", baseUrl, `/alertes/${id}`),
  };

  return api;
}

export const bresilAPI = createPaysAPI("bresil");
export const equateurAPI = createPaysAPI("equateur");
export const colombieAPI = createPaysAPI("colombie");

export const PAYS_API = {
  bresil: bresilAPI,
  equateur: equateurAPI,
  colombie: colombieAPI,
};

// ----------------------------------------------------------
// Helpers de filtrage des mesures par capteur (pour un lot)
// ----------------------------------------------------------
export function filtrerMesuresParCapteurs(mesures, capteurIds) {
  const ids = new Set(capteurIds.map(String));
  return (mesures || []).filter((m) => ids.has(String(m.capteur_id)));
}

// ==========================================================
// CONSOLIDATION SIÈGE (agrège les pays accessibles côté client)
// ==========================================================

function buildSiegeAPI(paysIds = Object.keys(PAYS_API)) {
  const entries = paysIds
    .filter((id) => PAYS_API[id])
    .map((id) => [id, PAYS_API[id]]);

  const collect = async (fn) => {
    const results = await Promise.allSettled(
      entries.map(async ([paysId, api]) => {
        const data = await fn(api);
        return data.map((item) => ({ ...item, _pays: paysId }));
      })
    );
    return results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
  };

  const siegeAPI = {
    getAllSites: () => collect((api) => api.getSites()),
    getAllLots: () => collect((api) => api.getLots()),
    getAllCapteurs: () => collect((api) => api.getCapteurs()),
    getAllAlertes: () => collect((api) => api.getAlertes()),
    getAllTemperatures: () => collect((api) => api.getTemperatures()),
    getAllHumidites: () => collect((api) => api.getHumidites()),

    getStatsSiege: async () => {
      const [lots, alertes, capteurs] = await Promise.all([
        siegeAPI.getAllLots(),
        siegeAPI.getAllAlertes(),
        siegeAPI.getAllCapteurs(),
      ]);
      const lotsParPays = {};
      entries.forEach(([id]) => {
        lotsParPays[id] = lots.filter((l) => l._pays === id).length;
      });
      return {
        totalLots: lots.length,
        totalAlertes: alertes.length,
        totalCapteurs: capteurs.length,
        lotsParPays,
      };
    },
  };
  return siegeAPI;
}

// Instance par défaut (tous pays). Pour restreindre : buildSiegeAPI(accessiblePays)
export const siegeAPI = buildSiegeAPI();
export { buildSiegeAPI };
