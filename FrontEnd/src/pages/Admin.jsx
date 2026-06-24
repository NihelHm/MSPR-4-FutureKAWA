// ==========================================================
// PAGE ADMIN — gestion des utilisateurs (backend siège, JWT admin)
// Amélioration métier : filtre + regroupement par RÔLE / périmètre pays.
// ==========================================================

import { useState, useMemo } from "react";
import { useAdminUsers } from "../hooks/useAdmin";
import { useApp } from "../context/AppContext";
import { ROLES, getRoleConfig } from "../constants/pays";
import {
  PageHeader, SectionTitle, Loader, ErrorBox, Card, Button, Badge, Toggle, Modal,
} from "../components/UI";
import styles from "./Admin.module.css";

const ROLE_OPTIONS = Object.values(ROLES);
const EMPTY_FORM = { username: "", email: "", password: "", role: "responsable_bresil", is_admin: false };

export default function Admin() {
  const { user: current } = useApp();
  const { users, loading, error, createUser, updateUser, deleteUser, toggleAdmin } = useAdminUsers();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filtreRole, setFiltreRole] = useState("tous");

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(null); setModalOpen(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ username: u.username, email: u.email, password: "", role: u.role, is_admin: u.is_admin });
    setFormError(null); setModalOpen(true);
  };
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setBusy(true); setFormError(null);
    try {
      if (editing) {
        const payload = { username: form.username, email: form.email, role: form.role, is_admin: form.is_admin };
        if (form.password) payload.password = form.password;
        await updateUser(editing.id, payload);
      } else {
        await createUser(form);
      }
      setModalOpen(false);
    } catch (err) { setFormError(err.message); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    setBusy(true);
    try { await deleteUser(id); setConfirmDelete(null); }
    catch (err) { setFormError(err.message); }
    finally { setBusy(false); }
  };

  // Filtrage + regroupement par rôle
  const usersFiltres = useMemo(
    () => (filtreRole === "tous" ? users : users.filter((u) => u.role === filtreRole)),
    [users, filtreRole]
  );
  const groupes = useMemo(() => {
    const map = {};
    usersFiltres.forEach((u) => (map[u.role] = map[u.role] || []).push?.(u) ?? (map[u.role] = [u]));
    // garantir un tableau par rôle
    Object.keys(map).forEach((k) => { if (!Array.isArray(map[k])) map[k] = [map[k]]; });
    return map;
  }, [usersFiltres]);

  const compteParRole = useMemo(() => {
    const acc = {};
    users.forEach((u) => (acc[u.role] = (acc[u.role] || 0) + 1));
    return acc;
  }, [users]);

  return (
    <div className={styles.page}>
      <PageHeader title="🛡 Administration" sub="Gestion des comptes utilisateurs">
        <Button variant="primary" onClick={openCreate}>＋ Nouvel utilisateur</Button>
      </PageHeader>

      {error && <ErrorBox message={error} />}

      {/* Filtre par rôle */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 16px" }}>
        <FiltreBtn active={filtreRole === "tous"} onClick={() => setFiltreRole("tous")}>
          Tous ({users.length})
        </FiltreBtn>
        {ROLE_OPTIONS.map((r) => (
          <FiltreBtn key={r.id} active={filtreRole === r.id} onClick={() => setFiltreRole(r.id)}>
            {r.icon} {r.label} ({compteParRole[r.id] || 0})
          </FiltreBtn>
        ))}
      </div>

      {loading ? (
        <Loader text="Chargement des utilisateurs..." />
      ) : (
        Object.keys(groupes)
          .sort()
          .map((role) => {
            const conf = getRoleConfig(role);
            const liste = groupes[role];
            return (
              <section key={role} className={styles.section} style={{ marginBottom: 20 }}>
                <SectionTitle>{conf.icon} {conf.label} — {liste.length} compte(s)</SectionTitle>
                <Card>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["#", "Nom", "Email", "Admin", "Actions"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", opacity: 0.6 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {liste.map((u) => (
                        <tr key={u.id}>
                          <td style={cell}>#{u.id}</td>
                          <td style={cell}>
                            {u.username} {u.id === current?.id && <span style={{ opacity: 0.6 }}>(vous)</span>}
                          </td>
                          <td style={{ ...cell, opacity: 0.8 }}>{u.email}</td>
                          <td style={cell}>
                            <Toggle
                              checked={u.is_admin}
                              onChange={(v) => toggleAdmin(u.id, v)}
                              disabled={u.id === current?.id}
                            />
                          </td>
                          <td style={cell}>
                            <div style={{ display: "flex", gap: 8 }}>
                              <Button size="sm" onClick={() => openEdit(u)}>✎ Modifier</Button>
                              <Button size="sm" variant="danger" onClick={() => setConfirmDelete(u)}
                                disabled={u.id === current?.id}>🗑 Supprimer</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </section>
            );
          })
      )}

      {/* Modale création / édition */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
        footer={
          <>
            <Button onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={handleSave} disabled={busy}>
              {busy ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </>
        }
      >
        {formError && <ErrorBox message={formError} />}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Champ label="Nom"><input style={inp} value={form.username} onChange={(e) => setField("username", e.target.value)} /></Champ>
          <Champ label="Email"><input style={inp} type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} /></Champ>
          <Champ label={editing ? "Mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"}>
            <input style={inp} type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} />
          </Champ>
          <Champ label="Rôle">
            <select style={inp} value={form.role} onChange={(e) => setField("role", e.target.value)}>
              {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </Champ>
          <Champ label="Administrateur">
            <Toggle checked={form.is_admin} onChange={(v) => setField("is_admin", v)} />
          </Champ>
        </div>
      </Modal>

      {/* Confirmation suppression */}
      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Confirmer la suppression"
        footer={
          <>
            <Button onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button variant="danger" onClick={() => handleDelete(confirmDelete.id)} disabled={busy}>
              Supprimer définitivement
            </Button>
          </>
        }
      >
        <p>Supprimer le compte de <strong>{confirmDelete?.username}</strong> ? Cette action est irréversible.</p>
      </Modal>
    </div>
  );
}

const cell = { padding: "10px", borderTop: "1px solid var(--border, #222)", fontSize: 14 };
const inp = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid var(--border, #2a2a2a)", background: "var(--bg-elev, #161616)", color: "inherit",
};

function FiltreBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{
        padding: "6px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
        border: "1px solid var(--border,#2a2a2a)",
        background: active ? "var(--accent,#74C69D)" : "transparent",
        color: active ? "#0a0a0a" : "inherit", fontWeight: active ? 600 : 400,
      }}>
      {children}
    </button>
  );
}

function Champ({ label, children }) {
  return (
    <label>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}