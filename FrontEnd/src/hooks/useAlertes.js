// ==========================================================
// HOOKS useAlertes + useSiege
// Source de vérité UNIQUE : les alertes sont CALCULÉES à partir des
// mesures et de l'âge des lots (mêmes règles partout). Cela garantit la
// cohérence entre la vue pays, la vue entrepôt, le siège et la page Alertes.
// ==========================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PAYS_API,
  buildSiegeAPI,
  chargerDonneesPays,
  calculerAlertesPays,
} from "../services/api";
import { useApp } from "../context/AppContext";

// Alertes d'un pays (paysId fourni) ou consolidées (sans paysId).
export function useAlertes(paysId) {
  const { accessiblePays } = useApp();
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cibles = useMemo(
    () => (paysId ? [paysId] : accessiblePays),
    [paysId, accessiblePays]
  );

  const fetchAlertes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        cibles
          .filter((id) => PAYS_API[id])
          .map(async (id) => {
            const data = await chargerDonneesPays(id);
            return calculerAlertesPays(id, data);
          })
      );
      const ok = results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
      setAlertes(ok);
      const ko = results.find((r) => r.status === "rejected");
      if (ko && ok.length === 0) setError(ko.reason?.message || "Erreur de chargement des alertes.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cibles]);

  useEffect(() => {
    fetchAlertes();
  }, [fetchAlertes]);

  return { alertes, loading, error, refetch: fetchAlertes };
}

export function useSiege() {
  const { accessiblePays } = useApp();
  const siege = useMemo(() => buildSiegeAPI(accessiblePays), [accessiblePays]);

  const [stats, setStats] = useState(null);
  const [allLots, setAllLots] = useState([]);
  const [allAlertes, setAllAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paysStatus, setPaysStatus] = useState({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const statusMap = {};
    await Promise.allSettled(
      accessiblePays.map(async (paysId) => {
        try {
          await PAYS_API[paysId].ping();
          statusMap[paysId] = "online";
        } catch {
          statusMap[paysId] = "offline";
        }
      })
    );
    setPaysStatus(statusMap);

    try {
      const [lots, alertes, statsData] = await Promise.all([
        siege.getAllLots(),
        siege.getAllAlertes(),
        siege.getStatsSiege(),
      ]);
      setAllLots(lots);
      setAllAlertes(alertes);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [siege, accessiblePays]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { stats, allLots, allAlertes, loading, error, paysStatus, refetch: fetchAll };
}