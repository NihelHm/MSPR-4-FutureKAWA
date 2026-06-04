// ==========================================================
// PAGE ALERTES GLOBALES
// ==========================================================

import { useState } from "react";
import { useAlertes } from "../hooks/useAlertes";
import { PAYS_LIST } from "../constants/pays";
import AlerteList from "../components/AlerteList";
import { PageHeader, SectionTitle, Loader, ErrorBox } from "../components/UI";
import styles from "./Alertes.module.css";

export default function Alertes() {
  const [paysFilter, setPaysFilter] = useState("all");
  const { alertes, loading, error, refetch } = useAlertes(null);

  const filtered =
    paysFilter === "all"
      ? alertes
      : alertes.filter((a) => a._pays === paysFilter);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Alertes"
        sub="Toutes les alertes qualité et péremption — tous pays"
      >
        <button className={styles.refreshBtn} onClick={refetch}>↻ Actualiser</button>
      </PageHeader>

      {error && <ErrorBox message={error} />}

      <div className={styles.filters}>
        <button
          className={`${styles.filter} ${paysFilter === "all" ? styles.active : ""}`}
          onClick={() => setPaysFilter("all")}
        >
          Tous ({alertes.length})
        </button>
        {PAYS_LIST.map((pays) => {
          const count = alertes.filter((a) => a._pays === pays.id).length;
          return (
            <button
              key={pays.id}
              className={`${styles.filter} ${paysFilter === pays.id ? styles.active : ""}`}
              onClick={() => setPaysFilter(pays.id)}
            >
              {pays.flag} {pays.nom} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <Loader text="Chargement des alertes..." />
      ) : (
        <>
          <SectionTitle>
            {filtered.length} alerte{filtered.length !== 1 ? "s" : ""}
            {paysFilter !== "all" ? ` — ${PAYS_LIST.find((p) => p.id === paysFilter)?.nom}` : ""}
          </SectionTitle>
          <AlerteList alertes={filtered} showPays={paysFilter === "all"} />
        </>
      )}
    </div>
  );
}
