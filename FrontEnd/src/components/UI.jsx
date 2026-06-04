// ==========================================================
// COMPOSANTS UTILITAIRES
// ==========================================================

import styles from "./UI.module.css";

export function PageHeader({ title, sub, children }) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {sub && <p className={styles.pageSub}>{sub}</p>}
      </div>
      {children && <div className={styles.pageActions}>{children}</div>}
    </div>
  );
}

export function SectionTitle({ children }) {
  return <h2 className={styles.sectionTitle}>{children}</h2>;
}

export function Loader({ text = "Chargement..." }) {
  return (
    <div className={styles.loader}>
      <div className={styles.loaderDots}>
        <span /><span /><span />
      </div>
      <span className={styles.loaderText}>{text}</span>
    </div>
  );
}

export function ErrorBox({ message }) {
  return (
    <div className={styles.error}>
      <span className={styles.errorIcon}>⚠</span>
      <span>{message}</span>
    </div>
  );
}

export function PaysStatusDot({ status }) {
  return (
    <span
      className={`${styles.dot} ${
        status === "online"
          ? styles.dotOnline
          : status === "offline"
          ? styles.dotOffline
          : styles.dotLoading
      }`}
    />
  );
}

export function Grid({ children, cols = 3 }) {
  return (
    <div className={styles.grid} style={{ "--cols": cols }}>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>;
}

export function Button({ children, onClick, variant = "default", size = "md", disabled }) {
  return (
    <button
      className={`${styles.btn} ${styles[`btn-${variant}`]} ${styles[`btn-${size}`]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
