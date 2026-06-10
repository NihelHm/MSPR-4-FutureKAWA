// ==========================================================
// HOOK useSites — sites (entrepôts) d'un pays
// ==========================================================

import { useState, useEffect, useCallback } from "react";
import { PAYS_API } from "../services/api";

export function useSites(paysId) {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSites = useCallback(async () => {
    if (!paysId || !PAYS_API[paysId]) return;
    setLoading(true);
    setError(null);
    try {
      const data = await PAYS_API[paysId].getSites();
      setSites(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [paysId]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  return { sites, loading, error, refetch: fetchSites };
}

export function useSite(paysId, siteId) {
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!paysId || !siteId || !PAYS_API[paysId]) return;
    setLoading(true);
    setError(null);
    PAYS_API[paysId]
      .getSite(siteId)
      .then(setSite)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [paysId, siteId]);

  return { site, loading, error };
}
