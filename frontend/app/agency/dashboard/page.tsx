'use client';

import { useEffect, useState } from 'react';
import AuthGate from '../../../components/AuthGate';
import RoleGuard from '../../../components/RoleGuard';
import { createAgencyUser, listAgencyUsers, logout, type Account } from '../../../lib/access-api';

export default function Page() {
  const [users, setUsers] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const res = await listAgencyUsers();
      setUsers(res.users);
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function onCreateUser() {
    setError('');
    try {
      await createAgencyUser(form);
      setForm({ name: '', email: '', password: '' });
      await loadUsers();
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to create user');
    }
  }

  return (
    <AuthGate>
      <RoleGuard role="AGENCY">
        <div style={{ padding: 24 }}>
          <h1>Agency Dashboard</h1>
          <button onClick={async () => await logout()}>Logout</button>
          {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

          <h2>Create User</h2>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button onClick={onCreateUser}>Create User</button>

          <h2>User Management Table</h2>
          {loading ? <p>Loading...</p> : null}
          <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.status}</td>
                  <td>{new Date(u.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RoleGuard>
    </AuthGate>
  );
}
