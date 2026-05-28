// ==========================================================
// COMPOSANT ALERTELIST
// ==========================================================

import { ALERTE_TYPES, PAYS_CONFIG } from "../constants/pays";
import styles from "./AlerteList.module.css";

export default function AlerteList({ alertes, showPays = false, limit }) {
  const displayed = limit ? alertes.slice(0, limit) : alertes;

  if (!alertes || alertes.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>✓</span>
        <span>Aucune alerte active</span>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {displayed.map((alerte, idx) => {
        const typeConfig = ALERTE_TYPES[alerte.type] || { icon: "⚡", label: alerte.type };
        const paysConfig = alerte._pays ? PAYS_CONFIG[alerte._pays] : null;

        return (
          <div key={alerte.id ?? idx} className={styles.item}>
            <div className={styles.itemIcon}>{typeConfig.icon}</div>
            <div className={styles.itemBody}>
              <div className={styles.itemHeader}>
                <span className={styles.itemType}>{typeConfig.label}</span>
                {showPays && paysConfig && (
                  <span className={styles.itemPays}>
                    {paysConfig.flag} {paysConfig.nom}
                  </span>
                )}
                <span className={styles.itemDate}>
                  {alerte.date_alerte
                    ? new Date(alerte.date_alerte).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
              </div>
              <div className={styles.itemMessage}>{alerte.message}</div>
              {alerte.valeur !== null && alerte.valeur !== undefined && (
                <div className={styles.itemValues}>
                  <span>Valeur : <strong>{alerte.valeur}</strong></span>
                  {alerte.seuil && (
                    <span>Seuil : <strong>{alerte.seuil}</strong></span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {limit && alertes.length > limit && (
        <div className={styles.more}>+ {alertes.length - limit} alertes supplémentaires</div>
      )}
    </div>
  );
}
