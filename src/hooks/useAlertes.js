// ==========================================================
// HOOKS useAlertes + useSiege
// ==========================================================

import { useState, useEffect, useCallback } from "react";
import { PAYS_API, siegeAPI } from "../services/api";

export function useAlertes(paysId) {
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlertes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (paysId && PAYS_API[paysId]) {
        data = await PAYS_API[paysId].getAlertes();
      } else {
        data = await siegeAPI.getAllAlertes();
      }
      setAlertes(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [paysId]);

  useEffect(() => { fetchAlertes(); }, [fetchAlertes]);

  return { alertes, loading, error, refetch: fetchAlertes };
}

export function useSiege() {
  const [stats, setStats] = useState(null);
  const [allLots, setAllLots] = useState([]);
  const [allAlertes, setAllAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paysStatus, setPaysStatus] = useState({
    bresil: "loading",
    equateur: "loading",
    colombie: "loading",
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Ping chaque pays
    const statusMap = {};
    await Promise.allSettled(
      Object.entries(PAYS_API).map(async ([paysId, api]) => {
        try {
          await api.ping();
          statusMap[paysId] = "online";
        } catch {
          statusMap[paysId] = "offline";
        }
      })
    );
    setPaysStatus(statusMap);

    try {
      const [lots, alertes, statsData] = await Promise.all([
        siegeAPI.getAllLots(),
        siegeAPI.getAllAlertes(),
        siegeAPI.getStatsSiege(),
      ]);
      setAllLots(lots);
      setAllAlertes(alertes);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { stats, allLots, allAlertes, loading, error, paysStatus, refetch: fetchAll };
}

export function useCapteurs(paysId) {
  const [capteurs, setCapteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!paysId) return;
    setLoading(true);
    PAYS_API[paysId]
      .getCapteurs()
      .then((data) => setCapteurs(data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [paysId]);

  return { capteurs, loading, error };
}
