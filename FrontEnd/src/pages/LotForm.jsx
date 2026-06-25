// ==========================================================
// PAGE LOT FORM — création / édition d'un lot
// - préremplit l'entrepôt via ?site=<id>
// - permet d'AFFECTER des capteurs de l'entrepôt au lot (capteur.lot_id)
//   conformément à la hiérarchie Site → Lot → Capteur.
// - RÈGLE 1 capteur = 1 lot : un capteur déjà affecté à un AUTRE lot est
//   désactivé (impossible à cocher).
// ==========================================================

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useLots, useLot } from "../hooks/useLots";
import { useSites } from "../hooks/useSites";
import { useCapteurs } from "../hooks/useCapteurs";
import { PAYS_API } from "../services/api";
import { PAYS_CONFIG, CAPTEUR_TYPES } from "../constants/pays";
import { PageHeader, Loader, ErrorBox, Card, Button } from "../components/UI";
import styles from "./LotForm.module.css";

const STATUTS = ["stocké", "expédié"]; // "en alerte" / "périmé" sont CALCULÉS par le backend

export default function LotForm() {
  const { paysId, lotId } = useParams();
  const isEdit = Boolean(lotId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const siteFromQuery = searchParams.get("site");

  const config = PAYS_CONFIG[paysId];
  const { createLot, updateLot } = useLots(paysId);
  const { lot, loading: lotLoading } = useLot(paysId, isEdit ? lotId : null);
  const { sites } = useSites(paysId);
  const { capteurs, loading: capLoading, refetch: refetchCapteurs } = useCapteurs(paysId);

  const [form, setForm] = useState({
    reference: "",
    date_reception: "",
    date_stockage: "",
    statut: "stocké",
    site_id: siteFromQuery || "",
  });
  const [selectedCapteurs, setSelectedCapteurs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEdit && lot) {
      setForm({
        reference: lot.reference || "",
        date_reception: (lot.date_reception || "").slice(0, 10),
        date_stockage: (lot.date_stockage || "").slice(0, 10),
        statut: STATUTS.includes(lot.statut) ? lot.statut : "stocké",
        site_id: lot.site_id != null ? String(lot.site_id) : "",
      });
    }
  }, [isEdit, lot]);

  // En édition : capteurs déjà affectés à ce lot
  useEffect(() => {
    if (isEdit && lotId && capteurs.length) {
      setSelectedCapteurs(capteurs.filter((c) => String(c.lot_id) === String(lotId)).map((c) => c.id));
    }
  }, [isEdit, lotId, capteurs]);

  // Capteurs disponibles dans l'entrepôt choisi
  const capteursDuSite = useMemo(() => {
    if (!form.site_id) return [];
    return capteurs.filter((c) => String(c.site_id) === String(form.site_id));
  }, [capteurs, form.site_id]);

  // Un capteur est "pris ailleurs" s'il est déjà affecté à un AUTRE lot que celui-ci.
  const estPrisAilleurs = (c) => c.lot_id != null && String(c.lot_id) !== String(lotId);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Sécurité : on n'autorise jamais de cocher un capteur déjà pris par un autre lot.
  const toggleCapteur = (c) => {
    if (estPrisAilleurs(c)) return; // règle 1 capteur = 1 lot
    setSelectedCapteurs((prev) =>
      prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
    );
  };

  // Affecte / retire les capteurs au lot via la route dédiée /capteurs/{id}/lot
  const syncCapteurs = async (targetLotId) => {
    const api = PAYS_API[paysId];
    const dejaLies = capteurs.filter((c) => String(c.lot_id) === String(targetLotId)).map((c) => c.id);
    // Filet de sécurité supplémentaire : on ne lie jamais un capteur appartenant déjà à un autre lot.
    const idsPrisAilleurs = new Set(
      capteurs.filter((c) => c.lot_id != null && String(c.lot_id) !== String(targetLotId)).map((c) => c.id)
    );
    const aLier = selectedCapteurs.filter((id) => !dejaLies.includes(id) && !idsPrisAilleurs.has(id));
    const aDelier = dejaLies.filter((id) => !selectedCapteurs.includes(id));
    await Promise.all([
      ...aLier.map((id) => api.linkCapteurToLot(id, Number(targetLotId))),
      ...aDelier.map((id) => api.unlinkCapteur(id)),
    ]);
  };

  const handleSubmit = async () => {
    if (!form.reference.trim()) return setError("La référence du lot est obligatoire.");
    if (!form.site_id) return setError("Veuillez sélectionner un entrepôt.");
    setSaving(true);
    setError(null);
    try {
      const payload = {
        reference: form.reference.trim(),
        date_reception: form.date_reception || null,
        date_stockage: form.date_stockage || null,
        statut: form.statut,
        site_id: Number(form.site_id),
      };

      let targetLotId = lotId;
      if (isEdit) await updateLot(lotId, payload);
      else {
        const res = await createLot(payload);
        targetLotId = res?.lot?.id ?? res?.id;
      }

      if (targetLotId != null) {
        await syncCapteurs(targetLotId);
        await refetchCapteurs();
        try { await PAYS_API[paysId].recalculerStatutLot(targetLotId); } catch { /* non bloquant */ }
      }

      navigate(`/pays/${paysId}/sites/${form.site_id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!config) return <ErrorBox message={`Pays inconnu : ${paysId}`} />;
  if (isEdit && lotLoading) return <Loader text="Chargement du lot..." />;

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>← Retour</button>

      <PageHeader
        title={isEdit ? "✎ Modifier le lot" : "＋ Nouveau lot"}
        sub={`${config.flag} ${config.nom}`}
      />

      {error && <ErrorBox message={error} />}

      <Card>
        <div className={styles.formGrid}>
          <Field label="Référence">
            <input className={styles.input} value={form.reference}
              onChange={(e) => setField("reference", e.target.value)} placeholder="ex : LOT-BR-2026-001" />
          </Field>
          <Field label="Entrepôt">
            <select className={styles.input} value={form.site_id} onChange={(e) => setField("site_id", e.target.value)}>
              <option value="">— Sélectionner —</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.nom || `Entrepôt #${s.id}`}</option>)}
            </select>
          </Field>
          <Field label="Date de réception">
            <input type="date" className={styles.input} value={form.date_reception}
              onChange={(e) => setField("date_reception", e.target.value)} />
          </Field>
          <Field label="Date de stockage">
            <input type="date" className={styles.input} value={form.date_stockage}
              onChange={(e) => setField("date_stockage", e.target.value)} />
          </Field>
          <Field label="Statut">
            <select className={styles.input} value={form.statut} onChange={(e) => setField("statut", e.target.value)}>
              {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      {/* Affectation des capteurs au lot (Site → Lot → Capteur) */}
      <Card className={styles.capteurCard}>
        <h3 className={styles.subTitle}>Capteurs surveillant ce lot</h3>
        <p className={styles.subHint}>
          {form.site_id
            ? "Cochez les capteurs de l'entrepôt qui surveillent ce lot. Un capteur ne peut surveiller qu'un seul lot : ceux déjà affectés ailleurs sont désactivés."
            : "Sélectionnez d'abord un entrepôt pour voir ses capteurs."}
        </p>
        {!form.site_id ? null : capLoading ? (
          <Loader text="Chargement des capteurs..." />
        ) : capteursDuSite.length === 0 ? (
          <div className={styles.empty}>
            Aucun capteur installé sur cet entrepôt. Ajoutez-en depuis la page « Capteurs ».
          </div>
        ) : (
          <div className={styles.capteurGrid}>
            {capteursDuSite.map((c) => {
              const tc = CAPTEUR_TYPES[c.type_capteur] || { icon: "📡", label: c.type_capteur };
              const checked = selectedCapteurs.includes(c.id);
              const prisAilleurs = estPrisAilleurs(c);
              return (
                <label
                  key={c.id}
                  className={`${styles.capteurItem} ${checked ? styles.capteurChecked : ""}`}
                  aria-disabled={prisAilleurs}
                  title={prisAilleurs
                    ? "Ce capteur surveille déjà un autre lot. Un capteur ne peut être affecté qu'à un seul lot."
                    : undefined}
                  style={prisAilleurs ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={prisAilleurs}
                    onChange={() => toggleCapteur(c)}
                    style={{ cursor: prisAilleurs ? "not-allowed" : "pointer" }}
                  />
                  <span className={styles.capteurIcon}>{tc.icon}</span>
                  <span className={styles.capteurNom}>
                    {c.nom || `Capteur #${c.id}`}
                    <span className={styles.capteurType}>
                      {tc.label}{prisAilleurs ? " · déjà affecté à un autre lot" : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </Card>

      <div className={styles.actions}>
        <Button onClick={() => navigate(-1)}>Annuler</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={saving}>
          {saving ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer le lot"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}