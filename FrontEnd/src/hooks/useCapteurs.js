// ==========================================================
// HOOK useCapteurs — capteurs d'un pays, d'un site ou d'un lot
// Gère aussi la liaison d'un lot à ses capteurs.
// ==========================================================

import { useState, useEffect, useCallback } from "react";
import { PAYS_API } from "../services/api";

// Tous les capteurs d'un pays
export function useCapteurs(paysId) {
  const [capteurs, setCapteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCapteurs = useCallback(async () => {
    if (!paysId || !PAYS_API[paysId]) return;
    setLoading(true);
    setError(null);
    try {
      const data = await PAYS_API[paysId].getCapteurs();
      setCapteurs(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [paysId]);

  useEffect(() => {
    fetchCapteurs();
  }, [fetchCapteurs]);

  return { capteurs, loading, error, refetch: fetchCapteurs };
}

// Capteurs rattachés à un lot précis (capteur.lot_id === lotId)
export function useCapteursDuLot(paysId, lotId) {
  const [capteurs, setCapteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCapteurs = useCallback(async () => {
    if (!paysId || !lotId || !PAYS_API[paysId]) return;
    setLoading(true);
    setError(null);
    try {
      const data = await PAYS_API[paysId].getCapteursByLot(lotId);
      setCapteurs(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [paysId, lotId]);

  useEffect(() => {
    fetchCapteurs();
  }, [fetchCapteurs]);

  // Lier / délier des capteurs au lot
  const linkCapteur = async (capteurId) => {
    await PAYS_API[paysId].linkCapteurToLot(capteurId, lotId);
    await fetchCapteurs();
  };
  const unlinkCapteur = async (capteurId) => {
    await PAYS_API[paysId].unlinkCapteur(capteurId);
    await fetchCapteurs();
  };

  return { capteurs, loading, error, refetch: fetchCapteurs, linkCapteur, unlinkCapteur };
}
