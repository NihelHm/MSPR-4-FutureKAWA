// ==========================================================
// PAGE RÉGLAGES
// ==========================================================

import { useApp } from "../context/AppContext";
import { PAYS_CONFIG } from "../constants/pays";
import { PageHeader, SectionTitle } from "../components/UI";
import styles from "./Reglages.module.css";

function ThemePreview({ type }) {
  const isDark = type === "dark";
  return (
    <div className={`${styles.preview} ${isDark ? styles.previewDark : styles.previewLight}`}>
      <div className={styles.previewSidebar} />
      <div className={styles.previewContent}>
        <div className={styles.previewCard} />
        <div className={styles.previewCard} />
        <div className={styles.previewCard} />
      </div>
    </div>
  );
}

export default function Reglages() {
  const { user, theme, toggleTheme } = useApp();
  const pays = user?.role !== "siege" ? PAYS_CONFIG[user?.role] : null;

  return (
    <div className={styles.page}>
      <PageHeader title="Réglages" sub="Préférences de l'interface" />

      {/* Thème */}
      <section className={styles.section}>
        <SectionTitle>Apparence</SectionTitle>

        <div className={styles.themeGrid}>
          <button
            className={`${styles.themeOption} ${theme === "dark" ? styles.themeSelected : ""}`}
            onClick={() => theme !== "dark" && toggleTheme()}
          >
            <ThemePreview type="dark" />
            <div className={styles.themeLabel}>
              <span className={styles.themeName}>Sombre</span>
              <span className={styles.themeDesc}>Fond noir, accents verts — monitoring professionnel</span>
            </div>
            {theme === "dark" && <span className={styles.themeCheck}>✓ Actif</span>}
          </button>

          <button
            className={`${styles.themeOption} ${theme === "light" ? styles.themeSelected : ""}`}
            onClick={() => theme !== "light" && toggleTheme()}
          >
            <ThemePreview type="light" />
            <div className={styles.themeLabel}>
              <span className={styles.themeName}>Café</span>
              <span className={styles.themeDesc}>Beige chaud, brun café, blanc cassé — ambiance terrain</span>
            </div>
            {theme === "light" && <span className={styles.themeCheck}>✓ Actif</span>}
          </button>
        </div>
      </section>

      {/* Informations du compte */}
      <section className={styles.section}>
        <SectionTitle>Compte</SectionTitle>
        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Nom</span>
            <span className={styles.infoVal}>{user?.nom || "—"}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoVal}>{user?.email || "—"}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Rôle</span>
            <span className={styles.infoVal}>
              {pays ? `${pays.flag} Responsable ${pays.nom}` : "◈ Direction Siège"}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Accès</span>
            <span className={styles.infoVal}>
              {pays ? pays.nom : "Tous les pays"}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Connecté depuis</span>
            <span className={styles.infoVal}>
              {user?.loginAt
                ? new Date(user.loginAt).toLocaleString("fr-FR")
                : "—"}
            </span>
          </div>
        </div>
      </section>

      {/* Backends */}
      <section className={styles.section}>
        <SectionTitle>Configuration backends</SectionTitle>
        <div className={styles.infoCard}>
          {Object.values(PAYS_CONFIG).map((p) => (
            <div key={p.id} className={styles.infoRow}>
              <span className={styles.infoLabel}>{p.flag} {p.nom}</span>
              <span className={styles.infoVal} style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                {p.baseUrl}
              </span>
            </div>
          ))}
        </div>
        <p className={styles.hint}>
          Pour modifier les URLs, éditez <code>src/constants/pays.js</code>
        </p>
      </section>

      {/* Conditions idéales */}
      <section className={styles.section}>
        <SectionTitle>Seuils de conservation par pays</SectionTitle>
        <div className={styles.seuilsGrid}>
          {Object.values(PAYS_CONFIG).map((p) => (
            <div key={p.id} className={styles.seuilCard}>
              <div className={styles.seuilHeader}>
                <span className={styles.seuilFlag}>{p.flag}</span>
                <span className={styles.seuilNom}>{p.nom}</span>
              </div>
              <div className={styles.seuilRow}>
                <span className={styles.seuilLabel}>🌡 Température</span>
                <span className={styles.seuilVal}>
                  {p.conditions.temperature}°C ± {p.tolerances.temperature}°C
                </span>
              </div>
              <div className={styles.seuilRow}>
                <span className={styles.seuilLabel}>💧 Humidité</span>
                <span className={styles.seuilVal}>
                  {p.conditions.humidite}% ± {p.tolerances.humidite}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
