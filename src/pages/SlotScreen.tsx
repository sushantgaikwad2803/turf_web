// src/pages/SlotScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './SlotScreen.css';

/* =========================================================
   TYPES
========================================================= */

type TurfImage = { url?: string; isPrimary?: boolean };
type OperatingHour = {
  day?: string; dayOfWeek?: string;
  openingTime?: string; closingTime?: string;
  openTime?: string; closeTime?: string;
  isClosed?: boolean;
};
type TurfCourt = {
  _id?: string; id?: string; name?: string; courtName?: string;
  sport?: string; sports?: string[]; pricePerHour?: number;
  status?: string; hasNightPricing?: boolean;
  nightPricePerHour?: number; nightStartHour?: number; nightEndHour?: number;
  fullDayDiscountPercent?: number;
};
type Turf = {
  _id?: string; id?: string; name?: string; description?: string;
  city?: string; address?: string; pricePerHour?: number;
  sports?: string[]; amenities?: string[]; images?: TurfImage[];
  openingTime?: string; closingTime?: string;
  operatingHours?: OperatingHour[];
  courts?: TurfCourt[];
};
type Slot = {
  id: string; bookingKey: string;
  startTime: string; endTime: string;
  startMinutes: number; endMinutes: number;
  price: number; isNight: boolean; booked: boolean;
};
type BookingDay = {
  date: string; courtId: string; slots: Slot[];
  slotCount: number; subtotal: number;
  discountAmount: number; discountPercent: number; totalAmount: number;
};
export interface SlotScreenProps {
  turf?: Turf;
  onBack: () => void;
  onContinueToPayment: (payload: {
    turf: Turf; court: TurfCourt;
    bookings: BookingDay[];
    totalAmount: number;
    originalTotal: number;
    discountAmount: number;
  }) => void;
}

/* =========================================================
   CONSTANTS + HELPERS
========================================================= */

const API_URL = ((import.meta as any).env?.VITE_API_URL || '')
  .trim()
  .replace(/\/+$/, '');
const DEFAULT_FULL_DAY_DISCOUNT_PERCENT = 10;
const MIN_FULL_DAY_HOURS = 5;
const MAX_FULL_DAY_HOURS = 12;
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const getTurfId = (t: Turf) => String(t._id || t.id || '');
const getCourtId = (c: TurfCourt) => String(c._id || c.id || '');
const getCourtName = (c: TurfCourt, i: number) => c.name || c.courtName || `Court ${i + 1}`;

const parseTimeToMinutes = (value?: string): number => {
  if (!value) return 0;
  const normalized = String(value).trim().toUpperCase();
  if (normalized === '24:00') return 1440;
  const m = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
  if (!m) return 0;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const period = m[3];
  if (period) {
    if (period === 'AM') { if (hour === 12) hour = 0; }
    else { if (hour !== 12) hour += 12; }
  }
  return hour * 60 + minute;
};
const formatMinutes = (minutes: number): string => {
  const n = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
};
const formatDisplayTime = (minutes: number): string => {
  const n = ((minutes % 1440) + 1440) % 1440;
  let hour = Math.floor(n / 60);
  const minute = n % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12; if (hour === 0) hour = 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
};
const formatCompactTime = (minutes: number): string => {
  const n = ((minutes % 1440) + 1440) % 1440;
  let hour = Math.floor(n / 60);
  const minute = n % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12; if (hour === 0) hour = 12;
  return minute === 0 ? `${hour} ${suffix}` : `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
};
const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const addDays = (d: Date, n: number): Date => {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
};
const is24HourOperatingDay = (open: string, close: string): boolean => {
  const o = String(open).trim().toUpperCase();
  const c = String(close).trim().toUpperCase();
  return (o === '00:00' && c === '00:00') || (o === '12:00 AM' && c === '12:00 AM') || (o === '00:00' && c === '24:00');
};
const getOperatingHours = (turf: Turf, date: Date) => {
  const dayName = DAYS[date.getDay()];
  const item = (turf.operatingHours || []).find(
    (h) => String(h.dayOfWeek || h.day || '').toLowerCase() === dayName.toLowerCase(),
  );
  if (item) {
    return {
      openingTime: item.openingTime || item.openTime || turf.openingTime || '06:00 AM',
      closingTime: item.closingTime || item.closeTime || turf.closingTime || '11:00 PM',
      isClosed: item.isClosed === true,
    };
  }
  return {
    openingTime: turf.openingTime || '06:00 AM',
    closingTime: turf.closingTime || '11:00 PM',
    isClosed: false,
  };
};
const isNightSlot = (startMinutes: number, court: TurfCourt): boolean => {
  if (!court.hasNightPricing) return false;
  const startHour = Number(court.nightStartHour);
  const endHour = Number(court.nightEndHour);
  if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) return false;
  const ns = startHour * 60, ne = endHour * 60;
  if (ns === ne) return true;
  if (ns < ne) return startMinutes >= ns && startMinutes < ne;
  return startMinutes >= ns || startMinutes < ne;
};
const getSlotPrice = (court: TurfCourt, turf: Turf, startMinutes: number) => {
  const regular = Number(court.pricePerHour ?? turf.pricePerHour ?? 0);
  const night = isNightSlot(startMinutes, court);
  if (night && court.nightPricePerHour !== undefined) {
    const nightPrice = Number(court.nightPricePerHour);
    if (Number.isFinite(nightPrice)) return { price: nightPrice, isNight: true };
  }
  return { price: Number.isFinite(regular) ? regular : 0, isNight: night };
};
const isPastSlot = (slot: Slot, dateString: string): boolean => {
  const today = formatDate(new Date());
  if (dateString !== today) return false;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  return slot.startMinutes <= cur;
};
const generateSlots = (turf: Turf, court: TurfCourt, date: Date): Slot[] => {
  const hours = getOperatingHours(turf, date);
  if (hours.isClosed) return [];
  const slots: Slot[] = [];
  const dateString = formatDate(date);
  const courtId = getCourtId(court);
  for (let start = 0; start < 1440; start += 60) {
    const end = start + 60;
    const pricing = getSlotPrice(court, turf, start);
    const bookingKey = `${dateString}_${courtId}_${start}`;
    slots.push({
      id: bookingKey, bookingKey,
      startTime: formatMinutes(start), endTime: formatMinutes(end),
      startMinutes: start, endMinutes: end >= 1440 ? 0 : end,
      price: pricing.price, isNight: pricing.isNight, booked: false,
    });
  }
  return slots;
};
const extractBookedSlots = (data: any): any[] => {
  if (Array.isArray(data?.bookedSlots)) return data.bookedSlots;
  if (Array.isArray(data?.slots)) return data.slots.filter((s: any) => ['booked', 'reserved', 'blocked'].includes(String(s.status || '').toLowerCase()));
  if (Array.isArray(data?.data?.bookedSlots)) return data.data.bookedSlots;
  return [];
};
const getBookedKey = (v: any): string | null => {
  if (typeof v === 'string') return v;
  if (!v) return null;
  if (typeof v.bookingKey === 'string') return v.bookingKey;
  if (typeof v.startTime === 'string') return v.startTime;
  if (typeof v.startMinutes === 'number') return String(v.startMinutes);
  return null;
};
const extractApiSlots = (data: any): any[] => Array.isArray(data?.slots) ? data.slots : Array.isArray(data?.data?.slots) ? data.data.slots : [];
const isApiSlotUnavailable = (s: any) => !!s && (s.booked === true || s.available === false || ['booked', 'reserved', 'blocked'].includes(String(s.status ?? '').toLowerCase()));
const normalizeApiTime = (v: any): string => { const m = parseTimeToMinutes(String(v ?? '')); return Number.isFinite(m) ? formatMinutes(m) : ''; };
const getFullDayDiscountPercent = (c: TurfCourt): number => {
  const v = Number(c.fullDayDiscountPercent);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_FULL_DAY_DISCOUNT_PERCENT;
};
const calculateDiscount = (subtotal: number, count: number, court: TurfCourt) => {
  if (count < MIN_FULL_DAY_HOURS) return { discountAmount: 0, discountPercent: 0 };
  const pct = getFullDayDiscountPercent(court);
  return { discountAmount: Math.round(subtotal * (pct / 100)), discountPercent: pct };
};
const areSlotsContinuous = (slots: Slot[]): boolean => {
  if (slots.length <= 1) return true;
  const sorted = [...slots].sort((a, b) => a.startMinutes - b.startMinutes);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startMinutes === sorted[i - 1].endMinutes) continue;
    if (sorted[i - 1].endMinutes === 0 && sorted[i].startMinutes === 0) continue;
    return false;
  }
  return true;
};

/* =========================================================
   SLOT CARD
========================================================= */

interface SlotCardProps {
  slot: Slot;
  selected: boolean;
  dateString: string;
  onPress: (s: Slot) => void;
}

const SlotCard: React.FC<SlotCardProps> = ({ slot, selected, dateString, onPress }) => {
  const past = isPastSlot(slot, dateString);
  const disabled = slot.booked || past;
  const statusLabel = past ? 'PAST' : slot.booked ? 'BOOKED' : selected ? 'SELECTED' : 'AVAILABLE';

  return (
    <button
      disabled={disabled}
      onClick={() => onPress(slot)}
      className={`ss-slot-card ${disabled ? 'disabled' : ''} ${selected ? 'selected' : ''}`}
    >
      <div className="ss-slot-top-row">
        <span className="ss-slot-start-time">{formatCompactTime(slot.startMinutes)}</span>
        {slot.isNight && (
          <span className={`ss-night-badge ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}>N</span>
        )}
      </div>
      <span className="ss-slot-end-time">{formatCompactTime(slot.endMinutes)}</span>
      <span className="ss-slot-price">₹{slot.price}</span>
      <span className={`ss-slot-status ${past ? 'past' : ''} ${slot.booked && !past ? 'booked' : ''} ${selected ? 'selected' : ''}`}>
        {statusLabel}
      </span>
    </button>
  );
};

/* =========================================================
   FULL DAY MODAL
========================================================= */

interface FullDayModalProps {
  visible: boolean;
  slots: Slot[];
  selectedDate: string;
  selectedCourt?: TurfCourt;
  allowWrap: boolean;
  onClose: () => void;
  onApply: (slots: Slot[], hours: number) => void;
}

const FullDayModal: React.FC<FullDayModalProps> = ({ visible, slots, selectedDate, selectedCourt, allowWrap, onClose, onApply }) => {
  const [startKey, setStartKey] = useState('');
  const [hours, setHours] = useState(MIN_FULL_DAY_HOURS);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (visible) { setStartKey(''); setHours(MIN_FULL_DAY_HOURS); setDropdownOpen(false); }
  }, [visible]);

  const findContinuous = useCallback((startIndex: number, h: number): Slot[] => {
    if (slots.length === 0) return [];
    const result: Slot[] = [];
    if (allowWrap) {
      for (let o = 0; o < h; o++) {
        const idx = (startIndex + o) % slots.length;
        const s = slots[idx];
        if (!s || s.booked || isPastSlot(s, selectedDate)) return [];
        result.push(s);
      }
      return result;
    }
    const sliced = slots.slice(startIndex, startIndex + h);
    if (sliced.length !== h) return [];
    if (sliced.some((s) => s.booked || isPastSlot(s, selectedDate))) return [];
    if (!areSlotsContinuous(sliced)) return [];
    return sliced;
  }, [slots, selectedDate, allowWrap]);

  const availableStartSlots = useMemo(
    () => slots.filter((slot, index) => {
      if (slot.booked || isPastSlot(slot, selectedDate)) return false;
      return findContinuous(index, MIN_FULL_DAY_HOURS).length === MIN_FULL_DAY_HOURS;
    }),
    [slots, selectedDate, findContinuous],
  );

  const startIndex = useMemo(() => slots.findIndex((s) => s.bookingKey === startKey), [slots, startKey]);

  const availableHours = useMemo(() => {
    if (startIndex < 0) return [];
    const out: number[] = [];
    const max = Math.min(MAX_FULL_DAY_HOURS, slots.length);
    for (let h = MIN_FULL_DAY_HOURS; h <= max; h++) {
      if (findContinuous(startIndex, h).length === h) out.push(h);
      else if (!allowWrap) break;
    }
    return out;
  }, [startIndex, slots, findContinuous, allowWrap]);

  const selectedSlots = useMemo(() => startIndex < 0 ? [] : findContinuous(startIndex, hours), [startIndex, hours, findContinuous]);
  const startTime = startIndex >= 0 ? slots[startIndex]?.startMinutes ?? 0 : 0;
  const endTime = selectedSlots.length ? selectedSlots[selectedSlots.length - 1].endMinutes : 0;
  const discountPercent = selectedCourt ? getFullDayDiscountPercent(selectedCourt) : DEFAULT_FULL_DAY_DISCOUNT_PERCENT;

  if (!visible) return null;

  return (
    <div className="ss-modal-overlay" onClick={onClose}>
      <div className="ss-full-day-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
        <div className="ss-modal-handle" />
        <div className="ss-modal-header">
          <div>
            <h2 className="ss-modal-title">Full Day Booking</h2>
            <p className="ss-modal-small-text">Minimum {MIN_FULL_DAY_HOURS} continuous hours</p>
          </div>
          <button className="ss-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="ss-modal-body">
          <h3 className="ss-modal-section-title">1. Select Start Time</h3>
          <p className="ss-modal-description">
            Only times with at least {MIN_FULL_DAY_HOURS} continuous available hours are shown.
          </p>

          <div className="ss-start-row">
            {availableStartSlots.map((s) => {
              const active = startKey === s.bookingKey;
              return (
                <button
                  key={s.bookingKey}
                  onClick={() => { setStartKey(s.bookingKey); setHours(MIN_FULL_DAY_HOURS); }}
                  className={`ss-start-chip ${active ? 'active' : ''}`}
                >
                  {formatDisplayTime(s.startMinutes)}
                </button>
              );
            })}
          </div>

          {startKey !== '' && (
            <div className="ss-range-box">
              <div className="ss-range-item">
                <span className="ss-range-label">Start</span>
                <span className="ss-range-value">{formatDisplayTime(startTime)}</span>
              </div>
              <div className="ss-range-divider" />
              <div className="ss-range-item">
                <span className="ss-range-label">End</span>
                <span className="ss-range-value">{selectedSlots.length ? formatDisplayTime(endTime) : '--'}</span>
              </div>
            </div>
          )}

          <h3 className="ss-modal-section-title">2. Confirm Duration</h3>
          <p className="ss-modal-description">
            Choose between {MIN_FULL_DAY_HOURS} and {MAX_FULL_DAY_HOURS} continuous hours.
          </p>

          <button
            className={`ss-dropdown ${!startKey ? 'disabled' : ''}`}
            disabled={!startKey}
            onClick={() => setDropdownOpen((v) => !v)}
          >
            <span>{hours} hours</span>
            <span>{dropdownOpen ? '▲' : '▼'}</span>
          </button>

          {dropdownOpen && startKey !== '' && (
            <div className="ss-dropdown-list">
              {availableHours.map((h) => {
                const active = hours === h;
                return (
                  <button
                    key={h}
                    className={`ss-dropdown-item ${active ? 'active' : ''}`}
                    onClick={() => { setHours(h); setDropdownOpen(false); }}
                  >
                    <span>{h} hours</span>
                    {active && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          <div className="ss-discount-box">
            <p className="ss-discount-title">🎉 {discountPercent}% Full Day Discount</p>
            <p className="ss-discount-text">
              Applied automatically for bookings of {MIN_FULL_DAY_HOURS}+ continuous hours.
            </p>
          </div>

          <button
            className="ss-apply-button"
            disabled={!startKey || availableHours.length === 0}
            onClick={() => onApply(selectedSlots, hours)}
          >
            BOOK {hours} HOURS
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function SlotScreen({ turf, onBack, onContinueToPayment }: SlotScreenProps) {
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [selectedDates, setSelectedDates] = useState<string[]>([formatDate(new Date())]);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, Slot[]>>({});
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [fullDayMode, setFullDayMode] = useState(false);

  const activeCourts = useMemo(
    () => (turf?.courts || []).filter((c) => String(c.status || 'active').toLowerCase() === 'active'),
    [turf],
  );

  const selectedCourt = useMemo(
    () => activeCourts.find((c) => getCourtId(c) === selectedCourtId),
    [activeCourts, selectedCourtId],
  );

  useEffect(() => {
    if (!selectedCourtId && activeCourts.length > 0) setSelectedCourtId(getCourtId(activeCourts[0]));
  }, [activeCourts, selectedCourtId]);

  const isCurrentDate24Hours = useMemo(() => {
    if (!turf) return false;
    const hours = getOperatingHours(turf, new Date(`${selectedDate}T00:00:00`));
    return is24HourOperatingDay(hours.openingTime, hours.closingTime);
  }, [turf, selectedDate]);

  const loadSlots = useCallback(async (dateString: string, court: TurfCourt, silent = false): Promise<Slot[]> => {
    if (!turf) return [];
    if (!silent) setLoading(true);
    const localDate = new Date(`${dateString}T00:00:00`);
    const generated = generateSlots(turf, court, localDate).map((slot) => ({ ...slot, booked: isPastSlot(slot, dateString) }));

    const fallback = () => {
      setSlotsByDate((prev) => ({ ...prev, [dateString]: prev[dateString]?.length ? prev[dateString] : generated }));
      return generated;
    };

    try {
      const turfId = getTurfId(turf);
      const courtId = getCourtId(court);
      if (!API_URL || !turfId || !courtId) {
        setSlotsByDate((prev) => ({ ...prev, [dateString]: generated }));
        return generated;
      }
      const query = new URLSearchParams({ turfId, courtId, date: dateString }).toString();
      const response = await fetch(`${API_URL}/slots?${query}`, { method: 'GET', headers: { Accept: 'application/json', 'Content-Type': 'application/json' } });
      let data: any = null;
      try { data = await response.json(); } catch { data = null; }
      if (!response.ok) return fallback();

      const booked = extractBookedSlots(data);
      const apiSlots = extractApiSlots(data);
      const bookedKeys = new Set<string>();
      booked.forEach((item) => {
        const key = getBookedKey(item);
        if (!key) return;
        bookedKeys.add(key);
        const norm = normalizeApiTime(key);
        if (norm) bookedKeys.add(norm);
      });
      const apiByStart = new Map<string, any>();
      apiSlots.forEach((item) => {
        const start = normalizeApiTime(item?.startTime ?? item?.start ?? item?.time);
        if (start) apiByStart.set(start, item);
      });
      const finalSlots = generated.map((slot) => {
        const apiSlot = apiByStart.get(slot.startTime);
        const isBooked =
          bookedKeys.has(slot.bookingKey) ||
          bookedKeys.has(slot.startTime) ||
          bookedKeys.has(String(slot.startMinutes)) ||
          isApiSlotUnavailable(apiSlot);
        const apiPrice = Number(apiSlot?.price);
        return {
          ...slot,
          price: Number.isFinite(apiPrice) && apiPrice >= 0 ? apiPrice : slot.price,
          booked: isBooked || isPastSlot(slot, dateString),
        };
      });
      setSlotsByDate((prev) => ({ ...prev, [dateString]: finalSlots }));
      return finalSlots;
    } catch {
      return fallback();
    } finally {
      if (!silent) setLoading(false);
    }
  }, [turf]);

  useEffect(() => {
    if (!turf || !selectedCourt) return;
    void loadSlots(selectedDate, selectedCourt);
  }, [turf, selectedCourt, selectedDate, loadSlots]);

  const slotsForSelectedDate = slotsByDate[selectedDate] || [];
  const selectedKeySet = useMemo(() => new Set(selectedSlots[selectedDate] || []), [selectedSlots, selectedDate]);
  const selectedSlotObjects = useMemo(
    () => slotsForSelectedDate.filter((s) => selectedKeySet.has(s.bookingKey)),
    [slotsForSelectedDate, selectedKeySet],
  );

  const daySubtotals = useMemo(() => {
    const subtotal: Record<string, number> = {};
    const count: Record<string, number> = {};
    selectedDates.forEach((date) => {
      const slots = slotsByDate[date] || [];
      const keys = new Set(selectedSlots[date] || []);
      let s = 0, c = 0;
      slots.forEach((slot) => { if (keys.has(slot.bookingKey)) { s += slot.price; c += 1; } });
      subtotal[date] = s;
      count[date] = c;
    });
    return { subtotal, count };
  }, [selectedDates, slotsByDate, selectedSlots]);

  const grandOriginalTotal = selectedDates.reduce((sum, d) => sum + (daySubtotals.subtotal[d] || 0), 0);
  const totalSelectedSlots = selectedDates.reduce((sum, d) => sum + (daySubtotals.count[d] || 0), 0);
  const grandDiscount = selectedCourt
    ? selectedDates.reduce((sum, date) => {
        const subtotal = daySubtotals.subtotal[date] || 0;
        const count = daySubtotals.count[date] || 0;
        return sum + calculateDiscount(subtotal, count, selectedCourt).discountAmount;
      }, 0)
    : 0;
  const grandTotal = Math.max(0, grandOriginalTotal - grandDiscount);

  const toggleDate = (date: string) => {
    const hasAny = Object.values(selectedSlots).some((k) => Array.isArray(k) && k.length > 0);
    setSelectedDate(date);
    if (selectedCourt) void loadSlots(date, selectedCourt, true);
    setSelectedDates((prev) => {
      const dateHasSlots = (selectedSlots[date] || []).length > 0;
      if (dateHasSlots) return prev.includes(date) ? prev : [...prev, date].sort();
      if (!hasAny) return [date];
      return prev.filter((d) => (selectedSlots[d] || []).length > 0);
    });
  };

  const toggleSlot = (slot: Slot) => {
    if (slot.booked || isPastSlot(slot, selectedDate)) return;
    const date = selectedDate;
    setSelectedSlots((prev) => {
      const current = prev[date] || [];
      const already = current.includes(slot.bookingKey);
      const next = already ? current.filter((k) => k !== slot.bookingKey) : [...current, slot.bookingKey];
      setSelectedDates((prevDates) => {
        if (next.length > 0) return prevDates.includes(date) ? prevDates : [...prevDates, date].sort();
        const remaining = prevDates.filter((d) => d !== date);
        return remaining.length === 0 ? [date] : remaining;
      });
      return { ...prev, [date]: next };
    });
  };

  const openFullDayModal = () => {
    if (!selectedCourt) return alert('Please select a court first.');
    setFullDayMode(true);
  };

  const applyFullDay = (slots: Slot[], hours: number) => {
    setSelectedSlots((prev) => ({ ...prev, [selectedDate]: slots.map((s) => s.bookingKey) }));
    setSelectedDates((prev) => prev.includes(selectedDate) ? prev : [...prev, selectedDate].sort());
    setFullDayMode(false);
    alert(`Full Day Selected\n\n${hours} hours selected.`);
  };

  const handleBookNow = async () => {
    if (!turf || !selectedCourt) return;
    const dates = selectedDates.length ? selectedDates : [selectedDate];
    const hasSelection = dates.some((date) => {
      const keys = new Set(selectedSlots[date] || []);
      return (slotsByDate[date] || []).some((s) => keys.has(s.bookingKey));
    });
    if (!hasSelection) return alert('Please select at least one available slot.');

    setBookingLoading(true);
    try {
      const refreshed: Record<string, Slot[]> = {};
      for (const date of dates) refreshed[date] = await loadSlots(date, selectedCourt, true);

      const paymentBookings: BookingDay[] = dates
        .map((date) => {
          const fresh = refreshed[date] || [];
          const keys = new Set(selectedSlots[date] || []);
          const slots = fresh.filter((s) => keys.has(s.bookingKey) && !s.booked);
          const subtotal = slots.reduce((sum, s) => sum + s.price, 0);
          const discount = calculateDiscount(subtotal, slots.length, selectedCourt);
          return {
            date, courtId: getCourtId(selectedCourt), slots,
            slotCount: slots.length, subtotal,
            discountAmount: discount.discountAmount,
            discountPercent: discount.discountPercent,
            totalAmount: Math.max(0, subtotal - discount.discountAmount),
          };
        })
        .filter((b) => b.slots.length > 0);

      if (paymentBookings.length === 0) {
        alert('The selected slots are no longer available.');
        setSelectedSlots({});
        return;
      }
      const originalTotal = paymentBookings.reduce((s, b) => s + b.subtotal, 0);
      const discountAmount = paymentBookings.reduce((s, b) => s + b.discountAmount, 0);
      const totalAmount = paymentBookings.reduce((s, b) => s + b.totalAmount, 0);

      onContinueToPayment({
        turf,
        court: selectedCourt,
        bookings: paymentBookings,
        totalAmount,
        originalTotal,
        discountAmount,
      });
    } catch (e: any) {
      alert(e?.message || 'Unable to continue.');
    } finally {
      setBookingLoading(false);
    }
  };

  const visibleDates = useMemo(() => {
    const out: string[] = [];
    const start = new Date();
    for (let i = 0; i < 14; i++) out.push(formatDate(addDays(start, i)));
    return out;
  }, []);

  const getDateLabel = (dateString: string): string => {
    if (dateString === formatDate(new Date())) return 'Today';
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (!turf) {
    return (
      <div className="ss-safe">
        <div className="ss-center">
          <p className="ss-error-text">Turf information not found.</p>
          <button className="ss-back-button" onClick={onBack}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ss-safe">
      <div className="ss-container">
        {/* HEADER */}
        <div className="ss-header">
          <button className="ss-icon-button" onClick={onBack}>‹</button>
          <div className="ss-header-center">
            <h1 className="ss-header-title">Select Slots</h1>
            <p className="ss-header-subtitle">{turf.name || 'Turf Booking'}</p>
          </div>
          <button className="ss-icon-button" onClick={() => selectedCourt && loadSlots(selectedDate, selectedCourt, true)}>↻</button>
        </div>

        <div className="ss-scroll-content">
          {/* COURT */}
          <div className="ss-section-title-row">
            <h2 className="ss-section-title">Select Court</h2>
            <span className="ss-section-accent" />
          </div>

          <div className="ss-horizontal-scroll">
            {activeCourts.map((court, index) => {
              const id = getCourtId(court);
              const active = id === selectedCourtId;
              return (
                <button
                  key={id || index}
                  className={`ss-court-chip ${active ? 'active' : ''}`}
                  onClick={() => { setSelectedCourtId(id); setSelectedSlots({}); }}
                >
                  <span className="ss-court-name">{getCourtName(court, index)}</span>
                  <span className="ss-court-price">₹{Number(court.pricePerHour ?? turf.pricePerHour ?? 0)}/hr</span>
                </button>
              );
            })}
          </div>

          {/* DATE */}
          <div className="ss-section-title-row">
            <h2 className="ss-section-title">Select Date</h2>
            <span className="ss-section-accent" />
          </div>

          <div className="ss-horizontal-scroll">
            {visibleDates.map((date) => {
              const hasSlots = (selectedSlots[date] || []).length > 0;
              const hasAny = Object.values(selectedSlots).some((k) => k.length > 0);
              const active = hasSlots || (!hasAny && date === selectedDate);
              return (
                <button
                  key={date}
                  className={`ss-date-chip ${active ? 'active' : ''}`}
                  onClick={() => toggleDate(date)}
                >
                  {getDateLabel(date)}
                </button>
              );
            })}
          </div>

          {selectedDates.length > 1 && (
            <div className="ss-multi-date-info">
              {selectedDates.length} dates selected • tap dates to add/remove
            </div>
          )}

          {/* SLOTS */}
          <div className="ss-slot-header">
            <div className="ss-slot-header-left">
              <div className="ss-section-title-row">
                <h2 className="ss-section-title">Available Slots</h2>
                <span className="ss-section-accent" />
              </div>
              {selectedCourt && (
                <p className="ss-slot-subtitle">
                  {getOperatingHours(turf, new Date(`${selectedDate}T00:00:00`)).openingTime} –{' '}
                  {getOperatingHours(turf, new Date(`${selectedDate}T00:00:00`)).closingTime}
                </p>
              )}
            </div>
            <button className="ss-full-day-button" onClick={openFullDayModal}>
              ☀ <span>Full Day</span>
            </button>
          </div>

          {isCurrentDate24Hours && (
            <div className="ss-banner">
              <span className="ss-banner-icon">🕐</span>
              <div>
                <p className="ss-banner-title">24 Hours Available</p>
                <p className="ss-banner-text">Book any hour, from 12:00 AM to 12:00 AM.</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="ss-loading-box">
              <span className="ss-spinner large" />
              <p className="ss-loading-text">Loading slots…</p>
            </div>
          ) : selectedCourt ? (
            slotsForSelectedDate.length === 0 ? (
              <div className="ss-empty-box">
                <h3 className="ss-empty-title">Turf is closed</h3>
                <p className="ss-empty-text">No booking slots are available for this date.</p>
              </div>
            ) : (
              <div className="ss-slot-grid">
                {slotsForSelectedDate.map((slot) => (
                  <SlotCard
                    key={slot.bookingKey}
                    slot={slot}
                    selected={selectedKeySet.has(slot.bookingKey)}
                    dateString={selectedDate}
                    onPress={toggleSlot}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="ss-empty-box">
              <p className="ss-empty-text">Please select a court.</p>
            </div>
          )}

          {selectedSlotObjects.length > 0 && (
            <div className="ss-selected-info">
              <h3 className="ss-selected-info-title">Selected Slots</h3>
              <p className="ss-selected-info-text">
                {selectedSlotObjects.length} slot{selectedSlotObjects.length !== 1 ? 's' : ''} on{' '}
                {getDateLabel(selectedDate)}
              </p>
              <button
                className="ss-clear-text"
                onClick={() => setSelectedSlots((p) => ({ ...p, [selectedDate]: [] }))}
              >
                Clear
              </button>
            </div>
          )}

          {selectedDates.length > 1 && (
            <div className="ss-multi-date-summary">
              <h3 className="ss-summary-title">Selected Dates</h3>
              {selectedDates.map((date) => (
                <div key={date} className="ss-summary-row">
                  <span className="ss-summary-date">{getDateLabel(date)}</span>
                  <span className="ss-summary-amount">₹{daySubtotals.subtotal[date] || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM BAR */}
        <div className="ss-booking-bar">
          <div className="ss-booking-bar-left">
            <span className="ss-booking-count">
              {totalSelectedSlots} slot{totalSelectedSlots !== 1 ? 's' : ''}
            </span>
            {grandDiscount > 0 && (
              <span className="ss-original-price">₹{grandOriginalTotal}</span>
            )}
            <span className="ss-grand-total">₹{grandTotal}</span>
          </div>
          <button
            className="ss-continue-button"
            disabled={totalSelectedSlots === 0 || bookingLoading}
            onClick={handleBookNow}
          >
            {bookingLoading ? <span className="ss-spinner" /> : 'CONTINUE'}
          </button>
        </div>

        <FullDayModal
          visible={fullDayMode}
          slots={slotsForSelectedDate}
          selectedDate={selectedDate}
          selectedCourt={selectedCourt}
          allowWrap={isCurrentDate24Hours}
          onClose={() => setFullDayMode(false)}
          onApply={applyFullDay}
        />
      </div>
    </div>
  );
}