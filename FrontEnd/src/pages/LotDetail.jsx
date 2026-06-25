// ==========================================================
// PAGE LOT DETAIL — niveau LOT
// Affiche les infos du lot, ses capteurs liés et l'historique
// des mesures filtré sur ces capteurs.
// ==========================================================

import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLot } from "../hooks/useLots";
import { useCapteursDuLot } from "../hooks/useCapteurs";
import { useMesures } from "../hooks/useMesures";
import { PAYS_CONFIG, STATUT_COLORS, CAPTEUR_TYPES } from "../constants/pays";
import { calculerAlertesPays } from "../services/api";
import MesureChart from "../components/MesureChart";
import StatCard from "../components/StatCard";
import { PageHeader, SectionTitle, Loader, ErrorBox, Grid, Card, Button, Badge } from "../components/UI";
import styles from "./LotDetail.module.css";

// États CALCULÉS : jamais lus depuis la BDD (peuvent être figés/obsolètes).
const STATUTS_CALCULES = new Set(["en alerte", "périmé"]);

function getAge(dateStockage) {
  if (!dateStockage) return null;
  return Math.floor((Date.now() - new Date(dateStockage).getTime()) / (1000 * 60 * 60 * 24));
}

export default function LotDetail() {
  const { paysId, lotId } = useParams();
  const navigate = useNavigate();
  const config = PAYS_CONFIG[paysId];

  const { lot, loading: lotLoading, error: lotError } = useLot(paysId, lotId);
  const { capteurs, loading: capLoading } = useCapteursDuLot(paysId, lotId);

  // Ids des capteurs du lot → filtrage des mesures
  const capteurIds = useMemo(() => capteurs.map((c) => c.id), [capteurs]);
  const {
    temperatures, humidites, lastTemperature, lastHumidite,
    loading: mesLoading, conditionsIdéales, tolerances,
  } = useMesures(paysId, capteurIds.length ? capteurIds : null);

  // --- ALERTES DU LOT : même calcul que le tableau / le compteur ----------
  // Source de vérité UNIQUE : on réutilise calculerAlertesPays sur les données
  // du lot. Les capteurs de useCapteursDuLot ont déjà lot_id === ce lot, donc
  // leurs alertes de conditions sont rattachées à ce lot, + la péremption.
  const alertesLot = useMemo(
    () =>
      calculerAlertesPays(paysId, {
        sites: [],
        lots: lot ? [lot] : [],
        capteurs,
        temperatures,
        humidites,
      }).filter((a) => a.lot_id != null && String(a.lot_id) === String(lot?.id ?? lotId)),
    [paysId, lot, lotId, capteurs, temperatures, humidites]
  );
  const enAlerte = alertesLot.length > 0;
  const perime = alertesLot.some((a) => a.type === "peremption");

  if (!config) return <ErrorBox message={`Pays inconnu : ${paysId}`} />;
  if (lotLoading) return <Loader text="Chargement du lot..." />;
  if (lotError) return <ErrorBox message={`Lot introuvable : ${lotError}`} />;

  const age = getAge(lot?.date_stockage);

  // Statut affiché : "en alerte"/"périmé" dérivés du calcul, sinon statut workflow BDD.
  let statutAffiche;
  if (perime) statutAffiche = "périmé";
  else if (enAlerte) statutAffiche = "en alerte";
  else if (lot?.statut && !STATUTS_CALCULES.has(lot.statut)) statutAffiche = lot.statut;
  else statutAffiche = "stocké";

  const statutConf = STATUT_COLORS[statutAffiche] || { bg: "#222", text: "#aaa", label: statutAffiche };

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
        title={`📦 Lot ${lot?.reference || lot?.id || lotId}`}
        sub={`${config.flag} ${config.nom}${lot?.site_id != null ? ` · Site #${lot.site_id}` : ""}`}
      >
        <Button onClick={() => navigate(`/pays/${paysId}/lots/${lotId}/edit`)}>
          ✎ Modifier
        </Button>
      </PageHeader>

      <Grid cols={4}>
        <StatCard
          label="Statut"
          value={statutConf.label}
          icon="●"
          variant={enAlerte || perime ? "alert" : "default"}
        />
        <StatCard
          label="Âge en stock"
          value={age === null ? "—" : `${age}j`}
          icon="⏱"
          variant={age !== null && age > 365 ? "alert" : "default"}
          sub={age !== null && age > 365 ? "Dépasse 365 j (péremption)" : null}
        />
        <StatCard label="Capteurs liés" value={capLoading ? "…" : capteurs.length} icon="📡" />
        <StatCard
          label="Dernière temp."
          value={lastTemperature ? lastTemperature.valeur : "—"}
          unit={lastTemperature ? "°C" : ""}
          icon="🌡"
        />
      </Grid>

      {/* Infos détaillées du lot */}
      <section className={styles.section}>
        <SectionTitle>Informations du lot</SectionTitle>
        <Card>
          <div className={styles.infoGrid}>
            <Info label="Référence" value={lot?.reference || "—"} />
            <Info label="Identifiant" value={lot?.id ?? lotId} mono />
            <Info label="Site / Entrepôt" value={lot?.site_id != null ? `#${lot.site_id}` : "—"} />
            <Info label="Date de réception" value={fmtDate(lot?.date_reception)} />
            <Info label="Date de stockage" value={fmtDate(lot?.date_stockage)} />
            <Info label="Statut" value={statutConf.label} />
          </div>
        </Card>
      </section>

      {/* Capteurs liés */}
      <section className={styles.section}>
        <SectionTitle>Capteurs liés ({capteurs.length})</SectionTitle>
        {capLoading ? (
          <Loader text="Chargement des capteurs..." />
        ) : capteurs.length === 0 ? (
          <div className={styles.empty}>
            Aucun capteur lié à ce lot. Utilisez « Modifier » pour en associer.
          </div>
        ) : (
          <div className={styles.capteurList}>
            {capteurs.map((c) => {
              const tc = CAPTEUR_TYPES[c.type_capteur] || { icon: "📡", label: c.type_capteur, unit: "" };
              return (
                <div key={c.id} className={styles.capteurChip}>
                  <span className={styles.capteurIcon}>{tc.icon}</span>
                  <div>
                    <div className={styles.capteurNom}>{c.nom || `Capteur #${c.id}`}</div>
                    <div className={styles.capteurMeta}>
                      <Badge>{tc.label}</Badge>
                      <span className={styles.capteurId}>#{c.id}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Courbes des mesures du lot */}
      <section className={styles.section}>
        <SectionTitle>Historique des mesures du lot</SectionTitle>
        {mesLoading ? (
          <Loader text="Chargement des mesures..." />
        ) : capteurIds.length === 0 ? (
          <div className={styles.empty}>Aucun capteur lié — pas de mesures à afficher.</div>
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

function Info({ label, value, mono }) {
  return (
    <div className={styles.info}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={`${styles.infoValue} ${mono ? styles.mono : ""}`}>{value}</span>
    </div>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}