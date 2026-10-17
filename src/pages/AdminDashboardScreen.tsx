// AdminDashboardScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import './AdminDashboardScreen.css';
import type { AuthUser } from './AuthScreen';  

/* =========================================================
   TYPES
========================================================= */

type TurfStatus = 'active' | 'inactive' | 'maintenance';

export interface AdminDashboardScreenProps {
  user: AuthUser;
  onLogout?: () => void;
}

interface AdminOverview {
  totalUsers: number;
  totalTurfs: number;
  totalCourts: number;
  totalBookings: number;
  grossRevenue: number;
  platformRevenue: number;
  todaysBookings: number;
  todaysRevenue: number;
}

interface UserSummary {
  total: number;
  customers: number;
  owners: number;
  admins: number;
}

interface TurfSummary {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
}

interface CourtSummary {
  total: number;
  active: number;
}

interface BookingSummary {
  total: number;
  today: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

interface PaymentPeriod {
  grossRevenue: number;
  platformRevenue: number;
  ownerAmount: number;
}

interface PaymentSummary {
  grossRevenue: number;
  platformRevenue: number;
  ownerAmount: number;
  today: PaymentPeriod;
  thisMonth: PaymentPeriod;
}

interface RecentUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt?: string;
}

interface RecentTurf {
  _id: string;
  name: string;
  city: string;
  address: string;
  status: TurfStatus | string;
  owner?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  } | null;
  createdAt?: string;
}

interface RecentBooking {
  _id: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  finalAmount: number;
  status: string;
  user?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  } | null;
  turf?: {
    _id: string;
    name: string;
    city: string;
  } | null;
  court?: {
    _id: string;
    name: string;
    sport: string;
  } | null;
}

interface AdminDashboardData {
  success: boolean;
  overview: AdminOverview;
  users: UserSummary;
  turfs: TurfSummary;
  courts: CourtSummary;
  bookings: BookingSummary;
  payments: PaymentSummary;
  content: {
    reviews: number;
    coupons: number;
  };
  recentUsers: RecentUser[];
  recentTurfs: RecentTurf[];
  recentBookings: RecentBooking[];
}

interface AdminBankDetails {
  _id?: string;
  accountType?: 'admin';
  owner?: string | null;
  gatewayAccountId?: string;
  accountHolderName: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  branchName?: string;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BankFormState {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  gatewayAccountId: string;
}

/* =========================================================
   API CONFIGURATION
========================================================= */

const RAW_API_URL: string =
  (import.meta as any).env?.VITE_API_URL ||
  'https://turf-backend-q8w4.onrender.com/api';

const normalizeApiUrl = (url: string | undefined): string => {
  if (!url || !url.trim()) return '';
  let n = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(n)) n = `https://${n}`;
  n = n.replace(/\/api\/api$/i, '/api');
  return n;
};

const API_BASE_URL = normalizeApiUrl(RAW_API_URL);

/* =========================================================
   HELPERS
========================================================= */

const formatCurrency = (v: number | undefined | null): string =>
  `₹${Number(v || 0).toLocaleString('en-IN')}`;

const formatDate = (v: string | undefined): string => {
  if (!v) return '--';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const parseResponse = async (res: Response): Promise<any> => {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || `Server returned ${res.status}` };
  }
};

const getNetworkErrorMessage = (error: unknown): string => {
  if (error instanceof TypeError) {
    return 'Unable to connect to the backend.\n\nPlease check:\n• Railway backend is running\n• VITE_API_URL contains https://\n• The API endpoint is correct\n• Your device has internet access';
  }
  if (error instanceof Error) return error.message;
  return 'Unable to connect to the backend.';
};

const maskAccountNumber = (acc?: string): string => {
  if (!acc) return '--';
  if (acc.length <= 4) return acc;
  return `•••• ${acc.slice(-4)}`;
};

/* =========================================================
   SPINNER
========================================================= */

interface SpinnerProps {
  color?: string;
  size?: number;
}

const Spinner = ({ color = '#16A34A', size = 18 }: SpinnerProps) => (
  <span
    className="tb-spinner"
    style={{
      width: size,
      height: size,
      borderTopColor: color,
      borderColor: `${color}44`,
    }}
  />
);

/* =========================================================
   SUB-COMPONENTS
========================================================= */

interface SectionHeaderProps {
  title: string;
  subtitle: string;
}

const SectionHeader = ({ title, subtitle }: SectionHeaderProps) => (
  <div className="adm-section-header">
    <div className="adm-section-title-row">
      <h2 className="adm-section-title">{title}</h2>
      <span className="adm-section-title-accent" />
    </div>
    <p className="adm-section-subtitle">{subtitle}</p>
  </div>
);

interface StatCardProps {
  icon: string;
  value: number | string;
  title: string;
  meta: string;
  small?: boolean;
}

const StatCard = ({ icon, value, title, meta, small }: StatCardProps) => (
  <div className="adm-stat-card">
    <div className="adm-stat-icon">{icon}</div>
    <p className={`adm-stat-value ${small ? 'small' : ''}`}>{value}</p>
    <p className="adm-stat-title">{title}</p>
    <p className="adm-stat-meta">{meta}</p>
  </div>
);

interface BookingStatusCardProps {
  dotClass: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  value: number;
  label: string;
}

const BookingStatusCard = ({ dotClass, value, label }: BookingStatusCardProps) => (
  <div className="adm-booking-status-card">
    <div className="adm-booking-status-header">
      <span className={`adm-dot ${dotClass}`} />
      <span className="adm-booking-status-value">{value}</span>
    </div>
    <span className="adm-booking-status-label">{label}</span>
  </div>
);

interface DetailRowProps {
  label: string;
  value: number | string;
}

const DetailRow = ({ label, value }: DetailRowProps) => (
  <div className="adm-detail-row">
    <span className="adm-detail-label">{label}</span>
    <span className="adm-detail-value">{value}</span>
  </div>
);

interface ManagementItemProps {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}

const ManagementItem = ({ title, subtitle, icon, onPress }: ManagementItemProps) => (
  <button className="adm-management-item" onClick={onPress}>
    <span className="adm-management-icon">{icon}</span>
    <span className="adm-management-content">
      <span className="adm-management-title">{title}</span>
      <span className="adm-management-subtitle">{subtitle}</span>
    </span>
    <span className="adm-arrow">›</span>
  </button>
);

interface EmptyListProps {
  text: string;
}

const EmptyList = ({ text }: EmptyListProps) => (
  <div className="adm-empty-container">
    <div className="adm-empty-icon-circle">📭</div>
    <span className="adm-empty-text">{text}</span>
  </div>
);

interface BankDetailRowProps {
  label: string;
  value: string;
}

const BankDetailRow = ({ label, value }: BankDetailRowProps) => (
  <div className="adm-bank-detail-row">
    <span className="adm-bank-detail-label">{label}</span>
    <span className="adm-bank-detail-value" title={value}>
      {value}
    </span>
  </div>
);

interface BankInputProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  type?: 'text' | 'password';
  maxLength?: number;
}

const BankInput = ({
  label,
  value,
  placeholder,
  onChangeText,
  type = 'text',
  maxLength,
}: BankInputProps) => (
  <div className="adm-bank-input-group">
    <label className="adm-bank-input-label">{label}</label>
    <input
      className="adm-bank-input"
      type={type}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => onChangeText(e.target.value)}
    />
  </div>
);

/* =========================================================
   MAIN COMPONENT
========================================================= */

const AdminDashboardScreen = ({ user, onLogout }: AdminDashboardScreenProps) => {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingTurfId, setUpdatingTurfId] = useState<string | null>(null);

  /* bank */
  const [adminBank, setAdminBank] = useState<AdminBankDetails | null>(null);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankDeleting, setBankDeleting] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState<BankFormState>({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    gatewayAccountId: '',
  });

  /* ---------- fetch dashboard ---------- */
  const fetchDashboard = useCallback(
    async (showLoader: boolean = true): Promise<void> => {
      try {
        if (showLoader) setLoading(true);
        setError(null);
        if (!API_BASE_URL) throw new Error('Backend API URL is not configured.');
        if (!user?._id) throw new Error('Admin user ID is missing.');

        const endpoint = `${API_BASE_URL}/admin/dashboard?adminId=${encodeURIComponent(
          user._id,
        )}`;
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });
        const data = await parseResponse(res);
        if (!res.ok)
          throw new Error(
            data?.error || data?.message || `Server error: ${res.status}`,
          );
        if (!data?.success)
          throw new Error(
            data?.error || data?.message || 'Failed to load admin dashboard.',
          );
        setDashboard(data as AdminDashboardData);
      } catch (err) {
        setError(getNetworkErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?._id],
  );

  /* ---------- fetch bank ---------- */
  const fetchAdminBankDetails = useCallback(
    async (showLoader: boolean = false): Promise<void> => {
      try {
        if (!API_BASE_URL || !user?._id) return;
        if (showLoader) setBankLoading(true);
        setBankError(null);

        const endpoint = `${API_BASE_URL}/admin/bank-details?adminId=${encodeURIComponent(
          user._id,
        )}`;
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });
        const data = await parseResponse(res);
        if (!res.ok)
          throw new Error(
            data?.error || data?.message || `Server error: ${res.status}`,
          );
        if (!data?.success)
          throw new Error(
            data?.error ||
              data?.message ||
              'Failed to load admin bank details.',
          );
        setAdminBank((data?.bankDetails as AdminBankDetails) || null);
      } catch (err) {
        setBankError(getNetworkErrorMessage(err));
      } finally {
        setBankLoading(false);
      }
    },
    [user?._id],
  );

  /* ---------- bank modal ---------- */
  const openBankModal = useCallback((): void => {
    setBankError(null);
    setBankForm({
      accountHolderName: adminBank?.accountHolderName || '',
      accountNumber: adminBank?.accountNumber || '',
      ifscCode: adminBank?.ifscCode || '',
      bankName: adminBank?.bankName || '',
      branchName: adminBank?.branchName || '',
      gatewayAccountId: adminBank?.gatewayAccountId || '',
    });
    setBankModalVisible(true);
  }, [adminBank]);

  const saveAdminBankDetails = useCallback(async (): Promise<void> => {
    try {
      if (!API_BASE_URL) {
        alert('Backend API URL is missing.');
        return;
      }
      if (!user?._id) {
        alert('Admin user ID is missing.');
        return;
      }

      const holder = bankForm.accountHolderName.trim();
      const account = bankForm.accountNumber.trim().replace(/\s+/g, '');
      const ifsc = bankForm.ifscCode.trim().toUpperCase();
      const bankName = bankForm.bankName.trim();
      const branchName = bankForm.branchName.trim();
      const gatewayAccountId = bankForm.gatewayAccountId.trim();

      if (holder.length < 2) {
        alert('Please enter the account holder name.');
        return;
      }
      if (!/^\d{6,30}$/.test(account)) {
        alert('Account number must contain 6 to 30 digits.');
        return;
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        alert('Please enter a valid Indian IFSC code.');
        return;
      }

      setBankSaving(true);
      setBankError(null);

      const res = await fetch(`${API_BASE_URL}/admin/bank-details`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId: user._id,
          accountHolderName: holder,
          accountNumber: account,
          ifscCode: ifsc,
          bankName: bankName || undefined,
          branchName: branchName || undefined,
          gatewayAccountId: gatewayAccountId || undefined,
        }),
      });
      const data = await parseResponse(res);
      if (!res.ok)
        throw new Error(
          data?.error || data?.message || `Server error: ${res.status}`,
        );
      if (!data?.success)
        throw new Error(
          data?.error || data?.message || 'Failed to save admin bank details.',
        );

      setAdminBank((data?.bankDetails as AdminBankDetails) || null);
      setBankModalVisible(false);
      alert(data?.message || 'Admin bank details have been saved successfully.');
    } catch (err) {
      const msg = getNetworkErrorMessage(err);
      setBankError(msg);
      alert(`Save Failed\n\n${msg}`);
    } finally {
      setBankSaving(false);
    }
  }, [bankForm, user?._id]);

  const deleteAdminBankDetails = useCallback((): void => {
    if (!adminBank) return;
    if (
      !window.confirm(
        'Delete Bank Details?\n\nThis will remove the admin settlement bank account from TurfBook. Continue?',
      )
    )
      return;

    (async () => {
      try {
        if (!API_BASE_URL || !user?._id) {
          alert('Backend API URL or admin ID is missing.');
          return;
        }
        setBankDeleting(true);

        const endpoint = `${API_BASE_URL}/admin/bank-details?adminId=${encodeURIComponent(
          user._id,
        )}`;
        const res = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });
        const data = await parseResponse(res);
        if (!res.ok)
          throw new Error(
            data?.error || data?.message || `Server error: ${res.status}`,
          );
        if (!data?.success)
          throw new Error(
            data?.error ||
              data?.message ||
              'Failed to delete admin bank details.',
          );
        setAdminBank(null);
        alert(data?.message || 'Admin bank details deleted successfully.');
      } catch (err) {
        alert(`Delete Failed\n\n${getNetworkErrorMessage(err)}`);
      } finally {
        setBankDeleting(false);
      }
    })();
  }, [adminBank, user?._id]);

  /* ---------- initial load ---------- */
  useEffect(() => {
    fetchDashboard();
    fetchAdminBankDetails();
  }, [fetchDashboard, fetchAdminBankDetails]);


  /* ---------- turf status ---------- */
  const updateTurfStatus = useCallback(
    async (turfId: string, status: TurfStatus): Promise<void> => {
      try {
        if (!API_BASE_URL) {
          alert('Backend API URL is missing.');
          return;
        }
        if (!user?._id) {
          alert('Admin user ID is missing.');
          return;
        }
        if (!turfId) {
          alert('Turf ID is missing.');
          return;
        }

        setUpdatingTurfId(turfId);
        const endpoint = `${API_BASE_URL}/admin/turfs/${encodeURIComponent(
          turfId,
        )}/status`;
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ adminId: user._id, status }),
        });
        const data = await parseResponse(res);
        if (!res.ok)
          throw new Error(
            data?.error || data?.message || 'Failed to update turf status.',
          );
        if (!data?.success)
          throw new Error(
            data?.error || data?.message || 'Failed to update turf status.',
          );

        const title =
          status === 'active'
            ? 'Turf Activated'
            : status === 'inactive'
              ? 'Turf Deactivated'
              : status === 'maintenance'
                ? 'Turf Under Maintenance'
                : 'Turf Updated';
        alert(
          `${title}\n\n${
            data?.message || 'Turf status updated successfully.'
          }`,
        );
        await fetchDashboard(false);
      } catch (err) {
        alert(`Update Failed\n\n${getNetworkErrorMessage(err)}`);
      } finally {
        setUpdatingTurfId(null);
      }
    },
    [user?._id, fetchDashboard],
  );

  const handleActivateTurf = (turfId: string, turfName: string): void => {
    if (
      window.confirm(
        `Activate "${turfName}"?\n\nOnce activated, this turf will become visible to customers on the Home screen.`,
      )
    ) {
      updateTurfStatus(turfId, 'active');
    }
  };

  const handleDeactivateTurf = (turfId: string, turfName: string): void => {
    if (
      window.confirm(
        `Deactivate "${turfName}"?\n\nThis turf will no longer be visible to customers.`,
      )
    ) {
      updateTurfStatus(turfId, 'inactive');
    }
  };

  const handleMaintenanceTurf = (turfId: string, turfName: string): void => {
    if (
      window.confirm(
        `Move "${turfName}" to maintenance?\n\nCustomers will not see this turf while it is not active.`,
      )
    ) {
      updateTurfStatus(turfId, 'maintenance');
    }
  };

  const handleLogout = (): void => {
    if (window.confirm('Are you sure you want to logout?')) onLogout?.();
  };

  /* ---------- loading / error ---------- */
  if (loading && !dashboard) {
    return (
      <div className="adm-safe">
        <div className="adm-loading-container">
          <div className="adm-loading-logo">T</div>
          <Spinner size={28} />
          <p className="adm-loading-title">Loading Admin Dashboard</p>
          <p className="adm-loading-subtitle">Fetching platform statistics...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="adm-safe">
        <div className="adm-error-container">
          <div className="adm-error-icon">!</div>
          <p className="adm-error-title">Unable to Load Dashboard</p>
          <p className="adm-error-message" style={{ whiteSpace: 'pre-line' }}>
            {error}
          </p>
          <button className="adm-retry-button" onClick={() => fetchDashboard()}>
            TRY AGAIN
          </button>
          <button className="adm-error-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  const overview = dashboard?.overview;
  const users = dashboard?.users;
  const turfs = dashboard?.turfs;
  const courts = dashboard?.courts;
  const bookings = dashboard?.bookings;
  const payments = dashboard?.payments;
  const content = dashboard?.content;

  return (
    <div className="adm-safe">
      <div className="adm-scroll">
        {/* HEADER */}
        <div className="adm-header">
  <span className="adm-header-badge">🏆 TURFBOOK ADMIN</span>
  <h1 className="adm-header-title">Admin Dashboard</h1>
  <p className="adm-header-subtitle">Platform overview &amp; management</p>
  <span className="adm-admin-badge">ADMIN</span>

  {/* ✅ uses `refreshing` and re-fetches */}
  <button
    className="adm-refresh-btn"
    onClick={() => {
      if (refreshing) return;
      setRefreshing(true);
      fetchDashboard(false);
    }}
    disabled={refreshing}
    title="Refresh dashboard"
  >
    {refreshing ? '↻ Refreshing…' : '↻ Refresh'}
  </button>
</div>

        {/* WELCOME */}
        <div className="adm-welcome-card">
          <div className="adm-avatar-wrapper">
            <div className="adm-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <span className="adm-avatar-badge">🏆</span>
          </div>
          <div className="adm-welcome-content">
            <p className="adm-welcome-label">WELCOME BACK</p>
            <p className="adm-welcome-name">{user?.name}</p>
            <p className="adm-welcome-email">{user?.email}</p>
          </div>
          <span className="adm-online-badge">
            <span className="adm-online-dot" />
            LIVE
          </span>
        </div>

        {/* OVERVIEW */}
        <SectionHeader
          title="Platform Overview"
          subtitle="Live platform statistics"
        />
        <div className="adm-stats-grid">
          <StatCard
            icon="👥"
            value={overview?.totalUsers ?? 0}
            title="Total Users"
            meta={`${users?.customers ?? 0} customers • ${users?.owners ?? 0} owners`}
          />
          <StatCard
            icon="🏟️"
            value={overview?.totalTurfs ?? 0}
            title="Total Turfs"
            meta={`${turfs?.active ?? 0} active`}
          />
          <StatCard
            icon="📅"
            value={overview?.totalBookings ?? 0}
            title="Total Bookings"
            meta={`${overview?.todaysBookings ?? 0} today`}
          />
          <StatCard
            icon="₹"
            value={formatCurrency(overview?.platformRevenue ?? 0)}
            title="Platform Revenue"
            meta={`Today ${formatCurrency(overview?.todaysRevenue ?? 0)}`}
            small
          />
        </div>

        {/* REVENUE */}
        <SectionHeader title="Revenue" subtitle="Payment collection summary" />
        <div className="adm-revenue-card">
          <div className="adm-revenue-main">
            <p className="adm-revenue-label">TOTAL GROSS COLLECTION</p>
            <p className="adm-revenue-value">
              {formatCurrency(payments?.grossRevenue ?? 0)}
            </p>
          </div>
          <div className="adm-revenue-divider" />
          <div className="adm-revenue-row">
            <div>
              <p className="adm-revenue-row-label">Platform Revenue</p>
              <p className="adm-revenue-row-value">
                {formatCurrency(payments?.platformRevenue ?? 0)}
              </p>
            </div>
            <div className="adm-revenue-right">
              <p className="adm-revenue-row-label">Owner Amount</p>
              <p className="adm-revenue-row-value">
                {formatCurrency(payments?.ownerAmount ?? 0)}
              </p>
            </div>
          </div>
          <div className="adm-revenue-month-box">
            <span className="adm-revenue-month-title">THIS MONTH</span>
            <span className="adm-revenue-month-value">
              {formatCurrency(payments?.thisMonth?.platformRevenue ?? 0)}
            </span>
          </div>
        </div>

        {/* BOOKING STATUS */}
        <SectionHeader
          title="Booking Overview"
          subtitle="Current booking status"
        />
        <div className="adm-booking-status-grid">
          <BookingStatusCard
            dotClass="pending"
            value={bookings?.pending ?? 0}
            label="Pending"
          />
          <BookingStatusCard
            dotClass="confirmed"
            value={bookings?.confirmed ?? 0}
            label="Confirmed"
          />
          <BookingStatusCard
            dotClass="completed"
            value={bookings?.completed ?? 0}
            label="Completed"
          />
          <BookingStatusCard
            dotClass="cancelled"
            value={bookings?.cancelled ?? 0}
            label="Cancelled"
          />
        </div>

        {/* DETAILS */}
        <SectionHeader
          title="Platform Details"
          subtitle="Current platform inventory"
        />
        <div className="adm-details-card">
          <DetailRow label="Customers" value={users?.customers ?? 0} />
          <div className="adm-detail-divider" />
          <DetailRow label="Owners" value={users?.owners ?? 0} />
          <div className="adm-detail-divider" />
          <DetailRow label="Courts" value={courts?.total ?? 0} />
          <div className="adm-detail-divider" />
          <DetailRow label="Active Courts" value={courts?.active ?? 0} />
          <div className="adm-detail-divider" />
          <DetailRow label="Active Turfs" value={turfs?.active ?? 0} />
          <div className="adm-detail-divider" />
          <DetailRow
            label="Inactive / Pending Turfs"
            value={turfs?.inactive ?? 0}
          />
          <div className="adm-detail-divider" />
          <DetailRow
            label="Maintenance Turfs"
            value={turfs?.maintenance ?? 0}
          />
          <div className="adm-detail-divider" />
          <DetailRow label="Reviews" value={content?.reviews ?? 0} />
          <div className="adm-detail-divider" />
          <DetailRow label="Coupons" value={content?.coupons ?? 0} />
        </div>

        {/* MANAGEMENT */}
        <SectionHeader title="Management" subtitle="Manage TurfBook platform" />
        <div className="adm-management-card">
          <ManagementItem
            icon="👥"
            title="User Management"
            subtitle="View and manage customers, owners and admins"
            onPress={() =>
              alert(
                'User Management\n\nThis management section will be connected to its detailed screen next.',
              )
            }
          />
          <div className="adm-divider" />
          <ManagementItem
            icon="🏟️"
            title="Turf Management"
            subtitle="Manage registered turfs, courts and owners"
            onPress={() =>
              alert(
                'Turf Management\n\nThis management section will be connected to its detailed screen next.',
              )
            }
          />
          <div className="adm-divider" />
          <ManagementItem
            icon="📅"
            title="Booking Management"
            subtitle="Monitor booking activity and statuses"
            onPress={() =>
              alert(
                'Booking Management\n\nThis management section will be connected to its detailed screen next.',
              )
            }
          />
          <div className="adm-divider" />
          <ManagementItem
            icon="💳"
            title="Payments & Payouts"
            subtitle="Monitor payments, fees and owner settlements"
            onPress={() =>
              alert(
                'Payments & Payouts\n\nThis management section will be connected to its detailed screen next.',
              )
            }
          />
          <div className="adm-divider" />
          <ManagementItem
            icon="⭐"
            title="Reviews & Reports"
            subtitle="Review feedback and platform content"
            onPress={() =>
              alert(
                'Reviews & Reports\n\nThis management section will be connected to its detailed screen next.',
              )
            }
          />
          <div className="adm-divider" />
          <ManagementItem
            icon="🎟️"
            title="Coupons"
            subtitle="Manage promotional coupon campaigns"
            onPress={() =>
              alert(
                'Coupons\n\nThis management section will be connected to its detailed screen next.',
              )
            }
          />
        </div>

        {/* RECENT USERS */}
        <SectionHeader
          title="Recent Users"
          subtitle="Latest registered accounts"
        />
        <div className="adm-list-card">
          {dashboard?.recentUsers?.length ? (
            dashboard.recentUsers.map((u, i) => (
              <React.Fragment key={u._id}>
                <div className="adm-user-row">
                  <div className="adm-small-avatar">
                    {u.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="adm-list-content">
                    <p className="adm-list-title">{u.name}</p>
                    <p className="adm-list-subtitle">{u.email}</p>
                  </div>
                  <span className="adm-role-badge">
                    {String(u.role).toUpperCase()}
                  </span>
                </div>
                {i < dashboard.recentUsers.length - 1 && (
                  <div className="adm-list-divider" />
                )}
              </React.Fragment>
            ))
          ) : (
            <EmptyList text="No users found." />
          )}
        </div>

        {/* RECENT TURFS */}
        <SectionHeader
          title="Recent Turfs"
          subtitle="Approve and manage turf registrations"
        />
        <div className="adm-list-card">
          {dashboard?.recentTurfs?.length ? (
            dashboard.recentTurfs.map((t, i) => {
              const isUpdating = updatingTurfId === t._id;
              const s = t.status;
              return (
                <React.Fragment key={t._id}>
                  <div className="adm-turf-row">
                    <div className="adm-turf-icon">🏟️</div>
                    <div className="adm-turf-main-content">
                      <p className="adm-list-title">{t.name}</p>
                      <p className="adm-list-subtitle">
                        {t.city} • {t.owner?.name || 'Unknown owner'}
                      </p>
                      <div className="adm-turf-status-row">
                        <span
                          className={`adm-status-badge ${
                            s === 'active'
                              ? 'active'
                              : s === 'maintenance'
                                ? 'maintenance'
                                : 'inactive'
                          }`}
                        >
                          {String(s).toUpperCase()}
                        </span>

                        {s === 'inactive' && (
                          <button
                            className="adm-activate-btn"
                            disabled={isUpdating}
                            onClick={() => handleActivateTurf(t._id, t.name)}
                          >
                            {isUpdating ? (
                              <Spinner color="#fff" size={12} />
                            ) : (
                              'ACTIVATE'
                            )}
                          </button>
                        )}

                        {s === 'active' && (
                          <>
                            <button
                              className="adm-deactivate-btn"
                              disabled={isUpdating}
                              onClick={() => handleDeactivateTurf(t._id, t.name)}
                            >
                              {isUpdating ? (
                                <Spinner color="#DC2626" size={12} />
                              ) : (
                                'DEACTIVATE'
                              )}
                            </button>
                            <button
                              className="adm-maintenance-btn"
                              disabled={isUpdating}
                              onClick={() =>
                                handleMaintenanceTurf(t._id, t.name)
                              }
                            >
                              MAINTENANCE
                            </button>
                          </>
                        )}

                        {s === 'maintenance' && (
                          <button
                            className="adm-activate-btn"
                            disabled={isUpdating}
                            onClick={() => handleActivateTurf(t._id, t.name)}
                          >
                            {isUpdating ? (
                              <Spinner color="#fff" size={12} />
                            ) : (
                              'ACTIVATE'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {i < dashboard.recentTurfs.length - 1 && (
                    <div className="adm-list-divider" />
                  )}
                </React.Fragment>
              );
            })
          ) : (
            <EmptyList text="No turfs found." />
          )}
        </div>

        {/* RECENT BOOKINGS */}
        <SectionHeader
          title="Recent Bookings"
          subtitle="Latest booking activity"
        />
        <div className="adm-list-card">
          {dashboard?.recentBookings?.length ? (
            dashboard.recentBookings.map((b, i) => (
              <React.Fragment key={b._id}>
                <div className="adm-booking-row">
                  <div className="adm-booking-icon">📅</div>
                  <div className="adm-list-content">
                    <p className="adm-list-title">
                      {b.user?.name || 'Customer'}
                    </p>
                    <p className="adm-list-subtitle">
                      {b.turf?.name || 'Turf'} • {b.court?.name || 'Court'}
                    </p>
                    <p className="adm-booking-date">
                      {formatDate(b.bookingDate)} • {b.startTime} - {b.endTime}
                    </p>
                  </div>
                  <div className="adm-booking-right">
                    <p className="adm-booking-amount">
                      {formatCurrency(b.finalAmount)}
                    </p>
                    <span
                      className={`adm-booking-status-pill ${b.status}`}
                    >
                      {String(b.status).toUpperCase()}
                    </span>
                  </div>
                </div>
                {i < dashboard.recentBookings.length - 1 && (
                  <div className="adm-list-divider" />
                )}
              </React.Fragment>
            ))
          ) : (
            <EmptyList text="No recent bookings found." />
          )}
        </div>

        {/* ADMIN BANK */}
        <SectionHeader
          title="Admin Bank Account"
          subtitle="Settlement account for TurfBook platform revenue"
        />
        <div className="adm-bank-card">
          <div className="adm-bank-card-header">
            <div className="adm-bank-icon-circle">🏦</div>
            <div className="adm-bank-card-header-content">
              <p className="adm-bank-card-title">
                {adminBank
                  ? 'Admin settlement account'
                  : 'No admin bank account added'}
              </p>
              <p className="adm-bank-card-subtitle">
                {adminBank
                  ? 'Used for platform settlement and financial operations.'
                  : 'Add your TurfBook admin bank account to enable settlement setup.'}
              </p>
            </div>
          </div>

          {bankLoading ? (
            <div className="adm-bank-loading-row">
              <Spinner />
              <span>Loading bank details...</span>
            </div>
          ) : adminBank ? (
            <div className="adm-bank-details-box">
              <BankDetailRow
                label="Account Holder"
                value={adminBank.accountHolderName || '--'}
              />
              <BankDetailRow
                label="Bank"
                value={adminBank.bankName || '--'}
              />
              <BankDetailRow
                label="Branch"
                value={adminBank.branchName || '--'}
              />
              <BankDetailRow
                label="Account Number"
                value={maskAccountNumber(adminBank.accountNumber)}
              />
              <BankDetailRow
                label="IFSC"
                value={adminBank.ifscCode || '--'}
              />
              <BankDetailRow
                label="Gateway Account"
                value={adminBank.gatewayAccountId || 'Not connected'}
              />

              <div className="adm-bank-verification-row">
                <span
                  className={`adm-bank-verification-pill ${
                    adminBank.isVerified ? 'verified' : 'not-verified'
                  }`}
                >
                  <span
                    className={`adm-bank-verification-dot ${
                      adminBank.isVerified ? 'verified' : 'not-verified'
                    }`}
                  />
                  {adminBank.isVerified ? 'VERIFIED' : 'NOT VERIFIED'}
                </span>
              </div>

              <div className="adm-bank-action-row">
                <button
                  className="adm-bank-edit-btn"
                  onClick={openBankModal}
                  disabled={bankDeleting}
                >
                  EDIT BANK
                </button>
                <button
                  className="adm-bank-delete-btn"
                  onClick={deleteAdminBankDetails}
                  disabled={bankDeleting}
                >
                  {bankDeleting ? (
                    <Spinner color="#DC2626" size={12} />
                  ) : (
                    'DELETE'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button className="adm-add-bank-btn" onClick={openBankModal}>
              <span className="adm-add-bank-icon">+</span>
              <span className="adm-add-bank-content">
                <span className="adm-add-bank-title">ADD BANK ACCOUNT</span>
                <span className="adm-add-bank-subtitle">
                  Add account holder, bank, account number and IFSC
                </span>
              </span>
              <span className="adm-add-bank-arrow">›</span>
            </button>
          )}

          {!!bankError && (
            <div className="adm-bank-error-box">
              <span>{bankError}</span>
            </div>
          )}
        </div>

        {/* PLATFORM */}
        <SectionHeader
          title="Platform"
          subtitle="Configuration & analytics"
        />
        <div className="adm-management-card">
          <ManagementItem
            icon="⚙️"
            title="Platform Settings"
            subtitle="Configure TurfBook platform settings"
            onPress={() => alert('Platform Settings\n\nComing soon.')}
          />
          <div className="adm-divider" />
          <ManagementItem
            icon="📊"
            title="Analytics"
            subtitle="View detailed platform performance"
            onPress={() => alert('Analytics\n\nComing soon.')}
          />
        </div>

        {/* BANK MODAL */}
        {bankModalVisible && (
          <div
            className="adm-bank-modal-overlay"
            onClick={() => {
              if (!bankSaving) setBankModalVisible(false);
            }}
          >
            <div
              className="adm-bank-modal-card"
              onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                e.stopPropagation()
              }
            >
              <div className="adm-bank-modal-header">
                <div>
                  <p className="adm-bank-modal-title">
                    {adminBank ? 'Edit Admin Bank' : 'Add Admin Bank'}
                  </p>
                  <p className="adm-bank-modal-subtitle">
                    Enter the account that belongs to TurfBook administration.
                  </p>
                </div>
                <button
                  className="adm-bank-modal-close"
                  onClick={() => {
                    if (!bankSaving) setBankModalVisible(false);
                  }}
                  disabled={bankSaving}
                >
                  ×
                </button>
              </div>

              <div className="adm-bank-modal-scroll">
                <BankInput
                  label="Account Holder Name *"
                  value={bankForm.accountHolderName}
                  placeholder="e.g. TurfBook Technologies"
                  onChangeText={(v) =>
                    setBankForm((c) => ({ ...c, accountHolderName: v }))
                  }
                />
                <BankInput
                  label="Bank Name"
                  value={bankForm.bankName}
                  placeholder="e.g. HDFC Bank"
                  onChangeText={(v) =>
                    setBankForm((c) => ({ ...c, bankName: v }))
                  }
                />
                <BankInput
                  label="Branch Name"
                  value={bankForm.branchName}
                  placeholder="e.g. Sangli Main Branch"
                  onChangeText={(v) =>
                    setBankForm((c) => ({ ...c, branchName: v }))
                  }
                />
                <BankInput
                  label="Account Number *"
                  value={bankForm.accountNumber}
                  placeholder="Enter bank account number"
                  onChangeText={(v) =>
                    setBankForm((c) => ({
                      ...c,
                      accountNumber: v.replace(/[^0-9]/g, ''),
                    }))
                  }
                  type="password"
                />
                <BankInput
                  label="IFSC Code *"
                  value={bankForm.ifscCode}
                  placeholder="e.g. HDFC0001234"
                  maxLength={11}
                  onChangeText={(v) =>
                    setBankForm((c) => ({
                      ...c,
                      ifscCode: v.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                    }))
                  }
                />
                <BankInput
                  label="Gateway Account ID"
                  value={bankForm.gatewayAccountId}
                  placeholder="Optional until payout onboarding"
                  onChangeText={(v) =>
                    setBankForm((c) => ({ ...c, gatewayAccountId: v }))
                  }
                />

                <div className="adm-bank-security-note">
                  <span>🔒</span>
                  <span>
                    Bank details are used only for TurfBook administrative
                    settlement. Do not enter a fake gateway account ID. Leave it
                    empty until your real payout provider account is created.
                  </span>
                </div>

                {!!bankError && (
                  <div className="adm-bank-modal-error">
                    <span>{bankError}</span>
                  </div>
                )}

                <button
                  className={`adm-bank-save-btn ${bankSaving ? 'disabled' : ''}`}
                  onClick={saveAdminBankDetails}
                  disabled={bankSaving}
                >
                  {bankSaving ? (
                    <Spinner color="#fff" size={16} />
                  ) : adminBank ? (
                    'UPDATE BANK DETAILS'
                  ) : (
                    'SAVE BANK DETAILS'
                  )}
                </button>
                <button
                  className="adm-bank-cancel-btn"
                  onClick={() => {
                    if (!bankSaving) setBankModalVisible(false);
                  }}
                  disabled={bankSaving}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        <button className="adm-logout-btn" onClick={handleLogout}>
          <span className="adm-logout-icon">⇥</span>
          <span>LOGOUT</span>
        </button>
        <p className="adm-footer">TurfBook Admin Panel</p>
        <p className="adm-footer-version">Platform Management • v1.0</p>
        <div style={{ height: 10 }} />
      </div>
    </div>
  );
};

export default AdminDashboardScreen;