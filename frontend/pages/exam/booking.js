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

function buildCityOptions(items) {
  return Array.from(
    new Set(
      items
        .map((item) => String(getSessionSiteCity(item) || '').trim())
        .filter(Boolean)
    )
  );
}

function formatDateLabel(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function buildCalendarDays(activeMonth, availableDates) {
  const monthDate = activeMonth ? new Date(`${activeMonth}-01T00:00:00`) : new Date();
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leading = (firstDay.getDay() + 6) % 7;
  const total = lastDay.getDate();
  const availableSet = new Set(availableDates);
  const items = [];

  for (let index = 0; index < leading; index += 1) {
    items.push({ key: `empty-start-${index}`, empty: true });
  }

  for (let day = 1; day <= total; day += 1) {
    const current = new Date(year, month, day);
    const iso = current.toISOString().slice(0, 10);
    items.push({
      key: iso,
      iso,
      day,
      available: availableSet.has(iso),
    });
  }

  while (items.length % 7 !== 0) {
    items.push({ key: `empty-end-${items.length}`, empty: true });
  }

  return items;
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
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [siteCity, setSiteCity] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [languageCode, setLanguageCode] = useState('');
  const [holdId, setHoldId] = useState('');
  const [reservationId, setReservationId] = useState('');
  const [calendarMonth, setCalendarMonth] = useState('');
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

  const cityOptions = useMemo(() => buildCityOptions(sessions), [sessions]);

  const cityFilteredSessions = useMemo(() => {
    if (!selectedCity) return sessions;
    return sessions.filter((item) => String(getSessionSiteCity(item)) === String(selectedCity));
  }, [sessions, selectedCity]);

  const centerOptions = useMemo(() => buildCenterOptions(cityFilteredSessions), [cityFilteredSessions]);

  const filteredSessions = useMemo(() => {
    if (!selectedCenterId) return cityFilteredSessions;
    return cityFilteredSessions.filter((item) => String(getSessionSiteId(item)) === String(selectedCenterId));
  }, [cityFilteredSessions, selectedCenterId]);

  const selectedSession = useMemo(
    () => filteredSessions.find((item) => String(getSessionId(item)) === String(sessionId)) || null,
    [filteredSessions, sessionId]
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth || availableDate || normalizeDateValue(new Date().toISOString()), availableDates),
    [calendarMonth, availableDate, availableDates]
  );

  useEffect(() => {
    async function loadOccupations() {
      setLoadingOccupations(true);
      setError('');

      try {
        const data = await api('/api/svp/occupations?locale=en&per_page=200&page=1');
        setOccupations(pickArray(data).map(normalizeOccupation));
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
    if (router.query.siteCity) setSelectedCity(String(router.query.siteCity));
    if (router.query.siteCity) setSiteCity(String(router.query.siteCity));
    if (router.query.examDate) setAvailableDate(normalizeDateValue(String(router.query.examDate)));
    if (router.query.examDate) setCalendarMonth(String(router.query.examDate).slice(0, 7));
    if (router.query.reschedule === '1') {
      setStatus('Reschedule mode active. Select a new city, center, and session.');
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!selectedOccupation) return;
    if (!categoryId && selectedOccupation.categoryId) setCategoryId(String(selectedOccupation.categoryId));
    if (!languageCode && selectedOccupation.languageCodes[0]?.code) {
      setLanguageCode(String(selectedOccupation.languageCodes[0].code));
    }
  }, [selectedOccupation, categoryId, languageCode]);

  useEffect(() => {
    let active = true;

    async function loadDates() {
      if (!selectedOccupationId) {
        setAvailableDates([]);
        setAvailableDate('');
        return;
      }

      setLoadingDates(true);
      setError('');

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

        if (!active) return;
        setAvailableDates(dates);
        setAvailableDate((prev) => (prev && dates.includes(prev) ? prev : dates[0] || ''));
        setCalendarMonth((prev) => prev || (dates[0] ? dates[0].slice(0, 7) : normalizeDateValue(new Date().toISOString()).slice(0, 7)));
      } catch (err) {
        if (!active) return;
        setAvailableDates([]);
        setError(err?.message || 'Failed to load available dates');
      } finally {
        if (active) setLoadingDates(false);
      }
    }

    loadDates();

    return () => {
      active = false;
    };
  }, [selectedOccupationId, methodology, categoryId]);

  useEffect(() => {
    let active = true;

    async function loadSessions() {
      if (!selectedOccupationId || !availableDate) {
        setSessions([]);
        return;
      }

      setLoadingSessions(true);
      setError('');

      try {
        const params = new URLSearchParams({
          occupation_id: String(selectedOccupationId),
          available_date: availableDate,
          methodology_type: methodology || 'in_person',
          locale: 'en',
        });

        if (categoryId) params.set('category_id', categoryId);

        const data = await api(`/api/svp/exam-sessions?${params.toString()}`);
        if (!active) return;
        setSessions(pickArray(data));
      } catch (err) {
        if (!active) return;
        setSessions([]);
        setError(err?.message || 'Failed to load test sessions');
      } finally {
        if (active) setLoadingSessions(false);
      }
    }

    loadSessions();

    return () => {
      active = false;
    };
  }, [selectedOccupationId, availableDate, methodology, categoryId]);

  useEffect(() => {
    if (!cityOptions.length) {
      setSelectedCity('');
      return;
    }

    const hasSelected = cityOptions.some((item) => item === selectedCity);
    if (!selectedCity || !hasSelected) {
      setSelectedCity(cityOptions[0]);
    }
  }, [cityOptions, selectedCity]);

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
    <div className="page-shell">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="brand-mark" />
          <span>Professional Accreditation</span>
        </div>
        <div className="topbar__actions">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/exam/reservations">My bookings</Link>
        </div>
      </header>

      <main className="page-body">
        <div className="page-head">
          <Link className="back-link" href="/dashboard">
            Back to dashboard
          </Link>
          <div className="head-actions">
            <button className="ghost-btn" type="button" onClick={createHold} disabled={creatingHold || !sessionId}>
              {creatingHold ? 'Creating hold...' : 'Create hold'}
            </button>
            <button className="primary-btn" type="button" onClick={bookReservation} disabled={booking || !sessionId}>
              {booking ? 'Booking...' : 'Book now'}
            </button>
          </div>
        </div>

        <div className="booking-no">
          Booking No. <strong>{reservationId || holdId || '-'}</strong>
        </div>

        {status ? <div className="notice notice--ok">{status}</div> : null}
        {error ? <div className="notice notice--error">{error}</div> : null}

        <section className="detail-card">
          <div className="detail-card__title">Booking details</div>

          <div className="detail-grid">
            <div className="field-block field-block--wide">
              <span>Occupation</span>
              <select value={selectedOccupationId} onChange={(e) => setSelectedOccupationId(e.target.value)}>
                <option value="">{loadingOccupations ? 'Loading occupations...' : 'Select occupation'}</option>
                {occupations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.id ? `(#${item.id})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-block">
              <span>Occupation Code</span>
              <input value={selectedOccupation?.id || ''} readOnly placeholder="Auto" />
            </div>

            <div className="field-block">
              <span>Methodology</span>
              <select value={methodology} onChange={(e) => setMethodology(e.target.value)}>
                <option value="in_person">Direct Assessment</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            <div className="field-block">
              <span>Available Date</span>
              <input
                type="date"
                value={availableDate}
                onChange={(e) => {
                  setAvailableDate(e.target.value);
                  setCalendarMonth(e.target.value ? e.target.value.slice(0, 7) : calendarMonth);
                }}
              />
            </div>

            <div className="field-block">
              <span>City</span>
              <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} disabled={!cityOptions.length}>
                <option value="">
                  {loadingSessions ? 'Loading cities...' : cityOptions.length ? 'Select city' : 'Choose occupation first'}
                </option>
                {cityOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-block">
              <span>Category ID</span>
              <input value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="Category ID" />
            </div>

            <div className="field-block">
              <span>Language</span>
              <select value={languageCode} onChange={(e) => setLanguageCode(e.target.value)}>
                <option value="">Select language</option>
                {selectedOccupation?.languageCodes.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.englishName} {item.code ? `(${item.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-block">
              <span>Test center</span>
              <select
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                disabled={!centerOptions.length}
              >
                <option value="">{loadingSessions ? 'Loading centers...' : 'Select test center'}</option>
                {centerOptions.map((item) => (
                  <option key={item.siteId} value={item.siteId}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-block">
              <span>Session</span>
              <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={!filteredSessions.length}>
                <option value="">{loadingSessions ? 'Loading sessions...' : 'Select session'}</option>
                {filteredSessions.map((item) => (
                  <option key={getSessionId(item)} value={getSessionId(item)}>
                    {getSessionCenterName(item)} | Session #{getSessionId(item)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-block">
              <span>Selected City</span>
              <input value={siteCity} readOnly placeholder="Auto" />
            </div>

            <div className="field-block">
              <span>Site ID</span>
              <input value={siteId} readOnly placeholder="Auto" />
            </div>

            <div className="field-block">
              <span>Hold ID</span>
              <input value={holdId} readOnly placeholder="-" />
            </div>

            <div className="field-block">
              <span>Reservation ID</span>
              <input value={reservationId} readOnly placeholder="-" />
            </div>
          </div>

          {availableDates.length ? (
            <div className="calendar-wrap">
              <div className="calendar-head">
                <strong>
                  {new Date(`${calendarMonth || availableDates[0].slice(0, 7)}-01T00:00:00`).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </strong>
                <input
                  className="calendar-month"
                  type="month"
                  value={calendarMonth || availableDates[0].slice(0, 7)}
                  onChange={(e) => setCalendarMonth(e.target.value)}
                />
              </div>
              <div className="calendar-weekdays">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
              <div className="calendar-grid">
                {calendarDays.map((item) =>
                  item.empty ? (
                    <div key={item.key} className="calendar-cell calendar-cell--empty" />
                  ) : (
                    <button
                      key={item.key}
                      type="button"
                      className={`calendar-cell${item.available ? ' calendar-cell--available' : ''}${
                        item.iso === availableDate ? ' calendar-cell--active' : ''
                      }`}
                      onClick={() => item.available && setAvailableDate(item.iso)}
                      disabled={!item.available}
                    >
                      <span>{item.day}</span>
                      {item.available ? <small>Seat</small> : <small>-</small>}
                    </button>
                  )
                )}
              </div>
              <div className="chips">
                {availableDates.map((item) => (
                  <button
                    key={item}
                    className={`chip${item === availableDate ? ' chip--active' : ''}`}
                    type="button"
                    onClick={() => {
                      setAvailableDate(item);
                      setCalendarMonth(item.slice(0, 7));
                    }}
                  >
                    {formatDateLabel(item)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </main>

      <style jsx>{`
        .page-shell {
          min-height: 100vh;
          background: #f4f6f8;
          color: #22324d;
        }
        .topbar {
          min-height: 58px;
          padding: 0 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          border-bottom: 1px solid #d9e0e7;
        }
        .topbar__brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #127d87;
          font-weight: 700;
        }
        .brand-mark {
          width: 40px;
          height: 24px;
          border-radius: 0 20px 20px 20px;
          background: linear-gradient(135deg, #0b8c93 0%, #f49a20 100%);
        }
        .topbar__actions {
          display: flex;
          gap: 18px;
        }
        .topbar__actions a {
          color: #637084;
          text-decoration: none;
          font-weight: 600;
        }
        .page-body {
          padding: 44px 24px 60px;
        }
        .page-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }
        .back-link {
          color: #0b7f8a;
          text-decoration: none;
          font-size: 16px;
          font-weight: 700;
        }
        .head-actions {
          display: flex;
          gap: 10px;
        }
        .ghost-btn,
        .primary-btn {
          min-height: 42px;
          padding: 0 18px;
          border-radius: 6px;
          border: 1px solid #ccd5de;
          background: #fff;
          color: #1a607c;
          cursor: pointer;
          font-weight: 700;
        }
        .primary-btn {
          background: #13828c;
          border-color: #13828c;
          color: #fff;
        }
        .booking-no {
          margin-bottom: 18px;
          color: #748095;
          font-size: 17px;
        }
        .booking-no strong {
          color: #22324d;
          font-size: 18px;
        }
        .notice {
          margin-bottom: 14px;
          padding: 14px 16px;
          border-radius: 10px;
        }
        .notice--ok {
          background: #ebfaf4;
          color: #1a7d4d;
        }
        .notice--error {
          background: #fff1f1;
          color: #b13d3d;
        }
        .detail-card {
          background: #fff;
          border: 1px solid #cfd7df;
          border-radius: 14px;
          overflow: hidden;
        }
        .detail-card__title {
          padding: 14px 18px;
          border-bottom: 1px solid #dbe2e9;
          font-size: 18px;
          font-weight: 800;
          color: #111;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px 26px;
          padding: 22px 24px 24px;
        }
        .field-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .field-block--wide {
          grid-column: span 3;
        }
        .field-block span {
          color: #68758a;
          font-size: 14px;
        }
        .field-block input,
        .field-block select {
          min-height: 44px;
          border-radius: 6px;
          border: 1px solid #cfd7df;
          background: #fff;
          color: #24324d;
          padding: 0 12px;
        }
        .field-block select:disabled,
        .field-block input:disabled {
          background: #f5f7f9;
          color: #8d97a8;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 16px 0 0;
        }
        .calendar-wrap {
          padding: 0 24px 24px;
        }
        .calendar-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 8px;
        }
        .calendar-month {
          min-height: 38px;
          padding: 0 10px;
          border-radius: 6px;
          border: 1px solid #ccd5de;
        }
        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          margin-top: 14px;
          color: #6c788b;
          font-size: 12px;
          font-weight: 700;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          margin-top: 8px;
        }
        .calendar-cell {
          min-height: 68px;
          border-radius: 10px;
          border: 1px solid #d5dde6;
          background: #f6f8fa;
          color: #7f8a9c;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: space-between;
          padding: 10px;
          cursor: not-allowed;
        }
        .calendar-cell span {
          font-weight: 700;
        }
        .calendar-cell small {
          font-size: 11px;
        }
        .calendar-cell--empty {
          border: 0;
          background: transparent;
        }
        .calendar-cell--available {
          background: #ebfaf4;
          border-color: #a8d9bf;
          color: #156d44;
          cursor: pointer;
        }
        .calendar-cell--active {
          background: #13828c;
          border-color: #13828c;
          color: #fff;
        }
        .chip {
          min-height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid #ccd5de;
          background: #fff;
          color: #24405b;
          cursor: pointer;
          font-weight: 700;
        }
        .chip--active {
          background: #13828c;
          border-color: #13828c;
          color: #fff;
        }
        @media (max-width: 960px) {
          .detail-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .field-block--wide {
            grid-column: span 2;
          }
        }
        @media (max-width: 720px) {
          .topbar,
          .page-head,
          .head-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .detail-grid {
            grid-template-columns: 1fr;
          }
          .calendar-weekdays,
          .calendar-grid {
            grid-template-columns: repeat(7, minmax(32px, 1fr));
          }
          .field-block--wide {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}
