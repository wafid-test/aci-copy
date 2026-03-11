import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../lib/api';

export default function Dashboard() {
  const [out, setOut] = useState('');
  const [me, setMe] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) router.push('/auth/login');
  }, [router]);

  async function call(path, opts) {
    setOut('Loading...');
    try {
      const res = await api(path, opts);
      setOut(JSON.stringify(res, null, 2));
      if (path === '/api/me') setMe(res.user);
    } catch (err) {
      setOut(JSON.stringify(err.data || err.message, null, 2));
    }
  }

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('accessToken');
    setMe(null);
    router.push('/auth/login');
  }

  return (
    <div className="app-shell">
      <div className="app-panel app-panel-wide">
        <div className="page-header">
          <div>
            <p className="eyebrow">SVP workspace</p>
            <h1>Dashboard</h1>
            <p className="page-copy">Manage authentication, inspect live proxy endpoints, and launch the booking flow from one place.</p>
          </div>
          <div className="page-actions">
            <a className="text-link" href="/exam/booking">Open booking page</a>
            <button className="secondary-button" onClick={logout}>Logout</button>
          </div>
        </div>

        {me && (
          <div className="info-banner">
            <span>Signed in as</span>
            <strong>{me.fullName || me.login}</strong>
          </div>
        )}

        <div className="section-card">
          <div className="section-title-row">
            <h2>Quick actions</h2>
            <p className="section-copy">
              Access token is auto-loaded from localStorage. If it expires, the client calls
              <code> /api/auth/refresh </code>
              and retries once.
            </p>
          </div>

          <div className="action-grid">
            <button className="primary-button" onClick={() => router.push('/exam/booking')}>Create new booking</button>
            <button className="secondary-button" onClick={() => call('/api/me')}>Load profile</button>
            <button className="secondary-button" onClick={() => call('/api/svp/permissions')}>Permissions</button>
            <button className="secondary-button" onClick={() => call('/api/svp/occupations')}>Occupations</button>
          </div>
        </div>

        <div className="section-card">
          <div className="section-title-row">
            <h2>Output</h2>
            <p className="section-copy">Latest backend response or error payload.</p>
          </div>
          <pre className="output-panel">{out || 'No requests run yet.'}</pre>
        </div>
      </div>
    </div>
  );
}
