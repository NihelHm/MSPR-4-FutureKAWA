// ==========================================================
// PAGE PAYS DETAIL
// ==========================================================

import { useParams } from "react-router-dom";
import { useLots } from "../hooks/useLots";
import { useMesures } from "../hooks/useMesures";
import { useAlertes } from "../hooks/useAlertes";
import { PAYS_CONFIG } from "../constants/pays";
import StatCard from "../components/StatCard";
import LotTable from "../components/LotTable";
import MesureChart from "../components/MesureChart";
import AlerteList from "../components/AlerteList";
import { PageHeader, SectionTitle, Loader, ErrorBox, Grid } from "../components/UI";
import styles from "./PaysDetail.module.css";

export default function PaysDetail() {
  const { paysId } = useParams();
  const config = PAYS_CONFIG[paysId];

  const { lots, loading: lotsLoading, error: lotsError } = useLots(paysId);
  const { temperatures, humidites, lastTemperature, lastHumidite, loading: mesLoading, error: mesError, getStatutTemperature, getStatutHumidite, conditionsIdéales, tolerances } = useMesures(paysId);
  const { alertes, loading: alertLoading } = useAlertes(paysId);

  if (!config) {
    return <ErrorBox message={`Pays inconnu : ${paysId}`} />;
  }

  const loading = lotsLoading || mesLoading;

  const tempMin = conditionsIdéales
    ? conditionsIdéales.temperature - tolerances.temperature
    : undefined;
  const tempMax = conditionsIdéales
    ? conditionsIdéales.temperature + tolerances.temperature
    : undefined;
  const humMin = conditionsIdéales
    ? conditionsIdéales.humidite - tolerances.humidite
    : undefined;
  const humMax = conditionsIdéales
    ? conditionsIdéales.humidite + tolerances.humidite
    : undefined;

  const tempStatut = lastTemperature ? getStatutTemperature(lastTemperature.valeur) : null;
  const humStatut = lastHumidite ? getStatutHumidite(lastHumidite.valeur) : null;

  const lotsEnAlerte = lots.filter((l) => l.statut === "en alerte" || l.statut === "périmé").length;

  return (
    <div className={styles.page}>
      <PageHeader
        title={`${config.flag} ${config.nom}`}
        sub={`Backend local · ${config.baseUrl}`}
      />

      {(lotsError || mesError) && (
        <ErrorBox message="Impossible de joindre le backend local. Vérifiez que Docker est démarré." />
      )}

      {/* Conditions idéales */}
      <div className={styles.condBanner}>
        <span className={styles.condLabel}>Conditions idéales</span>
        <span className={styles.condVal}>🌡 {conditionsIdéales?.temperature}°C ± {tolerances?.temperature}°C</span>
        <span className={styles.condSep}>·</span>
        <span className={styles.condVal}>💧 {conditionsIdéales?.humidite}% ± {tolerances?.humidite}%</span>
      </div>

      {/* Stats */}
      <Grid cols={4}>
        <StatCard label="Lots stockés" value={lots.length} icon="📦" />
        <StatCard
          label="Température actuelle"
          value={lastTemperature?.valeur ?? "—"}
          unit="°C"
          icon="🌡"
          variant={tempStatut === "alerte" ? "alert" : tempStatut === "ok" ? "success" : "default"}
        />
        <StatCard
          label="Humidité actuelle"
          value={lastHumidite?.valeur ?? "—"}
          unit="%"
          icon="💧"
          variant={humStatut === "alerte" ? "alert" : humStatut === "ok" ? "success" : "default"}
        />
        <StatCard
          label="Alertes"
          value={alertes.length}
          icon="⚠"
          variant={alertes.length > 0 ? "alert" : "default"}
        />
      </Grid>

      {/* Graphiques */}
      {loading ? (
        <Loader text="Chargement des mesures..." />
      ) : (
        <div className={styles.charts}>
          <SectionTitle>Historique des mesures</SectionTitle>
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
        </div>
      )}

      <div className={styles.twoCol}>
        {/* Lots */}
        <div>
          <SectionTitle>Lots — ordre FIFO ({lots.length})</SectionTitle>
          {lotsLoading ? (
            <Loader text="Chargement des lots..." />
          ) : (
            <LotTable lots={lots} paysId={paysId} />
          )}
        </div>

        {/* Alertes */}
        <div>
          <SectionTitle>Alertes actives ({alertes.length})</SectionTitle>
          {alertLoading ? (
            <Loader />
          ) : (
            <AlerteList alertes={alertes} />
          )}
        </div>
      </div>
    </div>
  );
}
