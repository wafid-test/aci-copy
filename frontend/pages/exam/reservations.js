import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { api } from '../../lib/api';

function pickArray(payload) {
  if (Array.isArray(payload)) return payload;

  const candidates = [
    payload?.data,
    payload?.items,
    payload?.result,
    payload?.payload,
    payload?.exam_reservations,
    payload?.reservations,
    payload?.data?.items,
    payload?.data?.result,
    payload?.data?.payload,
    payload?.data?.exam_reservations,
    payload?.data?.reservations,
    payload?.result?.items,
    payload?.result?.exam_reservations,
    payload?.payload?.items,
    payload?.payload?.exam_reservations,
  ];

  for (const item of candidates) {
    if (Array.isArray(item)) return item;
  }

  return [];
}

function value(item, keys) {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== '') return item[key];
    if (item?.data?.[key] !== undefined && item?.data?.[key] !== null && item?.data?.[key] !== '') return item.data[key];
    if (item?.exam_session?.[key] !== undefined && item?.exam_session?.[key] !== null && item?.exam_session?.[key] !== '') return item.exam_session[key];
    if (item?.test_center?.[key] !== undefined && item?.test_center?.[key] !== null && item?.test_center?.[key] !== '') return item.test_center[key];
  }
  return '';
}

function getReservationId(item) {
  return value(item, ['id', 'reservation_id', 'exam_reservation_id']);
}

function getOccupationId(item) {
  return value(item, ['occupation_id']);
}

function getMethodology(item) {
  return value(item, ['methodology_type', 'methodology']) || 'in_person';
}

function getStatus(item) {
  return value(item, ['status', 'reservation_status', 'payment_status']) || 'Unknown';
}

function getDate(item) {
  return value(item, ['exam_date', 'scheduled_at', 'date', 'examDay']);
}

function getCenterName(item) {
  return (
    value(item, ['test_center_name', 'name', 'site_city', 'city']) ||
    `Site #${getSiteId(item) || '-'}`
  );
}

function getSiteId(item) {
  return value(item, ['site_id', 'id']);
}

function getLanguageCode(item) {
  return value(item, ['language_code', 'prometric_code', 'code']) || '-';
}

export default function ReservationsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState('');
  const [error, setError] = useState('');

  async function loadReservations() {
    setLoading(true);
    setError('');

    try {
      const data = await api('/api/svp/exam-reservations?locale=en');
      const reservations = pickArray(data);
      setItems(reservations);

      if (!reservations.length) {
        setError('No booked reservations found from the API for this account.');
      }
    } catch (err) {
      setItems([]);
      setError(err?.message || 'Failed to load booked reservations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReservations();
  }, []);

  async function startReschedule(item) {
    const reservationId = getReservationId(item);
    const occupationId = getOccupationId(item);

    if (!reservationId || !occupationId) {
      setError('Missing reservation ID or occupation ID');
      return;
    }

    setLoadingId(String(reservationId));
    setError('');

    try {
      await api('/api/svp/reservation-credits/use', {
        method: 'POST',
        body: {
          methodology_type: getMethodology(item),
          reservation_id: Number(reservationId),
          occupation_id: Number(occupationId),
        },
      });

      const query = new URLSearchParams({
        reschedule: '1',
        reservationId: String(reservationId),
        occupationId: String(occupationId),
        methodology: String(getMethodology(item)),
        examDate: String(getDate(item) || ''),
        siteId: String(getSiteId(item) || ''),
        siteCity: String(value(item, ['site_city', 'city']) || ''),
        languageCode: String(getLanguageCode(item) || ''),
      });

      router.push(`/exam/booking?${query.toString()}`);
    } catch (err) {
      setError(err?.message || 'Failed to start reschedule');
    } finally {
      setLoadingId('');
    }
  }

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-head">
          <div>
            <p className="eyebrow">My bookings</p>
            <h1>Booked exams</h1>
            <p className="muted">Your existing bookings should appear here automatically when the page opens.</p>
          </div>
          <div className="actions">
            <Link href="/dashboard" className="secondary-btn">
              Dashboard
            </Link>
            <button className="secondary-btn" type="button" onClick={loadReservations} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error ? <div className="status-card status-error">{error}</div> : null}

        {loading ? <div className="empty-card">Loading booked reservations...</div> : null}

        {!loading && !items.length ? (
          <div className="empty-card">
            No reservations are available to show. If you know bookings exist, the backend response shape may still need one more mapping update.
          </div>
        ) : null}

        <div className="reservation-grid">
          {items.map((item) => {
            const reservationId = getReservationId(item);

            return (
              <div className="reservation-card" key={reservationId || Math.random()}>
                <div className="reservation-top">
                  <h2>#{reservationId || '-'}</h2>
                  <span>{getStatus(item)}</span>
                </div>

                <div className="detail-list">
                  <div>
                    <span>Test center</span>
                    <strong>{getCenterName(item)}</strong>
                  </div>
                  <div>
                    <span>Exam date</span>
                    <strong>{getDate(item) || '-'}</strong>
                  </div>
                  <div>
                    <span>Occupation ID</span>
                    <strong>{getOccupationId(item) || '-'}</strong>
                  </div>
                  <div>
                    <span>Language</span>
                    <strong>{getLanguageCode(item)}</strong>
                  </div>
                  <div>
                    <span>Site ID</span>
                    <strong>{getSiteId(item) || '-'}</strong>
                  </div>
                </div>

                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => startReschedule(item)}
                  disabled={loadingId === String(reservationId)}
                >
                  {loadingId === String(reservationId) ? 'Opening...' : 'Reschedule'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .page-shell {
          min-height: 100vh;
          padding: 24px;
          background: #eef2f5;
        }
        .page-card {
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 28px;
          border-radius: 24px;
          background: #fff;
          box-shadow: 0 20px 45px rgba(10, 31, 68, 0.08);
        }
        .page-head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
        }
        .eyebrow {
          margin: 0 0 8px;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #5a7a7d;
          font-weight: 700;
        }
        h1 {
          margin: 0 0 8px;
          color: #101728;
        }
        .muted {
          margin: 0;
          color: #5f6777;
        }
        .actions {
          display: flex;
          gap: 10px;
        }
        .secondary-btn,
        .primary-btn {
          min-height: 44px;
          padding: 0 16px;
          border: 0;
          border-radius: 12px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }
        .secondary-btn {
          background: #101728;
          color: #fff;
        }
        .primary-btn {
          background: #83bcc0;
          color: #fff;
        }
        .status-card,
        .empty-card {
          padding: 14px 16px;
          border-radius: 14px;
          margin-bottom: 18px;
        }
        .status-error {
          background: #fff1f1;
          color: #9d2020;
        }
        .empty-card {
          background: #f6f7f9;
          color: #5f6777;
        }
        .reservation-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 18px;
        }
        .reservation-card {
          padding: 20px;
          border-radius: 18px;
          background: #f6f7f9;
          border: 1px solid #dde2ea;
        }
        .reservation-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 14px;
        }
        .reservation-top h2 {
          margin: 0;
          color: #101728;
        }
        .detail-list {
          display: grid;
          gap: 12px;
          margin-bottom: 16px;
        }
        .detail-list div {
          padding: 12px;
          border-radius: 12px;
          background: #fff;
        }
        .detail-list span {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          color: #5f6777;
          text-transform: uppercase;
        }
        .detail-list strong {
          color: #101728;
          word-break: break-word;
        }
        @media (max-width: 720px) {
          .page-head,
          .actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
