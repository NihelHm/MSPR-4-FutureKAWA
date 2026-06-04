// ==========================================================
// COMPOSANT NAVBAR - avec profil + réglages
// ==========================================================

import { NavLink, useNavigate } from "react-router-dom";
import { useApp, ROLES } from "../context/AppContext";
import { PAYS_LIST } from "../constants/pays";
import styles from "./Navbar.module.css";

const NAV_GLOBAL = [
  { to: "/", label: "Siège", icon: "◈", end: true },
  { to: "/alertes", label: "Alertes", icon: "⚠" },
];

export default function Navbar() {
  const { user, logout, theme, toggleTheme } = useApp();
  const navigate = useNavigate();

  const roleConf = user ? ROLES[user.role] : null;
  const initiales = user?.nom
    ? user.nom.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

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
          <div className={styles.brandSub}>Monitoring & Stocks</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Global</div>
        {NAV_GLOBAL.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ""}`
            }
          >
            <span className={styles.icon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Par pays</div>
        {PAYS_LIST.map((pays) => (
          <div key={pays.id} className={styles.paysGroup}>
            <NavLink
              to={`/pays/${pays.id}`}
              end
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ""}`
              }
            >
              <span className={styles.icon}>{pays.flag}</span>
              {pays.nom}
            </NavLink>
            <NavLink
              to={`/pays/${pays.id}/capteurs`}
              className={({ isActive }) =>
                `${styles.subLink} ${isActive ? styles.active : ""}`
              }
            >
              <span className={styles.icon}>📡</span>
              Capteurs
            </NavLink>
            <NavLink
              to={`/pays/${pays.id}/lots/nouveau`}
              className={({ isActive }) =>
                `${styles.subLink} ${isActive ? styles.active : ""}`
              }
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
          className={({ isActive }) =>
            `${styles.link} ${isActive ? styles.active : ""}`
          }
        >
          <span className={styles.icon}>⚙</span>
          Réglages
        </NavLink>

        {user && (
          <div className={styles.profile}>
            <div className={styles.profileLeft}>
              <div className={styles.avatar}>{initiales}</div>
              <div className={styles.profileInfo}>
                <div className={styles.profileName}>{user.nom}</div>
                <div className={styles.profileRole}>
                  {roleConf?.icon} {roleConf?.label}
                </div>
              </div>
            </div>
            <button
              className={styles.logoutBtn}
              onClick={handleLogout}
              title="Se déconnecter"
            >
              ⏏
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
