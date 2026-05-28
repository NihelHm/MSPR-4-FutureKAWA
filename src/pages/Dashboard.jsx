// ==========================================================
// PAGE DASHBOARD SIÈGE
// ==========================================================

import { Link } from "react-router-dom";
import { useSiege } from "../hooks/useAlertes";
import { PAYS_LIST } from "../constants/pays";
import StatCard from "../components/StatCard";
import LotTable from "../components/LotTable";
import AlerteList from "../components/AlerteList";
import { PageHeader, SectionTitle, Loader, ErrorBox, Grid, PaysStatusDot } from "../components/UI";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const { stats, allLots, allAlertes, loading, error, paysStatus, refetch } = useSiege();

  if (loading) return <Loader text="Consolidation des données pays..." />;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Vue Siège"
        sub="Consolidation multi-pays — Brésil · Équateur · Colombie"
      >
        <button className={styles.refreshBtn} onClick={refetch}>↻ Actualiser</button>
      </PageHeader>

      {error && <ErrorBox message={`Erreur de consolidation : ${error}`} />}

      {/* Statut des pays */}
      <div className={styles.paysCards}>
        {PAYS_LIST.map((pays) => {
          const status = paysStatus[pays.id] || "loading";
          const count = stats?.lotsParPays?.[pays.id] ?? "—";
          return (
            <Link
              key={pays.id}
              to={`/pays/${pays.id}`}
              className={`${styles.paysCard} ${status === "offline" ? styles.offline : ""}`}
            >
              <div className={styles.paysCardTop}>
                <span className={styles.paysFlag}>{pays.flag}</span>
                <PaysStatusDot status={status} />
              </div>
              <div className={styles.paysCardName}>{pays.nom}</div>
              <div className={styles.paysCardCount}>{count} lots</div>
              <div className={styles.paysCardStatus}>
                {status === "online" ? "Connecté" : status === "offline" ? "Hors ligne" : "..."}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Stats globales */}
      <Grid cols={3}>
        <StatCard
          label="Total lots"
          value={stats?.totalLots ?? "—"}
          icon="📦"
          sub="Tous pays confondus"
        />
        <StatCard
          label="Alertes actives"
          value={stats?.totalAlertes ?? "—"}
          icon="⚠"
          variant={stats?.totalAlertes > 0 ? "alert" : "default"}
          sub="Qualité & péremption"
        />
        <StatCard
          label="Pays actifs"
          value={Object.values(paysStatus).filter((s) => s === "online").length}
          icon="🌎"
          sub={`sur ${PAYS_LIST.length} pays`}
          variant={Object.values(paysStatus).every((s) => s === "online") ? "success" : "warning"}
        />
      </Grid>

      <div className={styles.twoCol}>
        <div>
          <SectionTitle>Lots récents (FIFO global)</SectionTitle>
          <LotTable lots={allLots.slice(0, 10)} showPays />
          {allLots.length > 10 && (
            <div className={styles.seeAll}>
              {allLots.length - 10} lots supplémentaires — consultez chaque pays
            </div>
          )}
        </div>

        <div>
          <SectionTitle>Dernières alertes</SectionTitle>
          <AlerteList alertes={allAlertes} showPays limit={8} />
        </div>
      </div>
    </div>
  );
}
