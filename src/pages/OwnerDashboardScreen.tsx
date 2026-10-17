// OwnerDashboardScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './OwnerDashboardScreen.css';

/* =========================================================
   API
========================================================= */

const API_BASE_URL = (
  (import.meta as any).env?.VITE_API_URL ||
  'https://turf-backend-q8w4.onrender.com/api'
)
  .trim()
  .replace(/\/+$/, '');

const buildApiUrl = (path: string): string => {
  if (!API_BASE_URL) throw new Error('API URL is not configured.');
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

/* =========================================================
   TYPES
========================================================= */

export interface OwnerDashboardScreenProps {
  user?: { _id?: string; id?: string; name?: string };
  onAddTurf?: () => void;
  onManageCourts?: () => void;
  onManageSlots?: () => void;
  onViewBookings?: () => void;
}

interface DashboardData {
  overview: {
    totalRevenue: number;
    todaysBookings: number;
    totalBookings: number;
    occupancy: number;
  };
  slots: { available: number; reserved: number; booked: number; blocked: number };
  revenue: { date: string; revenue: number }[];
  courts: {
    _id: string;
    name: string;
    sport: string;
    pricePerHour: number;
    status: string;
    bookedSlots: number;
    totalSlots: number;
    occupancy: number;
    revenue: number;
  }[];
  todaysBookings: {
    confirmed: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  recentBookings: {
    _id: string;
    customer?: { name?: string; email?: string; phone?: string } | null;
    turf?: { name?: string; city?: string } | null;
    court?: { name?: string; sport?: string } | null;
    bookingDate: string;
    startTime: string;
    endTime: string;
    grossAmount: number;
    discountAmount: number;
    finalAmount: number;
    status: string;
    createdAt: string;
  }[];
  payments: { gross: number; platformFee: number; ownerAmount: number };
  turfs: { _id: string; name: string; city: string; address: string; status: string }[];
}

const emptyDashboard: DashboardData = {
  overview: { totalRevenue: 0, todaysBookings: 0, totalBookings: 0, occupancy: 0 },
  slots: { available: 0, reserved: 0, booked: 0, blocked: 0 },
  revenue: [],
  courts: [],
  todaysBookings: { confirmed: 0, pending: 0, completed: 0, cancelled: 0 },
  recentBookings: [],
  payments: { gross: 0, platformFee: 0, ownerAmount: 0 },
  turfs: [],
};

/* =========================================================
   HELPERS
========================================================= */

const safeNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (value: unknown): string => {
  const amount = safeNumber(value);
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '-';
  }
};

const getInitials = (name?: string): string => {
  if (!name?.trim()) return 'OW';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const getStatusColors = (status?: string) => {
  const clean = String(status || '').toLowerCase();
  switch (clean) {
    case 'confirmed':
    case 'active':
      return { bg: '#F4FBE6', border: '#D9DCE7', text: '#6AAF4A' };
    case 'completed':
      return { bg: '#EFF6FF', border: '#BFDBFE', text: '#3B82F6' };
    case 'pending':
      return { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' };
    case 'cancelled':
    case 'inactive':
      return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C' };
    case 'maintenance':
    case 'blocked':
      return { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' };
    default:
      return { bg: '#FBFDF9', border: '#E8F3E0', text: '#8B9A82' };
  }
};

const parseApiResponse = async (response: Response): Promise<any> => {
  const rawText = await response.text();
  let data: any = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { message: rawText };
    }
  }
  if (!response.ok) {
    const message =
      data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data;
};

const normalizeDashboard = (data: any): DashboardData => {
  const source = data?.dashboard ?? data ?? {};
  return {
    overview: {
      totalRevenue: safeNumber(source?.overview?.totalRevenue),
      todaysBookings: safeNumber(source?.overview?.todaysBookings),
      totalBookings: safeNumber(source?.overview?.totalBookings),
      occupancy: safeNumber(source?.overview?.occupancy),
    },
    slots: {
      available: safeNumber(source?.slots?.available),
      reserved: safeNumber(source?.slots?.reserved),
      booked: safeNumber(source?.slots?.booked),
      blocked: safeNumber(source?.slots?.blocked),
    },
    revenue: Array.isArray(source?.revenue)
      ? source.revenue.map((item: any) => ({
          date: String(item?.date || ''),
          revenue: safeNumber(item?.revenue),
        }))
      : [],
    courts: Array.isArray(source?.courts)
      ? source.courts.map((court: any) => ({
          _id: String(court?._id || Math.random()),
          name: String(court?.name || 'Court'),
          sport: String(court?.sport || 'Sport'),
          pricePerHour: safeNumber(court?.pricePerHour),
          status: String(court?.status || 'active'),
          bookedSlots: safeNumber(court?.bookedSlots),
          totalSlots: safeNumber(court?.totalSlots),
          occupancy: Math.min(Math.max(safeNumber(court?.occupancy), 0), 100),
          revenue: safeNumber(court?.revenue),
        }))
      : [],
    todaysBookings: {
      confirmed: safeNumber(source?.todaysBookings?.confirmed),
      pending: safeNumber(source?.todaysBookings?.pending),
      completed: safeNumber(source?.todaysBookings?.completed),
      cancelled: safeNumber(source?.todaysBookings?.cancelled),
    },
    recentBookings: Array.isArray(source?.recentBookings)
      ? source.recentBookings.map((booking: any) => ({
          _id: String(booking?._id || Math.random()),
          customer: booking?.customer
            ? {
                name: booking.customer.name,
                email: booking.customer.email,
                phone: booking.customer.phone,
              }
            : null,
          turf: booking?.turf
            ? { name: booking.turf.name, city: booking.turf.city }
            : null,
          court: booking?.court
            ? { name: booking.court.name, sport: booking.court.sport }
            : null,
          bookingDate: String(booking?.bookingDate || ''),
          startTime: String(booking?.startTime || ''),
          endTime: String(booking?.endTime || ''),
          grossAmount: safeNumber(booking?.grossAmount),
          discountAmount: safeNumber(booking?.discountAmount),
          finalAmount: safeNumber(booking?.finalAmount),
          status: String(booking?.status || 'pending'),
          createdAt: String(booking?.createdAt || ''),
        }))
      : [],
    payments: {
      gross: safeNumber(source?.payments?.gross),
      platformFee: safeNumber(source?.payments?.platformFee),
      ownerAmount: safeNumber(source?.payments?.ownerAmount),
    },
    turfs: Array.isArray(source?.turfs)
      ? source.turfs.map((turf: any) => ({
          _id: String(turf?._id || Math.random()),
          name: String(turf?.name || 'Turf'),
          city: String(turf?.city || ''),
          address: String(turf?.address || ''),
          status: String(turf?.status || 'active'),
        }))
      : [],
  };
};

/* =========================================================
   COMPONENT
========================================================= */

const OwnerDashboardScreen: React.FC<OwnerDashboardScreenProps> = ({
  user,
  onAddTurf,
  onManageCourts,
  onManageSlots,
  onViewBookings,
}) => {
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'7' | '30' | '90'>('7');
  const [showAllRecentBookings, setShowAllRecentBookings] = useState(false);

  const ownerId = user?._id || user?.id;

  const fetchDashboard = useCallback(
    async (showLoader = true) => {
      if (!ownerId) {
        setError('Owner information is missing.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      try {
        if (showLoader) setLoading(true);
        setError('');
        const url = buildApiUrl(`/owners/${encodeURIComponent(ownerId)}/dashboard`);
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        const data = await parseApiResponse(response);
        setDashboard(normalizeDashboard(data));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load owner dashboard.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [ownerId],
  );

  useEffect(() => {
    fetchDashboard(true);
  }, [fetchDashboard]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard(false);
  }, [fetchDashboard]);

  const maxRevenue = useMemo(() => {
    if (!dashboard.revenue.length) return 1;
    return Math.max(
      ...dashboard.revenue.map((item) => safeNumber(item.revenue)),
      1,
    );
  }, [dashboard.revenue]);

  const visibleRevenue = useMemo(() => {
    const count = Number(period);
    return dashboard.revenue.slice(-count);
  }, [dashboard.revenue, period]);

  const visibleRecentBookings = useMemo(
    () =>
      showAllRecentBookings
        ? dashboard.recentBookings
        : dashboard.recentBookings.slice(0, 3),
    [dashboard.recentBookings, showAllRecentBookings],
  );

  if (loading) {
    return (
      <div className="od-safe">
        <div className="od-loading-container">
          <div className="od-loading-logo">T</div>
          <span className="od-spinner" />
          <p className="od-loading-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="od-safe">
      <div className="od-container">
        {/* HEADER */}
        <div className="od-header">
          <div className="od-header-text">
            <span className="od-header-badge">⌁ OWNER</span>
            <h1 className="od-greeting">Hello, {user?.name || 'Owner'}</h1>
            <p className="od-turf-count">
              {dashboard.turfs.length}{' '}
              {dashboard.turfs.length === 1 ? 'turf' : 'turfs'} connected
            </p>
          </div>
          <div className="od-header-icon">⌁</div>
        </div>

        {/* REFRESH */}
        <button
          className="od-refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? '↻ Refreshing...' : '↻ Refresh'}
        </button>

        {/* ERROR */}
        {error && (
          <div className="od-error-card">
            <div className="od-error-icon-circle">!</div>
            <h3 className="od-error-title">Unable to load dashboard</h3>
            <p className="od-error-text">{error}</p>
            <button className="od-retry-btn" onClick={() => fetchDashboard(true)}>
              TRY AGAIN
            </button>
          </div>
        )}

        {/* TURFS */}
        {dashboard.turfs.length > 0 && (
          <div className="od-turf-card">
            <div className="od-section-title-row">
              <h3 className="od-turf-card-title">Your Turfs</h3>
              <span className="od-section-accent" />
            </div>
            {dashboard.turfs.map((turf, index) => {
              const sc = getStatusColors(turf.status);
              return (
                <div
                  key={turf._id}
                  className={`od-turf-row ${
                    index === dashboard.turfs.length - 1 ? 'last' : ''
                  }`}
                >
                  <div className="od-turf-icon">⌂</div>
                  <div className="od-turf-info">
                    <p className="od-turf-name">{turf.name}</p>
                    <p className="od-turf-address">
                      {turf.city || 'City'} •{' '}
                      {turf.address || 'Address not available'}
                    </p>
                  </div>
                  <span
                    className="od-status-badge"
                    style={{
                      backgroundColor: sc.bg,
                      borderColor: sc.border,
                      color: sc.text,
                    }}
                  >
                    {String(turf.status || 'active').toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* OVERVIEW */}
        <div className="od-section-title-row">
          <h2 className="od-section-title">Overview</h2>
          <span className="od-section-accent" />
        </div>

        <div className="od-stats-grid">
          <div className="od-stat-card">
            <div className="od-stat-icon">₹</div>
            <p className="od-stat-value">
              {formatCurrency(dashboard.overview.totalRevenue)}
            </p>
            <p className="od-stat-label">Owner Revenue</p>
          </div>
          <div className="od-stat-card">
            <div className="od-stat-icon">▣</div>
            <p className="od-stat-value">{dashboard.overview.todaysBookings}</p>
            <p className="od-stat-label">Today's Bookings</p>
          </div>
          <div className="od-stat-card">
            <div className="od-stat-icon">◫</div>
            <p className="od-stat-value">{dashboard.overview.totalBookings}</p>
            <p className="od-stat-label">Total Bookings</p>
          </div>
          <div className="od-stat-card">
            <div className="od-stat-icon">⌁</div>
            <p className="od-stat-value">
              {Math.min(Math.max(dashboard.overview.occupancy, 0), 100)}%
            </p>
            <p className="od-stat-label">Today's Occupancy</p>
          </div>
        </div>

        {/* REVENUE */}
        <div className="od-section-header">
          <div className="od-section-title-row">
            <h2 className="od-section-title">Revenue Overview</h2>
            <span className="od-section-accent" />
          </div>
          <span className="od-live-badge">
            <span className="od-live-dot" />
            LIVE
          </span>
        </div>

        <div className="od-revenue-card">
          <p className="od-revenue-label">OWNER EARNINGS</p>
          <p className="od-revenue-amount">
            {formatCurrency(dashboard.payments.ownerAmount)}
          </p>
          <div className="od-chart">
            {visibleRevenue.length === 0 ? (
              <div className="od-empty-chart">
                <span className="od-empty-chart-icon">↗</span>
                <span className="od-empty-text">No revenue data available</span>
              </div>
            ) : (
              visibleRevenue.map((item, index) => {
                const revenue = safeNumber(item.revenue);
                const barHeight = Math.max(8, (revenue / maxRevenue) * 110);
                return (
                  <div key={`${item.date}-${index}`} className="od-chart-column">
                    <div className="od-bar" style={{ height: barHeight }} />
                    <span className="od-day-text">{formatDate(item.date)}</span>
                  </div>
                );
              })
            )}
          </div>
          <div className="od-period-row">
            {[
              { v: '7', l: '7 Days' },
              { v: '30', l: '30 Days' },
              { v: '90', l: '3 Months' },
            ].map((item) => {
              const active = period === item.v;
              return (
                <button
                  key={item.v}
                  className={active ? 'od-active-period' : 'od-period-button'}
                  onClick={() => setPeriod(item.v as '7' | '30' | '90')}
                >
                  {item.l}
                </button>
              );
            })}
          </div>
        </div>

        {/* SLOTS */}
        <div className="od-section-title-row">
          <h2 className="od-section-title">Today's Slots</h2>
          <span className="od-section-accent" />
        </div>
        <div className="od-slot-summary-card">
          {[
            { dot: '#C7F36B', label: 'Available', value: dashboard.slots.available },
            { dot: '#F59E0B', label: 'Reserved', value: dashboard.slots.reserved },
            { dot: '#3B82F6', label: 'Booked', value: dashboard.slots.booked },
            { dot: '#EF4444', label: 'Blocked', value: dashboard.slots.blocked },
          ].map((s) => (
            <div key={s.label} className="od-slot-item">
              <span className="od-slot-dot" style={{ backgroundColor: s.dot }} />
              <span className="od-slot-label">{s.label}</span>
              <span className="od-slot-value">{s.value}</span>
            </div>
          ))}
        </div>

        {/* COURT PERFORMANCE */}
        <div className="od-section-header">
          <div className="od-section-title-row">
            <h2 className="od-section-title">Court Performance</h2>
            <span className="od-section-accent" />
          </div>
          {onManageCourts && (
            <button className="od-view-text" onClick={onManageCourts}>
              MANAGE
            </button>
          )}
        </div>

        {dashboard.courts.length === 0 ? (
          <div className="od-empty-card">
            <div className="od-empty-icon-circle">⌂</div>
            <h3 className="od-empty-title">No courts found</h3>
            <p className="od-empty-text">
              Add courts to start tracking performance.
            </p>
            {onManageCourts && (
              <button className="od-primary-button" onClick={onManageCourts}>
                MANAGE COURTS
              </button>
            )}
          </div>
        ) : (
          dashboard.courts.map((court) => {
            const sc = getStatusColors(court.status);
            const occupancy = Math.min(
              Math.max(safeNumber(court.occupancy), 0),
              100,
            );
            return (
              <div key={court._id} className="od-court-card">
                <div className="od-court-top">
                  <div className="od-court-name-box">
                    <p className="od-court-name">{court.name}</p>
                    <span className="od-sport-pill">
                      {String(court.sport || 'SPORT').toUpperCase()}
                    </span>
                    <p className="od-court-bookings">
                      {court.bookedSlots} / {court.totalSlots} slots booked
                    </p>
                  </div>
                  <span className="od-court-percentage">{occupancy}%</span>
                </div>
                <div className="od-progress-background">
                  <div
                    className="od-progress-fill"
                    style={{ width: `${occupancy}%` }}
                  />
                </div>
                <div className="od-court-bottom">
                  <span className="od-court-revenue">
                    Revenue: {formatCurrency(court.revenue)}
                  </span>
                  <span
                    className="od-status-badge"
                    style={{
                      backgroundColor: sc.bg,
                      borderColor: sc.border,
                      color: sc.text,
                    }}
                  >
                    {String(court.status || 'active').toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* TODAY'S BOOKINGS */}
        <div className="od-section-header">
          <div className="od-section-title-row">
            <h2 className="od-section-title">Today's Bookings</h2>
            <span className="od-section-accent" />
          </div>
          {onViewBookings && (
            <button className="od-view-text" onClick={onViewBookings}>
              VIEW ALL
            </button>
          )}
        </div>

        <div className="od-booking-summary">
          {[
            {
              dot: '#C7F36B',
              label: 'Confirmed',
              value: dashboard.todaysBookings.confirmed,
              color: '#6AAF4A',
            },
            {
              dot: '#F59E0B',
              label: 'Pending',
              value: dashboard.todaysBookings.pending,
              color: '#92400E',
            },
            {
              dot: '#3B82F6',
              label: 'Completed',
              value: dashboard.todaysBookings.completed,
              color: '#3B82F6',
            },
            {
              dot: '#EF4444',
              label: 'Cancelled',
              value: dashboard.todaysBookings.cancelled,
              color: '#B91C1C',
            },
          ].map((b) => (
            <div key={b.label} className="od-booking-summary-item">
              <span
                className="od-booking-dot"
                style={{ backgroundColor: b.dot }}
              />
              <span
                className="od-booking-number"
                style={{ color: b.color }}
              >
                {b.value}
              </span>
              <span className="od-booking-label">{b.label}</span>
            </div>
          ))}
        </div>

        {/* RECENT BOOKINGS */}
        <div className="od-section-header">
          <div className="od-section-title-row">
            <h2 className="od-section-title">Recent Bookings</h2>
            <span className="od-section-accent" />
          </div>
          {dashboard.recentBookings.length > 3 && (
            <button
              className="od-view-text"
              onClick={() => setShowAllRecentBookings((p) => !p)}
            >
              {showAllRecentBookings ? 'SHOW LESS' : 'SEE ALL'}
            </button>
          )}
        </div>

        {dashboard.recentBookings.length === 0 ? (
          <div className="od-empty-card">
            <div className="od-empty-icon-circle">▣</div>
            <h3 className="od-empty-title">No bookings yet</h3>
            <p className="od-empty-text">
              Customer bookings, including past bookings, will appear here.
            </p>
          </div>
        ) : (
          visibleRecentBookings.map((booking) => {
            const sc = getStatusColors(booking.status);
            return (
              <div key={booking._id} className="od-booking-card">
                <div className="od-avatar">
                  <span className="od-avatar-text">
                    {getInitials(booking.customer?.name)}
                  </span>
                </div>
                <div className="od-booking-info">
                  <p className="od-customer-name">
                    {booking.customer?.name || 'Customer'}
                  </p>
                  <p className="od-booking-details">
                    {booking.court?.name || 'Court'} • {booking.startTime} -{' '}
                    {booking.endTime}
                  </p>
                  <p className="od-booking-date">
                    ▣ {formatDate(booking.bookingDate)}
                  </p>
                </div>
                <div className="od-booking-right">
                  <p className="od-booking-amount">
                    {formatCurrency(booking.finalAmount)}
                  </p>
                  <span
                    className="od-status-badge small"
                    style={{
                      backgroundColor: sc.bg,
                      borderColor: sc.border,
                      color: sc.text,
                    }}
                  >
                    {String(booking.status || 'pending').toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* PAYMENT SUMMARY */}
        <div className="od-section-title-row">
          <h2 className="od-section-title">Payment Summary</h2>
          <span className="od-section-accent" />
        </div>
        <div className="od-payment-card">
          <div className="od-payment-row">
            <span className="od-payment-label">Gross Collection</span>
            <span className="od-payment-value">
              {formatCurrency(dashboard.payments.gross)}
            </span>
          </div>
          <div className="od-payment-row">
            <span className="od-payment-label">Platform Fee</span>
            <span className="od-payment-value od-fee-text">
              - {formatCurrency(dashboard.payments.platformFee)}
            </span>
          </div>
          <div className="od-divider" />
          <div className="od-payment-row">
            <span className="od-owner-amount-label">Owner Earnings</span>
            <span className="od-owner-amount">
              {formatCurrency(dashboard.payments.ownerAmount)}
            </span>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="od-section-title-row">
          <h2 className="od-section-title">Quick Actions</h2>
          <span className="od-section-accent" />
        </div>
        <div className="od-quick-actions">
          <button className="od-action-button" onClick={onAddTurf}>
            <span className="od-action-icon-circle">＋</span>
            <span className="od-action-text">Add Turf</span>
          </button>
          <button className="od-action-button" onClick={onManageCourts}>
            <span className="od-action-icon-circle">⌂</span>
            <span className="od-action-text">Manage Courts</span>
          </button>
          <button className="od-action-button" onClick={onManageSlots}>
            <span className="od-action-icon-circle">◷</span>
            <span className="od-action-text">Manage Slots</span>
          </button>
          <button className="od-action-button" onClick={onViewBookings}>
            <span className="od-action-icon-circle">☷</span>
            <span className="od-action-text">Bookings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboardScreen;