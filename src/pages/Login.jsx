// ==========================================================
// PAGE LOGIN - FUTUREKAWA
// ==========================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, ROLES } from "../context/AppContext";
import styles from "./Login.module.css";

const DEMO_USERS = [
  { role: "siege", nom: "Marie Dubois", email: "m.dubois@futurekawa.com" },
  { role: "bresil", nom: "Carlos Silva", email: "c.silva@futurekawa.com" },
  { role: "equateur", nom: "Ana Torres", email: "a.torres@futurekawa.com" },
  { role: "colombie", nom: "Juan Reyes", email: "j.reyes@futurekawa.com" },
];

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = (demoUser) => {
    setSelected(demoUser.role);
    setNom(demoUser.nom);
    setEmail(demoUser.email);
  };

  const handleSubmit = async () => {
    if (!selected || !nom || !email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    login({ role: selected, nom, email });
    const roleConfig = ROLES[selected];
    navigate(roleConfig.pays ? `/pays/${roleConfig.pays}` : "/");
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
            Monitoring &<br />
            <em>Gestion des stocks</em>
          </h1>
          <p className={styles.sub}>
            Plateforme de suivi multi-pays pour la gestion des grains de café vert.
            Brésil · Équateur · Colombie.
          </p>
          <div className={styles.features}>
            {[
              { icon: "📦", label: "Suivi des lots en temps réel" },
              { icon: "🌡", label: "Monitoring IoT température/humidité" },
              { icon: "⚠", label: "Alertes qualité automatiques" },
              { icon: "◈", label: "Vue consolidée siège" },
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
            <p className={styles.cardSub}>Sélectionnez votre profil</p>
          </div>

          {/* Sélection rôle */}
          <div className={styles.roles}>
            {DEMO_USERS.map((u) => {
              const roleConf = ROLES[u.role];
              return (
                <button
                  key={u.role}
                  className={`${styles.roleBtn} ${selected === u.role ? styles.roleActive : ""}`}
                  onClick={() => handleQuickLogin(u)}
                >
                  <span className={styles.roleIcon}>{roleConf.icon}</span>
                  <div className={styles.roleInfo}>
                    <div className={styles.roleLabel}>{roleConf.label}</div>
                    <div className={styles.roleName}>{u.nom}</div>
                  </div>
                  {selected === u.role && <span className={styles.roleCheck}>✓</span>}
                </button>
              );
            })}
          </div>

          <div className={styles.divider}><span>ou entrez manuellement</span></div>

          {/* Formulaire */}
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Nom complet</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Votre nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                className={styles.input}
                type="email"
                placeholder="email@futurekawa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {!selected && (
              <div className={styles.field}>
                <label className={styles.label}>Rôle</label>
                <select
                  className={styles.input}
                  value={selected || ""}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">-- Choisir un rôle --</option>
                  {Object.values(ROLES).map((r) => (
                    <option key={r.id} value={r.id}>{r.icon} {r.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={!selected || !nom || !email || loading}
          >
            {loading ? (
              <span className={styles.loadingDots}>
                <span /><span /><span />
              </span>
            ) : (
              "Accéder à la plateforme →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
