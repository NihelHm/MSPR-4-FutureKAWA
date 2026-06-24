// ==========================================================
// PAGE ALERTES — consolidation des alertes des pays accessibles
// Source UNIQUE : alertes calculées (mêmes règles que les vues pays/entrepôt).
// ==========================================================

import { useState, useMemo } from "react";
import { useAlertes } from "../hooks/useAlertes";
import { useApp } from "../context/AppContext";
import { PAYS_CONFIG, ALERTE_TYPES } from "../constants/pays";
import AlerteList from "../components/AlerteList";
import StatCard from "../components/StatCard";
import { PageHeader, SectionTitle, Loader, ErrorBox, Grid } from "../components/UI";
import styles from "./Alertes.module.css";

export default function Alertes() {
  const { accessiblePays } = useApp();
  const { alertes, loading, error } = useAlertes(); // sans paysId → consolidé
  const [filtrePays, setFiltrePays] = useState("tous");

  const alertesFiltrees = useMemo(() => {
    if (filtrePays === "tous") return alertes;
    return alertes.filter((a) => a._pays === filtrePays);
  }, [alertes, filtrePays]);

  const parType = useMemo(() => {
    const acc = { temperature: 0, humidite: 0, peremption: 0 };
    alertes.forEach((a) => {
      if (acc[a.type] !== undefined) acc[a.type] += 1;
    });
    return acc;
  }, [alertes]);

  if (error) return <ErrorBox message={error} />;

  return (
    <div className={styles.page}>
      <PageHeader title="⚠ Alertes" sub="Anomalies détectées sur votre périmètre" />

      <Grid cols={4}>
        <StatCard label="Alertes actives" value={loading ? "…" : alertes.length} icon="⚠"
          variant={alertes.length ? "alert" : "default"} />
        <StatCard label={ALERTE_TYPES.temperature.label} value={parType.temperature} icon={ALERTE_TYPES.temperature.icon} />
        <StatCard label={ALERTE_TYPES.humidite.label} value={parType.humidite} icon={ALERTE_TYPES.humidite.icon} />
        <StatCard label={ALERTE_TYPES.peremption.label} value={parType.peremption} icon={ALERTE_TYPES.peremption.icon} />
      </Grid>

      <section className={styles.section}>
        <div className={styles.filterBar}>
          <button
            className={`${styles.filterBtn} ${filtrePays === "tous" ? styles.filterActive : ""}`}
            onClick={() => setFiltrePays("tous")}
          >
            Tous
          </button>
          {accessiblePays.map((id) => {
            const c = PAYS_CONFIG[id];
            return (
              <button
                key={id}
                className={`${styles.filterBtn} ${filtrePays === id ? styles.filterActive : ""}`}
                onClick={() => setFiltrePays(id)}
              >
                {c.flag} {c.nom}
              </button>
            );
          })}
        </div>

        <SectionTitle>
          {filtrePays === "tous"
            ? `Toutes les alertes (${alertesFiltrees.length})`
            : `${PAYS_CONFIG[filtrePays]?.nom} (${alertesFiltrees.length})`}
        </SectionTitle>

        {loading ? (
          <Loader text="Analyse des conditions et des lots..." />
        ) : (
          <AlerteList alertes={alertesFiltrees} showPays={filtrePays === "tous"} />
        )}
      </section>
    </div>
  );
}