// ==========================================================
// COMPOSANT LOTTABLE
// ==========================================================

import { useNavigate } from "react-router-dom";
import { STATUT_COLORS } from "../constants/pays";
import styles from "./LotTable.module.css";

function getAge(dateStockage) {
  if (!dateStockage) return null;
  const diff = Date.now() - new Date(dateStockage).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function AgeBadge({ jours }) {
  if (jours === null) return <span className={styles.ageMuted}>—</span>;
  const variant = jours > 365 ? "danger" : jours > 300 ? "warning" : "ok";
  return <span className={`${styles.ageBadge} ${styles[variant]}`}>{jours}j</span>;
}

function StatutBadge({ statut }) {
  const config = STATUT_COLORS[statut] || { bg: "#222", text: "#aaa", label: statut };
  return (
    <span className={styles.statut} style={{ background: config.bg, color: config.text }}>
      {config.label}
    </span>
  );
}

export default function LotTable({ lots, paysId, showPays = false, capteursMap = null }) {
  const navigate = useNavigate();

  if (!lots || lots.length === 0) {
    return <div className={styles.empty}>Aucun lot trouvé</div>;
  }

  const showCapteurs = capteursMap !== null;

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Référence</th>
            {showPays && <th>Pays</th>}
            <th>Date stockage</th>
            <th>Ancienneté</th>
            <th>Statut</th>
            <th>Site</th>
            {showCapteurs && <th>Capteurs</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lots.map((lot) => {
            const age = getAge(lot.date_stockage);
            const pays = lot._pays || paysId;
            const nbCapteurs = capteursMap ? (capteursMap[lot.id] ?? 0) : null;
            return (
              <tr
                key={`${pays}-${lot.id}`}
                className={styles.row}
                onClick={() => navigate(`/pays/${pays}/lots/${lot.id}`)}
              >
                <td className={styles.ref}>{lot.reference}</td>
                {showPays && <td className={styles.pays}>{pays}</td>}
                <td className={styles.date}>
                  {lot.date_stockage ? new Date(lot.date_stockage).toLocaleDateString("fr-FR") : "—"}
                </td>
                <td><AgeBadge jours={age} /></td>
                <td><StatutBadge statut={lot.statut} /></td>
                <td className={styles.site}>Site #{lot.site_id}</td>
                {showCapteurs && (
                  <td>
                    <span className={`${styles.capteurs} ${nbCapteurs === 0 ? styles.capteursEmpty : ""}`}>
                      📡 {nbCapteurs}
                    </span>
                  </td>
                )}
                <td className={styles.arrow}>→</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
