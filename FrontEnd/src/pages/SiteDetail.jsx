// ==========================================================
// PAGE SITE DETAIL — niveau SITE : lots de l'entrepôt
// ==========================================================

import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSite } from "../hooks/useSites";
import { useLots } from "../hooks/useLots";
import { useCapteurs } from "../hooks/useCapteurs";
import { PAYS_CONFIG } from "../constants/pays";
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

  // Nb de capteurs par lot (pour la colonne du tableau)
  const capteursMap = useMemo(() => {
    const map = {};
    capteurs.forEach((c) => {
      if (c.lot_id != null) map[c.lot_id] = (map[c.lot_id] || 0) + 1;
    });
    return map;
  }, [capteurs]);

  const capteursSite = capteurs.filter((c) => String(c.site_id) === String(siteId));

  if (!config) return <ErrorBox message={`Pays inconnu : ${paysId}`} />;
  if (siteLoading) return <Loader text="Chargement du site..." />;
  if (siteError) return <ErrorBox message={`Site introuvable : ${siteError}`} />;

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(`/pays/${paysId}`)}>
        ← {config.flag} {config.nom}
      </button>

      <PageHeader
        title={`🏭 ${site?.nom || `Site #${siteId}`}`}
        sub={`${config.flag} ${config.nom}${site?.localisation ? ` · 📍 ${site.localisation}` : ""}`}
      >
        <Button variant="primary" onClick={() => navigate(`/pays/${paysId}/lots/nouveau?site=${siteId}`)}>
          ＋ Nouveau lot
        </Button>
      </PageHeader>

      <Grid cols={3}>
        <StatCard label="Lots du site" value={lotsLoading ? "…" : lots.length} icon="📦" />
        <StatCard label="Capteurs du site" value={capLoading ? "…" : capteursSite.length} icon="📡" />
        <StatCard
          label="Lots en alerte"
          value={lots.filter((l) => l.statut === "en alerte" || l.statut === "périmé").length}
          icon="⚠"
          variant={lots.some((l) => l.statut === "en alerte" || l.statut === "périmé") ? "alert" : "default"}
        />
      </Grid>

      <section className={styles.section}>
        <SectionTitle>Lots stockés — ordre FIFO ({lots.length})</SectionTitle>
        {lotsLoading || capLoading ? (
          <Loader text="Chargement des lots..." />
        ) : (
          <LotTable lots={lots} paysId={paysId} capteursMap={capteursMap} />
        )}
        <p className={styles.hint}>
          Cliquez sur un lot pour voir ses capteurs liés et l'historique de ses mesures.
        </p>
      </section>
    </div>
  );
}
