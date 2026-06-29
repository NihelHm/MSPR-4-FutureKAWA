// ==========================================================
// PAGE CAPTEURS — capteurs d'un pays, regroupés par entrepôt
// - Création d'un capteur (POST /capteurs) — point #12
// - Garde "bon pays" : vérifie que le backend interrogé sert bien le pays
//   sélectionné (détecte une inversion de ports/bases) — point #10
// ==========================================================

import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSites } from "../hooks/useSites";
import { useCapteurs } from "../hooks/useCapteurs";
import { PAYS_API } from "../services/api";
import { PAYS_CONFIG, CAPTEUR_TYPES } from "../constants/pays";
import { PageHeader, SectionTitle, Loader, ErrorBox, Card, Button, Badge } from "../components/UI";

// Normalise (minuscules + sans accents) pour comparer des noms de pays
const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function Capteurs() {
  const { paysId } = useParams();
  const config = PAYS_CONFIG[paysId];

  const { sites, loading: sitesLoading } = useSites(paysId);
  const { capteurs, loading: capLoading, error, refetch } = useCapteurs(paysId);

  // Garde anti-inversion : le backend sert-il bien le pays attendu ?
  const [mismatch, setMismatch] = useState(null);
  useEffect(() => {
    let ok = true;
    PAYS_API[paysId]
      .ping()
      .then((r) => {
        const servi = r?.message || "";
        if (ok && config && !norm(servi).includes(norm(config.nom))) {
          setMismatch(servi);
        } else if (ok) {
          setMismatch(null);
        }
      })
      .catch(() => {});
    return () => { ok = false; };
  }, [paysId, config]);

  // Création
  const [form, setForm] = useState({ nom: "", type_capteur: "temperature", site_id: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const capteursParSite = useMemo(() => {
    const map = {};
    capteurs.forEach((c) => {
      (map[c.site_id] = map[c.site_id] || []).push(c);
    });
    return map;
  }, [capteurs]);

  const handleCreate = async () => {
    if (!form.nom.trim()) return setCreateError("Le nom du capteur est obligatoire.");
    if (!form.site_id) return setCreateError("Veuillez choisir un entrepôt.");
    setCreating(true);
    setCreateError(null);
    try {
      await PAYS_API[paysId].createCapteur({
        nom: form.nom.trim(),
        type_capteur: form.type_capteur,
        site_id: Number(form.site_id),
      });
      setForm({ nom: "", type_capteur: "temperature", site_id: "" });
      await refetch();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (!config) return <ErrorBox message={`Pays inconnu : ${paysId}`} />;

  const input = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid var(--border, #2a2a2a)", background: "var(--bg-elev, #161616)",
    color: "inherit",
  };

  return (
  <div style={{ maxWidth: 1700, margin: "3% 2% " }}>
    <PageHeader title={`📡 Capteurs — ${config.flag} ${config.nom}`} sub="Capteurs IoT par entrepôt" />
      {mismatch && (
        <ErrorBox
          message={`Attention : le backend interrogé pour « ${config.nom} » répond « ${mismatch} ». Les pays/ports sont probablement inversés dans la configuration (.env / docker-compose). Vérifiez VITE_URL_${paysId.toUpperCase()} et le mapping des conteneurs.`}
        />
      )}
      {error && <ErrorBox message={error} />}

      {/* Création d'un capteur */}
      <Card>
        <SectionTitle>Ajouter un capteur</SectionTitle>
        {createError && <ErrorBox message={createError} />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Nom</div>
            <input style={input} value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              placeholder="ex : Capteur Température 2" />
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Type</div>
            <select style={input} value={form.type_capteur}
              onChange={(e) => setForm((f) => ({ ...f, type_capteur: e.target.value }))}>
              <option value="temperature">Température</option>
              <option value="humidite">Humidité</option>
            </select>
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Entrepôt</div>
            <select style={input} value={form.site_id}
              onChange={(e) => setForm((f) => ({ ...f, site_id: e.target.value }))}>
              <option value="">— Sélectionner —</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.nom || `Entrepôt #${s.id}`}</option>)}
            </select>
          </label>
          <Button variant="primary" onClick={handleCreate} disabled={creating}>
            {creating ? "Ajout..." : "＋ Ajouter"}
          </Button>
        </div>
        <p style={{ fontSize: 12, opacity: 0.6, marginTop: 10 }}>
          Le capteur est installé dans l'entrepôt. Affectez-le ensuite à un lot depuis le formulaire du lot
          (hiérarchie Entrepôt → Lot → Capteur).
        </p>
      </Card>

      <section style={{ marginTop: 24 }}>
        <SectionTitle>Capteurs installés ({capteurs.length})</SectionTitle>
        {sitesLoading || capLoading ? (
          <Loader text="Chargement des capteurs..." />
        ) : sites.length === 0 ? (
          <div style={{ opacity: 0.6 }}>Aucun entrepôt pour ce pays.</div>
        ) : (
          sites.map((site) => {
            const liste = capteursParSite[site.id] || [];
            return (
              <Card key={site.id} className="" >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong>🏭 {site.nom || `Entrepôt #${site.id}`}</strong>
                  <Link to={`/pays/${paysId}/sites/${site.id}`} style={{ fontSize: 13, opacity: 0.8 }}>
                    Voir l'entrepôt →
                  </Link>
                </div>
                {liste.length === 0 ? (
                  <div style={{ opacity: 0.6, fontSize: 14 }}>Aucun capteur installé.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {liste.map((c) => {
                      const tc = CAPTEUR_TYPES[c.type_capteur] || { icon: "📡", label: c.type_capteur };
                      return (
                        <div key={c.id}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid var(--border,#222)" }}>
                          <span style={{ fontSize: 18 }}>{tc.icon}</span>
                          <span style={{ flex: 1 }}>
                            {c.nom || `Capteur #${c.id}`}{" "}
                            <span style={{ opacity: 0.6, fontSize: 12 }}>· {tc.label}</span>
                          </span>
                          {c.lot_id != null ? (
                            <Badge variant="success">Affecté au lot #{c.lot_id}</Badge>
                          ) : (
                            <Badge variant="default">Non affecté</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}