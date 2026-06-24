// ==========================================================
// PAGE LOGIN — connexion réelle (backend siège, JWT)
// ==========================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getRoleConfig } from "../constants/pays";
import { authAPI } from "../services/api";
import styles from "./Login.module.css";

// Affichage des comptes de démonstration.
// En contexte métier réel, laisser à false : on ne liste pas les comptes.
// En soutenance/démo, passer à true → la liste est récupérée dynamiquement
// depuis l'API (donc toujours à jour, y compris après création d'un compte).
const AFFICHER_COMPTES_DEMO = false;

const ICONE_ROLE = {
  admin: "🛡",
  direction_siege: "◈",
  responsable_bresil: "🇧🇷",
  responsable_equateur: "🇪🇨",
  responsable_colombie: "🇨🇴",
};

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [comptes, setComptes] = useState([]);

  useEffect(() => {
    if (!AFFICHER_COMPTES_DEMO) return;
    authAPI
      .listPublic()
      .then((users) =>
        setComptes(
          (users || []).map((u) => ({
            email: u.email,
            label: `${ICONE_ROLE[u.role] || "•"} ${getRoleConfig(u.role).label}`,
          }))
        )
      )
      .catch(() => setComptes([]));
  }, []);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Veuillez renseigner votre email et votre mot de passe.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      const conf = getRoleConfig(user.role);
      // Un administrateur n'a pas de données métier : on l'envoie vers l'administration.
      let cible = "/";
      if (user.is_admin) cible = "/admin";
      else if (conf.scope && conf.scope !== "all") cible = `/pays/${conf.scope}`;
      navigate(cible);
    } catch (err) {
      // err.message est déjà un message métier (api.js ne fuit plus la route).
      setError(err.message || "La connexion a échoué. Réessayez.");
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
              { icon: "📦", label: "Suivi des lots & entrepôts en temps réel" },
              { icon: "🌡", label: "Monitoring IoT — capteurs par entrepôt" },
              { icon: "⚠", label: "Alertes qualité & péremption automatiques" },
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

          {AFFICHER_COMPTES_DEMO && comptes.length > 0 && (
            <>
              <div className={styles.divider}><span>comptes de démonstration</span></div>
              <div className={styles.demoList}>
                {comptes.map((u) => (
                  <button key={u.email} className={styles.demoBtn} onClick={() => setEmail(u.email)}>
                    <span className={styles.demoLabel}>{u.label}</span>
                    <span className={styles.demoEmail}>{u.email}</span>
                  </button>
                ))}
              </div>
              <p className={styles.demoHint}>
                Cliquez pour pré-remplir l'email, puis saisissez votre mot de passe.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}