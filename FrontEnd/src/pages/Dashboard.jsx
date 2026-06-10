// ==========================================================
// PAGE DASHBOARD SIÈGE
// ==========================================================

import { Link } from "react-router-dom";
import { useSiege } from "../hooks/useAlertes";
import { useApp } from "../context/AppContext";
import { PAYS_CONFIG } from "../constants/pays";
import StatCard from "../components/StatCard";
import LotTable from "../components/LotTable";
import AlerteList from "../components/AlerteList";
import { PageHeader, SectionTitle, Loader, ErrorBox, Grid, PaysStatusDot } from "../components/UI";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const { accessiblePays, roleConfig } = useApp();
  const { stats, allLots, allAlertes, loading, error, paysStatus, refetch } = useSiege();

  const paysVisibles = accessiblePays.map((id) => PAYS_CONFIG[id]).filter(Boolean);

  if (loading) return <Loader text="Consolidation des données pays..." />;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Vue Siège"
        sub={`Consolidation — ${paysVisibles.map((p) => p.nom).join(" · ")}`}
      >
        <button className={styles.refreshBtn} onClick={refetch}>↻ Actualiser</button>
      </PageHeader>

      {error && <ErrorBox message={`Erreur de consolidation : ${error}`} />}

      <div className={styles.paysCards}>
        {paysVisibles.map((pays) => {
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

      <Grid cols={4}>
        <StatCard label="Total lots" value={stats?.totalLots ?? "—"} icon="📦" sub="Pays accessibles" />
        <StatCard label="Capteurs IoT" value={stats?.totalCapteurs ?? "—"} icon="📡" sub="Tous lots confondus" />
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
          sub={`sur ${paysVisibles.length} accessible${paysVisibles.length > 1 ? "s" : ""}`}
          variant={
            paysVisibles.length > 0 && Object.values(paysStatus).every((s) => s === "online")
              ? "success"
              : "warning"
          }
        />
      </Grid>

      <div className={styles.twoCol}>
        <div>
          <SectionTitle>Lots récents</SectionTitle>
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
