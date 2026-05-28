// ==========================================================
// PAGE FORMULAIRE LOT (création + édition)
// ==========================================================

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PAYS_API } from "../services/api";
import { PAYS_CONFIG } from "../constants/pays";
import { PageHeader, Loader, ErrorBox } from "../components/UI";
import styles from "./LotForm.module.css";

const STATUTS = ["stocké", "en alerte", "périmé", "expédié"];

export default function LotForm() {
  const { paysId, lotId } = useParams();
  const navigate = useNavigate();
  const config = PAYS_CONFIG[paysId];
  const isEdit = Boolean(lotId);

  const [form, setForm] = useState({
    reference: "",
    date_reception: "",
    date_stockage: "",
    statut: "stocké",
    site_id: "",
  });
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Charger les sites du pays
  useEffect(() => {
    if (!paysId) return;
    PAYS_API[paysId]
      .getSites()
      .then(setSites)
      .catch(() => {});
  }, [paysId]);

  // En mode édition, charger le lot existant
  useEffect(() => {
    if (!isEdit || !paysId || !lotId) return;
    setLoading(true);
    PAYS_API[paysId]
      .getLot(lotId)
      .then((lot) => {
        setForm({
          reference: lot.reference || "",
          date_reception: lot.date_reception || "",
          date_stockage: lot.date_stockage || "",
          statut: lot.statut || "stocké",
          site_id: lot.site_id || "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isEdit, paysId, lotId]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.reference || !form.site_id) {
      setError("La référence et le site sont obligatoires.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        site_id: parseInt(form.site_id),
        date_reception: form.date_reception || null,
        date_stockage: form.date_stockage || null,
      };
      if (isEdit) {
        await PAYS_API[paysId].updateLot(lotId, payload);
      } else {
        await PAYS_API[paysId].createLot(payload);
      }
      setSuccess(true);
      setTimeout(() => navigate(`/pays/${paysId}`), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!config) return <ErrorBox message={`Pays inconnu : ${paysId}`} />;
  if (loading) return <Loader text="Chargement du lot..." />;

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>← Retour</button>

      <PageHeader
        title={isEdit ? "Modifier le lot" : "Nouveau lot"}
        sub={`${config.flag} ${config.nom}`}
      />

      {error && <ErrorBox message={error} />}

      {success && (
        <div className={styles.successBanner}>
          ✓ Lot {isEdit ? "modifié" : "créé"} avec succès — redirection...
        </div>
      )}

      <div className={styles.formCard}>
        <div className={styles.formGrid}>

          <div className={styles.field}>
            <label className={styles.label}>Référence *</label>
            <input
              className={styles.input}
              name="reference"
              type="text"
              placeholder="ex: LOT-BR-042"
              value={form.reference}
              onChange={handleChange}
            />
            <span className={styles.hint}>Identifiant unique du lot</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Statut</label>
            <select
              className={styles.input}
              name="statut"
              value={form.statut}
              onChange={handleChange}
            >
              {STATUTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Date de réception</label>
            <input
              className={styles.input}
              name="date_reception"
              type="date"
              value={form.date_reception}
              onChange={handleChange}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Date de stockage</label>
            <input
              className={styles.input}
              name="date_stockage"
              type="date"
              value={form.date_stockage}
              onChange={handleChange}
            />
            <span className={styles.hint}>Utilisée pour le calcul FIFO et la péremption (365j)</span>
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label}>Site / Entrepôt *</label>
            <select
              className={styles.input}
              name="site_id"
              value={form.site_id}
              onChange={handleChange}
            >
              <option value="">-- Sélectionner un site --</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} — {s.nom} {s.localisation ? `(${s.localisation})` : ""}
                </option>
              ))}
            </select>
            {sites.length === 0 && (
              <span className={styles.hintWarn}>
                ⚠ Aucun site disponible — vérifiez la connexion au backend
              </span>
            )}
          </div>

        </div>

        {/* Résumé */}
        {form.reference && form.site_id && (
          <div className={styles.preview}>
            <div className={styles.previewLabel}>Aperçu du lot</div>
            <div className={styles.previewContent}>
              <span className={styles.previewRef}>{form.reference}</span>
              <span className={styles.previewSep}>·</span>
              <span>{config.flag} {config.nom}</span>
              <span className={styles.previewSep}>·</span>
              <span className={styles.previewStatut}>{form.statut}</span>
              {form.date_stockage && (
                <>
                  <span className={styles.previewSep}>·</span>
                  <span>Stocké le {new Date(form.date_stockage).toLocaleDateString("fr-FR")}</span>
                </>
              )}
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            Annuler
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting || success}
          >
            {submitting ? "Enregistrement..." : isEdit ? "Modifier le lot" : "Créer le lot"}
          </button>
        </div>
      </div>
    </div>
  );
}
