// ==========================================================
// HOOK useAdmin — administration des utilisateurs (backend siège)
// ==========================================================

import { useState, useEffect, useCallback } from "react";
import { adminAPI } from "../services/api";

export function useAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAPI.listUsers();
      setUsers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (data) => {
    const res = await adminAPI.createUser(data);
    await fetchUsers();
    return res;
  };

  const updateUser = async (id, data) => {
    const res = await adminAPI.updateUser(id, data);
    await fetchUsers();
    return res;
  };

  const deleteUser = async (id) => {
    await adminAPI.deleteUser(id);
    await fetchUsers();
  };

  const toggleAdmin = async (id, isAdmin) => {
    await adminAPI.setAdmin(id, isAdmin);
    await fetchUsers();
  };

  return { users, loading, error, refetch: fetchUsers, createUser, updateUser, deleteUser, toggleAdmin };
}
