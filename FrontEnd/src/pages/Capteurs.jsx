// ==========================================================
// PAGE CAPTEURS — niveau PAYS : tous les capteurs du pays
// Groupés par type, avec leur lot de rattachement et les courbes.
// ==========================================================

import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCapteurs } from "../hooks/useCapteurs";
import { useMesures } from "../hooks/useMesures";
import { PAYS_CONFIG, CAPTEUR_TYPES } from "../constants/pays";
import MesureChart from "../components/MesureChart";
import StatCard from "../components/StatCard";
import { PageHeader, SectionTitle, Loader, ErrorBox, Grid, Card, Badge } from "../components/UI";
import styles from "./Capteurs.module.css";

export default function Capteurs() {
  const { paysId } = useParams();
  const navigate = useNavigate();
  const config = PAYS_CONFIG[paysId];

  const { capteurs, loading, error } = useCapteurs(paysId);
  const {
    temperatures, humidites, loading: mesLoading,
    conditionsIdéales, tolerances,
  } = useMesures(paysId);

  const capteursTemp = useMemo(() => capteurs.filter((c) => c.type_capteur === "temperature"), [capteurs]);
  const capteursHum = useMemo(() => capteurs.filter((c) => c.type_capteur === "humidite"), [capteurs]);
  const nonLies = useMemo(() => capteurs.filter((c) => c.lot_id == null), [capteurs]);

  if (!config) return <ErrorBox message={`Pays inconnu : ${paysId}`} />;
  if (error) return <ErrorBox message={error} />;

  const tempMin = conditionsIdéales ? conditionsIdéales.temperature - tolerances.temperature : undefined;
  const tempMax = conditionsIdéales ? conditionsIdéales.temperature + tolerances.temperature : undefined;
  const humMin = conditionsIdéales ? conditionsIdéales.humidite - tolerances.humidite : undefined;
  const humMax = conditionsIdéales ? conditionsIdéales.humidite + tolerances.humidite : undefined;

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(`/pays/${paysId}`)}>
        ← {config.flag} {config.nom}
      </button>

      <PageHeader title="📡 Capteurs" sub={`${config.flag} ${config.nom}`} />

      <Grid cols={4}>
        <StatCard label="Capteurs total" value={loading ? "…" : capteurs.length} icon="📡" />
        <StatCard label="Température" value={capteursTemp.length} icon="🌡" />
        <StatCard label="Humidité" value={capteursHum.length} icon="💧" />
        <StatCard
          label="Non liés à un lot"
          value={nonLies.length}
          icon="🔗"
          variant={nonLies.length ? "alert" : "default"}
        />
      </Grid>

      <section className={styles.section}>
        <SectionTitle>Liste des capteurs ({capteurs.length})</SectionTitle>
        {loading ? (
          <Loader text="Chargement des capteurs..." />
        ) : capteurs.length === 0 ? (
          <div className={styles.empty}>Aucun capteur enregistré.</div>
        ) : (
          <div className={styles.capteurGrid}>
            {capteurs.map((c) => {
              const tc = CAPTEUR_TYPES[c.type_capteur] || { icon: "📡", label: c.type_capteur, unit: "" };
              return (
                <Card key={c.id} className={styles.capteurCard}>
                  <div className={styles.capteurHead}>
                    <span className={styles.capteurIcon}>{tc.icon}</span>
                    <span className={styles.capteurId}>#{c.id}</span>
                  </div>
                  <div className={styles.capteurNom}>{c.nom || `Capteur ${c.id}`}</div>
                  <div className={styles.capteurMeta}>
                    <Badge>{tc.label}</Badge>
                    {c.site_id != null && <span className={styles.metaTxt}>Site #{c.site_id}</span>}
                  </div>
                  <div className={styles.lotLink}>
                    {c.lot_id != null ? (
                      <button
                        className={styles.lotBtn}
                        onClick={() => navigate(`/pays/${paysId}/lots/${c.lot_id}`)}
                      >
                        🔗 Lot #{c.lot_id}
                      </button>
                    ) : (
                      <span className={styles.lotNone}>Non lié à un lot</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <SectionTitle>Historique global du pays</SectionTitle>
        {mesLoading ? (
          <Loader text="Chargement des mesures..." />
        ) : (
          <div className={styles.chartsGrid}>
            <Card>
              <MesureChart
                data={temperatures}
                label="Température"
                unit="°C"
                color={CAPTEUR_TYPES.temperature.color}
                seuilMin={tempMin}
                seuilMax={tempMax}
              />
            </Card>
            <Card>
              <MesureChart
                data={humidites}
                label="Humidité"
                unit="%"
                color={CAPTEUR_TYPES.humidite.color}
                seuilMin={humMin}
                seuilMax={humMax}
              />
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}
