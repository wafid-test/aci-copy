import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

function pickArray(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.results)) return json.results;
  return null;
}

function extractHoldId(json) {
  return json?.hold_id || json?.id || json?.data?.hold_id || json?.data?.id || null;
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
  const [languageCode, setLanguageCode] = useState('MTDBB');
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
      setOut(JSON.stringify(res, null, 2));
      const arr = pickArray(res);
      if (!occupationId && arr?.[0]?.id) setOccupationId(String(arr[0].id));
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
      setOut(JSON.stringify(res, null, 2));
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
      setOut(JSON.stringify(res, null, 2));
      const arr = pickArray(res);
      const firstId = arr?.[0]?.id || arr?.[0]?.exam_session_id;
      if (firstId) setSelectedSessionId(String(firstId));
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
      setOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
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
          site_id: null,
          site_city: null,
          hold_id: holdRaw ? extractHoldId(holdRaw) : null,
          methodology,
        },
      });
      setReservationRaw(res);
      setOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    }
  }

  const sessionList = useMemo(() => pickArray(sessionsRaw) || [], [sessionsRaw]);
  const occupationList = useMemo(() => pickArray(occupationsRaw) || [], [occupationsRaw]);

  return (
    <div className="container">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Exam Search + Booking</h2>
        <Link href="/dashboard">Back</Link>
      </div>

      <div className="card">
        <h3>1) Search Available Dates</h3>
        <form onSubmit={searchAvailableDates}>
          <div className="row">
            <div>
              <label>category_id</label>
              <input value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
            </div>
            <div>
              <label>start_at_date_from (YYYY-MM-DD)</label>
              <input value={startDateFrom} onChange={(e) => setStartDateFrom(e.target.value)} placeholder="auto = today" />
            </div>
          </div>

          <div className="row">
            <div>
              <label>per_page</label>
              <input value={perPage} onChange={(e) => setPerPage(e.target.value)} />
            </div>
            <div>
              <label>available_seats</label>
              <input value={availableSeats} onChange={(e) => setAvailableSeats(e.target.value)} />
            </div>
            <div>
              <label>status</label>
              <input value={status} onChange={(e) => setStatus(e.target.value)} />
            </div>
          </div>

          <button type="submit">Search Dates</button>
          <p className="small">API: <code>/api/svp/available-dates</code></p>
        </form>
      </div>

      <div className="card">
        <h3>2) Load Sessions</h3>
        <div className="row">
          <div>
            <label>city</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label>exam_date</label>
            <input value={examDate} onChange={(e) => setExamDate(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
        </div>
        <button onClick={loadExamSessions}>Load Sessions</button>

        {sessionList.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <label>Pick exam_session_id</label>
            <select value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)}>
              {sessionList.map((session) => (
                <option key={session.id || session.exam_session_id} value={session.id || session.exam_session_id}>
                  #{session.id || session.exam_session_id} {session.city ? `- ${session.city}` : ''} {session.start_at ? `- ${session.start_at}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="card">
        <h3>3) Booking</h3>
        <div className="row">
          <div>
            <label>methodology</label>
            <select value={methodology} onChange={(e) => setMethodology(e.target.value)}>
              <option value="in_person">in_person</option>
              <option value="remote">remote</option>
            </select>
          </div>
          <div>
            <label>language_code</label>
            <input value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div>
            <label>occupation_id</label>
            <input value={occupationId} onChange={(e) => setOccupationId(e.target.value)} placeholder="ex: 2023" />
            <button style={{ marginTop: 8 }} onClick={loadOccupations} type="button">
              Load occupations helper
            </button>
            {occupationList.length > 0 && (
              <select value={occupationId} onChange={(e) => setOccupationId(e.target.value)} style={{ marginTop: 8 }}>
                {occupationList.map((occupation) => (
                  <option key={occupation.id} value={occupation.id}>
                    {occupation.id} {occupation.name ? `- ${occupation.name}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label>Selected exam_session_id</label>
            <input value={selectedSessionId} readOnly />
            <p className="small">Temporary seat is optional, but recommended.</p>
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={createHold} type="button">Create temporary seat</button>
          <button onClick={bookReservation} type="button">Book reservation</button>
        </div>

        <p className="small">
          Last available dates payload: {availableDatesRaw ? 'loaded' : 'not loaded'}.
          Last hold payload: {holdRaw ? 'loaded' : 'not loaded'}.
          Last reservation payload: {reservationRaw ? 'loaded' : 'not loaded'}.
        </p>
      </div>

      <div className="card">
        <h3>Output</h3>
        <pre>{out}</pre>
      </div>
    </div>
  );
}
