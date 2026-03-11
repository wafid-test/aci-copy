import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import { api } from '../lib/api';

function getProfile(data) {
  return data?.user || data?.data?.user || data?.data || data || null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadMe() {
      setLoading(true);
      setError('');

      try {
        const data = await api('/api/me');
        if (!active) return;
        setMe(getProfile(data));
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Request failed');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMe();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    setError('');

    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      setError(err?.message || 'Logout failed');
    } finally {
      setLoggingOut(false);
      router.push('/auth/login');
    }
  }

  return (
    <div className="shell">
      <div className="floating-label floating-label--left">Dashboard</div>
      <Link className="floating-label floating-label--center" href="/exam/reservations">
        My booking
      </Link>
      <Link className="floating-label floating-label--right" href="/exam/booking">
        new booking
      </Link>

      <button className="logout-top" type="button" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? 'Logging out...' : 'Logout'}
      </button>

      <div className="card">
        <div className="card-head">
          <span className="badge">Dashboard</span>
          <div className="card-head__actions">
            <Link href="/exam/reservations">My bookings</Link>
            <button className="logout-inline" type="button" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>

        <div className="hero">
          <div className="hero-copy">
            <h1>Welcome back</h1>
            <p>{loading ? 'Loading your account...' : me?.email || me?.login || me?.name || 'Manage your bookings'}</p>
          </div>
          <div className="portal-card">
            <span>Portal</span>
            <strong>Booking Center</strong>
          </div>
        </div>

        {error ? <div className="error-card">{error}</div> : null}

        <div className="action-grid">
          <Link className="action-card" href="/exam/booking">
            <span className="action-icon">+</span>
            <div>
              <strong>Create new booking</strong>
              <p>Open the booking page directly and search new test sessions.</p>
            </div>
          </Link>

          <Link className="action-card" href="/exam/reservations">
            <span className="action-icon">#</span>
            <div>
              <strong>My exam reservations</strong>
              <p>See booked exams and start reschedule from one page.</p>
            </div>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .shell {
          min-height: 100vh;
          position: relative;
          padding: 160px 24px 48px;
          background: radial-gradient(circle at left, rgba(166, 208, 220, 0.45), transparent 28%),
            #eef2f5;
        }
        .floating-label,
        .logout-top {
          position: absolute;
          top: 24px;
          min-width: 180px;
          min-height: 84px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #dfe4e8;
          color: #111;
          border: 0;
          text-decoration: none;
          font-size: 18px;
          border-radius: 4px;
        }
        .floating-label--left {
          left: 180px;
        }
        .floating-label--center {
          left: 50%;
          transform: translateX(-50%);
          top: 190px;
        }
        .floating-label--right {
          right: 420px;
          top: 190px;
        }
        .logout-top {
          right: 140px;
          min-width: 130px;
          min-height: 54px;
          top: 18px;
          cursor: pointer;
        }
        .card {
          width: min(960px, 100%);
          margin: 230px auto 0;
          padding: 34px;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.86);
          box-shadow: 0 22px 55px rgba(38, 61, 89, 0.12);
        }
        .card-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 28px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 16px;
          border-radius: 999px;
          background: #d8e6e6;
          color: #36606d;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .card-head__actions {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .card-head__actions a {
          color: #5f2bb8;
          font-size: 15px;
        }
        .logout-inline {
          min-height: 46px;
          padding: 0 18px;
          border: 0;
          border-radius: 14px;
          background: linear-gradient(135deg, #ff8c85 0%, #f4738d 100%);
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }
        .hero {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: center;
          margin-bottom: 24px;
        }
        h1 {
          margin: 0 0 12px;
          font-size: 60px;
          line-height: 1;
          color: #132251;
        }
        .hero-copy p {
          margin: 0;
          color: #5f6777;
          font-size: 18px;
        }
        .portal-card {
          min-width: 240px;
          padding: 18px 24px;
          border-radius: 20px;
          background: linear-gradient(135deg, #194568 0%, #1f5d76 100%);
          color: #fff;
          box-shadow: 0 18px 34px rgba(26, 74, 107, 0.2);
        }
        .portal-card span {
          display: block;
          margin-bottom: 6px;
          color: rgba(255, 255, 255, 0.76);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 12px;
        }
        .portal-card strong {
          font-size: 30px;
        }
        .error-card {
          margin-bottom: 18px;
          padding: 16px;
          border-radius: 16px;
          background: #fff0ef;
          color: #b53f3f;
        }
        .action-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
        .action-card {
          display: flex;
          gap: 16px;
          padding: 12px 0;
          text-decoration: none;
        }
        .action-icon {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #eef0f3;
          color: #152457;
          font-size: 32px;
          font-weight: 800;
          flex: 0 0 auto;
        }
        .action-card strong {
          display: block;
          margin: 8px 0;
          color: #16265a;
          font-size: 26px;
        }
        .action-card p {
          margin: 0;
          color: #5f6777;
          font-size: 16px;
          line-height: 1.6;
        }
        @media (max-width: 1100px) {
          .floating-label,
          .logout-top {
            position: static;
            transform: none;
            margin: 0 0 12px;
          }
          .shell {
            padding-top: 24px;
          }
          .card {
            margin-top: 16px;
          }
        }
        @media (max-width: 760px) {
          .hero,
          .card-head,
          .card-head__actions,
          .action-grid {
            grid-template-columns: 1fr;
            flex-direction: column;
          }
          .action-grid {
            display: grid;
          }
          h1 {
            font-size: 42px;
          }
        }
      `}</style>
    </div>
  );
}
