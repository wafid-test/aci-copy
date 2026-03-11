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

function extractPaymentId(json) {
  return json?.payment?.id || json?.payment_id || json?.id || json?.data?.payment?.id || json?.data?.payment_id || json?.data?.id || null;
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

function getPaymentDetails(json, fallback = {}) {
  const payment = json?.payment || json?.data?.payment || json?.data || json || {};
  return {
    id: extractPaymentId(json),
    status: payment?.status || json?.status || json?.data?.status || fallback.status || null,
    paymentMethod: payment?.payment_method || fallback.paymentMethod || null,
    payableType: payment?.payable_type || fallback.payableType || null,
    payableId: payment?.payable_id || fallback.payableId || null,
    amount: payment?.amount ?? fallback.amount ?? null,
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
  return session?.test_center_name || session?.test_center?.name || 'Unknown Center';
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
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentId, setPaymentId] = useState('');
  const [paymentRaw, setPaymentRaw] = useState(null);
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

  async function createPayment() {
    const reservationId = extractReservationId(reservationRaw);
    if (!reservationId) {
      setOut('Create reservation first.');
      return;
    }

    setOut('Creating payment...');
    try {
      const res = await api('/api/svp/payments', {
        method: 'POST',
        body: {
          payment: {
            payment_method: paymentMethod,
            payable_type: 'Reservation',
            payable_id: Number(reservationId),
          },
        },
      });
      setPaymentRaw(res);
      const pid = extractPaymentId(res);
      if (pid) setPaymentId(String(pid));
      setOut('Payment created successfully.');
    } catch (e) {
      setOut(e?.data?.message || e?.message || 'Payment create request failed.');
    }
  }

  async function finalizePayment() {
    if (!paymentId) {
      setOut('Payment ID is required.');
      return;
    }

    setOut('Finalizing payment...');
    try {
      const res = await api(`/api/svp/payments/${encodeURIComponent(paymentId)}`, {
        method: 'PUT',
      });
      setPaymentRaw(res);
      setOut('Payment finalized successfully.');
    } catch (e) {
      setOut(e?.data?.message || e?.message || 'Payment finalize request failed.');
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
  const paymentDetails = useMemo(
    () => (
      paymentRaw
        ? getPaymentDetails(paymentRaw, {
            paymentMethod,
            payableType: 'Reservation',
            payableId: reservationDetails?.id || null,
          })
        : null
    ),
    [paymentRaw, paymentMethod, reservationDetails]
  );
  const selectedSession = useMemo(
    () => sessionList.find((session) => String(getSessionId(session)) === String(selectedSessionId)) || null,
    [sessionList, selectedSessionId]
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
    if (!selectedSession) return;
    setSiteId(String(getSessionSiteId(selectedSession) || ''));
    setSiteCity(String(getSessionSiteCity(selectedSession) || ''));
    if (!city) {
      const nextCity = getSessionSiteCity(selectedSession);
      if (nextCity) setCity(String(nextCity));
    }
  }, [sessionList, selectedSessionId, city]);

  return (
    <div className="booking-shell">
      <div className="booking-panel">
        <div className="booking-header">
          <div>
            <h1>Create New Booking</h1>
            <p>{out || 'Using live SVP session and real API data.'}</p>
          </div>
          <Link className="text-link booking-back" href="/dashboard">Back</Link>
        </div>

        <div className="booking-block">
          <label>Occupation *</label>
          <div className="booking-grid booking-grid-three">
            <div className="booking-field">
              <label>per_page</label>
              <input value={perPage} onChange={(e) => setPerPage(e.target.value)} />
            </div>
            <div className="booking-field">
              <label>page</label>
              <input value="1" readOnly />
            </div>
            <div className="booking-field">
              <label>name</label>
              <input value="" readOnly placeholder="optional" />
            </div>
          </div>
          <button className="booking-load" type="button" onClick={loadOccupations}>Load Occupations</button>
          {occupationList.length > 0 && (
            <select value={occupationId} onChange={(e) => setOccupationId(e.target.value)}>
              {occupationList.map((occupation) => (
                <option key={occupation.id} value={occupation.id}>
                  {occupation.name} (#{occupation.id})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="booking-grid">
          <div className="booking-field">
            <label>City *</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="booking-field">
            <label>Available Date *</label>
            <input value={examDate} onChange={(e) => setExamDate(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
        </div>

        <div className="booking-grid">
          <div className="booking-field">
            <label>Category Id</label>
            <input value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
          </div>
          <div className="booking-field">
            <label>Methodology</label>
            <select value={methodology} onChange={(e) => setMethodology(e.target.value)}>
              <option value="in_person">in_person</option>
              <option value="remote">remote</option>
            </select>
          </div>
        </div>

        <div className="booking-grid">
          <div className="booking-field">
            <label>site_id (auto)</label>
            <input value={siteId} readOnly />
          </div>
          <div className="booking-field">
            <label>site_city (auto)</label>
            <input value={siteCity} readOnly />
          </div>
        </div>

        <button className="booking-load" type="button" onClick={searchAvailableDates}>Search Available Dates</button>
        <button className="booking-load" type="button" onClick={loadExamSessions}>Load Test Sessions</button>

        {sessionList.length > 0 && (
          <div className="booking-field">
            <label>Test Center / Session *</label>
            <select value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)}>
              {sessionList.map((session) => (
                <option key={getSessionId(session)} value={getSessionId(session)}>
                  {getSessionLabel(session)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="booking-field">
          <label>Language Code</label>
          {languageOptions.length > 0 ? (
            <select value={languageCode} onChange={(e) => setLanguageCode(e.target.value)}>
              {languageOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.english_name || option.code}
                </option>
              ))}
            </select>
          ) : (
            <input value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} />
          )}
        </div>

        <div className="booking-actions">
          <button className="booking-action" type="button" onClick={createHold}>Create Hold</button>
          <button className="booking-action" type="button" onClick={bookReservation}>Book</button>
        </div>

        {reservationDetails ? (
          <div className="booking-result">
            <h3>Reservation Details</h3>
            <div className="detail-grid">
              <div className="detail-item"><span>Reservation ID</span><strong>{reservationDetails.id || 'N/A'}</strong></div>
              <div className="detail-item"><span>Status</span><strong>{reservationDetails.status || 'Created'}</strong></div>
              <div className="detail-item"><span>Exam Session ID</span><strong>{reservationDetails.examSessionId || 'N/A'}</strong></div>
              <div className="detail-item"><span>Occupation ID</span><strong>{reservationDetails.occupationId || 'N/A'}</strong></div>
              <div className="detail-item"><span>Language Code</span><strong>{reservationDetails.languageCode || 'N/A'}</strong></div>
              <div className="detail-item"><span>Site ID</span><strong>{reservationDetails.siteId || 'N/A'}</strong></div>
            </div>
          </div>
        ) : null}

        {reservationDetails ? (
          <>
            <div className="booking-grid">
              <div className="booking-field">
                <label>Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="card">card</option>
                </select>
              </div>
              <div className="booking-field">
                <label>payment_id</label>
                <input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="auto after create payment" />
              </div>
            </div>

            <div className="booking-actions">
              <button className="booking-action" type="button" onClick={createPayment}>Create Payment</button>
              <button className="booking-action" type="button" onClick={finalizePayment}>Finalize Payment</button>
            </div>
          </>
        ) : null}

        {paymentDetails ? (
          <div className="booking-result">
            <h3>Payment Details</h3>
            <div className="detail-grid">
              <div className="detail-item"><span>Payment ID</span><strong>{paymentDetails.id || paymentId || 'N/A'}</strong></div>
              <div className="detail-item"><span>Status</span><strong>{paymentDetails.status || 'Created'}</strong></div>
              <div className="detail-item"><span>Method</span><strong>{paymentDetails.paymentMethod || paymentMethod}</strong></div>
              <div className="detail-item"><span>Payable ID</span><strong>{paymentDetails.payableId || reservationDetails?.id || 'N/A'}</strong></div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
