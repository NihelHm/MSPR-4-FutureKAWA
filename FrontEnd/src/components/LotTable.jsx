// ==========================================================
// COMPOSANT LOTTABLE — liste de lots (FIFO) avec capteurs & alertes
// Props :
//   lots          : tableau de lots
//   paysId        : pays courant (si absent, on tente lot._pays)
//   capteursMap   : { [lotId]: nbCapteursAffectés }
//   alerteLotIds  : Set (ou array) des ids de lots en alerte (CALCULÉS).
//                   - non fourni (undefined/null) → on fait confiance au lot.statut BDD
//                   - fourni (même vide)          → le CALCUL fait foi pour les états
//                     "en alerte" / "périmé"  (plus de contradiction compteur vs badge)
//   showPays      : affiche une colonne Pays (vue siège)
// ==========================================================

import { Link } from "react-router-dom";
import { PAYS_CONFIG, STATUT_COLORS } from "../constants/pays";

// États CALCULÉS : ne doivent JAMAIS être lus depuis la BDD (peuvent être figés/obsolètes).
// On les recalcule toujours à partir des mesures + péremption.
const STATUTS_CALCULES = new Set(["en alerte", "périmé"]);

function ageJours(dateStr) {
  if (!dateStr) return null;
  return Math.floor((new Date() - new Date(dateStr)) / 86400000);
}
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? "—" : dt.toLocaleDateString("fr-FR");
}

export default function LotTable({ lots = [], paysId, capteursMap = {}, alerteLotIds, showPays = false }) {
  // On distingue "alerteLotIds absent" (pas d'info live) de "fourni mais vide" (calcul = 0 alerte)
  const hasLiveAlertes = alerteLotIds != null;
  const alerteSet = alerteLotIds instanceof Set ? alerteLotIds : new Set(alerteLotIds || []);

  // FIFO : plus anciens d'abord
  const rows = [...lots].sort((a, b) => (a.date_stockage || "").localeCompare(b.date_stockage || ""));

  const th = { textAlign: "left", padding: "10px 12px", fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", opacity: 0.6 };
  const td = { padding: "12px", borderTop: "1px solid var(--border, #222)", fontSize: 14 };

  if (rows.length === 0) {
    return <div style={{ opacity: 0.6, padding: 16 }}>Aucun lot.</div>;
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border, #222)", borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Référence</th>
            {showPays && <th style={th}>Pays</th>}
            <th style={th}>Date stockage</th>
            <th style={th}>Ancienneté</th>
            <th style={th}>Statut</th>
            <th style={th}>Entrepôt</th>
            <th style={th}>Capteurs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((lot) => {
            const pid = paysId || lot._pays;
            const pays = PAYS_CONFIG[pid];
            const age = ageJours(lot.date_stockage);
            const perime = age != null && age > 365;
            const enAlerte = alerteSet.has(lot.id); // inclut conditions hors plage ET péremption

            // --- STATUT AFFICHÉ ---------------------------------------------
            // "en alerte" / "périmé" = états CALCULÉS → dérivés du calcul live uniquement.
            // On ne réaffiche jamais un "en alerte"/"périmé" resté figé en BDD.
            let statutAffiche;
            if (hasLiveAlertes) {
              if (perime) {
                statutAffiche = "périmé";
              } else if (enAlerte) {
                statutAffiche = "en alerte";
              } else if (lot.statut && !STATUTS_CALCULES.has(lot.statut)) {
                statutAffiche = lot.statut; // statut workflow conservé : stocké / expédié / conforme
              } else {
                statutAffiche = "stocké";
              }
            } else {
              // Pas d'info d'alerte fournie → ancien comportement : on garde le statut BDD
              statutAffiche = lot.statut || "stocké";
            }

            const sc = STATUT_COLORS[statutAffiche] || STATUT_COLORS["stocké"];
            const nbCapteurs = capteursMap[lot.id] || 0;
            const rowEnAlerte = hasLiveAlertes ? enAlerte : lot.statut === "en alerte";

            return (
              <tr key={`${pid}-${lot.id}`} style={{ background: rowEnAlerte ? "rgba(255,77,77,.06)" : "transparent" }}>
                <td style={td}>
                  <Link to={`/pays/${pid}/lots/${lot.id}`} style={{ fontWeight: 700, color: "inherit" }}>
                    {lot.reference || `#${lot.id}`}
                  </Link>
                </td>
                {showPays && <td style={td}>{pays ? `${pays.flag} ${pays.nom}` : pid}</td>}
                <td style={td}>{fmtDate(lot.date_stockage)}</td>
                <td style={td}>
                  {age == null ? "—" : (
                    <span style={{
                      padding: "2px 8px", borderRadius: 999, fontSize: 12,
                      background: age > 365 ? "rgba(255,77,77,.15)" : "rgba(116,198,157,.15)",
                      color: age > 365 ? "#ff6b6b" : "#74C69D",
                    }}>
                      {age} j{age > 365 ? " ⚠" : ""}
                    </span>
                  )}
                </td>
                <td style={td}>
                  <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, background: sc.bg, color: sc.text }}>
                    {sc.label}
                  </span>
                </td>
                <td style={{ ...td, opacity: 0.8 }}>
                  {lot.site_id != null ? (
                    <Link to={`/pays/${pid}/sites/${lot.site_id}`} style={{ color: "inherit" }}>
                      Entrepôt #{lot.site_id}
                    </Link>
                  ) : "—"}
                </td>
                <td style={td}>
                  <span title="Capteurs affectés à ce lot">📡 {nbCapteurs}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}