// ==========================================================
// PAGE SITE DETAIL — niveau ENTREPÔT : lots + capteurs + alertes
// Hiérarchie Site → Lot → Capteur : chaque lot affiche le nombre de
// capteurs qui le surveillent, et son état d'alerte est calculé à partir
// de leurs mesures (+ péremption).
// ==========================================================

import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSite } from "../hooks/useSites";
import { useLots } from "../hooks/useLots";
import { useCapteurs } from "../hooks/useCapteurs";
import { useMesures } from "../hooks/useMesures";
import { PAYS_CONFIG } from "../constants/pays";
import { calculerAlertesPays } from "../services/api";
import LotTable from "../components/LotTable";
import StatCard from "../components/StatCard";
import { PageHeader, SectionTitle, Loader, ErrorBox, Grid, Button } from "../components/UI";
import styles from "./SiteDetail.module.css";

export default function SiteDetail() {
  const { paysId, siteId } = useParams();
  const navigate = useNavigate();
  const config = PAYS_CONFIG[paysId];

  const { site, loading: siteLoading, error: siteError } = useSite(paysId, siteId);
  const { lots, loading: lotsLoading } = useLots(paysId, siteId);
  const { capteurs, loading: capLoading } = useCapteurs(paysId);
  const { temperatures, humidites } = useMesures(paysId);

  // Capteurs de CET entrepôt
  const capteursSite = useMemo(
    () => capteurs.filter((c) => String(c.site_id) === String(siteId)),
    [capteurs, siteId]
  );

  // Nb de capteurs PAR LOT (capteur.lot_id) → colonne du tableau
  const capteursMap = useMemo(() => {
    const map = {};
    capteursSite.forEach((c) => {
      if (c.lot_id != null) map[c.lot_id] = (map[c.lot_id] || 0) + 1;
    });
    return map;
  }, [capteursSite]);

  // Alertes calculées pour cet entrepôt (mêmes règles que partout)
  const alertesSite = useMemo(
    () =>
      calculerAlertesPays(paysId, {
        sites: site ? [site] : [],
        lots,
        capteurs: capteursSite,
        temperatures,
        humidites,
      }),
    [paysId, site, lots, capteursSite, temperatures, humidites]
  );

  const lotsEnAlerteIds = new Set(alertesSite.filter((a) => a.lot_id != null).map((a) => a.lot_id));
  const alertesEntrepot = alertesSite.filter((a) => a.lot_id == null); // capteurs non affectés à un lot

  if (!config) return <ErrorBox message={`Pays inconnu : ${paysId}`} />;
  if (siteLoading) return <Loader text="Chargement de l'entrepôt..." />;
  if (siteError) return <ErrorBox message="Entrepôt introuvable." />;

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(`/pays/${paysId}`)}>
        ← {config.flag} {config.nom}
      </button>

      <PageHeader
        title={`🏭 ${site?.nom || `Entrepôt #${siteId}`}`}
        sub={`${config.flag} ${config.nom}${site?.localisation ? ` · 📍 ${site.localisation}` : ""}`}
      >
        <Button variant="primary" onClick={() => navigate(`/pays/${paysId}/lots/nouveau?site=${siteId}`)}>
          ＋ Nouveau lot
        </Button>
      </PageHeader>

      {alertesEntrepot.length > 0 && (
        <div className={styles.condBanner}>
          ⚠ {alertesEntrepot.length} capteur(s) de l'entrepôt hors plage mais non affecté(s) à un lot —
          affectez-les à un lot pour rattacher l'alerte.
        </div>
      )}

      <Grid cols={3}>
        <StatCard label="Lots du site" value={lotsLoading ? "…" : lots.length} icon="📦" />
        <StatCard label="Capteurs de l'entrepôt" value={capLoading ? "…" : capteursSite.length} icon="📡" />
        <StatCard
          label="Lots en alerte"
          value={lotsLoading ? "…" : lotsEnAlerteIds.size}
          icon="⚠"
          variant={lotsEnAlerteIds.size > 0 ? "alert" : "default"}
          sub="Conditions hors plage ou > 365 j"
        />
      </Grid>

      <section className={styles.section}>
        <SectionTitle>Lots stockés — ordre FIFO ({lots.length})</SectionTitle>
        {lotsLoading || capLoading ? (
          <Loader text="Chargement des lots..." />
        ) : (
          <LotTable lots={lots} paysId={paysId} capteursMap={capteursMap} alerteLotIds={lotsEnAlerteIds} />
        )}
        <p className={styles.hint}>
          La colonne « Capteurs » indique le nombre de capteurs affectés à chaque lot.
          Cliquez sur un lot pour voir ses capteurs et l'historique de ses mesures.
        </p>
      </section>
    </div>
  );
}