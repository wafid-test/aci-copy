import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { api } from '../../lib/api';

function pickArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.exam_reservations)) return payload.exam_reservations;
  if (Array.isArray(payload?.data?.exam_reservations)) return payload.data.exam_reservations;
  return [];
}

function getReservationId(item) {
  return item?.id || item?.reservation_id || item?.exam_reservation_id || item?.data?.id || '';
}

function getOccupationId(item) {
  return (
    item?.occupation_id ||
    item?.occupation?.id ||
    item?.occupation?.occupation_id ||
    item?.reservation?.occupation_id ||
    ''
  );
}

function getMethodology(item) {
  return (
    item?.methodology_type ||
    item?.methodology ||
    item?.exam_session?.methodology_type ||
    item?.exam_session?.methodology ||
    'in_person'
  );
}

function getStatus(item) {
  return item?.status || item?.payment_status || item?.reservation_status || 'Unknown';
}

function getLanguage(item) {
  return item?.language_code || item?.language?.code || item?.prometric_code || '-';
}

function getSiteName(item) {
  return (
    item?.test_center_name ||
    item?.test_center?.name ||
    item?.test_center?.test_center_name ||
    item?.exam_session?.test_center_name ||
    item?.exam_session?.test_center?.name ||
    item?.site_city ||
    '-'
  );
}

function getSiteId(item) {
  return (
    item?.site_id ||
    item?.test_center?.site_id ||
    item?.exam_session?.site_id ||
    item?.exam_session?.test_center?.site_id ||
    ''
  );
}

function getExamDate(item) {
  return (
    item?.exam_date ||
    item?.scheduled_at ||
    item?.date ||
    item?.exam_session?.date ||
    item?.exam_session?.exam_date ||
    ''
  );
}

function getReservationPayload(item) {
  const reservationId = getReservationId(item);
  const occupationId = getOccupationId(item);

  return {
    reservationId,
    occupationId,
    methodology: getMethodology(item),
    siteId: getSiteId(item),
    siteName: getSiteName(item),
    examDate: getExamDate(item),
    languageCode: getLanguage(item),
    categoryId: item?.category_id || item?.exam_session?.category_id || '',
  };
}

export default function ReservationDashboardPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rescheduleLoadingId, setRescheduleLoadingId] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function loadReservations() {
    setLoading(true);
    setError('');

    try {
      const data = await api('/api/svp/exam-reservations');
      const items = pickArray(data);
      setReservations(items);
      if (items[0] && !selectedId) {
        setSelectedId(String(getReservationId(items[0])));
      }
    } catch (err) {
      setError(err?.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReservations();
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDetails() {
      if (!selectedId) {
        setSelectedDetails(null);
        return;
      }

      setDetailLoading(true);

      try {
        const data = await api(`/api/svp/exam-reservations/${selectedId}`);
        if (!active) return;
        setSelectedDetails(data?.data || data);
      } catch (err) {
        if (!active) return;
        setSelectedDetails(null);
        setError(err?.message || 'Failed to load reservation details');
      } finally {
        if (active) setDetailLoading(false);
      }
    }

    loadDetails();

    return () => {
      active = false;
    };
  }, [selectedId]);

  async function startReschedule(item) {
    const payload = getReservationPayload(item);

    if (!payload.reservationId || !payload.occupationId) {
      setError('Missing reservation_id or occupation_id for reschedule');
      return;
    }

    setRescheduleLoadingId(String(payload.reservationId));
    setStatus('');
    setError('');

    try {
      await api('/api/svp/reservation-credits/use', {
        method: 'POST',
        body: {
          methodology_type: payload.methodology,
          reservation_id: Number(payload.reservationId),
          occupation_id: Number(payload.occupationId),
        },
      });

      const query = new URLSearchParams({
        reschedule: '1',
        reservationId: String(payload.reservationId),
        occupationId: String(payload.occupationId),
        methodology: String(payload.methodology || 'in_person'),
        categoryId: String(payload.categoryId || ''),
        languageCode: String(payload.languageCode || ''),
        siteId: String(payload.siteId || ''),
        siteName: String(payload.siteName || ''),
        examDate: String(payload.examDate || ''),
      });

      setStatus(`Reschedule credit ready for reservation #${payload.reservationId}`);
      router.push(`/exam/booking?${query.toString()}`);
    } catch (err) {
      setError(err?.message || 'Failed to start reschedule');
    } finally {
      setRescheduleLoadingId('');
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card app-card reservation-page">
        <div className="app-card__header">
          <div>
            <p className="eyebrow">Exam reservations</p>
            <h1>My booked exams</h1>
            <p className="muted">See booked reservations and start reschedule directly from this page.</p>
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-btn" href="/dashboard">
              Dashboard
            </Link>
            <Link className="primary-btn" href="/exam/booking">
              Create new booking
            </Link>
          </div>
        </div>

        {status ? <div className="status-card status-card--success">{status}</div> : null}
        {error ? <div className="status-card status-card--error">{error}</div> : null}

        <div className="reservation-layout">
          <div className="reservation-list-card">
            <div className="list-card__header">
              <h2>Reservations</h2>
              <button className="secondary-btn" type="button" onClick={loadReservations} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {loading ? <p className="muted">Loading reservations...</p> : null}
            {!loading && reservations.length === 0 ? <p className="muted">No reservations found.</p> : null}

            <div className="reservation-list">
              {reservations.map((item) => {
                const reservationId = String(getReservationId(item));
                const selected = reservationId === selectedId;
                return (
                  <button
                    key={reservationId}
                    className={`reservation-item${selected ? ' reservation-item--active' : ''}`}
                    type="button"
                    onClick={() => setSelectedId(reservationId)}
                  >
                    <span className="reservation-item__top">
                      <strong>#{reservationId}</strong>
                      <span>{getStatus(item)}</span>
                    </span>
                    <span>{getSiteName(item)}</span>
                    <span>{getExamDate(item) || 'Date not available'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="reservation-detail-card">
            <div className="list-card__header">
              <h2>Reservation details</h2>
            </div>

            {detailLoading ? <p className="muted">Loading details...</p> : null}

            {!detailLoading && selectedDetails ? (
              <>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span>Reservation ID</span>
                    <strong>{getReservationId(selectedDetails)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Status</span>
                    <strong>{getStatus(selectedDetails)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Test center</span>
                    <strong>{getSiteName(selectedDetails)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Site ID</span>
                    <strong>{getSiteId(selectedDetails) || '-'}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Exam date</span>
                    <strong>{getExamDate(selectedDetails) || '-'}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Language</span>
                    <strong>{getLanguage(selectedDetails)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Occupation ID</span>
                    <strong>{getOccupationId(selectedDetails) || '-'}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Methodology</span>
                    <strong>{getMethodology(selectedDetails)}</strong>
                  </div>
                </div>

                <div className="reservation-detail-actions">
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={() => startReschedule(selectedDetails)}
                    disabled={rescheduleLoadingId === String(getReservationId(selectedDetails))}
                  >
                    {rescheduleLoadingId === String(getReservationId(selectedDetails))
                      ? 'Starting reschedule...'
                      : 'Reschedule'}
                  </button>
                </div>
              </>
            ) : null}

            {!detailLoading && !selectedDetails && !loading ? (
              <p className="muted">Choose a reservation to see details.</p>
            ) : null}
          </div>
        </div>
      </div>
      <style jsx>{`
        .auth-shell {
          min-height: 100vh;
          padding: 24px;
          background: #efefef;
        }
        .app-card {
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 28px;
          border-radius: 20px;
          background: #fff;
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
        h1,
        h2 {
          margin: 0;
          color: #101728;
        }
        h1 {
          margin-bottom: 8px;
          font-size: 34px;
        }
        .muted {
          color: #5f6777;
        }
        .dashboard-actions {
          display: flex;
          gap: 12px;
        }
        .primary-btn,
        .secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 12px;
          padding: 12px 18px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }
        .primary-btn {
          background: #83bcc0;
          color: #fff;
        }
        .secondary-btn {
          background: #101728;
          color: #fff;
        }
        .status-card {
          margin-bottom: 16px;
          padding: 14px 16px;
          border-radius: 14px;
        }
        .status-card--success {
          background: #edf8f2;
          color: #0d6b3d;
        }
        .status-card--error {
          background: #fff1f1;
          color: #9d2020;
        }
        .reservation-layout {
          display: grid;
          grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
          gap: 20px;
        }
        .reservation-list-card,
        .reservation-detail-card {
          padding: 20px;
          border-radius: 18px;
          background: #f6f7f9;
          border: 1px solid #dde2ea;
        }
        .list-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }
        .reservation-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .reservation-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          padding: 14px;
          border: 1px solid #cfd6df;
          border-radius: 14px;
          background: #fff;
          color: #101728;
          text-align: left;
          cursor: pointer;
        }
        .reservation-item--active {
          border-color: #83bcc0;
          box-shadow: inset 0 0 0 1px #83bcc0;
        }
        .reservation-item__top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }
        .detail-item {
          padding: 14px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid #dde2ea;
        }
        .detail-item span {
          display: block;
          margin-bottom: 6px;
          color: #5f6777;
          font-size: 13px;
        }
        .detail-item strong {
          color: #101728;
          word-break: break-word;
        }
        .reservation-detail-actions {
          display: flex;
          justify-content: flex-end;
        }
        @media (max-width: 900px) {
          .reservation-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .app-card {
            padding: 20px;
          }
          .app-card__header {
            flex-direction: column;
          }
          .dashboard-actions {
            width: 100%;
            flex-direction: column;
          }
          .primary-btn,
          .secondary-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
