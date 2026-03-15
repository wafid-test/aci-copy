import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import { api } from '../../lib/api';

const DEFAULT_CATEGORY_ID = '159';

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
  return item?.name || item?.english_name || item?.occupation_name || item?.title || `Occupation #${item?.id || item?.occupation_id || ''}`;
}

function getOccupationId(item) {
  return item?.id || item?.occupation_id || item?.value || '';
}

function normalizeOccupation(item) {
  const id = getOccupationId(item);
  const languageSource = item?.prometric_codes || item?.category?.prometric_codes || [];
  return {
    raw: item,
    id,
    name: toOptionLabel(item),
    categoryId: item?.category_id || item?.category?.id || '',
    methodology: item?.methodology_type || item?.methodology || 'in_person',
    languageCodes: pickArray(languageSource).map((code) => ({
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
  return toLocalIsoDate(parsed);
}

function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAvailableDateCity(item) {
  if (!item || typeof item === 'string') return '';
  const siteCity = item.site_city;
  const normalizedSiteCity = typeof siteCity === 'object' ? (siteCity?.name || siteCity?.city || siteCity?.english_name || '') : siteCity;
  const testCenterCity = item?.test_center?.city;
  const normalizedTestCenterCity = typeof testCenterCity === 'object'
    ? (testCenterCity?.name || testCenterCity?.city || testCenterCity?.english_name || '')
    : testCenterCity;
  return String(
    item.city ||
      normalizedSiteCity ||
      item.site_city_name ||
      item.test_center_city ||
      normalizedTestCenterCity ||
      item.site?.city ||
      ''
  ).trim();
}

function getAvailableDateIso(item) {
  if (typeof item === 'string') return normalizeDateValue(item);
  return normalizeDateValue(
    item?.date ||
      item?.available_date ||
      item?.exam_date ||
      item?.start_date_in_browser_time_zone ||
      item?.start_date_in_tc_time_zone ||
      item?.start_at_date ||
      item?.start_at ||
      item?.scheduled_at ||
      ''
  );
}

function normalizeAvailableDateEntries(items) {
  const map = new Map();
  items.forEach((item) => {
    const date = getAvailableDateIso(item);
    const city = getAvailableDateCity(item);
    if (!date || !city) return;
    const key = `${city}__${date}`;
    if (!map.has(key)) map.set(key, { city, date });
  });
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date) || a.city.localeCompare(b.city));
}

function getSessionId(item) {
  return item?.id || item?.session_id || item?.exam_session_id || '';
}

function getSessionSiteId(item) {
  return item?.site_id || item?.test_center?.site_id || item?.test_center?.id || item?.site?.id || '';
}

function getSessionSiteCity(item) {
  const siteCity = item?.site_city;
  return (
    (typeof siteCity === 'object' ? (siteCity?.name || siteCity?.city || siteCity?.english_name) : siteCity) ||
    item?.test_center?.city ||
    item?.city ||
    item?.site_city_name ||
    item?.test_center_city ||
    ''
  );
}

function getSessionCenterName(item) {
  return (
    item?.test_center_name ||
    item?.test_center?.name ||
    item?.test_center?.test_center_name ||
    `${getSessionSiteCity(item) || 'Center'}${getSessionSiteId(item) ? ` (#${getSessionSiteId(item)})` : ''}`
  );
}

function getCenterKey(item) {
  return String(getSessionSiteId(item) || getSessionId(item) || '');
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
    const siteId = getCenterKey(item);
    if (!siteId || map.has(siteId)) return;
    map.set(siteId, { siteId, name: getSessionCenterName(item), city: getSessionSiteCity(item) });
  });
  return Array.from(map.values());
}

function buildCityOptions(entries) {
  return Array.from(new Set(entries.map((item) => item.city).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function buildDateOptions(entries, city) {
  return Array.from(
    new Set(
      entries
        .filter((item) => (city ? String(item.city) === String(city) : true))
        .map((item) => item.date)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
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

  for (let index = 0; index < leading; index += 1) items.push({ key: `empty-start-${index}`, empty: true });
  for (let day = 1; day <= total; day += 1) {
    const current = new Date(year, month, day);
    const iso = toLocalIsoDate(current);
    items.push({ key: iso, iso, day, available: availableSet.has(iso) });
  }
  while (items.length % 7 !== 0) items.push({ key: `empty-end-${items.length}`, empty: true });
  return items;
}

function formatDateLabel(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function readNumeric(payload, keys) {
  for (const key of keys) {
    const value = payload?.[key] ?? payload?.data?.[key] ?? payload?.result?.[key];
    if (value !== undefined && value !== null && value !== '') {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
    }
  }
  return 0;
}

function detectBookingMode(balance) {
  const reservationCredits = readNumeric(balance, ['reservation_credits', 'reservationCredits']);
  const freeCertificates = readNumeric(balance, ['free_certificates_total', 'freeCertificatesTotal']);

  if (reservationCredits > 0) {
    return { type: 'reservation_credit', label: 'Reservation Credit', reservationCredits, freeCertificates };
  }
  if (freeCertificates > 0) {
    return { type: 'free_certificate', label: 'Free Certificate', reservationCredits, freeCertificates };
  }
  return { type: 'paid', label: 'Paid Booking', reservationCredits, freeCertificates };
}

export default function BookingPage() {
  const router = useRouter();
  const [occupations, setOccupations] = useState([]);
  const [availableDateEntries, setAvailableDateEntries] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedOccupationId, setSelectedOccupationId] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [availableDate, setAvailableDate] = useState('');
  const [calendarMonth, setCalendarMonth] = useState('');
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORY_ID);
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
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const selectedOccupation = useMemo(
    () => occupations.find((item) => String(item.id) === String(selectedOccupationId)) || null,
    [occupations, selectedOccupationId]
  );

  const cityOptions = useMemo(() => buildCityOptions(availableDateEntries), [availableDateEntries]);
  const availableDates = useMemo(() => buildDateOptions(availableDateEntries, selectedCity), [availableDateEntries, selectedCity]);
  const cityFilteredSessions = useMemo(
    () =>
      (selectedCity
        ? sessions.filter((item) => String(getSessionSiteCity(item)).trim().toLowerCase() === String(selectedCity).trim().toLowerCase())
        : sessions),
    [sessions, selectedCity]
  );
  const centerOptions = useMemo(() => buildCenterOptions(cityFilteredSessions), [cityFilteredSessions]);
  const filteredSessions = useMemo(
    () => (selectedCenterId ? cityFilteredSessions.filter((item) => getCenterKey(item) === String(selectedCenterId)) : cityFilteredSessions),
    [cityFilteredSessions, selectedCenterId]
  );
  const selectedSession = useMemo(
    () => filteredSessions.find((item) => String(getSessionId(item)) === String(sessionId)) || null,
    [filteredSessions, sessionId]
  );
  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth || availableDate || normalizeDateValue(new Date().toISOString()), availableDates),
    [calendarMonth, availableDate, availableDates]
  );
  const calendarBaseMonth = calendarMonth || (availableDate ? availableDate.slice(0, 7) : normalizeDateValue(new Date().toISOString()).slice(0, 7));
  const calendarCursorDate = useMemo(() => new Date(`${calendarBaseMonth}-01T00:00:00`), [calendarBaseMonth]);
  const calendarYear = calendarCursorDate.getFullYear();
  const calendarYearOptions = useMemo(() => {
    const years = availableDates.map((item) => Number(String(item).slice(0, 4))).filter((item) => Number.isInteger(item));
    const fallback = new Date().getFullYear();
    const minYear = years.length ? Math.min(...years) : fallback;
    const maxYear = years.length ? Math.max(...years) : fallback + 1;
    const options = [];
    for (let year = minYear; year <= maxYear; year += 1) options.push(year);
    return options.length ? options : [fallback, fallback + 1];
  }, [availableDates]);
  const bookingMode = useMemo(() => detectBookingMode(balanceInfo), [balanceInfo]);

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
    if (router.query.languageCode) setLanguageCode(String(router.query.languageCode));
    if (router.query.siteCity) setSelectedCity(String(router.query.siteCity));
    if (router.query.siteId) setSelectedCenterId(String(router.query.siteId));
    if (router.query.siteId) setSiteId(String(router.query.siteId));
    if (router.query.siteCity) setSiteCity(String(router.query.siteCity));
    if (router.query.examDate) {
      const examDate = normalizeDateValue(String(router.query.examDate));
      setAvailableDate(examDate);
      setCalendarMonth(examDate.slice(0, 7));
    }
    if (router.query.reschedule === '1') setStatus('Reschedule mode active. Follow the steps to rebook.');
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!selectedOccupation) return;
    setCategoryId(String(selectedOccupation.categoryId || DEFAULT_CATEGORY_ID));
    setLanguageCode((prev) => prev || String(selectedOccupation.languageCodes[0]?.code || ''));
    setMethodology(String(selectedOccupation.methodology || 'in_person'));
    setSelectedCity('');
    setAvailableDate('');
    setAvailableDateEntries([]);
    setSessions([]);
    setSelectedCenterId('');
    setSessionId('');
    setHoldId('');
    setReservationId('');
  }, [selectedOccupation]);

  useEffect(() => {
    setAvailableDate('');
    setSessions([]);
    setSelectedCenterId('');
    setSessionId('');
    setSiteId('');
    setSiteCity(selectedCity || '');
    setHoldId('');
    setReservationId('');
    if (selectedCity) {
      setStatus(`City selected: ${selectedCity}. Loading sessions for the selected date.`);
    }
  }, [selectedCity]);

  useEffect(() => {
    let active = true;
    async function loadDates() {
      if (!selectedOccupationId) {
        setAvailableDateEntries([]);
        setAvailableDate('');
        return;
      }

      setLoadingDates(true);
      setError('');
      try {
        const startFromDate = normalizeDateValue(new Date().toISOString());
        const params = new URLSearchParams({
          per_page: '1000',
          category_id: String(categoryId || DEFAULT_CATEGORY_ID),
          start_at_date_from: startFromDate,
          available_seats: 'greater_than::0',
          status: 'scheduled',
          locale: 'en',
        });
        const data = await api(`/api/svp/available-dates?${params.toString()}`);
        const entries = normalizeAvailableDateEntries(pickArray(data));
        if (!active) return;
        const cities = buildCityOptions(entries);
        setAvailableDateEntries(entries);
        setSelectedCity((prev) => (prev && cities.includes(prev) ? prev : cities[0] || ''));
      } catch (err) {
        if (!active) return;
        setAvailableDateEntries([]);
        setError(err?.message || 'Failed to load available dates');
      } finally {
        if (active) setLoadingDates(false);
      }
    }
    loadDates();
    return () => {
      active = false;
    };
  }, [selectedOccupationId, categoryId]);

  useEffect(() => {
    setAvailableDate((prev) => (prev && availableDates.includes(prev) ? prev : availableDates[0] || ''));
    setCalendarMonth(availableDates[0] ? availableDates[0].slice(0, 7) : normalizeDateValue(new Date().toISOString()).slice(0, 7));
  }, [availableDates]);

  useEffect(() => {
    if (!selectedCity || !availableDates.length) {
      setIsDatePickerOpen(false);
    }
  }, [selectedCity, availableDates.length]);

  useEffect(() => {
    let active = true;
    async function loadBalance() {
      if (!selectedOccupationId) {
        setBalanceInfo(null);
        return;
      }
      setLoadingBalance(true);
      try {
        const params = new URLSearchParams({
          methodology_type: methodology || 'in_person',
          occupation_id: String(selectedOccupationId),
          locale: 'en',
        });
        const data = await api(`/api/svp/user-balance?${params.toString()}`);
        if (!active) return;
        setBalanceInfo(data);
      } catch {
        if (!active) return;
        setBalanceInfo(null);
      } finally {
        if (active) setLoadingBalance(false);
      }
    }
    loadBalance();
    return () => {
      active = false;
    };
  }, [selectedOccupationId, methodology]);

  useEffect(() => {
    let active = true;
    async function loadSessions() {
      if (!selectedCity || !availableDate || !categoryId) {
        setSessions([]);
        return;
      }

      setLoadingSessions(true);
      setError('');
      try {
        const params = new URLSearchParams({
          category_id: String(categoryId),
          city: String(selectedCity),
          exam_date: availableDate,
          locale: 'en',
        });
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
  }, [selectedCity, availableDate, categoryId]);

  useEffect(() => {
    if (!centerOptions.length) {
      setSelectedCenterId('');
      return;
    }
    const hasSelected = centerOptions.some((item) => String(item.siteId) === String(selectedCenterId));
    if (!selectedCenterId || !hasSelected) setSelectedCenterId(String(centerOptions[0].siteId));
  }, [centerOptions, selectedCenterId]);

  useEffect(() => {
    if (!filteredSessions.length) {
      setSessionId('');
      return;
    }
    const hasSelected = filteredSessions.some((item) => String(getSessionId(item)) === String(sessionId));
    if (!sessionId || !hasSelected) setSessionId(String(getSessionId(filteredSessions[0])));
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
    if (codes[0]?.code || codes[0]?.language_code) setLanguageCode(String(codes[0].code || codes[0].language_code));
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
          exam_session_id: [Number(sessionId)],
          methodology: methodology || 'in_person',
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
    const sessionCodes = getPrometricCodes(selectedSession);
    const effectiveLanguageCode =
      languageCode ||
      selectedOccupation?.languageCodes?.[0]?.code ||
      sessionCodes?.[0]?.code ||
      sessionCodes?.[0]?.language_code ||
      '';
    if (!effectiveLanguageCode) {
      setError('language_code is required. Select a language before booking.');
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
          methodology: methodology || 'in_person',
          language_code: effectiveLanguageCode,
          site_id: siteId ? Number(siteId) : null,
          site_city: siteCity || selectedCity || null,
          hold_id: holdId ? Number(holdId) : null,
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

  function shiftCalendarMonth(delta) {
    const base = new Date(`${calendarBaseMonth}-01T00:00:00`);
    base.setMonth(base.getMonth() + delta);
    setCalendarMonth(`${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`);
  }

  function pickDateFromCalendar(nextDate) {
    setAvailableDate(nextDate);
    setCalendarMonth(nextDate.slice(0, 7));
    setIsDatePickerOpen(false);
  }

  return (
    <div className="booking-shell">
      <div className="booking-modal">
        <div className="modal-head">
          <h1>Create New Booking</h1>
          <Link href="/dashboard" className="close-link" aria-label="Close">
            x
          </Link>
        </div>
        <div className="modal-meta-links">
          <Link href="/exam/reservations">My bookings</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>

        {status ? <div className="notice notice--ok">{status}</div> : null}
        {error ? <div className="notice notice--error">{error}</div> : null}

        <div className="form-grid">
          <div className="field-block">
            <span>PACC Credential *</span>
            <div className="readonly-value">Using current logged-in SVP session</div>
          </div>

          <div className="field-block">
            <span>Occupation *</span>
            <select value={selectedOccupationId} onChange={(e) => setSelectedOccupationId(e.target.value)}>
              <option value="">{loadingOccupations ? 'Loading occupations...' : 'Select occupation'}</option>
              {occupations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-block">
            <span>City *</span>
            <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} disabled={!selectedOccupationId}>
              <option value="">Select city</option>
              {cityOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="field-block field-block--datepicker">
            <span>Available Date *</span>
            <button
              type="button"
              className="date-trigger"
              onClick={() => setIsDatePickerOpen((prev) => !prev)}
              disabled={loadingDates || !availableDates.length || !selectedCity}
            >
              <span>{availableDate ? formatDateLabel(availableDate) : 'Select available date...'}</span>
              <span className="date-trigger__icon">[]</span>
            </button>
            {isDatePickerOpen && selectedCity && availableDates.length ? (
              <div className="date-popup">
                <div className="date-popup__head">
                  <strong>Select Date</strong>
                  <button type="button" className="icon-btn" onClick={() => setIsDatePickerOpen(false)}>
                    x
                  </button>
                </div>
                <div className="date-popup__toolbar">
                  <button type="button" className="icon-btn" onClick={() => shiftCalendarMonth(-1)}>
                    {'<'}
                  </button>
                  <select
                    className="toolbar-select"
                    value={calendarCursorDate.getMonth()}
                    onChange={(e) => {
                      const next = new Date(calendarCursorDate);
                      next.setMonth(Number(e.target.value));
                      setCalendarMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
                    }}
                  >
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index} value={index}>
                        {new Date(2000, index, 1).toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    className="toolbar-select"
                    value={calendarYear}
                    onChange={(e) => {
                      const next = new Date(calendarCursorDate);
                      next.setFullYear(Number(e.target.value));
                      setCalendarMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
                    }}
                  >
                    {calendarYearOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="icon-btn" onClick={() => shiftCalendarMonth(1)}>
                    {'>'}
                  </button>
                </div>
                <div className="calendar-weekdays">
                  <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>
                <div className="calendar-grid">
                  {calendarDays.map((item) =>
                    item.empty ? (
                      <div key={item.key} className="calendar-cell calendar-cell--empty" />
                    ) : (
                      <button
                        key={item.key}
                        type="button"
                        className={`calendar-cell${item.available ? ' calendar-cell--available' : ''}${item.iso === availableDate ? ' calendar-cell--active' : ''}`}
                        onClick={() => item.available && pickDateFromCalendar(item.iso)}
                        disabled={!item.available}
                      >
                        <span>{item.day}</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {!loadingDates && selectedCity && !availableDates.length ? (
            <small className="error-text">
              No available dates found yet. Try another city or occupation.
            </small>
          ) : null}

          <div className="field-block">
            <span>Test Center *</span>
            <select value={selectedCenterId} onChange={(e) => setSelectedCenterId(e.target.value)} disabled={!centerOptions.length}>
              <option value="">{loadingSessions ? 'Loading centers...' : 'Select test center'}</option>
              {centerOptions.map((item) => (
                <option key={item.siteId} value={item.siteId}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-block">
            <span>Exam Session *</span>
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
            <span>Language *</span>
            <select value={languageCode} onChange={(e) => setLanguageCode(e.target.value)}>
              <option value="">Select language</option>
              {selectedOccupation?.languageCodes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.englishName} {item.code ? `(${item.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="meta-grid">
          <div><span>Booking Type:</span> <strong>{loadingBalance ? 'Checking...' : bookingMode.label}</strong></div>
          <div><span>Reservation Credits:</span> <strong>{loadingBalance ? '-' : bookingMode.reservationCredits}</strong></div>
          <div><span>Free Certificates:</span> <strong>{loadingBalance ? '-' : bookingMode.freeCertificates}</strong></div>
          <div><span>City:</span> <strong>{siteCity || selectedCity || '-'}</strong></div>
          <div><span>Site ID:</span> <strong>{siteId || '-'}</strong></div>
          <div><span>Hold ID:</span> <strong>{holdId || '-'}</strong></div>
          <div><span>Booking No:</span> <strong>{reservationId || '-'}</strong></div>
        </div>

        <div className="actions-row">
          <button className="ghost-btn" type="button" onClick={createHold} disabled={creatingHold || !sessionId}>
            {creatingHold ? 'Creating hold...' : 'Create Hold'}
          </button>
          <button className="primary-btn" type="button" onClick={bookReservation} disabled={booking || !sessionId}>
            {booking ? 'Booking...' : 'Book Now'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .booking-shell {
          min-height: 100vh;
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 20% 10%, rgba(22, 203, 161, 0.08), transparent 30%),
            radial-gradient(circle at 80% 90%, rgba(20, 116, 237, 0.12), transparent 35%),
            #070d19;
          color: #d9e4ff;
        }
        .booking-modal {
          width: min(760px, 100%);
          border-radius: 16px;
          padding: 18px;
          background: linear-gradient(180deg, #1a2a42 0%, #1a2740 100%);
          border: 1px solid rgba(148, 163, 184, 0.25);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
          position: relative;
        }
        .modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .modal-head h1 {
          margin: 0;
          font-size: 24px;
          letter-spacing: 0.02em;
        }
        .close-link {
          text-decoration: none;
          color: #99aacd;
          font-weight: 700;
          font-size: 20px;
        }
        .modal-meta-links {
          display: flex;
          gap: 12px;
          margin-bottom: 14px;
        }
        .modal-meta-links a {
          color: #8fdcff;
          text-decoration: none;
          font-size: 13px;
        }
        .notice {
          margin-bottom: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
        }
        .notice--ok { background: rgba(22, 163, 74, 0.2); color: #7cf2ae; }
        .notice--error { background: rgba(239, 68, 68, 0.18); color: #ffabab; }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .field-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
        }
        .field-block span {
          font-size: 13px;
          color: #b7c6e6;
          font-weight: 700;
        }
        .readonly-value,
        .field-block input,
        .field-block select,
        .date-trigger {
          min-height: 46px;
          border-radius: 10px;
          border: 1px solid rgba(123, 145, 184, 0.45);
          background: #031130;
          color: #f1f6ff;
          padding: 0 12px;
          font-size: 16px;
          width: 100%;
        }
        .readonly-value {
          display: flex;
          align-items: center;
          color: #c2d5ff;
        }
        .date-trigger {
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-align: left;
          cursor: pointer;
        }
        .date-trigger:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .date-trigger__icon {
          font-size: 13px;
          color: #84d6e9;
          letter-spacing: -0.1em;
        }
        .field-block--datepicker {
          z-index: 5;
        }
        .date-popup {
          position: absolute;
          left: 0;
          top: calc(100% + 8px);
          width: min(420px, 96vw);
          border-radius: 12px;
          background: #1f2e45;
          border: 1px solid rgba(110, 128, 159, 0.6);
          padding: 12px;
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.55);
        }
        .date-popup__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .date-popup__toolbar {
          display: grid;
          grid-template-columns: 34px 1fr 88px 34px;
          gap: 6px;
          margin-bottom: 10px;
          align-items: center;
        }
        .icon-btn {
          min-height: 32px;
          border-radius: 8px;
          border: 1px solid rgba(122, 142, 173, 0.5);
          background: #11203a;
          color: #d8e8ff;
          cursor: pointer;
        }
        .toolbar-select {
          min-height: 32px;
          border-radius: 8px;
          border: 1px solid rgba(122, 142, 173, 0.5);
          background: #11203a;
          color: #d8e8ff;
          padding: 0 8px;
        }
        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          color: #9cb0d4;
          font-size: 12px;
          margin-bottom: 6px;
          text-align: center;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
        }
        .calendar-cell {
          min-height: 38px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: #6d83ad;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: not-allowed;
        }
        .calendar-cell--empty { visibility: hidden; }
        .calendar-cell--available {
          background: rgba(52, 211, 153, 0.16);
          border-color: rgba(94, 234, 212, 0.45);
          color: #b8ffe5;
          cursor: pointer;
        }
        .calendar-cell--active {
          background: #8bf4c4;
          border-color: #8bf4c4;
          color: #163224;
          font-weight: 800;
        }
        .error-text {
          color: #ffb3b3;
          font-size: 12px;
          margin-top: -3px;
        }
        .meta-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          background: rgba(3, 12, 32, 0.45);
          border: 1px solid rgba(100, 125, 164, 0.4);
          border-radius: 12px;
          padding: 12px;
        }
        .meta-grid div { font-size: 13px; color: #9bb3d9; }
        .meta-grid strong { color: #e6f0ff; }
        .actions-row {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .ghost-btn,
        .primary-btn {
          min-height: 44px;
          border-radius: 10px;
          font-weight: 700;
          border: 1px solid rgba(113, 137, 177, 0.5);
          cursor: pointer;
        }
        .ghost-btn {
          background: #0a1833;
          color: #c5d9ff;
        }
        .primary-btn {
          background: linear-gradient(135deg, #2f7df8 0%, #1ecdb3 100%);
          color: #fff;
          border-color: transparent;
        }
        .ghost-btn:disabled,
        .primary-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        @media (max-width: 760px) {
          .booking-shell { padding: 10px; align-items: flex-start; }
          .booking-modal { padding: 14px; border-radius: 14px; }
          .modal-head h1 { font-size: 22px; }
          .form-grid,
          .meta-grid,
          .actions-row { grid-template-columns: 1fr; }
          .date-popup { width: calc(100vw - 44px); }
        }
      `}</style>
    </div>
  );
}
