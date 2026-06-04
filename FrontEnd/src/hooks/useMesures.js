// ==========================================================
// HOOK useMesures
// ==========================================================

import { useState, useEffect, useCallback } from "react";
import { PAYS_API } from "../services/api";
import { PAYS_CONFIG } from "../constants/pays";

export function useTemperatures(paysId) {
  const [temperatures, setTemperatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!paysId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await PAYS_API[paysId].getTemperatures();
      setTemperatures(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [paysId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { temperatures, loading, error, refetch: fetch };
}

export function useHumidites(paysId) {
  const [humidites, setHumidites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!paysId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await PAYS_API[paysId].getHumidites();
      setHumidites(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [paysId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { humidites, loading, error, refetch: fetch };
}

// Hook combiné qui retourne temp + humidité + statut par rapport aux seuils
export function useMesures(paysId) {
  const { temperatures, loading: loadingT, error: errorT } = useTemperatures(paysId);
  const { humidites, loading: loadingH, error: errorH } = useHumidites(paysId);

  const config = PAYS_CONFIG[paysId];

  const getStatutTemperature = (valeur) => {
    if (!config) return "inconnu";
    const { temperature } = config.conditions;
    const { temperature: tol } = config.tolerances;
    if (valeur >= temperature - tol && valeur <= temperature + tol) return "ok";
    return "alerte";
  };

  const getStatutHumidite = (valeur) => {
    if (!config) return "inconnu";
    const { humidite } = config.conditions;
    const { humidite: tol } = config.tolerances;
    if (valeur >= humidite - tol && valeur <= humidite + tol) return "ok";
    return "alerte";
  };

  const lastTemperature = temperatures[0] || null;
  const lastHumidite = humidites[0] || null;

  return {
    temperatures,
    humidites,
    lastTemperature,
    lastHumidite,
    loading: loadingT || loadingH,
    error: errorT || errorH,
    getStatutTemperature,
    getStatutHumidite,
    conditionsIdéales: config?.conditions,
    tolerances: config?.tolerances,
  };
}
