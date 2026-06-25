// ==========================================================
// COMPOSANT NAVBAR — filtré par rôle + profil + déconnexion visible
// ==========================================================

import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { PAYS_CONFIG } from "../constants/pays";
import styles from "./Navbar.module.css";

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

  const linkCls = ({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`;
  const subCls = ({ isActive }) => `${styles.subLink} ${isActive ? styles.active : ""}`;

  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.logo}>FK</span>
        <div>
          <div className={styles.brandName}>FutureKawa</div>
          <div className={styles.brandSub}>Monitoring &amp; Stocks</div>
        </div>
      </div>

      {/* Navigation : MÉTIER pour les non-admins, ADMINISTRATION pour l'admin */}
      <div className={styles.navScroll}>
        {isAdmin ? (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Administration</div>
            <NavLink to="/admin" className={linkCls}>
              <span className={styles.icon}>🛡</span> Utilisateurs
            </NavLink>
          </div>
        ) : (
          <>
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Global</div>
              <NavLink to="/" end className={linkCls}>
                <span className={styles.icon}>◈</span> Siège
              </NavLink>
              <NavLink to="/alertes" className={linkCls}>
                <span className={styles.icon}>⚠</span> Alertes
              </NavLink>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionLabel}>
                {accessiblePays.length > 1 ? "Par pays" : "Mon pays"}
              </div>
              {paysVisibles.map((pays) => (
                <div key={pays.id} className={styles.paysGroup}>
                  <NavLink to={`/pays/${pays.id}`} end className={linkCls}>
                    <span className={styles.icon}>{pays.flag}</span> {pays.nom}
                  </NavLink>
                   <NavLink to={`/pays/${pays.id}/lots/nouveau`} className={subCls}>
                    <span className={styles.icon}>＋</span> Nouveau lot
                  </NavLink>
                  <NavLink to={`/pays/${pays.id}/capteurs`} className={subCls}>
                    <span className={styles.icon}>📡</span> Capteurs
                  </NavLink>
                 
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* PIED : réglages + profil + DÉCONNEXION (toujours visible) */}
      <div className={styles.footer}>
        <NavLink to="/reglages" className={linkCls}>
          <span className={styles.icon}>⚙</span> Réglages
        </NavLink>
        <button className={styles.themeBtn} onClick={toggleTheme}>
          <span className={styles.icon}>{theme === "dark" ? "🌙" : "☀"}</span>
          {theme === "dark" ? "Thème sombre" : "Thème clair"}
        </button>

        <div className={styles.profileCard}>
          <span className={styles.profileAvatar}>{initiales}</span>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>{user?.username || "Utilisateur"}</div>
            <div className={styles.profileRole}>
              {roleConfig?.icon} {roleConfig?.label}
            </div>
          </div>
        </div>

        <button
          className={styles.logoutBtn}
          onClick={handleLogout}
          title="Se déconnecter"
          style={{
            // sécurité visuelle si la classe CSS n'est pas encore définie
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            marginTop: 5,
            padding: "9px 0px",
            borderRadius: "0 ",
            border: "1px solid #5a1f1f",
            background: "#2a1212",
            color: "#ff6b6b",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <span>⎋</span> Déconnexion
        </button>
      </div>
    </nav>
  );
}