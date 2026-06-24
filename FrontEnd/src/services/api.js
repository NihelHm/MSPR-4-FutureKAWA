// ==========================================================
// SERVICE API — FUTUREKAWA
// ----------------------------------------------------------
// - authAPI / adminAPI  → backend central SIÈGE (auth JWT + utilisateurs)
// - PAYS_API            → backends locaux par pays (sites, lots, capteurs, mesures)
// - siegeAPI            → consolidation multi-pays côté client
//
// HIÉRARCHIE MÉTIER : pays → site (entrepôt) → lot → capteur → mesure
//   * un capteur est physiquement dans un entrepôt (capteur.site_id)
//   * un capteur est affecté à un lot pour le surveiller (capteur.lot_id, nullable)
//   * une mesure appartient à un capteur (mesure.capteur_id)
// ==========================================================

import { PAYS_CONFIG, SIEGE_URL } from "../constants/pays";

// ----------------------------------------------------------
// HELPERS HTTP
// ----------------------------------------------------------

function authHeaders() {
  const token = localStorage.getItem("fk_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Traduit un détail technique en message lisible. On n'expose JAMAIS la route
// appelée (/login, /capteurs/1, ...) ni le code HTTP brut côté utilisateur.
function messageMetier(status, detailTechnique) {
  switch (status) {
    case 400: return "Les informations saisies sont incomplètes ou invalides.";
    case 401: return "Email ou mot de passe incorrect.";
    case 403: return "Vous n'avez pas les droits nécessaires pour cette action.";
    case 404: return "L'élément demandé est introuvable.";
    case 409: return "Cet enregistrement existe déjà.";
    case 422: return "Certains champs sont mal renseignés.";
    case 503: return "Service momentanément indisponible. Réessayez plus tard.";
    default:
      if (status >= 500) return "Une erreur technique est survenue. Réessayez plus tard.";
      return detailTechnique || "Une erreur est survenue.";
  }
}

async function handle(res, endpoint) {
  if (!res.ok) {
    let detailTechnique = `${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detailTechnique = body.detail;
    } catch { /* ignore */ }
    console.error(`[API] ${res.status} ${endpoint} → ${detailTechnique}`); // trace dev uniquement
    const err = new Error(messageMetier(res.status, detailTechnique));
    err.status = res.status;
    err.endpoint = endpoint;
    throw err;
  }
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
    headers: { "Content-Type": "application/json", ...(withAuth ? authHeaders() : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle(res, endpoint);
}

// ==========================================================
// AUTHENTIFICATION (backend siège)
// ==========================================================
export const authAPI = {
  login: (email, password) => sendAPI("POST", SIEGE_URL, "/login", { email, password }),
  listPublic: () => fetchAPI(SIEGE_URL, "/utilisateurs").then((r) => r.utilisateurs || []),
};

// ==========================================================
// ADMINISTRATION DES UTILISATEURS (backend siège, JWT admin requis)
// ==========================================================
export const adminAPI = {
  listUsers: () => fetchAPI(SIEGE_URL, "/admin/utilisateurs", true).then((r) => r.utilisateurs || []),
  createUser: (data) => sendAPI("POST", SIEGE_URL, "/admin/utilisateurs", data, true),
  updateUser: (id, data) => sendAPI("PUT", SIEGE_URL, `/admin/utilisateurs/${id}`, data, true),
  deleteUser: (id) => sendAPI("DELETE", SIEGE_URL, `/admin/utilisateurs/${id}`, undefined, true),
  setAdmin: (id, isAdmin) => sendAPI("PUT", SIEGE_URL, `/admin/utilisateurs/${id}`, { is_admin: isAdmin }, true),
};

// ==========================================================
// FACTORY API PAR PAYS (backend local)
// ==========================================================
function createPaysAPI(paysId) {
  const config = PAYS_CONFIG[paysId];
  if (!config) throw new Error(`Pays inconnu : ${paysId}`);
  const { baseUrl } = config;

  const api = {
    // Renvoie { message } → permet de vérifier le pays réellement servi par le backend
    ping: () => fetchAPI(baseUrl, "/"),

    // SITES (entrepôts)
    getSites: () => fetchAPI(baseUrl, "/sites").then((r) => r.sites || []),
    getSite: (id) => fetchAPI(baseUrl, `/sites/${id}`).then((r) => r.site),
    createSite: (data) => sendAPI("POST", baseUrl, "/sites", data),
    updateSite: (id, data) => sendAPI("PUT", baseUrl, `/sites/${id}`, data),
    deleteSite: (id) => sendAPI("DELETE", baseUrl, `/sites/${id}`),

    // LOTS
    getLots: () => fetchAPI(baseUrl, "/lots").then((r) => r.lots || []),
    getLot: (id) => fetchAPI(baseUrl, `/lots/${id}`).then((r) => r.lot),
    getLotsBySite: async (siteId) => (await api.getLots()).filter((l) => String(l.site_id) === String(siteId)),
    createLot: (data) => sendAPI("POST", baseUrl, "/lots", data),
    updateLot: (id, data) => sendAPI("PUT", baseUrl, `/lots/${id}`, data),
    deleteLot: (id) => sendAPI("DELETE", baseUrl, `/lots/${id}`),
    recalculerStatutLot: (id) => sendAPI("PUT", baseUrl, `/lots/${id}/statut`),

    // CAPTEURS (capteur.site_id = entrepôt physique ; capteur.lot_id = lot surveillé)
    getCapteurs: () => fetchAPI(baseUrl, "/capteurs").then((r) => r.capteurs || []),
    getCapteur: (id) => fetchAPI(baseUrl, `/capteurs/${id}`).then((r) => r.capteur),
    getCapteursBySite: async (siteId) => (await api.getCapteurs()).filter((c) => String(c.site_id) === String(siteId)),
    getCapteursByLot: async (lotId) => (await api.getCapteurs()).filter((c) => String(c.lot_id) === String(lotId)),
    createCapteur: (data) => sendAPI("POST", baseUrl, "/capteurs", data),
    updateCapteur: (id, data) => sendAPI("PUT", baseUrl, `/capteurs/${id}`, data),
    deleteCapteur: (id) => sendAPI("DELETE", baseUrl, `/capteurs/${id}`),

    // Affectation capteur ↔ lot — route DÉDIÉE qui accepte lot_id = null (délier).
    // (La route générique PUT /capteurs/{id} ne peut pas remettre lot_id à NULL.)
    linkCapteurToLot: (capteurId, lotId) => sendAPI("PUT", baseUrl, `/capteurs/${capteurId}/lot`, { lot_id: lotId }),
    unlinkCapteur: (capteurId) => sendAPI("PUT", baseUrl, `/capteurs/${capteurId}/lot`, { lot_id: null }),

    // MESURES
    getTemperatures: () => fetchAPI(baseUrl, "/temperature").then((r) => r.temperature || []),
    getHumidites: () => fetchAPI(baseUrl, "/humidite").then((r) => r.humidite || []),

    // ALERTES persistées (journal du moteur d'alerting / e-mails)
    getAlertes: () => fetchAPI(baseUrl, "/alertes").then((r) => r.alertes || []),
    deleteAlerte: (id) => sendAPI("DELETE", baseUrl, `/alertes/${id}`),
  };
  return api;
}

export const bresilAPI = createPaysAPI("bresil");
export const equateurAPI = createPaysAPI("equateur");
export const colombieAPI = createPaysAPI("colombie");

export const PAYS_API = { bresil: bresilAPI, equateur: equateurAPI, colombie: colombieAPI };

export function filtrerMesuresParCapteurs(mesures, capteurIds) {
  const ids = new Set((capteurIds || []).map(String));
  return (mesures || []).filter((m) => ids.has(String(m.capteur_id)));
}

// Dernière mesure (liste triée DESC) par capteur → { capteur_id: mesure }
function dernieresParCapteur(mesures) {
  const map = {};
  (mesures || []).forEach((m) => {
    if (!(m.capteur_id in map)) map[m.capteur_id] = m;
  });
  return map;
}

// ==========================================================
// CALCUL DES ALERTES — SOURCE DE VÉRITÉ UNIQUE (côté client)
// ----------------------------------------------------------
// Règles CDC §III.4 :
//  - Conditions non idéales : dernière mesure d'un capteur hors plage [cible ± tolérance].
//      → attribuée au LOT surveillé (capteur.lot_id) si défini, sinon à l'ENTREPÔT.
//  - Péremption : lot stocké depuis > 365 jours.
// Utilisée partout (vue pays, entrepôt, lot, siège, page Alertes) → plus de contradiction.
// ==========================================================
export function calculerAlertesPays(paysId, { sites, lots, capteurs, temperatures, humidites }) {
  const config = PAYS_CONFIG[paysId];
  if (!config) return [];
  const alertes = [];
  const { temperature: cibleT, humidite: cibleH } = config.conditions;
  const { temperature: tolT, humidite: tolH } = config.tolerances;

  const capteurById = {};
  (capteurs || []).forEach((c) => (capteurById[c.id] = c));
  const siteNom = {};
  (sites || []).forEach((s) => (siteNom[s.id] = s.nom || `Entrepôt #${s.id}`));
  const lotRef = {};
  (lots || []).forEach((l) => (lotRef[l.id] = l.reference || `#${l.id}`));

  const evaluer = (mesures, type, cible, tol, unite) => {
    const last = dernieresParCapteur(mesures);
    Object.values(last).forEach((m) => {
      const c = capteurById[m.capteur_id];
      if (!c) return;
      if (m.valeur < cible - tol || m.valeur > cible + tol) {
        const surLot = c.lot_id != null;
        alertes.push({
          id: `${paysId}-${type}-cap${c.id}`,
          type,
          _pays: paysId,
          site_id: c.site_id,
          lot_id: surLot ? c.lot_id : null,
          capteur_id: c.id,
          valeur: m.valeur,
          date_alerte: m.date_mesure,
          message:
            `${type === "temperature" ? "Température" : "Humidité"} ${m.valeur}${unite} ` +
            `(plage ${cible - tol}–${cible + tol}${unite}) — ` +
            (surLot ? `lot ${lotRef[c.lot_id] || c.lot_id}` : `entrepôt ${siteNom[c.site_id] || c.site_id}`) +
            ` · capteur ${c.nom || c.id}.`,
        });
      }
    });
  };

  evaluer(temperatures, "temperature", cibleT, tolT, "°C");
  evaluer(humidites, "humidite", cibleH, tolH, "%");

  // Péremption
  const today = new Date();
  (lots || []).forEach((l) => {
    if (!l.date_stockage) return;
    const age = Math.floor((today - new Date(l.date_stockage)) / 86400000);
    if (age > 365) {
      alertes.push({
        id: `${paysId}-perem-lot${l.id}`,
        type: "peremption",
        _pays: paysId,
        site_id: l.site_id,
        lot_id: l.id,
        date_alerte: l.date_stockage,
        message: `Lot ${l.reference || l.id} stocké depuis ${age} j (> 365 j) — expédition prioritaire (FIFO).`,
      });
    }
  });

  return alertes;
}

export async function chargerDonneesPays(paysId) {
  const api = PAYS_API[paysId];
  const [sites, lots, capteurs, temperatures, humidites] = await Promise.all([
    api.getSites(), api.getLots(), api.getCapteurs(), api.getTemperatures(), api.getHumidites(),
  ]);
  return { sites, lots, capteurs, temperatures, humidites };
}

// ==========================================================
// CONSOLIDATION SIÈGE
// ==========================================================
function buildSiegeAPI(paysIds = Object.keys(PAYS_API)) {
  const entries = paysIds.filter((id) => PAYS_API[id]).map((id) => [id, PAYS_API[id]]);

  const collect = async (fn) => {
    const results = await Promise.allSettled(
      entries.map(async ([paysId, api]) => (await fn(api)).map((item) => ({ ...item, _pays: paysId })))
    );
    return results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
  };

  const siegeAPI = {
    getAllSites: () => collect((api) => api.getSites()),
    getAllLots: () => collect((api) => api.getLots()),
    getAllCapteurs: () => collect((api) => api.getCapteurs()),
    getAllTemperatures: () => collect((api) => api.getTemperatures()),
    getAllHumidites: () => collect((api) => api.getHumidites()),

    getAllAlertes: async () => {
      const results = await Promise.allSettled(
        entries.map(async ([paysId]) => calculerAlertesPays(paysId, await chargerDonneesPays(paysId)))
      );
      return results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
    },

    getStatsSiege: async () => {
      const [lots, capteurs, alertes] = await Promise.all([
        siegeAPI.getAllLots(), siegeAPI.getAllCapteurs(), siegeAPI.getAllAlertes(),
      ]);
      const lotsParPays = {};
      entries.forEach(([id]) => (lotsParPays[id] = lots.filter((l) => l._pays === id).length));
      return { totalLots: lots.length, totalAlertes: alertes.length, totalCapteurs: capteurs.length, lotsParPays };
    },
  };
  return siegeAPI;
}

export const siegeAPI = buildSiegeAPI();
export { buildSiegeAPI };