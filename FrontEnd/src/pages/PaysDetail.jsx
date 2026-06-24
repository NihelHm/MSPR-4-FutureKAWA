// ==========================================================
// PAGE PAYS DETAIL — niveau PAYS : liste des SITES (entrepôts)
// ==========================================================

import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useLots } from "../hooks/useLots";
import { useSites } from "../hooks/useSites";
import { useMesures } from "../hooks/useMesures";
import { useAlertes } from "../hooks/useAlertes";
import { useCapteurs } from "../hooks/useCapteurs";
import { PAYS_CONFIG } from "../constants/pays";
import StatCard from "../components/StatCard";
import MesureChart from "../components/MesureChart";
import AlerteList from "../components/AlerteList";
import { PageHeader, SectionTitle, Loader, ErrorBox, Grid } from "../components/UI";
import styles from "./PaysDetail.module.css";

export default function PaysDetail() {
  const { paysId } = useParams();
  const config = PAYS_CONFIG[paysId];

  const { sites, loading: sitesLoading, error: sitesError } = useSites(paysId);
  const { lots, loading: lotsLoading } = useLots(paysId);
  const { capteurs } = useCapteurs(paysId);
  const {
    temperatures, humidites, lastTemperature, lastHumidite,
    loading: mesLoading, error: mesError,
    getStatutTemperature, getStatutHumidite, conditionsIdéales, tolerances,
  } = useMesures(paysId);
  const { alertes, loading: alertLoading } = useAlertes(paysId);

  // Regroupements lots/capteurs par site
  const lotsParSite = useMemo(() => {
    const map = {};
    lots.forEach((l) => {
      map[l.site_id] = (map[l.site_id] || 0) + 1;
    });
    return map;
  }, [lots]);

  const capteursParSite = useMemo(() => {
    const map = {};
    capteurs.forEach((c) => {
      map[c.site_id] = (map[c.site_id] || 0) + 1;
    });
    return map;
  }, [capteurs]);

  if (!config) return <ErrorBox message={`Pays inconnu : ${paysId}`} />;

  const tempMin = conditionsIdéales ? conditionsIdéales.temperature - tolerances.temperature : undefined;
  const tempMax = conditionsIdéales ? conditionsIdéales.temperature + tolerances.temperature : undefined;
  const humMin = conditionsIdéales ? conditionsIdéales.humidite - tolerances.humidite : undefined;
  const humMax = conditionsIdéales ? conditionsIdéales.humidite + tolerances.humidite : undefined;

  const tempStatut = lastTemperature ? getStatutTemperature(lastTemperature.valeur) : null;
  const humStatut = lastHumidite ? getStatutHumidite(lastHumidite.valeur) : null;

  return (
    <div className={styles.page}>
      <PageHeader title={`${config.flag} ${config.nom}`} />

      {(sitesError || mesError) && (
        <ErrorBox message="Impossible de joindre le backend local. Vérifiez que Docker est démarré." />
      )}

      <div className={styles.condBanner}>
        <span className={styles.condLabel}>Conditions idéales</span>
        <span className={styles.condVal}>🌡 {conditionsIdéales?.temperature}°C ± {tolerances?.temperature}°C</span>
        <span className={styles.condSep}>·</span>
        <span className={styles.condVal}>💧 {conditionsIdéales?.humidite}% ± {tolerances?.humidite}%</span>
      </div>

      <Grid cols={4}>
        <StatCard label="Sites / entrepôts" value={sites.length} icon="🏭" />
        <StatCard label="Lots stockés" value={lots.length} icon="📦" />
        <StatCard
          label="Température actuelle"
          value={lastTemperature?.valeur ?? "—"} unit="°C" icon="🌡"
          variant={tempStatut === "alerte" ? "alert" : tempStatut === "ok" ? "success" : "default"}
        />
        <StatCard
          label="Humidité actuelle"
          value={lastHumidite?.valeur ?? "—"} unit="%" icon="💧"
          variant={humStatut === "alerte" ? "alert" : humStatut === "ok" ? "success" : "default"}
        />
      </Grid>

      {/* SITES */}
      <section className={styles.section}>
        <SectionTitle>Sites / entrepôts ({sites.length})</SectionTitle>
        {sitesLoading || lotsLoading ? (
          <Loader text="Chargement des sites..." />
        ) : sites.length === 0 ? (
          <div className={styles.empty}>Aucun site enregistré pour ce pays</div>
        ) : (
          <div className={styles.sitesGrid}>
            {sites.map((site) => (
              <Link key={site.id} to={`/pays/${paysId}/sites/${site.id}`} className={styles.siteCard}>
                <div className={styles.siteTop}>
                  <span className={styles.siteIcon}>🏭</span>
                  <span className={styles.siteId}>#{site.id}</span>
                </div>
                <div className={styles.siteName}>{site.nom || `Site ${site.id}`}</div>
                {site.localisation && <div className={styles.siteLoc}>📍 {site.localisation}</div>}
                <div className={styles.siteStats}>
                  <span className={styles.siteStat}>📦 {lotsParSite[site.id] || 0} lots</span>
                  <span className={styles.siteStat}>📡 {capteursParSite[site.id] || 0} capteurs</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* MESURES */}
      <section className={styles.section}>
        <SectionTitle>Historique des mesures (pays)</SectionTitle>
        {mesLoading ? (
          <Loader text="Chargement des mesures..." />
        ) : (
          <div className={styles.chartsGrid}>
            <MesureChart data={temperatures} label="Température" unit="°C" color="#FF8C42" seuilMin={tempMin} seuilMax={tempMax} />
            <MesureChart data={humidites} label="Humidité" unit="%" color="#64B5F6" seuilMin={humMin} seuilMax={humMax} />
          </div>
        )}
      </section>

      {/* ALERTES */}
      <section className={styles.section}>
        <SectionTitle>Alertes actives ({alertes.length})</SectionTitle>
        {alertLoading ? <Loader /> : <AlerteList alertes={alertes} />}
      </section>
    </div>
  );
}
