import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

function pickArray(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.occupations)) return json.occupations;
  if (Array.isArray(json?.exam_sessions)) return json.exam_sessions;
  if (Array.isArray(json?.available_dates)) return json.available_dates;
  if (Array.isArray(json?.data?.occupations)) return json.data.occupations;
  if (Array.isArray(json?.data?.exam_sessions)) return json.data.exam_sessions;
  if (Array.isArray(json?.data?.available_dates)) return json.data.available_dates;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.results)) return json.results;
  return null;
}

function extractHoldId(json) {
  return json?.hold_id || json?.id || json?.data?.hold_id || json?.data?.id || null;
}

function extractReservationId(json) {
  return json?.reservation?.id || json?.reservation_id || json?.id || json?.data?.reservation?.id || json?.data?.reservation_id || json?.data?.id || null;
}

function getReservationDetails(json, fallback = {}) {
  const reservation = json?.reservation || json?.data?.reservation || json?.data || json || {};
  return {
    id: extractReservationId(json),
    examSessionId: reservation?.exam_session_id ?? fallback.examSessionId ?? null,
    occupationId: reservation?.occupation_id ?? fallback.occupationId ?? null,
    languageCode: reservation?.language_code ?? fallback.languageCode ?? null,
    siteId: reservation?.site_id ?? fallback.siteId ?? null,
    siteCity: reservation?.site_city ?? fallback.siteCity ?? null,
    methodology: reservation?.methodology ?? fallback.methodology ?? null,
    status: reservation?.status || json?.status || json?.data?.status || null,
  };
}

function getPrometricCodes(occupation) {
  return occupation?.category?.prometric_codes || [];
}

function getSessionId(session) {
  return session?.id || session?.exam_session_id || '';
}

function getSessionSiteId(session) {
  return session?.site_id ?? session?.test_center?.site_id ?? session?.test_center_id ?? session?.site?.id ?? '';
}

function getSessionSiteCity(session) {
  return session?.test_center?.city || session?.site_city || session?.city || session?.site_city_name || session?.test_center_city || '';
}

function getSessionLabel(session) {
  const sessionId = getSessionId(session);
  const centerName = session?.test_center_name || session?.test_center?.name || 'Unknown Center';
  const centerCity = session?.city || session?.site_city_name || session?.test_center?.city || '';
  const siteId = getSessionSiteId(session);
  const startAt = session?.start_at || session?.exam_date || '';
  return `#${sessionId} - ${centerName}${centerCity ? ` - ${centerCity}` : ''}${siteId ? ` - site_id ${siteId}` : ''}${startAt ? ` - ${startAt}` : ''}`;
}

export default function ExamBooking() {
  const [out, setOut] = useState('');
  const [categoryId, setCategoryId] = useState('56');
  const [startDateFrom, setStartDateFrom] = useState('');
  const [perPage, setPerPage] = useState('1000');
  const [availableSeats, setAvailableSeats] = useState('greater_than::0');
  const [status, setStatus] = useState('scheduled');
  const [city, setCity] = useState('Mymensingh');
  const [examDate, setExamDate] = useState('');
  const [occupationId, setOccupationId] = useState('');
  const [languageCode, setLanguageCode] = useState('');
  const [siteId, setSiteId] = useState('');
  const [siteCity, setSiteCity] = useState('');
  const [methodology, setMethodology] = useState('in_person');
  const [availableDatesRaw, setAvailableDatesRaw] = useState(null);
  const [sessionsRaw, setSessionsRaw] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [holdRaw, setHoldRaw] = useState(null);
  const [reservationRaw, setReservationRaw] = useState(null);
  const [occupationsRaw, setOccupationsRaw] = useState(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) window.location.href = '/auth/login';
  }, []);

  async function loadOccupations() {
    setOut('Loading occupations...');
    try {
      const res = await api('/api/svp/occupations');
      setOccupationsRaw(res);
      setOut('Occupations loaded.');
      const arr = pickArray(res);
      if (arr?.[0]?.id) {
        if (!occupationId) setOccupationId(String(arr[0].id));
        const firstLanguageCode = getPrometricCodes(arr[0])[0]?.code;
        if (!languageCode && firstLanguageCode) setLanguageCode(firstLanguageCode);
      }
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    }
  }

  async function searchAvailableDates(e) {
    e?.preventDefault?.();
    setOut('Searching available dates...');

    const startDate = startDateFrom || new Date().toISOString().slice(0, 10);
    const qs = new URLSearchParams({
      per_page: perPage,
      category_id: categoryId,
      start_at_date_from: startDate,
      available_seats: availableSeats,
      status,
    }).toString();

    try {
      const res = await api(`/api/svp/available-dates?${qs}`);
      setAvailableDatesRaw(res);
      setOut('Available dates loaded.');
      const arr = pickArray(res);
      const maybeDate = arr?.[0]?.date || arr?.[0]?.exam_date || arr?.[0]?.day || arr?.[0] || '';
      if (typeof maybeDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(maybeDate)) {
        setExamDate(maybeDate);
      }
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    }
  }

  async function loadExamSessions() {
    setOut('Loading exam sessions...');
    const qs = new URLSearchParams({
      category_id: categoryId,
      city,
      exam_date: examDate,
    }).toString();

    try {
      const res = await api(`/api/svp/exam-sessions?${qs}`);
      setSessionsRaw(res);
      setOut('Test centers loaded.');
      const arr = pickArray(res);
      const first = arr?.[0];
      const firstId = getSessionId(first);
      if (firstId) setSelectedSessionId(String(firstId));
      if (first) {
        setSiteId(String(getSessionSiteId(first) || ''));
        setSiteCity(String(getSessionSiteCity(first) || ''));
      }
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    }
  }

  async function createHold() {
    if (!selectedSessionId) {
      setOut('Select an exam session first.');
      return;
    }

    setOut('Creating temporary seat...');
    try {
      const res = await api('/api/svp/temporary-seats', {
        method: 'POST',
        body: { exam_session_id: [Number(selectedSessionId)], methodology },
      });
      setHoldRaw(res);
      setOut('Temporary seat created.');
    } catch (e) {
      setOut(e?.data?.message || e?.message || 'Temporary seat request failed.');
    }
  }

  async function bookReservation() {
    if (!selectedSessionId) {
      setOut('Select an exam session first.');
      return;
    }
    if (!occupationId) {
      setOut('occupation_id is required.');
      return;
    }

    setOut('Booking exam reservation...');
    try {
      const res = await api('/api/svp/exam-reservations', {
        method: 'POST',
        body: {
          exam_session_id: Number(selectedSessionId),
          occupation_id: Number(occupationId),
          language_code: languageCode,
          site_id: siteId ? Number(siteId) : null,
          site_city: siteCity || null,
          hold_id: holdRaw ? extractHoldId(holdRaw) : null,
          methodology,
        },
      });
      setReservationRaw(res);
      setOut('Reservation created successfully.');
    } catch (e) {
      setOut(e?.data?.message || e?.message || 'Reservation request failed.');
    }
  }

  const sessionList = useMemo(() => pickArray(sessionsRaw) || [], [sessionsRaw]);
  const occupationList = useMemo(() => pickArray(occupationsRaw) || [], [occupationsRaw]);
  const selectedOccupation = useMemo(
    () => occupationList.find((occupation) => String(occupation?.id) === String(occupationId)) || null,
    [occupationList, occupationId]
  );
  const languageOptions = useMemo(() => getPrometricCodes(selectedOccupation), [selectedOccupation]);
  const reservationDetails = useMemo(
    () => (
      reservationRaw
        ? getReservationDetails(reservationRaw, {
            examSessionId: selectedSessionId || null,
            occupationId: occupationId || null,
            languageCode: languageCode || null,
            siteId: siteId || null,
            siteCity: siteCity || null,
            methodology,
          })
        : null
    ),
    [reservationRaw, selectedSessionId, occupationId, languageCode, siteId, siteCity, methodology]
  );

  useEffect(() => {
    if (!selectedOccupation) return;
    const category = selectedOccupation?.category_id || selectedOccupation?.category?.id;
    if (category) setCategoryId(String(category));
    if (!languageOptions.length) return;
    const hasSelected = languageOptions.some((option) => option?.code === languageCode);
    if (!hasSelected && languageOptions[0]?.code) {
      setLanguageCode(languageOptions[0].code);
    }
  }, [selectedOccupation, languageOptions, languageCode]);

  useEffect(() => {
    const selectedSession = sessionList.find((session) => String(getSessionId(session)) === String(selectedSessionId));
    if (!selectedSession) return;
    setSiteId(String(getSessionSiteId(selectedSession) || ''));
    setSiteCity(String(getSessionSiteCity(selectedSession) || ''));
    if (!city) {
      const nextCity = getSessionSiteCity(selectedSession);
      if (nextCity) setCity(String(nextCity));
    }
  }, [sessionList, selectedSessionId, city]);

  return (
    <div className="app-shell">
      <div className="app-panel app-panel-wide">
        <div className="page-header">
          <div>
            <p className="eyebrow">Exam workflow</p>
            <h1>Exam Search and Booking</h1>
            <p className="page-copy">Search dates, choose a real test center, select readable language options, and submit the reservation flow in one place.</p>
          </div>
          <div className="page-actions">
            <Link className="text-link" href="/dashboard">Back to dashboard</Link>
          </div>
        </div>

        <div className="section-card">
          <div className="section-title-row">
            <h2>1. Search available dates</h2>
            <p className="section-copy">Queries <code>/api/svp/available-dates</code> and fills the first valid date automatically.</p>
          </div>
          <form className="form-grid" onSubmit={searchAvailableDates}>
            <div className="field-group">
              <label>Category ID</label>
              <input value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
            </div>
            <div className="field-group">
              <label>Start Date From</label>
              <input value={startDateFrom} onChange={(e) => setStartDateFrom(e.target.value)} placeholder="YYYY-MM-DD" />
            </div>
            <div className="field-group">
              <label>Per Page</label>
              <input value={perPage} onChange={(e) => setPerPage(e.target.value)} />
            </div>
            <div className="field-group">
              <label>Available Seats</label>
              <input value={availableSeats} onChange={(e) => setAvailableSeats(e.target.value)} />
            </div>
            <div className="field-group">
              <label>Status</label>
              <input value={status} onChange={(e) => setStatus(e.target.value)} />
            </div>
            <div className="form-actions form-actions-full">
              <button className="primary-button" type="submit">Search dates</button>
            </div>
          </form>
        </div>

        <div className="section-card">
          <div className="section-title-row">
            <h2>2. Load test centers</h2>
            <p className="section-copy">Choose a city and date, then select a real test center name with its visible <code>site_id</code>.</p>
          </div>
          <div className="form-grid">
            <div className="field-group">
              <label>City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="field-group">
              <label>Exam Date</label>
              <input value={examDate} onChange={(e) => setExamDate(e.target.value)} placeholder="YYYY-MM-DD" />
            </div>
            <div className="form-actions form-actions-full">
              <button className="primary-button" type="button" onClick={loadExamSessions}>Load sessions</button>
            </div>
          </div>

          {sessionList.length > 0 && (
            <div className="field-group field-group-spaced">
              <label>Test Center</label>
              <select value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)}>
                {sessionList.map((session) => (
                  <option key={getSessionId(session)} value={getSessionId(session)}>
                    {getSessionLabel(session)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="section-card">
          <div className="section-title-row">
            <h2>3. Reservation details</h2>
            <p className="section-copy">Language uses the readable option label, while the backend still receives the correct code.</p>
          </div>

          <div className="form-grid">
            <div className="field-group">
              <label>Methodology</label>
              <select value={methodology} onChange={(e) => setMethodology(e.target.value)}>
                <option value="in_person">in_person</option>
                <option value="remote">remote</option>
              </select>
            </div>
            <div className="field-group">
              <label>Language</label>
              {languageOptions.length > 0 ? (
                <select value={languageCode} onChange={(e) => setLanguageCode(e.target.value)}>
                  {languageOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.english_name || option.language_code || option.code}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} placeholder="Language code" />
              )}
            </div>
          </div>

          <div className="form-grid">
            <div className="field-group">
              <label>Occupation</label>
              <input value={occupationId} onChange={(e) => setOccupationId(e.target.value)} placeholder="Occupation ID" />
              <button className="secondary-button inline-action" onClick={loadOccupations} type="button">Load occupations</button>
              {occupationList.length > 0 && (
                <select value={occupationId} onChange={(e) => setOccupationId(e.target.value)}>
                  {occupationList.map((occupation) => (
                    <option key={occupation.id} value={occupation.id}>
                      {occupation.name ? `${occupation.name}` : `Occupation`} (#{occupation.id})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="field-group">
              <label>Selected Session ID</label>
              <input value={selectedSessionId} readOnly />
              <label>Site ID</label>
              <input value={siteId} readOnly />
              <label>Site City</label>
              <input value={siteCity} readOnly />
            </div>
          </div>

          <div className="summary-strip">
            <span>Available dates: <strong>{availableDatesRaw ? 'loaded' : 'not loaded'}</strong></span>
            <span>Hold: <strong>{holdRaw ? 'loaded' : 'not loaded'}</strong></span>
            <span>Reservation: <strong>{reservationRaw ? 'loaded' : 'not loaded'}</strong></span>
          </div>

          <div className="action-grid action-grid-compact">
            <button className="secondary-button" onClick={createHold} type="button">Create temporary seat</button>
            <button className="primary-button" onClick={bookReservation} type="button">Book reservation</button>
          </div>
        </div>

        {reservationDetails ? (
          <div className="section-card">
            <div className="section-title-row">
              <h2>4. Reservation result</h2>
              <p className="section-copy">Clean summary from <code>/api/svp/exam-reservations</code>.</p>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span>Reservation ID</span>
                <strong>{reservationDetails.id || 'N/A'}</strong>
              </div>
              <div className="detail-item">
                <span>Status</span>
                <strong>{reservationDetails.status || 'Created'}</strong>
              </div>
              <div className="detail-item">
                <span>Exam Session ID</span>
                <strong>{reservationDetails.examSessionId || 'N/A'}</strong>
              </div>
              <div className="detail-item">
                <span>Occupation ID</span>
                <strong>{reservationDetails.occupationId || 'N/A'}</strong>
              </div>
              <div className="detail-item">
                <span>Language Code</span>
                <strong>{reservationDetails.languageCode || 'N/A'}</strong>
              </div>
              <div className="detail-item">
                <span>Methodology</span>
                <strong>{reservationDetails.methodology || 'N/A'}</strong>
              </div>
              <div className="detail-item">
                <span>Site ID</span>
                <strong>{reservationDetails.siteId || 'N/A'}</strong>
              </div>
              <div className="detail-item">
                <span>Site City</span>
                <strong>{reservationDetails.siteCity || 'N/A'}</strong>
              </div>
            </div>
          </div>
        ) : null}

        {out ? (
          <div className="info-banner">
            <span>Status</span>
            <strong>{out}</strong>
          </div>
        ) : null}
      </div>
    </div>
  );
}
