// ==========================================================
// COMPOSANTS UTILITAIRES
// ==========================================================

import { useEffect } from "react";
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

export function Button({ children, onClick, variant = "default", size = "md", disabled, type = "button" }) {
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[`btn-${variant}`]} ${styles[`btn-${size}`]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Badge({ children, variant = "default" }) {
  return <span className={`${styles.badge} ${styles[`badge-${variant}`]}`}>{children}</span>;
}

export function Toggle({ checked, onChange, disabled, labelOn = "Oui", labelOff = "Non" }) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
    >
      <span className={styles.toggleKnob} />
      <span className={styles.toggleLabel}>{checked ? labelOn : labelOff}</span>
    </button>
  );
}

export function Modal({ open, onClose, title, children, footer, width = 480 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}
