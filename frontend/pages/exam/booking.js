import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import { api } from '../../lib/api';

function pickArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.occupations)) return payload.occupations;
  if (Array.isArray(payload?.data?.occupations)) return payload.data.occupations;
  if (Array.isArray(payload?.exam_sessions)) return payload.exam_sessions;
  if (Array.isArray(payload?.data?.exam_sessions)) return payload.data.exam_sessions;
  if (Array.isArray(payload?.available_dates)) return payload.available_dates;
  if (Array.isArray(payload?.data?.available_dates)) return payload.data.available_dates;
  if (Array.isArray(payload?.prometric_codes)) return payload.prometric_codes;
  if (Array.isArray(payload?.data?.prometric_codes)) return payload.data.prometric_codes;
  return [];
}

function toOptionLabel(item) {
  return (
    item?.name ||
    item?.english_name ||
    item?.occupation_name ||
    item?.title ||
    `Occupation #${item?.id || item?.occupation_id || ''}`
  );
}

function getOccupationId(item) {
  return item?.id || item?.occupation_id || item?.value || '';
}

function normalizeOccupation(item) {
  const id = getOccupationId(item);
  return {
    raw: item,
    id,
    name: toOptionLabel(item),
    categoryId: item?.category_id || item?.category?.id || '',
    methodology: item?.methodology_type || item?.methodology || 'in_person',
    languageCodes: pickArray(item?.prometric_codes).map((code) => ({
      code: code?.code || code?.language_code || '',
      englishName: code?.english_name || code?.name || code?.code || '',
    })),
  };
}

function normalizeDateValue(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function getSessionId(item) {
  return item?.id || item?.session_id || item?.exam_session_id || '';
}

function getSessionSiteId(item) {
  return item?.site_id || item?.test_center?.site_id || item?.test_center?.id || '';
}

function getSessionSiteCity(item) {
  return item?.site_city || item?.test_center?.city || item?.city || '';
}

function getSessionCenterName(item) {
  return (
    item?.test_center_name ||
    item?.test_center?.name ||
    item?.test_center?.test_center_name ||
    `${getSessionSiteCity(item) || 'Center'}${getSessionSiteId(item) ? ` (#${getSessionSiteId(item)})` : ''}`
  );
}

function getPrometricCodes(item) {
  return pickArray(item?.prometric_codes || item?.languages || item?.language_codes);
}

function extractId(payload, keys) {
  for (const key of keys) {
    const value = payload?.[key] || payload?.data?.[key] || payload?.result?.[key];
    if (value) return value;
  }
  return '';
}

function buildCenterOptions(items) {
  const map = new Map();

  items.forEach((item) => {
    const siteId = String(getSessionSiteId(item) || '');
    if (!siteId || map.has(siteId)) return;

    map.set(siteId, {
      siteId,
      name: getSessionCenterName(item),
      city: getSessionSiteCity(item),
    });
  });

  return Array.from(map.values());
}

export default function BookingPage() {
  const router = useRouter();
  const [occupations, setOccupations] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedOccupationId, setSelectedOccupationId] = useState('');
  const [availableDate, setAvailableDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [methodology, setMethodology] = useState('in_person');
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [siteCity, setSiteCity] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [languageCode, setLanguageCode] = useState('');
  const [holdId, setHoldId] = useState('');
  const [reservationId, setReservationId] = useState('');
  const [loadingOccupations, setLoadingOccupations] = useState(false);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [creatingHold, setCreatingHold] = useState(false);
  const [booking, setBooking] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const selectedOccupation = useMemo(
    () => occupations.find((item) => String(item.id) === String(selectedOccupationId)) || null,
    [occupations, selectedOccupationId]
  );

  const centerOptions = useMemo(() => buildCenterOptions(sessions), [sessions]);

  const filteredSessions = useMemo(() => {
    if (!selectedCenterId) return sessions;
    return sessions.filter((item) => String(getSessionSiteId(item)) === String(selectedCenterId));
  }, [sessions, selectedCenterId]);

  const selectedSession = useMemo(
    () => filteredSessions.find((item) => String(getSessionId(item)) === String(sessionId)) || null,
    [filteredSessions, sessionId]
  );

  useEffect(() => {
    async function loadOccupations() {
      setLoadingOccupations(true);
      setError('');

      try {
        const data = await api('/api/svp/occupations?locale=en&per_page=200&page=1');
        const items = pickArray(data).map(normalizeOccupation);
        setOccupations(items);
      } catch (err) {
        setError(err?.message || 'Failed to load occupations');
      } finally {
        setLoadingOccupations(false);
      }
    }

    loadOccupations();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    if (router.query.occupationId) setSelectedOccupationId(String(router.query.occupationId));
    if (router.query.categoryId) setCategoryId(String(router.query.categoryId));
    if (router.query.methodology) setMethodology(String(router.query.methodology));
    if (router.query.languageCode) setLanguageCode(String(router.query.languageCode));
    if (router.query.siteId) setSelectedCenterId(String(router.query.siteId));
    if (router.query.siteId) setSiteId(String(router.query.siteId));
    if (router.query.siteCity) setSiteCity(String(router.query.siteCity));
    if (router.query.examDate) setAvailableDate(normalizeDateValue(String(router.query.examDate)));
    if (router.query.reschedule === '1') {
      setStatus('Reschedule mode active. Select a new date, center, and session.');
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!selectedOccupation) return;
    if (!categoryId && selectedOccupation.categoryId) setCategoryId(String(selectedOccupation.categoryId));
    if (!methodology && selectedOccupation.methodology) setMethodology(String(selectedOccupation.methodology));
    if (!languageCode && selectedOccupation.languageCodes[0]?.code) {
      setLanguageCode(String(selectedOccupation.languageCodes[0].code));
    }
  }, [selectedOccupation, categoryId, methodology, languageCode]);

  useEffect(() => {
    if (!centerOptions.length) {
      setSelectedCenterId('');
      return;
    }

    const hasSelected = centerOptions.some((item) => String(item.siteId) === String(selectedCenterId));
    if (!selectedCenterId || !hasSelected) {
      setSelectedCenterId(String(centerOptions[0].siteId));
    }
  }, [centerOptions, selectedCenterId]);

  useEffect(() => {
    if (!filteredSessions.length) {
      setSessionId('');
      return;
    }

    const hasSelected = filteredSessions.some((item) => String(getSessionId(item)) === String(sessionId));
    if (!sessionId || !hasSelected) {
      setSessionId(String(getSessionId(filteredSessions[0])));
    }
  }, [filteredSessions, sessionId]);

  useEffect(() => {
    const selectedCenter = centerOptions.find((item) => String(item.siteId) === String(selectedCenterId));
    if (selectedCenter) {
      setSiteId(String(selectedCenter.siteId || ''));
      setSiteCity(String(selectedCenter.city || ''));
    }
  }, [selectedCenterId, centerOptions]);

  useEffect(() => {
    if (!selectedSession) return;
    setSiteId(String(getSessionSiteId(selectedSession) || ''));
    setSiteCity(String(getSessionSiteCity(selectedSession) || ''));
    const codes = getPrometricCodes(selectedSession);
    if (codes[0]?.code || codes[0]?.language_code) {
      setLanguageCode(String(codes[0].code || codes[0].language_code));
    }
  }, [selectedSession]);

  async function searchDates() {
    if (!selectedOccupationId) {
      setError('Select occupation first');
      return;
    }

    setLoadingDates(true);
    setError('');
    setStatus('');

    try {
      const params = new URLSearchParams({
        occupation_id: String(selectedOccupationId),
        methodology_type: methodology || 'in_person',
        locale: 'en',
      });

      if (categoryId) params.set('category_id', categoryId);

      const data = await api(`/api/svp/available-dates?${params.toString()}`);
      const dates = pickArray(data)
        .map((item) => {
          const value = typeof item === 'string' ? item : item?.date || item?.available_date || '';
          return normalizeDateValue(value);
        })
        .filter(Boolean);

      setAvailableDates(dates);
      if (!availableDate && dates[0]) setAvailableDate(dates[0]);
      setStatus(dates.length ? 'Available dates loaded' : 'No available dates found');
    } catch (err) {
      setError(err?.message || 'Failed to load available dates');
    } finally {
      setLoadingDates(false);
    }
  }

  async function loadSessions() {
    if (!selectedOccupationId || !availableDate) {
      setError('Select occupation and date first');
      return;
    }

    setLoadingSessions(true);
    setError('');
    setStatus('');

    try {
      const params = new URLSearchParams({
        occupation_id: String(selectedOccupationId),
        available_date: availableDate,
        methodology_type: methodology || 'in_person',
        locale: 'en',
      });

      if (categoryId) params.set('category_id', categoryId);

      const data = await api(`/api/svp/exam-sessions?${params.toString()}`);
      const items = pickArray(data);
      setSessions(items);
      setStatus(items.length ? 'Test centers and sessions loaded from API' : 'No test sessions found');
    } catch (err) {
      setError(err?.message || 'Failed to load test sessions');
    } finally {
      setLoadingSessions(false);
    }
  }

  async function createHold() {
    if (!sessionId) {
      setError('Select test center / session first');
      return;
    }

    setCreatingHold(true);
    setError('');
    setStatus('');

    try {
      const data = await api('/api/svp/temporary-seats', {
        method: 'POST',
        body: {
          exam_session_id: Number(sessionId),
          methodology_type: methodology || 'in_person',
          language_code: languageCode || undefined,
        },
      });

      const nextHoldId = extractId(data, ['id', 'hold_id', 'temporary_seat_id']);
      setHoldId(String(nextHoldId || ''));
      setStatus(nextHoldId ? `Hold created: #${nextHoldId}` : 'Hold created');
    } catch (err) {
      setError(err?.message || 'Failed to create hold');
    } finally {
      setCreatingHold(false);
    }
  }

  async function bookReservation() {
    if (!sessionId) {
      setError('Select test center / session first');
      return;
    }

    setBooking(true);
    setError('');
    setStatus('');

    try {
      const data = await api('/api/svp/exam-reservations', {
        method: 'POST',
        body: {
          exam_session_id: Number(sessionId),
          occupation_id: Number(selectedOccupationId),
          methodology_type: methodology || 'in_person',
          language_code: languageCode || undefined,
          temporary_seat_id: holdId ? Number(holdId) : undefined,
        },
      });

      const nextReservationId = extractId(data, ['id', 'reservation_id', 'exam_reservation_id']);
      setReservationId(String(nextReservationId || ''));
      setStatus(nextReservationId ? `Reservation created: #${nextReservationId}` : 'Reservation created');
    } catch (err) {
      setError(err?.message || 'Failed to book reservation');
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="booking-shell">
      <div className="booking-card">
        <div className="booking-head">
          <div>
            <p className="eyebrow">Booking</p>
            <h1>Create new booking</h1>
            <p className="muted">Load real test centers from the API, choose one from the dropdown, then book.</p>
          </div>
          <div className="head-actions">
            <Link href="/dashboard" className="secondary-btn">
              Dashboard
            </Link>
            <Link href="/exam/reservations" className="secondary-btn">
              My bookings
            </Link>
          </div>
        </div>

        {status ? <div className="status-card status-ok">{status}</div> : null}
        {error ? <div className="status-card status-error">{error}</div> : null}

        <div className="form-grid">
          <label className="field field-wide">
            <span>Occupation</span>
            <select value={selectedOccupationId} onChange={(e) => setSelectedOccupationId(e.target.value)}>
              <option value="">{loadingOccupations ? 'Loading occupations...' : 'Select occupation'}</option>
              {occupations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} {item.id ? `(#${item.id})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Available date</span>
            <input
              type="date"
              value={availableDate}
              onChange={(e) => setAvailableDate(e.target.value)}
              list="available-dates"
            />
            <datalist id="available-dates">
              {availableDates.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <label className="field">
            <span>Category ID</span>
            <input value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="Category ID" />
          </label>

          <label className="field">
            <span>Methodology</span>
            <select value={methodology} onChange={(e) => setMethodology(e.target.value)}>
              <option value="in_person">in_person</option>
              <option value="remote">remote</option>
            </select>
          </label>

          <label className="field">
            <span>Language</span>
            <select value={languageCode} onChange={(e) => setLanguageCode(e.target.value)}>
              <option value="">Select language</option>
              {selectedOccupation?.languageCodes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.englishName} {item.code ? `(${item.code})` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedOccupation ? (
          <div className="detail-box">
            <h2>Occupation details from API</h2>
            <div className="detail-grid">
              <div>
                <span>Name</span>
                <strong>{selectedOccupation.name}</strong>
              </div>
              <div>
                <span>Occupation ID</span>
                <strong>{selectedOccupation.id || '-'}</strong>
              </div>
              <div>
                <span>Category ID</span>
                <strong>{selectedOccupation.categoryId || '-'}</strong>
              </div>
              <div>
                <span>Methodology</span>
                <strong>{selectedOccupation.methodology || '-'}</strong>
              </div>
            </div>
          </div>
        ) : null}

        <div className="button-row">
          <button className="secondary-btn" type="button" onClick={searchDates} disabled={loadingDates}>
            {loadingDates ? 'Loading dates...' : 'Load available dates'}
          </button>
          <button className="secondary-btn" type="button" onClick={loadSessions} disabled={loadingSessions}>
            {loadingSessions ? 'Loading centers...' : 'Load test centers'}
          </button>
        </div>

        {availableDates.length ? (
          <div className="detail-box">
            <h2>Available dates</h2>
            <div className="date-grid">
              {availableDates.map((item) => {
                const active = item === availableDate;
                const label = new Date(item).toLocaleDateString('en-US', {
                  month: 'short',
                  day: '2-digit',
                  year: 'numeric',
                });

                return (
                  <button
                    key={item}
                    className={`date-card${active ? ' date-card--active' : ''}`}
                    type="button"
                    onClick={() => setAvailableDate(item)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {sessions.length ? (
          <>
            <div className="form-grid form-grid--secondary">
              <label className="field field-wide">
                <span>Test center</span>
                <select value={selectedCenterId} onChange={(e) => setSelectedCenterId(e.target.value)}>
                  <option value="">Select test center</option>
                  {centerOptions.map((item) => (
                    <option key={item.siteId} value={item.siteId}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field field-wide">
                <span>Test center / session</span>
                <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                  <option value="">Select session</option>
                  {filteredSessions.map((item) => (
                    <option key={getSessionId(item)} value={getSessionId(item)}>
                      {getSessionCenterName(item)} | Session #{getSessionId(item)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="detail-grid detail-grid--session">
              <div>
                <span>site_id</span>
                <strong>{siteId || '-'}</strong>
              </div>
              <div>
                <span>site_city</span>
                <strong>{siteCity || '-'}</strong>
              </div>
              <div>
                <span>hold_id</span>
                <strong>{holdId || '-'}</strong>
              </div>
              <div>
                <span>reservation_id</span>
                <strong>{reservationId || '-'}</strong>
              </div>
            </div>

            <div className="button-row">
              <button className="primary-btn" type="button" onClick={createHold} disabled={creatingHold}>
                {creatingHold ? 'Creating hold...' : 'Create hold'}
              </button>
              <button className="primary-btn" type="button" onClick={bookReservation} disabled={booking}>
                {booking ? 'Booking...' : 'Book'}
              </button>
            </div>
          </>
        ) : null}
      </div>

      <style jsx>{`
        .booking-shell {
          min-height: 100vh;
          padding: 24px;
          background: #0e1730;
        }
        .booking-card {
          width: min(920px, 100%);
          margin: 0 auto;
          padding: 24px;
          border-radius: 20px;
          background: linear-gradient(180deg, #16234a 0%, #111a34 100%);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
          color: #fff;
        }
        .booking-head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }
        .head-actions {
          display: flex;
          gap: 10px;
        }
        .eyebrow {
          margin: 0 0 8px;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #8ec0c8;
          font-weight: 700;
        }
        h1,
        h2 {
          margin: 0 0 8px;
        }
        .muted {
          margin: 0;
          color: #b9c2d6;
        }
        .status-card {
          margin-bottom: 16px;
          padding: 12px 14px;
          border-radius: 12px;
        }
        .status-ok {
          background: rgba(30, 132, 73, 0.2);
          color: #a3e5bc;
        }
        .status-error {
          background: rgba(165, 43, 43, 0.22);
          color: #ffb6b6;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .form-grid--secondary {
          margin-top: 18px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .field-wide {
          grid-column: 1 / -1;
        }
        .field span {
          font-size: 13px;
          font-weight: 700;
        }
        .field input,
        .field select {
          width: 100%;
          min-height: 48px;
          border-radius: 12px;
          border: 1px solid #44506f;
          background: #f7f9fd;
          color: #182238;
          padding: 0 14px;
        }
        .button-row {
          display: flex;
          gap: 12px;
          margin-top: 18px;
        }
        .primary-btn,
        .secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 0 18px;
          border: 0;
          border-radius: 12px;
          text-decoration: none;
          cursor: pointer;
          font-weight: 700;
        }
        .primary-btn {
          background: #87c2c7;
          color: #fff;
        }
        .secondary-btn {
          background: #1f2a4b;
          color: #fff;
        }
        .detail-box {
          margin-top: 20px;
          padding: 18px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .date-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-top: 14px;
        }
        .date-card {
          min-height: 48px;
          border: 1px solid #44506f;
          border-radius: 12px;
          background: #f7f9fd;
          color: #182238;
          cursor: pointer;
          font-weight: 700;
        }
        .date-card--active {
          background: #87c2c7;
          border-color: #87c2c7;
          color: #fff;
        }
        .detail-grid div {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(6, 12, 26, 0.28);
        }
        .detail-grid span {
          color: #b9c2d6;
          font-size: 12px;
          text-transform: uppercase;
        }
        .detail-grid strong {
          word-break: break-word;
        }
        .detail-grid--session {
          margin-top: 16px;
        }
        @media (max-width: 720px) {
          .booking-head,
          .button-row,
          .head-actions {
            flex-direction: column;
          }
          .form-grid,
          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
