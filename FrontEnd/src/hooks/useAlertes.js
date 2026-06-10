// ==========================================================
// HOOKS useAlertes + useSiege
// ==========================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { PAYS_API, buildSiegeAPI } from "../services/api";
import { useApp } from "../context/AppContext";

export function useAlertes(paysId) {
  const { accessiblePays } = useApp();
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlertes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (paysId && PAYS_API[paysId]) {
        const data = await PAYS_API[paysId].getAlertes();
        setAlertes((data || []).map((a) => ({ ...a, _pays: paysId })));
      } else {
        const siege = buildSiegeAPI(accessiblePays);
        setAlertes((await siege.getAllAlertes()) || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [paysId, accessiblePays]);

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

    // Ping de chaque pays accessible
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
