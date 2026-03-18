import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import { api } from '../lib/api';
import AuthGate from '../components/AuthGate';

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(normalized);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function ExistingDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const payload = decodeJwtPayload(token);
    setMe(payload ? { login: payload.login || 'User' } : { login: 'User' });
    setLoading(false);
  }, [router]);

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
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" />
          <div>
            <strong>Professional</strong>
            <span>Accreditation</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link className="nav-item nav-item--active" href="/dashboard">
            Account Dashboard
          </Link>
          <Link className="nav-item" href="/exam/reservations">
            My bookings
          </Link>
          <Link className="nav-item" href="/exam/booking">
            New booking
          </Link>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar__locale">العربية</div>
          <div className="topbar__user">
            <div className="avatar" />
            <div>
              <strong>{loading ? 'Loading...' : me?.name || me?.login || 'User'}</strong>
              <span>{me?.role || 'Labor'}</span>
            </div>
            <button className="logout-btn" type="button" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </header>

        <section className="hero">
          <div className="hero__copy">
            <h1>Advance your career through professional accreditation</h1>
            <p>
              Use your dashboard to manage bookings, review current reservations, and continue your accreditation
              process from one place.
            </p>
            <Link className="hero__cta" href="/exam/booking">
              Start Verification
            </Link>
          </div>

          <div className="hero__steps">
            <div className="step"><span>1</span><strong>Select your occupation</strong></div>
            <div className="step"><span>2</span><strong>Enter your data</strong></div>
            <div className="step"><span>3</span><strong>Review and confirm your information</strong></div>
            <div className="step"><span>4</span><strong>Pay for the verification</strong></div>
          </div>
        </section>

        {error ? <div className="error-card">{error}</div> : null}

        <section className="content">
          <div className="tabs">
            <span className="tabs__item tabs__item--active">Bookings</span>
            <span className="tabs__item">Requests</span>
          </div>

          <div className="booking-card">
            <div className="booking-card__head">
              <div>
                <span className="label">Occupation</span>
                <h2>Manage your exam bookings</h2>
              </div>
              <div className="booking-card__actions">
                <Link className="action-btn action-btn--primary" href="/exam/booking">
                  New booking
                </Link>
                <Link className="action-btn" href="/exam/reservations">
                  View details
                </Link>
              </div>
            </div>

            <div className="booking-card__grid">
              <div>
                <span className="label">Account</span>
                <strong>{loading ? 'Loading...' : me?.email || me?.login || '-'}</strong>
              </div>
              <div>
                <span className="label">Booking status</span>
                <strong className="success-dot">Ready</strong>
              </div>
              <div>
                <span className="label">Methodology</span>
                <strong>Direct Assessment</strong>
              </div>
              <div>
                <span className="label">Actions</span>
                <strong>Book, review, reschedule</strong>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .dashboard-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 246px minmax(0, 1fr);
          background: #f3f5f7;
          color: #23324d;
        }
        .sidebar {
          background: #fff;
          border-right: 1px solid #e0e6eb;
          padding: 28px 18px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 56px;
        }
        .brand-mark {
          width: 42px;
          height: 26px;
          border-radius: 0 20px 20px 20px;
          background: linear-gradient(135deg, #0b8c93 0%, #f49a20 100%);
        }
        .brand strong,
        .brand span {
          display: block;
          line-height: 1.15;
        }
        .brand strong {
          font-size: 15px;
        }
        .brand span {
          color: #0b8c93;
          font-size: 14px;
        }
        .sidebar-nav {
          display: grid;
          gap: 14px;
        }
        .nav-item {
          padding: 14px 16px;
          border-radius: 8px;
          text-decoration: none;
          color: #3c475b;
          font-weight: 600;
        }
        .nav-item--active {
          background: #127d87;
          color: #fff;
        }
        .main {
          padding: 0 0 36px;
        }
        .topbar {
          min-height: 62px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 18px;
          padding: 0 30px;
          background: #fff;
          border-bottom: 1px solid #e0e6eb;
        }
        .topbar__locale {
          color: #67748a;
          font-weight: 600;
        }
        .topbar__user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .topbar__user strong,
        .topbar__user span {
          display: block;
        }
        .topbar__user span {
          color: #8a95a6;
          font-size: 14px;
        }
        .avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #d5d9df;
        }
        .logout-btn {
          min-height: 40px;
          padding: 0 16px;
          border: 0;
          border-radius: 10px;
          background: #f06473;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }
        .hero {
          margin: 0 0 26px;
          padding: 48px 32px 42px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 344px;
          gap: 28px;
          background:
            radial-gradient(circle at left bottom, rgba(101, 203, 205, 0.24), transparent 30%),
            radial-gradient(circle at right top, rgba(113, 230, 220, 0.18), transparent 26%),
            linear-gradient(135deg, #0b8b91 0%, #1d6f76 52%, #3a8e90 100%);
          color: #fff;
        }
        .hero__copy h1 {
          max-width: 680px;
          margin: 0 0 20px;
          font-size: 32px;
          line-height: 1.2;
        }
        .hero__copy p {
          max-width: 760px;
          margin: 0 0 30px;
          font-size: 17px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.92);
        }
        .hero__cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 200px;
          min-height: 46px;
          border-radius: 6px;
          background: #fff;
          color: #117983;
          text-decoration: none;
          font-weight: 700;
        }
        .hero__steps {
          padding: 18px 20px;
          border-radius: 14px;
          background: rgba(40, 89, 95, 0.28);
          backdrop-filter: blur(2px);
        }
        .step {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }
        .step:last-child {
          margin-bottom: 0;
        }
        .step span {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 2px solid rgba(255, 255, 255, 0.8);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }
        .step strong {
          font-size: 16px;
          line-height: 1.4;
        }
        .error-card {
          margin: 0 40px 20px;
          padding: 14px 16px;
          border-radius: 12px;
          background: #fff1f1;
          color: #b43c3c;
        }
        .content {
          padding: 0 40px;
        }
        .tabs {
          display: flex;
          gap: 18px;
          margin-bottom: 16px;
          padding-left: 10px;
          border-bottom: 1px solid #d8dee6;
        }
        .tabs__item {
          padding: 10px 0;
          color: #5f6777;
        }
        .tabs__item--active {
          color: #127d87;
          border-bottom: 2px solid #127d87;
          margin-bottom: -1px;
        }
        .booking-card {
          padding: 20px;
          border: 1px solid #d6dde6;
          border-radius: 12px;
          background: #fff;
        }
        .booking-card__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 18px;
          border-bottom: 1px solid #e2e8ef;
        }
        .label {
          display: block;
          margin-bottom: 8px;
          color: #6d788a;
          font-size: 14px;
        }
        .booking-card__head h2 {
          margin: 0;
          font-size: 22px;
          color: #24324d;
        }
        .booking-card__actions {
          display: flex;
          gap: 12px;
        }
        .action-btn {
          min-height: 40px;
          padding: 0 18px;
          border-radius: 6px;
          border: 1px solid #ccd5de;
          color: #1d5c7a;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }
        .action-btn--primary {
          background: #127d87;
          border-color: #127d87;
          color: #fff;
        }
        .booking-card__grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          padding-top: 18px;
        }
        .booking-card__grid strong {
          color: #1f2b43;
          font-size: 18px;
        }
        .success-dot {
          color: #1a8b4f;
        }
        @media (max-width: 1100px) {
          .hero,
          .booking-card__grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 820px) {
          .dashboard-shell {
            grid-template-columns: 1fr;
          }
          .sidebar {
            border-right: 0;
            border-bottom: 1px solid #e0e6eb;
          }
          .hero,
          .booking-card__grid,
          .booking-card__head {
            grid-template-columns: 1fr;
            flex-direction: column;
          }
          .content,
          .hero {
            padding-left: 20px;
            padding-right: 20px;
          }
          .error-card {
            margin-left: 20px;
            margin-right: 20px;
          }
        }
      `}</style>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <ExistingDashboardPage />
    </AuthGate>
  );
}
