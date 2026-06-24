// ==========================================================
// COMPOSANT ALERTELIST — affiche une liste d'alertes calculées
// Forme d'une alerte : { type, message, _pays, site_id?, lot_id?, date_alerte }
// ==========================================================

import { Link } from "react-router-dom";
import { PAYS_CONFIG, ALERTE_TYPES } from "../constants/pays";

function fmt(d) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt) ? "" : dt.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AlerteList({ alertes = [], showPays = false, limit }) {
  const liste = limit ? alertes.slice(0, limit) : alertes;

  if (liste.length === 0) {
    return (
      <div style={{ opacity: 0.6, padding: 16, border: "1px dashed var(--border,#222)", borderRadius: 12 }}>
        ✓ Aucune alerte active. Toutes les conditions sont dans les plages idéales.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {liste.map((a) => {
        const t = ALERTE_TYPES[a.type] || { icon: "⚠", label: a.type };
        const pays = PAYS_CONFIG[a._pays];
        const cibleLink = a.lot_id != null
          ? `/pays/${a._pays}/lots/${a.lot_id}`
          : a.site_id != null
          ? `/pays/${a._pays}/sites/${a.site_id}`
          : null;

        return (
          <div key={a.id}
            style={{
              display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px",
              borderRadius: 10, border: "1px solid rgba(255,77,77,.25)", background: "rgba(255,77,77,.06)",
            }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {t.label}
                {showPays && pays && <span style={{ opacity: 0.7, fontWeight: 400 }}> · {pays.flag} {pays.nom}</span>}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{a.message}</div>
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                {fmt(a.date_alerte)}
                {cibleLink && (
                  <>
                    {" · "}
                    <Link to={cibleLink} style={{ color: "inherit" }}>voir le détail →</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}