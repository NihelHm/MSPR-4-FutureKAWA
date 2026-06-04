// ==========================================================
// PAGE LOT DETAIL
// ==========================================================

import { useParams, useNavigate } from "react-router-dom";
import { useLot } from "../hooks/useLots";
import { useMesures } from "../hooks/useMesures";
import { PAYS_CONFIG, STATUT_COLORS } from "../constants/pays";
import MesureChart from "../components/MesureChart";
import { PageHeader, SectionTitle, Loader, ErrorBox, Grid } from "../components/UI";
import StatCard from "../components/StatCard";
import styles from "./LotDetail.module.css";

function getAge(dateStockage) {
  if (!dateStockage) return null;
  const diff = Date.now() - new Date(dateStockage).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function LotDetail() {
  const { paysId, lotId } = useParams();
  const navigate = useNavigate();
  const config = PAYS_CONFIG[paysId];

  const { lot, loading: lotLoading, error: lotError } = useLot(paysId, lotId);
  const {
    temperatures,
    humidites,
    loading: mesLoading,
    conditionsIdéales,
    tolerances,
    getStatutTemperature,
    getStatutHumidite,
  } = useMesures(paysId);

  if (!config) return <ErrorBox message={`Pays inconnu : ${paysId}`} />;
  if (lotLoading) return <Loader text="Chargement du lot..." />;
  if (lotError) return <ErrorBox message={`Lot introuvable : ${lotError}`} />;
  if (!lot) return <Loader />;

  const age = getAge(lot.date_stockage);
  const statutConfig = STATUT_COLORS[lot.statut] || { bg: "#222", text: "#aaa", label: lot.statut };

  const tempMin = conditionsIdéales ? conditionsIdéales.temperature - tolerances.temperature : undefined;
  const tempMax = conditionsIdéales ? conditionsIdéales.temperature + tolerances.temperature : undefined;
  const humMin = conditionsIdéales ? conditionsIdéales.humidite - tolerances.humidite : undefined;
  const humMax = conditionsIdéales ? conditionsIdéales.humidite + tolerances.humidite : undefined;

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        ← Retour
      </button>

      <PageHeader
        title={lot.reference}
        sub={`${config.flag} ${config.nom} · Site #${lot.site_id}`}
      >
        <span
          className={styles.statut}
          style={{ background: statutConfig.bg, color: statutConfig.text }}
        >
          {statutConfig.label}
        </span>
      </PageHeader>

      <Grid cols={4}>
        <StatCard
          label="Ancienneté"
          value={age ?? "—"}
          unit="j"
          icon="📅"
          variant={age > 365 ? "alert" : age > 300 ? "warning" : "default"}
          sub={age > 365 ? "⚠ Lot périmé" : age > 300 ? "Approche péremption" : ""}
        />
        <StatCard
          label="Date stockage"
          value={lot.date_stockage ? new Date(lot.date_stockage).toLocaleDateString("fr-FR") : "—"}
          icon="📦"
        />
        <StatCard
          label="Date réception"
          value={lot.date_reception ? new Date(lot.date_reception).toLocaleDateString("fr-FR") : "—"}
          icon="🚚"
        />
        <StatCard
          label="Site"
          value={`#${lot.site_id}`}
          icon="🏭"
          sub={config.nom}
        />
      </Grid>

      <div className={styles.section}>
        <SectionTitle>Historique température & humidité</SectionTitle>
        {mesLoading ? (
          <Loader text="Chargement des mesures..." />
        ) : (
          <div className={styles.chartsGrid}>
            <MesureChart
              data={temperatures}
              label="Température"
              unit="°C"
              color="#FF8C42"
              seuilMin={tempMin}
              seuilMax={tempMax}
            />
            <MesureChart
              data={humidites}
              label="Humidité"
              unit="%"
              color="#64B5F6"
              seuilMin={humMin}
              seuilMax={humMax}
            />
          </div>
        )}
      </div>

      <div className={styles.section}>
        <SectionTitle>Informations lot</SectionTitle>
        <div className={styles.infoGrid}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Référence</span>
            <span className={styles.infoVal}>{lot.reference}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Pays</span>
            <span className={styles.infoVal}>{config.flag} {config.nom}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Statut</span>
            <span className={styles.infoVal}>{lot.statut || "—"}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Site ID</span>
            <span className={styles.infoVal}>#{lot.site_id}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Date réception</span>
            <span className={styles.infoVal}>
              {lot.date_reception ? new Date(lot.date_reception).toLocaleDateString("fr-FR") : "—"}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Date stockage</span>
            <span className={styles.infoVal}>
              {lot.date_stockage ? new Date(lot.date_stockage).toLocaleDateString("fr-FR") : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
