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
        setError(err?.message || 'Failed to load profile');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMe();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="auth-shell dashboard-shell">
      <div className="auth-card app-card">
        <div className="app-card__header">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Welcome back</h1>
            <p className="muted">
              {loading
                ? 'Loading account details...'
                : me?.name || me?.email || me?.login || 'Manage your bookings and reservations'}
            </p>
          </div>
          <button className="secondary-btn" type="button" onClick={() => router.push('/exam/reservations')}>
            My bookings
          </button>
        </div>

        {error ? <div className="status-card status-card--error">{error}</div> : null}

        <div className="dashboard-grid">
          <Link className="action-card action-card--primary" href="/exam/booking">
            <span className="action-card__title">Create new booking</span>
            <span className="action-card__desc">Open the booking page directly and search new test sessions.</span>
          </Link>

          <Link className="action-card" href="/exam/reservations">
            <span className="action-card__title">My exam reservations</span>
            <span className="action-card__desc">See already booked exams and start reschedule from one page.</span>
          </Link>
        </div>
      </div>
      <style jsx>{`
        .dashboard-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #efefef;
        }
        .app-card {
          width: min(760px, 100%);
          padding: 32px;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 20px 45px rgba(10, 31, 68, 0.08);
        }
        .app-card__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
        }
        .eyebrow {
          margin: 0 0 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #5a7a7d;
        }
        h1 {
          margin: 0 0 8px;
          font-size: 36px;
          line-height: 1.1;
          color: #101728;
        }
        .muted {
          margin: 0;
          color: #5f6777;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .action-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 20px;
          border-radius: 16px;
          text-decoration: none;
          background: #f6f7f9;
          color: #101728;
          border: 1px solid #dde2ea;
        }
        .action-card--primary {
          background: #deeff0;
          border-color: #b8d8da;
        }
        .action-card__title {
          font-size: 18px;
          font-weight: 700;
        }
        .action-card__desc {
          color: #5f6777;
          line-height: 1.5;
        }
        .secondary-btn {
          min-width: 130px;
          border: 0;
          border-radius: 12px;
          padding: 12px 18px;
          background: #101728;
          color: #fff;
          cursor: pointer;
        }
        .status-card {
          margin-bottom: 16px;
          padding: 14px 16px;
          border-radius: 14px;
        }
        .status-card--error {
          background: #fff1f1;
          color: #9d2020;
        }
        @media (max-width: 640px) {
          .app-card {
            padding: 24px;
          }
          .app-card__header {
            flex-direction: column;
          }
          h1 {
            font-size: 30px;
          }
        }
      `}</style>
    </div>
  );
}
