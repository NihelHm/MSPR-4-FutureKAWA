// ==========================================================
// PAGE ADMIN — gestion des utilisateurs (backend siège, JWT admin)
// Créer / modifier / supprimer + bascule du flag is_admin.
// ==========================================================

import { useState } from "react";
import { useAdminUsers } from "../hooks/useAdmin";
import { useApp } from "../context/AppContext";
import { ROLES } from "../constants/pays";
import { PageHeader, SectionTitle, Loader, ErrorBox, Card, Button, Badge, Toggle, Modal } from "../components/UI";
import styles from "./Admin.module.css";

const ROLE_OPTIONS = Object.values(ROLES);

const EMPTY_FORM = { username: "", email: "", password: "", role: "responsable_bresil", is_admin: false };

export default function Admin() {
  const { user: current } = useApp();
  const { users, loading, error, createUser, updateUser, deleteUser, toggleAdmin } = useAdminUsers();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = création
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ username: u.username, email: u.email, password: "", role: u.role, is_admin: u.is_admin });
    setFormError(null);
    setModalOpen(true);
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setBusy(true);
    setFormError(null);
    try {
      if (editing) {
        // En édition, on n'envoie le mot de passe que s'il a été saisi
        const payload = { username: form.username, email: form.email, role: form.role, is_admin: form.is_admin };
        if (form.password) payload.password = form.password;
        await updateUser(editing.id, payload);
      } else {
        await createUser(form);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    setBusy(true);
    try {
      await deleteUser(id);
      setConfirmDelete(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="🛡 Administration" sub="Gestion des comptes utilisateurs">
        <Button variant="primary" onClick={openCreate}>＋ Nouvel utilisateur</Button>
      </PageHeader>

      {error && <ErrorBox message={error} />}

      <section className={styles.section}>
        <SectionTitle>Utilisateurs ({users.length})</SectionTitle>
        {loading ? (
          <Loader text="Chargement des utilisateurs..." />
        ) : (
          <Card>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Admin</th>
                  <th className={styles.right}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const role = ROLES[u.role] || { label: u.role, icon: "•" };
                  const isSelf = current?.id === u.id;
                  return (
                    <tr key={u.id}>
                      <td className={styles.mono}>#{u.id}</td>
                      <td>{u.username}{isSelf && <span className={styles.you}> (vous)</span>}</td>
                      <td className={styles.mono}>{u.email}</td>
                      <td><Badge>{role.icon} {role.label}</Badge></td>
                      <td>
                        <Toggle
                          checked={Boolean(u.is_admin)}
                          onChange={(val) => toggleAdmin(u.id, val)}
                          disabled={isSelf}
                        />
                      </td>
                      <td className={styles.right}>
                        <div className={styles.actions}>
                          <Button size="sm" onClick={() => openEdit(u)}>✎ Modifier</Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setConfirmDelete(u)}
                            disabled={isSelf}
                          >
                            🗑 Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* Modale création / édition */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Modifier ${editing.username}` : "Nouvel utilisateur"}
        footer={
          <>
            <Button onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={handleSave} disabled={busy}>
              {busy ? "Enregistrement..." : editing ? "Enregistrer" : "Créer"}
            </Button>
          </>
        }
      >
        {formError && <ErrorBox message={formError} />}
        <div className={styles.form}>
          <Field label="Nom d'utilisateur">
            <input className={styles.input} value={form.username} onChange={(e) => setField("username", e.target.value)} />
          </Field>
          <Field label="Email">
            <input className={styles.input} type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </Field>
          <Field label={editing ? "Mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"}>
            <input className={styles.input} type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} />
          </Field>
          <Field label="Rôle">
            <select className={styles.input} value={form.role} onChange={(e) => setField("role", e.target.value)}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Administrateur">
            <Toggle checked={form.is_admin} onChange={(v) => setField("is_admin", v)} />
          </Field>
        </div>
      </Modal>

      {/* Confirmation de suppression */}
      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Confirmer la suppression"
        width={420}
        footer={
          <>
            <Button onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button variant="danger" onClick={() => handleDelete(confirmDelete.id)} disabled={busy}>
              {busy ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          Supprimer l'utilisateur <strong>{confirmDelete?.username}</strong> ({confirmDelete?.email}) ?
          Cette action est irréversible.
        </p>
      </Modal>
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
