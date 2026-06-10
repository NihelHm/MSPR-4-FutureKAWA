// ==========================================================
// HOOK useLots
// ==========================================================

import { useState, useEffect, useCallback } from "react";
import { PAYS_API } from "../services/api";

export function useLots(paysId, siteId = null) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLots = useCallback(async () => {
    if (!paysId || !PAYS_API[paysId]) return;
    setLoading(true);
    setError(null);
    try {
      const api = PAYS_API[paysId];
      const data = siteId ? await api.getLotsBySite(siteId) : await api.getLots();
      setLots(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [paysId, siteId]);

  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  const createLot = async (lotData) => {
    const result = await PAYS_API[paysId].createLot(lotData);
    await fetchLots();
    return result;
  };

  const updateLot = async (id, lotData) => {
    const result = await PAYS_API[paysId].updateLot(id, lotData);
    await fetchLots();
    return result;
  };

  const deleteLot = async (id) => {
    await PAYS_API[paysId].deleteLot(id);
    await fetchLots();
  };

  return { lots, loading, error, refetch: fetchLots, createLot, updateLot, deleteLot };
}

export function useLot(paysId, lotId) {
  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!paysId || !lotId || !PAYS_API[paysId]) return;
    setLoading(true);
    setError(null);
    PAYS_API[paysId]
      .getLot(lotId)
      .then(setLot)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [paysId, lotId]);

  return { lot, loading, error };
}
