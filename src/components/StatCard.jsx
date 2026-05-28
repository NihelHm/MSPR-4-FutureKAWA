// ==========================================================
// COMPOSANT STATCARD
// ==========================================================

import styles from "./StatCard.module.css";

export default function StatCard({ label, value, unit, icon, variant = "default", sub }) {
  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>
      <div className={styles.value}>
        {value ?? "—"}
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  );
}
