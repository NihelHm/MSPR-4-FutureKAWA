// ==========================================================
// PAGE CAPTEURS
// ==========================================================

import { useParams } from "react-router-dom";
import { useCapteurs } from "../hooks/useAlertes";
import { useMesures } from "../hooks/useMesures";
import { PAYS_CONFIG } from "../constants/pays";
import { PageHeader, SectionTitle, Loader, ErrorBox, Grid } from "../components/UI";
import StatCard from "../components/StatCard";
import MesureChart from "../components/MesureChart";
import styles from "./Capteurs.module.css";

function CapteurCard({ capteur, mesures, statut, couleur, unit }) {
  const last = mesures?.[0];
  return (
    <div className={`${styles.capteurCard} ${statut === "alerte" ? styles.cardAlert : ""}`}>
      <div className={styles.capteurHeader}>
        <div className={styles.capteurInfo}>
          <div className={styles.capteurName}>{capteur.nom}</div>
          <div className={styles.capteurType}>
            {capteur.type_capteur === "temperature" ? "🌡 Température" : "💧 Humidité"}
            &nbsp;· Site #{capteur.site_id}
          </div>
        </div>
        <div className={`${styles.capteurDot} ${statut === "ok" ? styles.dotOk : statut === "alerte" ? styles.dotAlert : styles.dotUnknown}`} />
      </div>

      <div className={styles.capteurVal}>
        {last?.valeur ?? "—"}
        <span className={styles.capteurUnit}>{unit}</span>
      </div>

      {last && (
        <div className={styles.capteurDate}>
          Dernière mesure :{" "}
          {new Date(last.date_mesure).toLocaleString("fr-FR", {
            day: "2-digit", month: "2-digit",
            hour: "2-digit", minute: "2-digit",
          })}
        </div>
      )}

      <div className={styles.capteurId}>ID #{capteur.id}</div>
    </div>
  );
}

export default function Capteurs() {
  const { paysId } = useParams();
  const config = PAYS_CONFIG[paysId];
  const { capteurs, loading: capLoading, error: capError } = useCapteurs(paysId);
  const {
    temperatures, humidites, loading: mesLoading,
    getStatutTemperature, getStatutHumidite,
    conditionsIdéales, tolerances,
  } = useMesures(paysId);

  if (!config) return <ErrorBox message={`Pays inconnu : ${paysId}`} />;
  if (capLoading || mesLoading) return <Loader text="Chargement des capteurs..." />;
  if (capError) return <ErrorBox message={capError} />;

  const capteursTemp = capteurs.filter((c) => c.type_capteur === "temperature");
  const capteursHum = capteurs.filter((c) => c.type_capteur === "humidite");

  const lastTemp = temperatures[0];
  const lastHum = humidites[0];

  const tempMin = conditionsIdéales ? conditionsIdéales.temperature - tolerances.temperature : undefined;
  const tempMax = conditionsIdéales ? conditionsIdéales.temperature + tolerances.temperature : undefined;
  const humMin = conditionsIdéales ? conditionsIdéales.humidite - tolerances.humidite : undefined;
  const humMax = conditionsIdéales ? conditionsIdéales.humidite + tolerances.humidite : undefined;

  return (
    <div className={styles.page}>
      <PageHeader
        title={`${config.flag} Capteurs — ${config.nom}`}
        sub={`${capteurs.length} capteur${capteurs.length !== 1 ? "s" : ""} enregistré${capteurs.length !== 1 ? "s" : ""}`}
      />

      <Grid cols={3}>
        <StatCard label="Total capteurs" value={capteurs.length} icon="📡" />
        <StatCard
          label="Capteurs température"
          value={capteursTemp.length}
          icon="🌡"
          sub={lastTemp ? `Dernière : ${lastTemp.valeur}°C` : "Aucune mesure"}
          variant={lastTemp && getStatutTemperature(lastTemp.valeur) === "alerte" ? "alert" : "default"}
        />
        <StatCard
          label="Capteurs humidité"
          value={capteursHum.length}
          icon="💧"
          sub={lastHum ? `Dernière : ${lastHum.valeur}%` : "Aucune mesure"}
          variant={lastHum && getStatutHumidite(lastHum.valeur) === "alerte" ? "alert" : "default"}
        />
      </Grid>

      {capteursTemp.length > 0 && (
        <section className={styles.section}>
          <SectionTitle>Capteurs de température</SectionTitle>
          <div className={styles.capteursGrid}>
            {capteursTemp.map((c) => (
              <CapteurCard
                key={c.id}
                capteur={c}
                mesures={temperatures}
                statut={lastTemp ? getStatutTemperature(lastTemp.valeur) : null}
                couleur="#FF8C42"
                unit="°C"
              />
            ))}
          </div>
          <div className={styles.chartWrap}>
            <MesureChart
              data={temperatures}
              label="Historique Température"
              unit="°C"
              color="#FF8C42"
              seuilMin={tempMin}
              seuilMax={tempMax}
            />
          </div>
        </section>
      )}

      {capteursHum.length > 0 && (
        <section className={styles.section}>
          <SectionTitle>Capteurs d'humidité</SectionTitle>
          <div className={styles.capteursGrid}>
            {capteursHum.map((c) => (
              <CapteurCard
                key={c.id}
                capteur={c}
                mesures={humidites}
                statut={lastHum ? getStatutHumidite(lastHum.valeur) : null}
                couleur="#64B5F6"
                unit="%"
              />
            ))}
          </div>
          <div className={styles.chartWrap}>
            <MesureChart
              data={humidites}
              label="Historique Humidité"
              unit="%"
              color="#64B5F6"
              seuilMin={humMin}
              seuilMax={humMax}
            />
          </div>
        </section>
      )}

      {capteurs.length === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📡</span>
          <span>Aucun capteur enregistré pour ce pays</span>
        </div>
      )}
    </div>
  );
}
