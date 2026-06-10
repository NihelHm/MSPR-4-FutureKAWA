// ==========================================================
// PAGE LOGIN — connexion réelle (backend siège, JWT)
// ==========================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getRoleConfig } from "../constants/pays";
import styles from "./Login.module.css";

// Comptes de démonstration (emails issus de init.sql — mot de passe à saisir)
const DEMO_USERS = [
  { email: "admin@futurekawa.com", label: "🛡 Administrateur" },
  { email: "m.dubois@futurekawa.com", label: "◈ Direction Siège" },
  { email: "c.silva@futurekawa.com", label: "🇧🇷 Responsable Brésil" },
  { email: "a.torres@futurekawa.com", label: "🇪🇨 Responsable Équateur" },
  { email: "j.reyes@futurekawa.com", label: "🇨🇴 Responsable Colombie" },
];

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Email et mot de passe requis.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      const conf = getRoleConfig(user.role);
      const cible = conf.scope && conf.scope !== "all" ? `/pays/${conf.scope}` : "/";
      navigate(cible);
    } catch (err) {
      setError(err.message || "Échec de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.leftContent}>
          <div className={styles.brand}>
            <span className={styles.brandLogo}>FK</span>
            <span className={styles.brandName}>FutureKawa</span>
          </div>
          <h1 className={styles.headline}>
            Monitoring &amp;<br />
            <em>Gestion des stocks</em>
          </h1>
          <p className={styles.sub}>
            Plateforme de suivi multi-pays pour la gestion des grains de café vert.
            Brésil · Équateur · Colombie.
          </p>
          <div className={styles.features}>
            {[
              { icon: "📦", label: "Suivi des lots & sites en temps réel" },
              { icon: "🌡", label: "Monitoring IoT — capteurs par lot" },
              { icon: "⚠", label: "Alertes qualité automatiques" },
              { icon: "🛡", label: "Administration & rôles par pays" },
            ].map((f) => (
              <div key={f.label} className={styles.feature}>
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Connexion</h2>
            <p className={styles.cardSub}>Accédez à la plateforme avec vos identifiants</p>
          </div>

          {error && <div className={styles.errorBox}>⚠ {error}</div>}

          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                className={styles.input}
                type="email"
                placeholder="email@futurekawa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Mot de passe</label>
              <input
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          </div>

          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={!email || !password || loading}
          >
            {loading ? (
              <span className={styles.loadingDots}><span /><span /><span /></span>
            ) : (
              "Se connecter →"
            )}
          </button>

          <div className={styles.divider}><span>comptes de démonstration</span></div>

          <div className={styles.demoList}>
            {DEMO_USERS.map((u) => (
              <button key={u.email} className={styles.demoBtn} onClick={() => setEmail(u.email)}>
                <span className={styles.demoLabel}>{u.label}</span>
                <span className={styles.demoEmail}>{u.email}</span>
              </button>
            ))}
          </div>
          <p className={styles.demoHint}>
            Cliquez pour pré-remplir l'email, puis saisissez le mot de passe défini en base.
          </p>
        </div>
      </div>
    </div>
  );
}
