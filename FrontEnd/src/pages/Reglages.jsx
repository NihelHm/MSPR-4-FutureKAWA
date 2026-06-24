// ==========================================================
// PAGE RÉGLAGES — profil / rôle, apparence, conditions idéales
// (Les URLs d'API et variables d'environnement, purement techniques,
//  ne sont plus exposées à l'utilisateur — cf. point métier #6.)
// ==========================================================

import { useApp } from "../context/AppContext";
import { PAYS_LIST } from "../constants/pays";
import { PageHeader, SectionTitle, Card, Badge, Toggle } from "../components/UI";
import styles from "./Reglages.module.css";

export default function Reglages() {
  const { user, roleConfig, isAdmin, accessiblePays, theme, toggleTheme } = useApp();

  return (
    <div className={styles.page}>
      <PageHeader title="⚙ Réglages" sub="Profil et préférences d'affichage" />

      {/* Profil / rôle */}
      <section className={styles.section}>
        <SectionTitle>Mon profil</SectionTitle>
        <Card>
          <div className={styles.profileGrid}>
            <Info label="Nom" value={user?.username || "—"} />
            <Info label="Email" value={user?.email || "—"} mono />
            <Info label="Rôle">
              <Badge variant="accent">{roleConfig?.icon} {roleConfig?.label}</Badge>
            </Info>
            <Info label="Administrateur">
              <Badge variant={isAdmin ? "success" : "default"}>{isAdmin ? "Oui" : "Non"}</Badge>
            </Info>
            {!isAdmin && (
              <Info label="Pays accessibles">
                <span className={styles.paysTags}>
                  {accessiblePays.length
                    ? accessiblePays.map((p) => {
                        const c = PAYS_LIST.find((x) => x.id === p);
                        return <Badge key={p}>{c?.flag} {c?.nom}</Badge>;
                      })
                    : "Aucun"}
                </span>
              </Info>
            )}
          </div>
        </Card>
      </section>

      {/* Apparence */}
      <section className={styles.section}>
        <SectionTitle>Apparence</SectionTitle>
        <Card>
          <div className={styles.row}>
            <div>
              <div className={styles.rowTitle}>Thème {theme === "dark" ? "sombre" : "clair"}</div>
              <div className={styles.rowSub}>Basculer entre l'interface sombre et claire.</div>
            </div>
            <Toggle checked={theme === "dark"} onChange={toggleTheme} labelOn="🌙 Sombre" labelOff="☀ Clair" />
          </div>
        </Card>
      </section>

      {/* Conditions idéales par pays — information MÉTIER (pas technique) */}
      {!isAdmin && (
        <section className={styles.section}>
          <SectionTitle>Conditions idéales de stockage par pays</SectionTitle>
          <Card>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Pays</th>
                  <th>Température cible</th>
                  <th>Tolérance</th>
                  <th>Humidité cible</th>
                  <th>Tolérance</th>
                </tr>
              </thead>
              <tbody>
                {PAYS_LIST.map((p) => (
                  <tr key={p.id}>
                    <td>{p.flag} {p.nom}</td>
                    <td>{p.conditions.temperature} °C</td>
                    <td>± {p.tolerances.temperature} °C</td>
                    <td>{p.conditions.humidite} %</td>
                    <td>± {p.tolerances.humidite} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </div>
  );
}

function Info({ label, value, children, mono }) {
  return (
    <div className={styles.info}>
      <span className={styles.infoLabel}>{label}</span>
      {children || <span className={`${styles.infoValue} ${mono ? styles.mono : ""}`}>{value}</span>}
    </div>
  );
}