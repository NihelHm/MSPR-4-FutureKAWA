// ==========================================================
// COMPOSANT NAVBAR — responsive (tiroir mobile + barre supérieure)
// ==========================================================

import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { PAYS_CONFIG } from "../constants/pays";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { user, logout, roleConfig, accessiblePays, isAdmin, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Ferme le tiroir à chaque changement de page (mobile)
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Bloque le scroll de la page quand le tiroir est ouvert (mobile)
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
    <>
      {/* BARRE SUPÉRIEURE — visible uniquement sur mobile */}
      <header className={styles.topbar}>
        <button
          className={styles.hamburger}
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <span /><span /><span />
        </button>
        <div className={styles.topbarBrand}>
          <span className={styles.logoSm}>FK</span>
          <span className={styles.topbarName}>FutureKawa</span>
        </div>
      </header>

      {/* VOILE SOMBRE derrière le tiroir — mobile */}
      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}

      <nav className={`${styles.nav} ${open ? styles.navOpen : ""}`}>
        <div className={styles.brand}>
          <span className={styles.logo}>FK</span>
          <div>
            <div className={styles.brandName}>FutureKawa</div>
            <div className={styles.brandSub}>Monitoring &amp; Stocks</div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
          >
            ✕
          </button>
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

        {/* PIED : réglages + profil + DÉCONNEXION */}
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

          <button className={styles.logoutBtn} onClick={handleLogout} title="Se déconnecter">
            <span>⎋</span> Déconnexion
          </button>
        </div>
      </nav>
    </>
  );
}