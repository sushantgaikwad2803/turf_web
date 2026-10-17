// CustomerProfileScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import './CustomerProfileScreen.css';

/* =========================================================
   API CONFIG
========================================================= */

const RAW_API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  'https://turf-backend-q8w4.onrender.com/api';

const normalizeApiUrl = (url: string): string => {
  let normalized = String(url || '').trim();
  if (!normalized) normalized = 'https://turf-backend-q8w4.onrender.com/api';
  normalized = normalized.replace(/^["']|["']$/g, '');
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
  return normalized.replace(/\/+$/, '');
};

const API_BASE_URL = normalizeApiUrl(RAW_API_URL);

/* =========================================================
   TYPES
========================================================= */

export interface CustomerUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer';
}

export interface Booking {
  _id: string;
  turf?: { _id?: string; name?: string; address?: string; city?: string };
  court?: { _id?: string; name?: string; sport?: string };
  bookingDate: string;
  startTime: string;
  endTime: string;
  finalAmount: number;
  status: 'confirmed' | 'cancelled' | 'pending' | 'completed' | 'booked' | string;
}

export interface CustomerProfileScreenProps {
  user: CustomerUser;
  onUpdateUser?: (updatedUser: CustomerUser) => void;
  onLogout?: () => void;
}

/* =========================================================
   HELPERS
========================================================= */

const formatBookingDate = (dateString: string): string => {
  if (!dateString) return 'Date unavailable';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const formatTimeCompact = (time: string): string => {
  if (!time) return '--';
  const str = String(time).trim();
  const match = str.match(/^(\d{1,2})(?::(\d{1,2}))?(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return str;

  let hour = Number(match[1]);
  const minute = match[2] !== undefined ? Number(match[2]) : 0;
  const period = match[3]?.toUpperCase();
  if (!Number.isFinite(hour)) return str;

  if (period) {
    if (period === 'AM' && hour === 12) hour = 0;
    else if (period === 'PM' && hour < 12) hour += 12;
  }

  let displayHour: number;
  if (hour === 0) displayHour = 12;
  else if (hour > 12) displayHour = hour - 12;
  else displayHour = hour;

  if (minute === 0) return String(displayHour);
  return `${displayHour}:${String(minute).padStart(2, '0')}`;
};

const formatTimeRange = (startTime: string, endTime: string): string =>
  `${formatTimeCompact(startTime)} - ${formatTimeCompact(endTime)}`;

const formatAmount = (amount: number): string => {
  const n = Number(amount);
  if (Number.isNaN(n)) return '0';
  return n.toLocaleString('en-IN');
};

const getInitial = (name?: string): string => {
  if (!name?.trim()) return 'U';
  return name.trim().charAt(0).toUpperCase();
};

const getStatusStyle = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
    case 'completed':
    case 'booked':
      return {
        container: { backgroundColor: '#F4FBE6', borderColor: '#D9DCE7' },
        text: { color: '#6F9D28' },
      };
    case 'cancelled':
      return {
        container: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
        text: { color: '#B91C1C' },
      };
    case 'pending':
      return {
        container: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
        text: { color: '#92400E' },
      };
    default:
      return {
        container: { backgroundColor: '#FCFCFE', borderColor: '#E6E8EF' },
        text: { color: '#8A92A3' },
      };
  }
};

const getStatusLabel = (status: string): string =>
  status ? status.toUpperCase() : 'UNKNOWN';

const getResponseData = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return { message: 'Server returned invalid JSON.' };
    }
  }
  const text = await response.text();
  return { message: text || 'Unexpected server response.' };
};

/* =========================================================
   COMPONENT
========================================================= */

const CustomerProfileScreen: React.FC<CustomerProfileScreenProps> = ({
  user,
  onUpdateUser,
  onLogout,
}) => {
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [fetchingBookings, setFetchingBookings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setName(user.name || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
  }, [user]);

  const fetchBookings = useCallback(async () => {
    if (!user?._id) return;
    const bookingUrl = `${API_BASE_URL}/users/${encodeURIComponent(
      user._id,
    )}/bookings`;
    try {
      setFetchingBookings(true);
      const response = await fetch(bookingUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const data = await getResponseData(response);
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Failed to fetch bookings. HTTP ${response.status}`,
        );
      }
      const bookingData: Booking[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.bookings)
          ? data.bookings
          : [];
      setBookings(bookingData);
    } catch (error) {
      console.error('Fetch bookings error:', error);
      setBookings([]);
    } finally {
      setFetchingBookings(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchBookings();
    } finally {
      setRefreshing(false);
    }
  }, [fetchBookings]);

  const validateProfile = (): boolean => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      alert('Please fill in your name, email and phone number.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      alert('Please enter a valid email address.');
      return false;
    }
    if (trimmedPhone.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid phone number.');
      return false;
    }
    return true;
  };

  const handleUpdateProfile = async () => {
    if (!validateProfile()) return;
    if (!user?._id) {
      alert('User information is missing.');
      return;
    }

    const updateUrl = `${API_BASE_URL}/users/${encodeURIComponent(user._id)}`;
    try {
      setUpdatingProfile(true);
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
        }),
      });
      const data = await getResponseData(response);
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Failed to update profile. HTTP ${response.status}`,
        );
      }
      const updatedUser: CustomerUser = data?.user || data;
      onUpdateUser?.({ ...user, ...updatedUser, role: 'customer' });
      setShowEditProfile(false);
      alert('Your profile has been updated successfully.');
    } catch (error: any) {
      alert(
        error?.message || 'Unable to update your profile. Please try again.',
      );
    } finally {
      setUpdatingProfile(false);
    }
  };

  const validatePassword = (): boolean => {
    if (!currentPassword.trim()) {
      alert('Please enter your current password.');
      return false;
    }
    if (!newPassword.trim()) {
      alert('Please enter your new password.');
      return false;
    }
    if (newPassword.length < 6) {
      alert('New password must contain at least 6 characters.');
      return false;
    }
    if (currentPassword === newPassword) {
      alert('New password must be different from your current password.');
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;
    if (!user?._id) {
      alert('User information is missing.');
      return;
    }

    const passwordUrl = `${API_BASE_URL}/users/${encodeURIComponent(
      user._id,
    )}/password`;
    try {
      setChangingPassword(true);
      const response = await fetch(passwordUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await getResponseData(response);
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Failed to change password. HTTP ${response.status}`,
        );
      }
      setCurrentPassword('');
      setNewPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowPasswordModal(false);
      alert('Your password has been changed successfully.');
    } catch (error: any) {
      alert(
        error?.message ||
          'Unable to change your password. Please try again.',
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    if (changingPassword) return;
    setCurrentPassword('');
    setNewPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowPasswordModal(false);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) onLogout?.();
  };

  return (
    <div className="cp-safe">
      <div className="cp-container">
        {/* PAGE HEADER */}
        <div className="cp-page-header">
          <span className="cp-page-badge">⚽ PLAYER</span>
          <h1 className="cp-title">Profile</h1>
          <p className="cp-page-subtitle">Manage your account and bookings</p>
        </div>

        {/* PROFILE CARD */}
        <div className="cp-card">
          <div className="cp-profile-top">
            <div className="cp-avatar-wrapper">
              <div className="cp-avatar">
                <span className="cp-avatar-text">{getInitial(user.name)}</span>
              </div>
              <span className="cp-avatar-badge">🏆</span>
            </div>
            <div className="cp-profile-info">
              <h2 className="cp-name">{user.name || 'User'}</h2>
              <p className="cp-email">
                {user.email || 'Email not available'}
              </p>
              <span className="cp-role-pill">PLAYER</span>
            </div>
          </div>

          <div className="cp-info-row">
            <span className="cp-label">Phone</span>
            <span className="cp-value">{user.phone || 'Not added'}</span>
          </div>

          <div className="cp-button-row">
            <button
              className="cp-primary-button"
              onClick={() => setShowEditProfile(true)}
            >
              ✎ Edit
            </button>
            <button
              className="cp-secondary-button"
              onClick={openPasswordModal}
            >
              🔒 Password
            </button>
          </div>
        </div>

        {/* BOOKING HISTORY */}
        <div className="cp-section-header">
          <div className="cp-section-title-row">
            <h2 className="cp-section-title">Booking History</h2>
            <span className="cp-section-accent" />
          </div>
          <div className="cp-section-header-right">
            {bookings.length > 0 && (
              <span className="cp-count-pill">{bookings.length}</span>
            )}
            <button
              className="cp-refresh-inline"
              onClick={handleRefresh}
              disabled={refreshing || fetchingBookings}
              title="Refresh bookings"
            >
              {refreshing ? '↻ Refreshing…' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {fetchingBookings && !refreshing ? (
          <div className="cp-loading-box">
            <span className="cp-spinner" />
            <span className="cp-loading-text">Loading bookings...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="cp-empty-card">
            <div className="cp-empty-icon-wrapper">🎟️</div>
            <h3 className="cp-empty-title">No bookings yet</h3>
            <p className="cp-empty-text">
              Your turf bookings will appear here.
            </p>
            <button
              className="cp-empty-refresh-button"
              onClick={fetchBookings}
            >
              REFRESH
            </button>
          </div>
        ) : (
          bookings.map((booking) => {
            const statusStyle = getStatusStyle(booking.status);
            return (
              <div key={booking._id} className="cp-booking-card">
                <div className="cp-booking-header">
                  <div className="cp-booking-icon-circle">🏟️</div>
                  <div className="cp-booking-main-info">
                    <h4 className="cp-booking-turf">
                      {booking.turf?.name || 'Turf'}
                    </h4>
                    <span className="cp-booking-date">
                      📅 {formatBookingDate(booking.bookingDate)}
                    </span>
                  </div>
                  <span
                    className="cp-status-pill"
                    style={{
                      backgroundColor:
                        statusStyle.container.backgroundColor,
                      borderColor: statusStyle.container.borderColor,
                      color: statusStyle.text.color,
                    }}
                  >
                    {getStatusLabel(booking.status)}
                  </span>
                </div>

                <div className="cp-booking-divider" />

                <div className="cp-booking-bottom">
                  <div>
                    <span className="cp-booking-label">TIME</span>
                    <p className="cp-booking-time">
                      {formatTimeRange(
                        booking.startTime,
                        booking.endTime,
                      )}
                    </p>
                  </div>
                  <div className="cp-booking-amount-box">
                    <span className="cp-booking-label">AMOUNT</span>
                    <p className="cp-amount">
                      ₹{formatAmount(booking.finalAmount)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* LOGOUT */}
        <button className="cp-logout-button" onClick={handleLogout}>
          ⎋ LOGOUT
        </button>
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditProfile && (
        <div
          className="cp-modal-overlay"
          onClick={() => {
            if (!updatingProfile) setShowEditProfile(false);
          }}
        >
          <div
            className="cp-modal-card"
            onClick={(e: React.MouseEvent<HTMLDivElement>) =>
              e.stopPropagation()
            }
          >
            <div className="cp-modal-handle" />
            <span className="cp-modal-badge">👤 PROFILE</span>
            <h2 className="cp-modal-title">Edit Profile</h2>

            <label className="cp-field-label">NAME</label>
            <input
              className="cp-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              disabled={updatingProfile}
            />

            <label className="cp-field-label">EMAIL</label>
            <input
              className="cp-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={updatingProfile}
            />

            <label className="cp-field-label">PHONE</label>
            <input
              className="cp-input"
              type="tel"
              maxLength={15}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              disabled={updatingProfile}
            />

            <button
              className="cp-green-button"
              onClick={handleUpdateProfile}
              disabled={updatingProfile}
            >
              {updatingProfile ? (
                <span className="cp-spinner" />
              ) : (
                'SAVE CHANGES'
              )}
            </button>
            <button
              className="cp-cancel-button"
              onClick={() => setShowEditProfile(false)}
              disabled={updatingProfile}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="cp-modal-overlay" onClick={closePasswordModal}>
          <div
            className="cp-modal-card"
            onClick={(e: React.MouseEvent<HTMLDivElement>) =>
              e.stopPropagation()
            }
          >
            <div className="cp-modal-handle" />
            <span className="cp-modal-badge">🔒 SECURITY</span>
            <h2 className="cp-modal-title">Change Password</h2>

            <label className="cp-field-label">CURRENT PASSWORD</label>
            <div className="cp-password-wrapper">
              <input
                className="cp-password-input"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={changingPassword}
              />
              <button
                type="button"
                className="cp-password-toggle"
                onClick={() => setShowCurrentPassword((p) => !p)}
                disabled={changingPassword}
              >
                {showCurrentPassword ? '🙈' : '👁'}
              </button>
            </div>

            <label className="cp-field-label">NEW PASSWORD</label>
            <div className="cp-password-wrapper">
              <input
                className="cp-password-input"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={changingPassword}
              />
              <button
                type="button"
                className="cp-password-toggle"
                onClick={() => setShowNewPassword((p) => !p)}
                disabled={changingPassword}
              >
                {showNewPassword ? '🙈' : '👁'}
              </button>
            </div>

            <p className="cp-helper-text">Minimum 6 characters</p>

            <button
              className="cp-green-button"
              onClick={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? (
                <span className="cp-spinner" />
              ) : (
                'CHANGE PASSWORD'
              )}
            </button>
            <button
              className="cp-cancel-button"
              onClick={closePasswordModal}
              disabled={changingPassword}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfileScreen;