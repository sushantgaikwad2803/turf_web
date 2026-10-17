// src/pages/PaymentScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './PaymentScreen.css';

/* =========================================================
   API
========================================================= */

const API_BASE_URL = (
  (import.meta as any).env?.VITE_API_URL ||
  'https://turf-backend-q8w4.onrender.com/api'
)
  .trim()
  .replace(/\/+$/, '');

const USER_STORAGE_KEY = '@user_data';

/* =========================================================
   TYPES
========================================================= */

interface TurfImage { url?: string; isPrimary?: boolean; }
interface Turf {
  _id?: string;
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  images?: TurfImage[];
  owner?: string | { _id?: string };
}
interface Court { _id?: string; id?: string; name?: string; sport?: string; }
interface BookingSlot {
  id: string;
  bookingKey?: string;
  startTime: string;
  endTime: string;
  startMinutes?: number;
  endMinutes?: number;
  price: number;
  isNight?: boolean;
}
interface MultiDateBooking {
  date: string;
  courtId?: string;
  slots: BookingSlot[];
  slotCount?: number;
  totalAmount?: number;
}
interface User { _id: string; name?: string; email?: string; phone?: string; role?: string; }
interface ApiResponse {
  success?: boolean;
  message?: string;
  error?: string;
  bookingId?: string;
  bookingIds?: string[];
  bookings?: any[];
  payment?: {
    _id?: string;
    totalPaid?: number;
    platformFeePercent?: number;
    platformFeeAmount?: number;
    ownerAmount?: number;
    paymentMethod?: string;
    status?: string;
  };
  [key: string]: any;
}
type PaymentStatus = 'idle' | 'loading' | 'processing' | 'success' | 'failed';

export interface PaymentScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  turf?: Turf;
  court?: Court;
  turfId?: string;
  courtId?: string;
  bookings?: MultiDateBooking[];
  date?: string;
  slots?: BookingSlot[];
  slotCount?: number;
  totalAmount?: number;
}

/* =========================================================
   HELPERS
========================================================= */

const formatMoney = (value: number): string => {
  const n = Number(value);
  return `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const getImage = (turf?: Turf): string => {
  const images = Array.isArray(turf?.images) ? turf.images : [];
  const primary = images.find(
    (i) => i?.isPrimary && typeof i.url === 'string' && i.url.trim().length > 0,
  );
  if (primary?.url) return primary.url.trim();
  const first = images.find(
    (i) => typeof i?.url === 'string' && i.url.trim().length > 0,
  );
  return first?.url?.trim() ?? '';
};

const getId = (v?: { _id?: string; id?: string }) =>
  String(v?._id || v?.id || '').trim();

const isValidObjectId = (v?: string) => !!v && /^[a-fA-F0-9]{24}$/.test(v);

const parseApiResponse = async (res: Response): Promise<ApiResponse> => {
  const rawText = await res.text();
  let data: ApiResponse = {};
  if (rawText.trim()) {
    try { data = JSON.parse(rawText); } catch { data = { message: rawText }; }
  }
  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || `Request failed with status ${res.status}`,
    );
  }
  return data;
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

const PaymentScreen: React.FC<PaymentScreenProps> = ({
  onBack,
  onSuccess,
  turf,
  court,
  turfId: routeTurfId,
  courtId: routeCourtId,
  bookings: routeBookings = [],
  date: legacyDate,
  slots: legacySlots = [],
  slotCount: legacySlotCount,
  totalAmount: legacyTotalAmount = 0,
}) => {
  /* ✅ Removed unused `user` state — userRef is the single source of truth */
  const [loadingUser, setLoadingUser] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [successfulBookingIds, setSuccessfulBookingIds] = useState<string[]>([]);
  const [successfulPayment, setSuccessfulPayment] = useState<ApiResponse['payment'] | null>(null);

  const userRef = useRef<User | null>(null);
  const mountedRef = useRef(true);
  const paymentInProgressRef = useRef(false);

  const bookingGroups = useMemo<MultiDateBooking[]>(() => {
    if (Array.isArray(routeBookings) && routeBookings.length > 0) {
      return routeBookings
        .filter((b) => b?.date && Array.isArray(b?.slots))
        .map((b) => ({
          ...b,
          date: String(b.date),
          slots: [...b.slots].sort((a, b2) => {
            const am = Number(a.startMinutes);
            const bm = Number(b2.startMinutes);
            if (Number.isFinite(am) && Number.isFinite(bm)) return am - bm;
            return String(a.startTime).localeCompare(String(b2.startTime));
          }),
          slotCount: b.slotCount ?? b.slots.length,
          totalAmount: Number(
            b.totalAmount ?? b.slots.reduce((s, x) => s + Number(x.price || 0), 0),
          ),
        }));
    }
    if (legacyDate && legacySlots.length > 0) {
      return [{
        date: String(legacyDate),
        courtId: routeCourtId || getId(court),
        slots: [...legacySlots].sort((a, b) =>
          String(a.startTime).localeCompare(String(b.startTime))),
        slotCount: legacySlotCount ?? legacySlots.length,
        totalAmount: Number(
          legacyTotalAmount || legacySlots.reduce((s, x) => s + Number(x.price || 0), 0),
        ),
      }];
    }
    return [];
  }, [court, legacyDate, legacySlotCount, legacySlots, legacyTotalAmount, routeBookings, routeCourtId]);

  const totalSlotCount = useMemo(
    () => bookingGroups.reduce((s, b) => s + Number(b.slotCount ?? b.slots.length), 0),
    [bookingGroups],
  );

  const displayedAmount = useMemo(() => {
    const calculated = bookingGroups.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
    if (calculated > 0) return calculated;
    const legacy = Number(legacyTotalAmount);
    return Number.isFinite(legacy) && legacy > 0 ? legacy : 0;
  }, [bookingGroups, legacyTotalAmount]);

  const imageUrl = useMemo(() => getImage(turf), [turf]);
  const turfId = useMemo(() => String(routeTurfId || getId(turf)).trim(), [routeTurfId, turf]);
  const courtId = useMemo(() => String(routeCourtId || getId(court)).trim(), [routeCourtId, court]);
  const isBusy = paymentStatus === 'loading' || paymentStatus === 'processing';

  const loadUser = useCallback(async () => {
    try {
      if (mountedRef.current) { setLoadingUser(true); setPaymentStatus('loading'); }
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (!stored) {
        userRef.current = null;
        if (!mountedRef.current) return;
        setPaymentStatus('idle');
        alert('Please login before making a booking.');
        onBack();
        return;
      }
      let parsed: User;
      try { parsed = JSON.parse(stored); } catch { throw new Error('Invalid saved user session.'); }
      if (!parsed?._id) throw new Error('Invalid user session.');
      userRef.current = parsed;
      if (mountedRef.current) { setPaymentStatus('idle'); }
    } catch (err) {
      userRef.current = null;
      if (!mountedRef.current) return;
      setPaymentStatus('failed');
      alert(err instanceof Error ? err.message : 'Session is invalid.');
      onBack();
    } finally {
      if (mountedRef.current) setLoadingUser(false);
    }
  }, [onBack]);

  const validateBooking = useCallback((): boolean => {
    const currentUser = userRef.current;
    if (!currentUser?._id) { alert('Please login before making a payment.'); return false; }
    if (!isValidObjectId(currentUser._id)) { alert('Your user session is invalid.'); return false; }
    if (!turfId || !isValidObjectId(turfId)) { alert('Turf information is invalid.'); return false; }
    if (!courtId || !isValidObjectId(courtId)) { alert('Court information is invalid.'); return false; }
    if (!bookingGroups.length) { alert('Please select at least one date and slot.'); return false; }
    for (const b of bookingGroups) {
      if (!b.date || !b.slots.length) { alert('Every selected date must contain at least one slot.'); return false; }
      const bCourt = String(b.courtId || courtId).trim();
      if (bCourt !== courtId) { alert('All selected dates must use the same court.'); return false; }
      const invalid = b.slots.find(
        (s) => !s?.id || !s?.startTime || !s?.endTime || !Number.isFinite(Number(s.price)) || Number(s.price) < 0,
      );
      if (invalid) { alert(`One or more slots on ${b.date} contain invalid information.`); return false; }
    }
    if (!Number.isFinite(displayedAmount) || displayedAmount <= 0) { alert('The booking amount is invalid.'); return false; }
    return true;
  }, [bookingGroups, courtId, displayedAmount, turfId]);

  const createBooking = useCallback(async () => {
    if (paymentInProgressRef.current) return;
    if (!validateBooking()) return;
    const currentUser = userRef.current;
    if (!currentUser?._id) { alert('Please login again.'); return; }

    try {
      paymentInProgressRef.current = true;
      if (mountedRef.current) {
        setPaymentStatus('processing');
        setStatusMessage('Checking slot availability and confirming your booking...');
      }
      const requestBookings = bookingGroups.map((b) => ({
        date: b.date,
        courtId: b.courtId || courtId,
        slots: b.slots.map((s) => ({
          id: s.id, bookingKey: s.bookingKey,
          startTime: s.startTime, endTime: s.endTime,
          startMinutes: s.startMinutes, endMinutes: s.endMinutes,
          price: Number(s.price || 0), isNight: s.isNight,
        })),
        slotCount: b.slots.length,
        totalAmount: b.slots.reduce((sum, s) => sum + Number(s.price || 0), 0),
      }));

      const res = await fetch(`${API_BASE_URL}/bookings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          userId: currentUser._id,
          turfId,
          courtId,
          bookings: requestBookings,
        }),
      });
      const data = await parseApiResponse(res);

      if (data?.success !== true) throw new Error(data?.message || 'Booking could not be completed.');
      const bookingIds = Array.isArray(data.bookingIds)
        ? data.bookingIds
        : data.bookingId ? [data.bookingId] : [];
      if (bookingIds.length === 0) throw new Error('No booking ID was returned.');

      if (mountedRef.current) {
        setSuccessfulBookingIds(bookingIds);
        setSuccessfulPayment(data.payment ?? null);
        setPaymentStatus('success');
        setStatusMessage('Payment successful. Your turf has been booked successfully.');
      }
      paymentInProgressRef.current = false;
      alert(`Payment Successful 🎉\n\nBooking ID: ${bookingIds[0]}`);
      onSuccess();
    } catch (err) {
      paymentInProgressRef.current = false;
      if (!mountedRef.current) return;
      setPaymentStatus('failed');
      setStatusMessage('Booking could not be completed.');
      alert(err instanceof Error ? err.message : 'Unable to complete your booking.');
    }
  }, [bookingGroups, courtId, onSuccess, turfId, validateBooking]);

  useEffect(() => {
    mountedRef.current = true;
    void loadUser();
    return () => {
      mountedRef.current = false;
      paymentInProgressRef.current = false;
    };
  }, [loadUser]);

  const handlePayNow = useCallback(() => {
    if (isBusy || paymentStatus === 'success') return;
    if (!validateBooking()) return;
    if (
      window.confirm(
        `Confirm booking for ${formatMoney(displayedAmount)}?\n\n${totalSlotCount} slot${totalSlotCount === 1 ? '' : 's'} across ${bookingGroups.length} date${bookingGroups.length === 1 ? '' : 's'}.`,
      )
    ) createBooking();
  }, [bookingGroups.length, createBooking, displayedAmount, isBusy, paymentStatus, totalSlotCount, validateBooking]);

  const handleBack = () => {
    if (isBusy) { alert('Please wait until the booking process is completed.'); return; }
    onBack();
  };

  const renderPaymentStatus = () => {
    if (paymentStatus === 'idle' && !statusMessage) return null;
    const isProcessing = paymentStatus === 'processing';
    const isSuccess = paymentStatus === 'success';
    const isFailed = paymentStatus === 'failed';

    return (
      <div className={`pm-status-card ${isProcessing ? 'green' : ''} ${isSuccess ? 'success' : ''} ${isFailed ? 'failed' : ''}`}>
        <div className="pm-status-icon">
          {isProcessing ? <span className="pm-spinner" /> : (isSuccess ? '✓' : '!')}
        </div>
        <div className="pm-status-content">
          <p className={`pm-status-title ${isSuccess ? 'success' : ''} ${isFailed ? 'failed' : ''}`}>
            {isSuccess ? 'Payment Successful 🎉' : isFailed ? 'Booking failed' : 'Confirming booking'}
          </p>
          <p className={`pm-status-message ${isSuccess ? 'success' : ''} ${isFailed ? 'failed' : ''}`}>
            {statusMessage || 'Please wait...'}
          </p>
          {isSuccess && successfulBookingIds.length > 0 && (
            <p className="pm-booking-id-text">Booking ID: {successfulBookingIds[0]}</p>
          )}
        </div>
      </div>
    );
  };

  if (loadingUser) {
    return (
      <div className="pm-safe">
        <div className="pm-center">
          <span className="pm-spinner large" />
          <p className="pm-loading-text">Loading payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pm-safe">
      {/* HEADER */}
      <div className="pm-header">
        <button className="pm-back-button" onClick={handleBack} disabled={isBusy}>‹</button>
        <h1 className="pm-header-title">Payment</h1>
        <div className="pm-header-right" />
      </div>

      <div className="pm-content">
        {paymentStatus === 'success' && (
          <div className="pm-success-banner">
            <div className="pm-success-icon">✓</div>
            <div className="pm-success-text">
              <h3 className="pm-success-title">Payment Successful 🎉</h3>
              <p className="pm-success-subtitle">Your turf has been booked successfully.</p>
              {successfulBookingIds.length > 0 && (
                <p className="pm-success-booking-id">Booking ID: {successfulBookingIds[0]}</p>
              )}
            </div>
          </div>
        )}

        {paymentStatus !== 'success' && (
          <div className="pm-secure-banner">
            <div className="pm-secure-icon">🛡</div>
            <div className="pm-secure-text">
              <h3 className="pm-secure-title">Secure booking</h3>
              <p className="pm-secure-subtitle">
                Your selected slots will be confirmed securely by the server.
              </p>
            </div>
          </div>
        )}

        {renderPaymentStatus()}

        <h2 className="pm-section-title">Booking summary</h2>

        <div className="pm-turf-card">
          {imageUrl ? (
            <img src={imageUrl} alt={turf?.name || 'Turf'} className="pm-turf-image" />
          ) : (
            <div className="pm-image-placeholder">⚽</div>
          )}
          <div className="pm-turf-info">
            <h3 className="pm-turf-name">{turf?.name || 'Turf'}</h3>
            <p className="pm-court-text">
              {court?.name || 'Selected court'}
              {court?.sport ? ` • ${court.sport}` : ''}
            </p>
            {!!turf?.city && <p className="pm-location-text">{turf.city}</p>}
          </div>
        </div>

        <h2 className="pm-section-title">Booking dates &amp; slots</h2>

        <div className="pm-multi-date-card">
          {bookingGroups.length === 0 ? (
            <div className="pm-empty-slots">No slots selected.</div>
          ) : (
            bookingGroups.map((b, i) => (
              <div key={`${b.date}-${i}`} className={`pm-date-group ${i === bookingGroups.length - 1 ? 'last' : ''}`}>
                <div className="pm-date-group-header">
                  <div className="pm-date-badge">{i + 1}</div>
                  <div className="pm-date-group-title-box">
                    <p className="pm-date-group-title">{b.date}</p>
                    <p className="pm-date-group-subtitle">
                      {b.slots.length} {b.slots.length === 1 ? 'slot' : 'slots'}
                    </p>
                  </div>
                  <p className="pm-date-group-total">{formatMoney(Number(b.totalAmount || 0))}</p>
                </div>
                {b.slots.map((s, si) => (
                  <div key={`${b.date}-${s.id}-${si}`} className="pm-multi-date-slot-row">
                    <div className="pm-multi-date-slot-left">
                      <div className="pm-slot-dot">{si + 1}</div>
                      <div className="pm-slot-info">
                        <p className="pm-slot-time">{s.startTime} - {s.endTime}</p>
                        {s.isNight && <span className="pm-night-badge">🌙 Night pricing</span>}
                      </div>
                    </div>
                    <span className="pm-slot-price">{formatMoney(Number(s.price || 0))}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="pm-detail-card">
          <div className="pm-detail-row">
            <span className="pm-detail-label">Selected dates</span>
            <span className="pm-detail-value">{bookingGroups.length}</span>
          </div>
          <div className="pm-divider" />
          <div className="pm-detail-row">
            <span className="pm-detail-label">Total slots</span>
            <span className="pm-detail-value">{totalSlotCount}</span>
          </div>
        </div>

        <h2 className="pm-section-title">Amount</h2>

        <div className="pm-amount-card">
          <div className="pm-amount-row">
            <span className="pm-amount-label">Booking amount</span>
            <span className="pm-amount-value">{formatMoney(displayedAmount)}</span>
          </div>
          <div className="pm-amount-divider" />
          <div className="pm-total-row">
            <span className="pm-total-label">Total payable</span>
            <span className="pm-total-value">{formatMoney(displayedAmount)}</span>
          </div>
        </div>

        <div className="pm-info-box">
          <h3 className="pm-info-title">How booking works</h3>
          <p className="pm-info-text">1. Your selected slots are checked again by the server.</p>
          <p className="pm-info-text">2. The server calculates the final booking amount.</p>
          <p className="pm-info-text">3. Available slots are locked and changed to booked.</p>
          <p className="pm-info-text">4. Your payment record is stored as successful.</p>
          <p className="pm-info-text">
            5. A 2% platform commission is stored and the owner payout is recorded.
          </p>
        </div>

        <div className="pm-warning-box">
          <h3 className="pm-warning-title">Booking safety</h3>
          <p className="pm-warning-text">
            Your booking is processed as one server transaction. If any part fails,
            the booking changes are rolled back.
          </p>
        </div>

        {paymentStatus === 'success' && successfulPayment && (
          <div className="pm-success-details-card">
            <h3 className="pm-success-details-title">Payment details</h3>
            <div className="pm-detail-row">
              <span className="pm-detail-label">Payment status</span>
              <span className="pm-success-value">SUCCESS</span>
            </div>
            <div className="pm-divider" />
            <div className="pm-detail-row">
              <span className="pm-detail-label">Amount paid</span>
              <span className="pm-detail-value">
                {formatMoney(Number(successfulPayment.totalPaid || displayedAmount))}
              </span>
            </div>
            <div className="pm-divider" />
            <div className="pm-detail-row">
              <span className="pm-detail-label">Payment method</span>
              <span className="pm-detail-value">Direct</span>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM BAR */}
      <div className="pm-bottom-bar">
        <div className="pm-bottom-price-box">
          <span className="pm-bottom-label">Total</span>
          <span className="pm-bottom-amount">{formatMoney(displayedAmount)}</span>
        </div>
        <button
          className={`pm-pay-button ${isBusy ? 'disabled' : ''} ${paymentStatus === 'success' ? 'success' : ''}`}
          onClick={handlePayNow}
          disabled={isBusy || paymentStatus === 'success' || !bookingGroups.length || totalSlotCount <= 0 || displayedAmount <= 0}
        >
          {isBusy ? (
            <><span className="pm-spinner" /> CONFIRMING...</>
          ) : paymentStatus === 'success' ? (
            'BOOKED ✓'
          ) : (
            <>PAY NOW <span style={{ marginLeft: 8 }}>→</span></>
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentScreen;