// ==========================================================
// HOOK useMesures — températures / humidités d'un pays
// + filtrage des mesures par capteurs (pour un lot)
// ==========================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { PAYS_API, filtrerMesuresParCapteurs } from "../services/api";
import { PAYS_CONFIG } from "../constants/pays";

export function useTemperatures(paysId) {
  const [temperatures, setTemperatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!paysId || !PAYS_API[paysId]) return;
    setLoading(true);
    setError(null);
    try {
      setTemperatures((await PAYS_API[paysId].getTemperatures()) || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [paysId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { temperatures, loading, error, refetch: fetch };
}

export function useHumidites(paysId) {
  const [humidites, setHumidites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!paysId || !PAYS_API[paysId]) return;
    setLoading(true);
    setError(null);
    try {
      setHumidites((await PAYS_API[paysId].getHumidites()) || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [paysId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { humidites, loading, error, refetch: fetch };
}

// Hook combiné : temp + humidité + statut par rapport aux seuils du pays.
// Si `capteurIds` est fourni, les mesures sont filtrées sur ces capteurs (vue lot).
export function useMesures(paysId, capteurIds = null) {
  const { temperatures: allTemp, loading: loadingT, error: errorT } = useTemperatures(paysId);
  const { humidites: allHum, loading: loadingH, error: errorH } = useHumidites(paysId);

  const config = PAYS_CONFIG[paysId];

  const temperatures = useMemo(
    () => (capteurIds ? filtrerMesuresParCapteurs(allTemp, capteurIds) : allTemp),
    [allTemp, capteurIds]
  );
  const humidites = useMemo(
    () => (capteurIds ? filtrerMesuresParCapteurs(allHum, capteurIds) : allHum),
    [allHum, capteurIds]
  );

  const getStatutTemperature = (valeur) => {
    if (!config) return "inconnu";
    const { temperature } = config.conditions;
    const tol = config.tolerances.temperature;
    return valeur >= temperature - tol && valeur <= temperature + tol ? "ok" : "alerte";
  };

  const getStatutHumidite = (valeur) => {
    if (!config) return "inconnu";
    const { humidite } = config.conditions;
    const tol = config.tolerances.humidite;
    return valeur >= humidite - tol && valeur <= humidite + tol ? "ok" : "alerte";
  };

  return {
    temperatures,
    humidites,
    lastTemperature: temperatures[0] || null,
    lastHumidite: humidites[0] || null,
    loading: loadingT || loadingH,
    error: errorT || errorH,
    getStatutTemperature,
    getStatutHumidite,
    conditionsIdéales: config?.conditions,
    tolerances: config?.tolerances,
  };
}
