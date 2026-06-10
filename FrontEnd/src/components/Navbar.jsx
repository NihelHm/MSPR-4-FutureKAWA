// ==========================================================
// COMPOSANT NAVBAR — filtré par rôle + lien admin + profil
// ==========================================================

import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { PAYS_CONFIG } from "../constants/pays";
import styles from "./Navbar.module.css";

const NAV_GLOBAL = [
  { to: "/", label: "Siège", icon: "◈", end: true },
  { to: "/alertes", label: "Alertes", icon: "⚠" },
];

export default function Navbar() {
  const { user, logout, roleConfig, accessiblePays, isAdmin, theme, toggleTheme } = useApp();
  const navigate = useNavigate();

  const initiales = user?.username
    ? user.username.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const paysVisibles = accessiblePays.map((id) => PAYS_CONFIG[id]).filter(Boolean);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.logo}>FK</span>
        <div>
          <div className={styles.brandName}>FutureKawa</div>
          <div className={styles.brandSub}>Monitoring &amp; Stocks</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Global</div>
        {NAV_GLOBAL.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
          >
            <span className={styles.icon}>🛡</span>
            Administration
          </NavLink>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          {accessiblePays.length > 1 ? "Par pays" : "Mon pays"}
        </div>
        {paysVisibles.map((pays) => (
          <div key={pays.id} className={styles.paysGroup}>
            <NavLink
              to={`/pays/${pays.id}`}
              end
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.icon}>{pays.flag}</span>
              {pays.nom}
            </NavLink>
            <NavLink
              to={`/pays/${pays.id}/capteurs`}
              className={({ isActive }) => `${styles.subLink} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.icon}>📡</span>
              Capteurs
            </NavLink>
            <NavLink
              to={`/pays/${pays.id}/lots/nouveau`}
              className={({ isActive }) => `${styles.subLink} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.icon}>＋</span>
              Nouveau lot
            </NavLink>
          </div>
        ))}
      </div>

      <div className={styles.bottom}>
        <button className={styles.themeToggle} onClick={toggleTheme} title="Changer le thème">
          <span>{theme === "dark" ? "☀" : "◗"}</span>
          <span>{theme === "dark" ? "Mode café" : "Mode sombre"}</span>
        </button>

        <NavLink
          to="/reglages"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
        >
          <span className={styles.icon}>⚙</span>
          Réglages
        </NavLink>

        {user && (
          <div className={styles.profile}>
            <div className={styles.profileLeft}>
              <div className={styles.avatar}>{initiales}</div>
              <div className={styles.profileInfo}>
                <div className={styles.profileName}>
                  {user.username}
                  {isAdmin && <span className={styles.adminTag}>admin</span>}
                </div>
                <div className={styles.profileRole}>
                  {roleConfig?.icon} {roleConfig?.label}
                </div>
              </div>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Se déconnecter">⏏</button>
          </div>
        )}
      </div>
    </nav>
  );
}
