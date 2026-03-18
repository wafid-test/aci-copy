'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '../../../components/AuthGate';
import RoleGuard from '../../../components/RoleGuard';
import {
  createAdminUser,
  createAgency,
  listAccounts,
  logout,
  setAccountStatus,
  type Account
} from '../../../lib/access-api';

export default function Page() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [agencyForm, setAgencyForm] = useState({ name: '', email: '', password: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', agencyId: '' });

  async function loadAccounts() {
    setLoading(true);
    setError('');
    try {
      const res = await listAccounts();
      setAccounts(res.accounts);
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  const agencies = useMemo(() => accounts.filter((a) => a.role === 'AGENCY'), [accounts]);
  const users = useMemo(() => accounts.filter((a) => a.role === 'USER'), [accounts]);

  async function onCreateAgency() {
    setError('');
    try {
      await createAgency(agencyForm);
      setAgencyForm({ name: '', email: '', password: '' });
      await loadAccounts();
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to create agency');
    }
  }

  async function onCreateUser() {
    setError('');
    try {
      await createAdminUser({
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        agencyId: userForm.agencyId || undefined
      });
      setUserForm({ name: '', email: '', password: '', agencyId: '' });
      await loadAccounts();
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to create user');
    }
  }

  async function onApprove(id: string) {
    setError('');
    try {
      await setAccountStatus(id, 'ACTIVE');
      await loadAccounts();
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to approve account');
    }
  }

  async function onReject(id: string) {
    setError('');
    try {
      await setAccountStatus(id, 'BLOCKED');
      await loadAccounts();
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to reject account');
    }
  }

  return (
    <AuthGate>
      <RoleGuard role="ADMIN">
        <div style={{ padding: 24 }}>
          <h1>Admin Dashboard</h1>
          <button onClick={async () => await logout()}>Logout</button>
          {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

          <h2>Create Agency</h2>
          <input
            placeholder="Agency name"
            value={agencyForm.name}
            onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })}
          />
          <input
            placeholder="Agency email"
            value={agencyForm.email}
            onChange={(e) => setAgencyForm({ ...agencyForm, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            value={agencyForm.password}
            onChange={(e) => setAgencyForm({ ...agencyForm, password: e.target.value })}
          />
          <button onClick={onCreateAgency}>Create Agency</button>

          <h2>Create User</h2>
          <input
            placeholder="User name"
            value={userForm.name}
            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
          />
          <input
            placeholder="User email"
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
          />
          <select value={userForm.agencyId} onChange={(e) => setUserForm({ ...userForm, agencyId: e.target.value })}>
            <option value="">Direct user (no agency)</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button onClick={onCreateUser}>Create User</button>

          <h2>User Management Table</h2>
          {loading ? <p>Loading...</p> : null}
          <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Agency</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.status}</td>
                  <td>{agencies.find((a) => a.id === u.agencyId)?.name || '-'}</td>
                  <td>
                    <button disabled={u.status === 'ACTIVE'} onClick={() => onApprove(u.id)}>
                      Approve
                    </button>
                    <button disabled={u.status === 'BLOCKED'} onClick={() => onReject(u.id)}>
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RoleGuard>
    </AuthGate>
  );
}
