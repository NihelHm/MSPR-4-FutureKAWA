// ==========================================================
// SERVICE API - FUTUREKAWA
// ==========================================================
// Ce service centralise tous les appels HTTP vers les
// backends locaux de chaque pays.
// ==========================================================

import { PAYS_CONFIG } from "../constants/pays";

// ----------------------------------------------------------
// HELPER
// ----------------------------------------------------------

async function fetchAPI(baseUrl, endpoint) {
  const res = await fetch(`${baseUrl}${endpoint}`);
  if (!res.ok) throw new Error(`Erreur API ${res.status} sur ${endpoint}`);
  return res.json();
}

async function postAPI(baseUrl, endpoint, body) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Erreur POST ${res.status} sur ${endpoint}`);
  return res.json();
}

async function putAPI(baseUrl, endpoint, body) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Erreur PUT ${res.status} sur ${endpoint}`);
  return res.json();
}

async function deleteAPI(baseUrl, endpoint) {
  const res = await fetch(`${baseUrl}${endpoint}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Erreur DELETE ${res.status} sur ${endpoint}`);
  return res.json();
}

// ----------------------------------------------------------
// FACTORY PAR PAYS
// ----------------------------------------------------------

function createPaysAPI(paysId) {
  const config = PAYS_CONFIG[paysId];
  if (!config) throw new Error(`Pays inconnu : ${paysId}`);
  const { baseUrl } = config;

  return {
    // SANTÉ
    ping: () => fetchAPI(baseUrl, "/"),

    // SITES
    getSites: () => fetchAPI(baseUrl, "/sites").then((r) => r.sites),
    getSite: (id) => fetchAPI(baseUrl, `/sites/${id}`).then((r) => r.site),
    createSite: (data) => postAPI(baseUrl, "/sites", data),
    updateSite: (id, data) => putAPI(baseUrl, `/sites/${id}`, data),
    deleteSite: (id) => deleteAPI(baseUrl, `/sites/${id}`),

    // LOTS
    getLots: () => fetchAPI(baseUrl, "/lots").then((r) => r.lots),
    getLot: (id) => fetchAPI(baseUrl, `/lots/${id}`).then((r) => r.lot),
    createLot: (data) => postAPI(baseUrl, "/lots", data),
    updateLot: (id, data) => putAPI(baseUrl, `/lots/${id}`, data),
    deleteLot: (id) => deleteAPI(baseUrl, `/lots/${id}`),

    // CAPTEURS
    getCapteurs: () => fetchAPI(baseUrl, "/capteurs").then((r) => r.capteurs),
    getCapteur: (id) => fetchAPI(baseUrl, `/capteurs/${id}`).then((r) => r.capteur),
    createCapteur: (data) => postAPI(baseUrl, "/capteurs", data),
    updateCapteur: (id, data) => putAPI(baseUrl, `/capteurs/${id}`, data),
    deleteCapteur: (id) => deleteAPI(baseUrl, `/capteurs/${id}`),

    // TEMPÉRATURES
    getTemperatures: () => fetchAPI(baseUrl, "/temperature").then((r) => r.temperature),
    getTemperature: (id) => fetchAPI(baseUrl, `/temperature/${id}`).then((r) => r.temperature),

    // HUMIDITÉS
    getHumidites: () => fetchAPI(baseUrl, "/humidite").then((r) => r.humidite),
    getHumidite: (id) => fetchAPI(baseUrl, `/humidite/${id}`).then((r) => r.humidite),

    // ALERTES
    getAlertes: () => fetchAPI(baseUrl, "/alertes").then((r) => r.alertes),
    getAlerte: (id) => fetchAPI(baseUrl, `/alertes/${id}`).then((r) => r.alerte),
    createAlerte: (data) => postAPI(baseUrl, "/alertes", data),
    deleteAlerte: (id) => deleteAPI(baseUrl, `/alertes/${id}`),
  };
}

// ----------------------------------------------------------
// INSTANCES PAR PAYS
// ----------------------------------------------------------

export const bresilAPI = createPaysAPI("bresil");
export const equateurAPI = createPaysAPI("equateur");
export const colombieAPI = createPaysAPI("colombie");

export const PAYS_API = {
  bresil: bresilAPI,
  equateur: equateurAPI,
  colombie: colombieAPI,
};

// ----------------------------------------------------------
// CONSOLIDATION SIÈGE (agrège les 3 pays)
// ----------------------------------------------------------

export const siegeAPI = {
  getAllLots: async () => {
    const results = await Promise.allSettled(
      Object.entries(PAYS_API).map(async ([paysId, api]) => {
        const lots = await api.getLots();
        return lots.map((lot) => ({ ...lot, _pays: paysId }));
      })
    );
    return results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);
  },

  getAllAlertes: async () => {
    const results = await Promise.allSettled(
      Object.entries(PAYS_API).map(async ([paysId, api]) => {
        const alertes = await api.getAlertes();
        return alertes.map((a) => ({ ...a, _pays: paysId }));
      })
    );
    return results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);
  },

  getAllTemperatures: async () => {
    const results = await Promise.allSettled(
      Object.entries(PAYS_API).map(async ([paysId, api]) => {
        const mesures = await api.getTemperatures();
        return mesures.map((m) => ({ ...m, _pays: paysId }));
      })
    );
    return results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);
  },

  getAllHumidites: async () => {
    const results = await Promise.allSettled(
      Object.entries(PAYS_API).map(async ([paysId, api]) => {
        const mesures = await api.getHumidites();
        return mesures.map((m) => ({ ...m, _pays: paysId }));
      })
    );
    return results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);
  },

  getStatsSiege: async () => {
    const [lots, alertes] = await Promise.all([
      siegeAPI.getAllLots(),
      siegeAPI.getAllAlertes(),
    ]);
    return {
      totalLots: lots.length,
      totalAlertes: alertes.length,
      lotsParPays: {
        bresil: lots.filter((l) => l._pays === "bresil").length,
        equateur: lots.filter((l) => l._pays === "equateur").length,
        colombie: lots.filter((l) => l._pays === "colombie").length,
      },
    };
  },
};
