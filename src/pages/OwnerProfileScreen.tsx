// src/pages/OwnerProfileScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import './OwnerProfileScreen.css';

/* =========================================================
   API
========================================================= */

const RAW_API_BASE_URL = (
  (import.meta as any).env?.VITE_API_URL ||
  'https://turf-backend-q8w4.onrender.com/api'
)
  .trim();

const normalizeApiBaseUrl = (value: string): string => {
  let url = value.trim().replace(/^['"]|['"]$/g, '');
  url = url.replace(/\/+$/, '');
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!/\/api$/i.test(url)) url = `${url}/api`;
  return url;
};

const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);

const buildApiUrl = (path: string): string => {
  if (!API_BASE_URL) throw new Error('API URL is not configured.');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

/* =========================================================
   TYPES
========================================================= */

export interface OwnerUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'owner';
}

export interface BankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
}

export interface OperatingHour {
  day: string;
  openingTime: string;
  closingTime: string;
  isClosed: boolean;
}

export interface Court {
  _id: string;
  turf: string;
  name: string;
  sport: string;
  pricePerHour: number;
  hasNightPricing: boolean;
  nightPricePerHour?: number;
  nightStartHour?: number;
  nightEndHour?: number;
  fullDayDiscountPercent?: number;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface Turf {
  _id: string;
  owner: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  status?: 'active' | 'inactive' | 'maintenance';
  operatingHours?: OperatingHour[];
  amenities?: string[];
  location?: { type: string; coordinates: [number, number] };
  images?: Array<{ url: string; isPrimary?: boolean }>;
}

export interface RecentBooking {
  _id: string;
  customer: { _id: string; name: string; email?: string; phone?: string } | null;
  turf: { _id: string; name: string; city?: string } | null;
  court: { _id: string; name: string; sport?: string } | null;
  slot: { startTime?: string; endTime?: string; price?: number } | null;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  grossAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
  status?: string;
  createdAt?: string;
}

export interface OwnerProfileScreenProps {
  user: OwnerUser;
  onUpdateUser?: (updatedUser: OwnerUser) => void;
  onLogout?: () => void;
  onNavigateToAddTurf?: () => void;
}

/* =========================================================
   DEFAULTS + HELPERS
========================================================= */

const DEFAULT_OPERATING_HOURS: OperatingHour[] = [
  { day: 'Monday', openingTime: '06:00', closingTime: '23:00', isClosed: false },
  { day: 'Tuesday', openingTime: '06:00', closingTime: '23:00', isClosed: false },
  { day: 'Wednesday', openingTime: '06:00', closingTime: '23:00', isClosed: false },
  { day: 'Thursday', openingTime: '06:00', closingTime: '23:00', isClosed: false },
  { day: 'Friday', openingTime: '06:00', closingTime: '23:00', isClosed: false },
  { day: 'Saturday', openingTime: '06:00', closingTime: '23:00', isClosed: false },
  { day: 'Sunday', openingTime: '06:00', closingTime: '23:00', isClosed: false },
];

const cloneDefaultHours = (): OperatingHour[] =>
  DEFAULT_OPERATING_HOURS.map((h) => ({ ...h }));

const getErrorMessage = (error: unknown, fallback = 'Something went wrong.'): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
};

const parseApiResponse = async (response: Response): Promise<any> => {
  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`,
    );
  }
  return data;
};

const hourToTimeString = (hour?: number): string => {
  const safeHour = typeof hour === 'number' && hour >= 0 && hour <= 23 ? hour : 18;
  return `${String(safeHour).padStart(2, '0')}:00`;
};

const timeStringToHour = (time: string): number => {
  const [hours] = String(time || '').split(':').map(Number);
  return Number.isNaN(hours) ? 0 : hours;
};

const timeStringToDate = (time: string): Date => {
  const [hours, minutes] = String(time || '').split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isNaN(hours) ? 6 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
  return date;
};

// ✅ REMOVED: `dateToTimeString` was unused after migrating to native <input type="time">.

const formatHour = (hour?: number): string => {
  if (typeof hour !== 'number' || hour < 0 || hour > 23) return '--:--';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(displayHour).padStart(2, '0')}:00 ${suffix}`;
};

const maskAccountNumber = (accountNumber: string): string => {
  if (!accountNumber) return 'Not added';
  if (accountNumber.length <= 4) return accountNumber;
  return `•••• •••• ${accountNumber.slice(-4)}`;
};

const getTurfStatusColors = (status?: string) => {
  const clean = String(status || 'active').toLowerCase();
  switch (clean) {
    case 'active':
      return { bg: '#F4FBE6', border: '#D9DCE7', text: '#6F9D28', dot: '#87B936' };
    case 'maintenance':
      return { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' };
    default:
      return { bg: '#FCFCFE', border: '#E6E8EF', text: '#8A92A3', dot: '#8A92A3' };
  }
};

const getBookingStatusColors = (status?: string) => {
  const clean = String(status || 'confirmed').toLowerCase();
  if (clean === 'cancelled' || clean === 'canceled')
    return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C' };
  if (clean === 'pending' || clean === 'reserved')
    return { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' };
  if (clean === 'completed')
    return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' };
  return { bg: '#F4FBE6', border: '#D9DCE7', text: '#6F9D28' };
};

const formatBookingDate = (date?: string): string => {
  if (!date) return 'Date not available';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatBookingTime = (time?: string): string => {
  if (!time) return '--';
  const match = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (Number.isNaN(hours) || hours < 0 || hours > 23) return time;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${minutes} ${suffix}`;
};

const isBookingTodayOrFuture = (bookingDate?: string): boolean => {
  if (!bookingDate) return false;
  const dateMatch = String(bookingDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (dateMatch) {
    const bookingStart = new Date(
      Number(dateMatch[1]),
      Number(dateMatch[2]) - 1,
      Number(dateMatch[3]),
    );
    return bookingStart >= todayStart;
  }
  const parsed = new Date(bookingDate);
  if (Number.isNaN(parsed.getTime())) return false;
  const bookingStart = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  );
  return bookingStart >= todayStart;
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export const OwnerProfileScreen: React.FC<OwnerProfileScreenProps> = ({
  user,
  onUpdateUser,
  onLogout,
  onNavigateToAddTurf,
}) => {
  /* MODALS */
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showTurfModal, setShowTurfModal] = useState(false);
  const [showCourtModal, setShowCourtModal] = useState(false);

  /* PROFILE */
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  /* BANK */
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
  });

  /* TURF FORM */
  const [turfName, setTurfName] = useState('');
  const [turfDescription, setTurfDescription] = useState('');
  const [turfAddress, setTurfAddress] = useState('');
  const [turfCity, setTurfCity] = useState('');
  const [turfAmenities, setTurfAmenities] = useState('');
  const [turfLatitude, setTurfLatitude] = useState<number | null>(null);
  const [turfLongitude, setTurfLongitude] = useState<number | null>(null);
  const [turfLocationLoading, setTurfLocationLoading] = useState(false);
  const [turfImageUri, setTurfImageUri] = useState<string | null>(null);
  const [turfUploadedImageUrl, setTurfUploadedImageUrl] = useState('');
  const [turfImageUploading, setTurfImageUploading] = useState(false);
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>(
    cloneDefaultHours(),
  );

  /* COURT FORM */
  const [courtName, setCourtName] = useState('');
  const [courtSport, setCourtSport] = useState('');
  const [courtPrice, setCourtPrice] = useState('');
  const [courtFullDayDiscountPercent, setCourtFullDayDiscountPercent] = useState('4');
  const [courtHasNightPricing, setCourtHasNightPricing] = useState(false);
  const [courtNightPrice, setCourtNightPrice] = useState('');
  const [courtNightStartTime, setCourtNightStartTime] = useState('18:00');
  const [courtNightEndTime, setCourtNightEndTime] = useState('23:00');

  /* DATA */
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [turfCourts, setTurfCourts] = useState<Record<string, Court[]>>({});
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [fetchingBookings, setFetchingBookings] = useState(false);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [expandedTurfId, setExpandedTurfId] = useState<string | null>(null);
  const [selectedTurfId, setSelectedTurfId] = useState<string | null>(null);
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

  /* LOADING */
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setName(user.name || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
  }, [user.name, user.email, user.phone]);

  /* FETCHERS */
  const fetchTurfs = useCallback(async () => {
    const response = await fetch(
      buildApiUrl(`/owners/${encodeURIComponent(user._id)}/turfs`),
    );
    const data = await parseApiResponse(response);
    const ownerTurfs = Array.isArray(data?.turfs)
      ? data.turfs
      : Array.isArray(data)
        ? data
        : [];
    if (mountedRef.current) setTurfs(ownerTurfs);
    return ownerTurfs;
  }, [user._id]);

  const fetchBankDetails = useCallback(async () => {
    const response = await fetch(
      buildApiUrl(`/owners/${encodeURIComponent(user._id)}/bank-details`),
    );
    const data = await parseApiResponse(response);
    if (!mountedRef.current) return;
    if (data) {
      setBankDetails({
        accountHolderName: data.accountHolderName || '',
        accountNumber: data.accountNumber || '',
        ifscCode: data.ifscCode || '',
      });
    } else {
      setBankDetails({ accountHolderName: '', accountNumber: '', ifscCode: '' });
    }
  }, [user._id]);

  const fetchRecentBookings = useCallback(async () => {
    try {
      setFetchingBookings(true);
      const response = await fetch(
        buildApiUrl(`/owners/${encodeURIComponent(user._id)}/dashboard`),
      );
      const data = await parseApiResponse(response);
      const bookings = Array.isArray(data?.recentBookings) ? data.recentBookings : [];
      if (mountedRef.current) setRecentBookings(bookings);
    } catch (error) {
      console.error('Failed to fetch recent bookings:', error);
      if (mountedRef.current) setRecentBookings([]);
    } finally {
      if (mountedRef.current) setFetchingBookings(false);
    }
  }, [user._id]);

  const fetchOwnerData = useCallback(async () => {
    try {
      setFetchingData(true);
      await Promise.allSettled([fetchTurfs(), fetchBankDetails(), fetchRecentBookings()]);
    } catch (error) {
      console.error('Failed to fetch owner data:', error);
    } finally {
      if (mountedRef.current) setFetchingData(false);
    }
  }, [fetchTurfs, fetchBankDetails, fetchRecentBookings]);

  useEffect(() => {
    fetchOwnerData();
  }, [fetchOwnerData]);

  const fetchCourts = useCallback(async (turfId: string) => {
    try {
      const response = await fetch(
        buildApiUrl(`/turfs/${encodeURIComponent(turfId)}/courts`),
      );
      const data = await parseApiResponse(response);
      const courts = Array.isArray(data?.courts)
        ? data.courts
        : Array.isArray(data)
          ? data
          : [];
      if (mountedRef.current) {
        setTurfCourts((prev) => ({ ...prev, [turfId]: courts }));
      }
      return courts;
    } catch (error) {
      console.error('Failed to fetch courts:', error);
      alert(getErrorMessage(error, 'Failed to load courts for this turf.'));
      return [];
    }
  }, []);

  const handleToggleTurf = async (turfId: string) => {
    if (expandedTurfId === turfId) {
      setExpandedTurfId(null);
      return;
    }
    setExpandedTurfId(turfId);
    await fetchCourts(turfId);
  };

  /* PROFILE ACTIONS */
  const handleUpdateProfile = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      alert('Please fill in all profile fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      alert('Please enter a valid email address.');
      return;
    }
    if (trimmedPhone.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid phone number.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(`/users/${encodeURIComponent(user._id)}`),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedName,
            email: trimmedEmail,
            phone: trimmedPhone,
          }),
        },
      );
      const data = await parseApiResponse(response);
      const updatedUser = data?.user || data;
      if (updatedUser && mountedRef.current) onUpdateUser?.(updatedUser);
      setShowEditProfile(false);
      alert('Your profile has been updated successfully.');
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to update profile.'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const current = currentPassword.trim();
    const next = newPassword.trim();

    if (!current || !next) {
      alert('Please enter your current and new password.');
      return;
    }
    if (next.length < 6) {
      alert('New password must contain at least 6 characters.');
      return;
    }
    if (current === next) {
      alert('New password must be different from your current password.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(`/users/${encodeURIComponent(user._id)}/password`),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: current, newPassword: next }),
        },
      );
      await parseApiResponse(response);
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordModal(false);
      alert('Your password has been changed successfully.');
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to change password.'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleAddTurf = () => {
    if (onNavigateToAddTurf) {
      onNavigateToAddTurf();
      return;
    }
    alert('Add Turf navigation is not configured.');
  };

  /* TURF IMAGE UPLOAD (web) */
  const uploadTurfImageToBackend = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(buildApiUrl('/upload/turf-image'), {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData,
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
    if (!res.ok) {
      throw new Error(
        `Image upload failed (${res.status}): ${data?.error || data?.message || text || 'Unknown'}`,
      );
    }
    const imageUrl =
      data?.url || data?.imageUrl || data?.secure_url || data?.image?.url;
    if (!imageUrl) throw new Error('Server did not return an image URL.');
    return String(imageUrl);
  };

  const pickTurfImage = async (file: File) => {
    setTurfImageUri(URL.createObjectURL(file));
    setTurfUploadedImageUrl('');
    setTurfImageUploading(true);
    try {
      const imageUrl = await uploadTurfImageToBackend(file);
      setTurfUploadedImageUrl(imageUrl);
      alert('Turf image uploaded successfully.');
    } catch (error) {
      setTurfImageUri(null);
      setTurfUploadedImageUrl('');
      alert(getErrorMessage(error, 'Could not upload the image.'));
    } finally {
      setTurfImageUploading(false);
    }
  };

  /* TURF LOCATION (web) */
  const getTurfCurrentLocation = () => {
    if (turfLocationLoading) return;
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setTurfLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          alert('The device returned an invalid location.');
          setTurfLocationLoading(false);
          return;
        }
        setTurfLatitude(lat);
        setTurfLongitude(lng);
        setTurfLocationLoading(false);
        alert('The turf location has been updated successfully.');
      },
      (err) => {
        setTurfLocationLoading(false);
        alert(err.message || 'Unable to get your current location.');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const handleEditTurf = (turf: Turf) => {
    setSelectedTurf(turf);
    setTurfName(turf.name || '');
    setTurfDescription(turf.description || '');
    setTurfAddress(turf.address || '');
    setTurfCity(turf.city || '');
    setTurfAmenities(Array.isArray(turf.amenities) ? turf.amenities.join(', ') : '');

    const coordinates = turf.location?.coordinates;
    if (
      Array.isArray(coordinates) &&
      coordinates.length === 2 &&
      Number.isFinite(Number(coordinates[0])) &&
      Number.isFinite(Number(coordinates[1]))
    ) {
      setTurfLongitude(Number(coordinates[0]));
      setTurfLatitude(Number(coordinates[1]));
    } else {
      setTurfLongitude(null);
      setTurfLatitude(null);
    }

    const primaryImage =
      turf.images?.find((i) => i.isPrimary && i.url) ||
      turf.images?.find((i) => i.url);
    setTurfImageUri(primaryImage?.url || null);
    setTurfUploadedImageUrl(primaryImage?.url || '');
    setTurfImageUploading(false);

    setShowTurfModal(true);
  };

  const updateOperatingHour = (
    index: number,
    field: keyof OperatingHour,
    value: string | boolean,
  ) => {
    setOperatingHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    );
  };

  const handleSaveTurf = async () => {
    const cleanName = turfName.trim();
    const cleanAddress = turfAddress.trim();
    const cleanCity = turfCity.trim();
    const amenityList = turfAmenities.split(',').map((s) => s.trim()).filter(Boolean);

    if (!cleanName) return alert('Please enter the turf name.');
    if (!cleanAddress) return alert('Please enter the turf address.');
    if (!cleanCity) return alert('Please enter the city.');
    if (turfImageUploading) return alert('The turf image is still uploading.');
    if (!turfUploadedImageUrl)
      return alert('Please select a turf image and wait for the upload to finish.');
    if (turfLatitude === null || turfLongitude === null)
      return alert('Please select the turf location using "Use Current Location".');

    const isEditing = Boolean(selectedTurf);
    if (!isEditing) {
      for (const hour of operatingHours) {
        if (hour.isClosed) continue;
        if (!hour.openingTime || !hour.closingTime)
          return alert(`Please select opening and closing time for ${hour.day}.`);
        const opening = timeStringToDate(hour.openingTime).getTime();
        const closing = timeStringToDate(hour.closingTime).getTime();
        if (opening >= closing)
          return alert(`Closing time must be later than opening time on ${hour.day}.`);
      }
    }

    try {
      setLoading(true);
      const url = isEditing
        ? buildApiUrl(`/turfs/${encodeURIComponent(selectedTurf!._id)}`)
        : buildApiUrl('/turfs');

      const payload: any = {
        owner: user._id,
        name: cleanName,
        description: turfDescription.trim(),
        address: cleanAddress,
        city: cleanCity,
        location: { type: 'Point', coordinates: [turfLongitude, turfLatitude] },
        images: [{ url: turfUploadedImageUrl, isPrimary: true }],
        amenities: amenityList,
      };
      if (!isEditing) payload.operatingHours = operatingHours;

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      await parseApiResponse(response);
      closeTurfModal();
      await fetchTurfs();
      alert(isEditing ? 'Turf updated successfully.' : 'Turf added successfully.');
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to save turf.'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const closeTurfModal = () => {
    setShowTurfModal(false);
    setSelectedTurf(null);
    setTurfName('');
    setTurfDescription('');
    setTurfAddress('');
    setTurfCity('');
    setTurfAmenities('');
    setTurfLatitude(null);
    setTurfLongitude(null);
    setTurfLocationLoading(false);
    setTurfImageUri(null);
    setTurfUploadedImageUrl('');
    setTurfImageUploading(false);
    setOperatingHours(cloneDefaultHours());
  };

  const handleDeleteTurf = (turf: Turf) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${turf.name}"?\n\nAll courts belonging to this turf will also be deleted.\n\nThis action cannot be undone.`,
      )
    )
      return;

    (async () => {
      try {
        setLoading(true);
        const response = await fetch(
          buildApiUrl(`/turfs/${encodeURIComponent(turf._id)}`),
          { method: 'DELETE', headers: { 'Content-Type': 'application/json' } },
        );
        const data = await parseApiResponse(response);
        if (!mountedRef.current) return;
        setTurfs((prev) => prev.filter((t) => t._id !== turf._id));
        setTurfCourts((prev) => {
          const next = { ...prev };
          delete next[turf._id];
          return next;
        });
        if (expandedTurfId === turf._id) setExpandedTurfId(null);
        if (selectedTurf?._id === turf._id) closeTurfModal();
        alert(data?.message || 'Turf and all its courts were deleted successfully.');
      } catch (error) {
        alert(getErrorMessage(error, 'Failed to delete turf.'));
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
  };

  /* COURT ACTIONS */
  const resetCourtForm = () => {
    setCourtName('');
    setCourtSport('');
    setCourtPrice('');
    setCourtFullDayDiscountPercent('4');
    setCourtHasNightPricing(false);
    setCourtNightPrice('');
    setCourtNightStartTime('18:00');
    setCourtNightEndTime('23:00');
    setSelectedCourt(null);
  };

  const handleAddCourt = (turfId: string) => {
    setSelectedTurfId(turfId);
    resetCourtForm();
    setShowCourtModal(true);
  };

  const handleEditCourt = (turfId: string, court: Court) => {
    setSelectedTurfId(turfId);
    setSelectedCourt(court);
    setCourtName(court.name || '');
    setCourtSport(court.sport || '');
    setCourtPrice(court.pricePerHour !== undefined ? String(court.pricePerHour) : '');
    setCourtFullDayDiscountPercent(
      court.fullDayDiscountPercent !== undefined
        ? String(court.fullDayDiscountPercent)
        : '4',
    );
    setCourtHasNightPricing(Boolean(court.hasNightPricing));
    setCourtNightPrice(
      court.nightPricePerHour !== undefined ? String(court.nightPricePerHour) : '',
    );
    setCourtNightStartTime(hourToTimeString(court.nightStartHour));
    setCourtNightEndTime(hourToTimeString(court.nightEndHour));
    setShowCourtModal(true);
  };

  const handleSaveCourt = async () => {
    if (!selectedTurfId || !courtName.trim() || !courtSport.trim() || !courtPrice.trim()) {
      alert('Please fill all required court fields.');
      return;
    }
    const price = Number(courtPrice);
    if (!Number.isFinite(price) || price <= 0) {
      alert('Base price must be greater than ₹0.');
      return;
    }
    const fullDayDiscountPercent = Number(courtFullDayDiscountPercent.trim());
    if (
      !Number.isFinite(fullDayDiscountPercent) ||
      fullDayDiscountPercent < 0 ||
      fullDayDiscountPercent > 100
    ) {
      alert('Full Day discount must be between 0% and 100%.');
      return;
    }

    let nightPrice: number | undefined;
    let nightStartHour: number | undefined;
    let nightEndHour: number | undefined;

    if (courtHasNightPricing) {
      if (!courtNightPrice.trim()) {
        alert('Please enter the night price per hour.');
        return;
      }
      nightPrice = Number(courtNightPrice);
      if (!Number.isFinite(nightPrice) || nightPrice <= 0) {
        alert('Night price must be greater than ₹0.');
        return;
      }
      nightStartHour = timeStringToHour(courtNightStartTime);
      nightEndHour = timeStringToHour(courtNightEndTime);
      if (nightStartHour === nightEndHour) {
        alert('Night start and end time cannot be the same.');
        return;
      }
    }

    try {
      setLoading(true);
      const isEditing = Boolean(selectedCourt);
      const url = isEditing
        ? buildApiUrl(`/courts/${encodeURIComponent(selectedCourt!._id)}`)
        : buildApiUrl('/courts');
      const payload: any = {
        turf: selectedTurfId,
        name: courtName.trim(),
        sport: courtSport.trim(),
        pricePerHour: price,
        fullDayDiscountPercent,
        hasNightPricing: courtHasNightPricing,
        ...(courtHasNightPricing
          ? { nightPricePerHour: nightPrice, nightStartHour, nightEndHour }
          : {}),
      };
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await parseApiResponse(response);
      setShowCourtModal(false);
      await fetchCourts(selectedTurfId);
      resetCourtForm();
      alert(isEditing ? 'Court updated successfully.' : 'Court added successfully.');
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to save court.'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleDeleteCourt = (turfId: string, court: Court) => {
    if (!window.confirm(`Are you sure you want to delete "${court.name}"?`)) return;

    (async () => {
      try {
        setLoading(true);
        const response = await fetch(
          buildApiUrl(`/courts/${encodeURIComponent(court._id)}`),
          { method: 'DELETE', headers: { 'Content-Type': 'application/json' } },
        );
        const data = await parseApiResponse(response);
        if (!mountedRef.current) return;
        setTurfCourts((prev) => ({
          ...prev,
          [turfId]: (prev[turfId] || []).filter((c) => c._id !== court._id),
        }));
        if (selectedCourt?._id === court._id) {
          setSelectedCourt(null);
          setShowCourtModal(false);
        }
        alert(data?.message || 'Court deleted successfully.');
      } catch (error) {
        alert(getErrorMessage(error, 'Failed to delete court.'));
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
  };

  /* BANK */
  const handleSaveBankDetails = async () => {
    const holder = bankDetails.accountHolderName.trim();
    const account = bankDetails.accountNumber.trim();
    const ifsc = bankDetails.ifscCode.trim().toUpperCase();

    if (!holder || !account || !ifsc) return alert('Please fill all bank details.');
    if (account.length < 6)
      return alert('Please enter a valid bank account number.');
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc))
      return alert('Please enter a valid IFSC code.');

    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(`/owners/${encodeURIComponent(user._id)}/bank-details`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountHolderName: holder,
            accountNumber: account,
            ifscCode: ifsc,
          }),
        },
      );
      await parseApiResponse(response);
      setShowBankModal(false);
      await fetchBankDetails();
      alert('Your payout bank details have been saved successfully.');
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to save bank details.'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleDeleteBankDetails = () => {
    if (!bankDetails.accountHolderName) return;
    if (
      !window.confirm(
        'Are you sure you want to remove your payout bank account details?',
      )
    )
      return;
    (async () => {
      try {
        setLoading(true);
        const response = await fetch(
          buildApiUrl(`/owners/${encodeURIComponent(user._id)}/bank-details`),
          { method: 'DELETE', headers: { 'Content-Type': 'application/json' } },
        );
        const data = await parseApiResponse(response);
        if (!mountedRef.current) return;
        setBankDetails({ accountHolderName: '', accountNumber: '', ifscCode: '' });
        setShowBankModal(false);
        alert(data?.message || 'Bank details deleted successfully.');
      } catch (error) {
        alert(getErrorMessage(error, 'Failed to delete bank details.'));
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
  };

  /* DANGER ZONE */
  const performDeleteOwnerAccount = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(`/owners/${encodeURIComponent(user._id)}/account`),
        { method: 'DELETE', headers: { 'Content-Type': 'application/json' } },
      );
      const data = await parseApiResponse(response);
      if (!mountedRef.current) return;
      setTurfs([]);
      setTurfCourts({});
      setBankDetails({ accountHolderName: '', accountNumber: '', ifscCode: '' });
      alert(data?.message || 'Your owner account has been deleted.');
      onLogout?.();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to delete your owner account.'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleDeleteOwnerAccount = () => {
    if (
      !window.confirm(
        'This will permanently delete:\n\n• Your owner account\n• All your turfs\n• All courts belonging to those turfs\n• Your bank details\n\nThis action cannot be undone. Continue?',
      )
    )
      return;
    if (
      !window.confirm(
        `Are you absolutely sure you want to permanently delete "${user.name}"'s owner account?`,
      )
    )
      return;
    performDeleteOwnerAccount();
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) onLogout?.();
  };

  /* DERIVED */
  const upcomingBookings = recentBookings.filter((b) =>
    isBookingTodayOrFuture(b.bookingDate),
  );
  const visibleBookings = showAllBookings
    ? upcomingBookings
    : upcomingBookings.slice(0, 3);

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="op-safe">
      <div className="op-container">
        {/* HEADER */}
        <div className="op-page-header">
          <span className="op-page-badge">🏟️ OWNER</span>
          <h1 className="op-title">Profile</h1>
          <p className="op-page-subtitle">Manage your turfs, courts and payouts</p>
        </div>

        {/* PROFILE CARD */}
        <div className="op-profile-card">
          <div className="op-profile-top">
            <div className="op-avatar-wrapper">
              <div className="op-avatar">
                {user.name?.charAt(0)?.toUpperCase() || 'O'}
              </div>
              <span className="op-avatar-badge">🏆</span>
            </div>
            <div className="op-profile-info">
              <h2 className="op-name">{user.name || 'Owner'}</h2>
              <p className="op-email">{user.email || 'No email added'}</p>
              <span className="op-role-pill">TURF OWNER</span>
            </div>
          </div>

          <div className="op-info-row">
            <span className="op-info-label">Phone</span>
            <span className="op-info-value">{user.phone || 'Not added'}</span>
          </div>

          <div className="op-button-row">
            <button
              className="op-primary-button"
              onClick={() => setShowEditProfile(true)}
            >
              ✎ Edit
            </button>
            <button
              className="op-secondary-button"
              onClick={() => setShowPasswordModal(true)}
            >
              🔒 Password
            </button>
          </div>
        </div>

        {/* TURFS */}
        <div className="op-section-header">
          <div className="op-section-title-row">
            <h2 className="op-section-title">My Listed Turfs</h2>
            <span className="op-section-accent" />
          </div>
          <button className="op-add-button" onClick={handleAddTurf}>
            + ADD TURF
          </button>
        </div>

        {fetchingData ? (
          <div className="op-loading-box">
            <span className="op-spinner" />
            <span className="op-loading-text">Loading your turfs...</span>
          </div>
        ) : turfs.length === 0 ? (
          <div className="op-empty-card">
            <div className="op-empty-icon-wrapper">🏟️</div>
            <h3 className="op-empty-title">No turfs listed</h3>
            <p className="op-empty-text">
              Add your first turf to start accepting bookings.
            </p>
            <button className="op-primary-button-full" onClick={handleAddTurf}>
              ADD YOUR FIRST TURF
            </button>
          </div>
        ) : (
          turfs.map((turf) => {
            const courts = turfCourts[turf._id] || [];
            const isExpanded = expandedTurfId === turf._id;
            const sc = getTurfStatusColors(turf.status);
            const imageUrl =
              turf.images?.find((i) => i.isPrimary)?.url || turf.images?.[0]?.url;

            return (
              <div key={turf._id} className="op-turf-card">
                {imageUrl ? (
                  <img src={imageUrl} alt={turf.name} className="op-turf-image" />
                ) : (
                  <div className="op-image-placeholder">
                    <span className="op-placeholder-icon">⚽</span>
                    <span className="op-placeholder-text">No Image</span>
                  </div>
                )}

                <span
                  className="op-turf-status-pill"
                  style={{ backgroundColor: sc.bg, borderColor: sc.border }}
                >
                  <span className="op-status-dot" style={{ backgroundColor: sc.dot }} />
                  <span style={{ color: sc.text }}>
                    {String(turf.status || 'active').toUpperCase()}
                  </span>
                </span>

                <div className="op-turf-content">
                  <h3 className="op-turf-name">{turf.name}</h3>
                  <p className="op-turf-city">📍 {turf.city}</p>
                  <p className="op-turf-address">{turf.address}</p>

                  <div className="op-turf-action-grid">
                    <button
                      className="op-manage-button"
                      onClick={() => handleToggleTurf(turf._id)}
                    >
                      {isExpanded ? 'HIDE COURTS' : 'MANAGE COURTS'}
                    </button>
                    <button
                      className="op-edit-button"
                      onClick={() => handleEditTurf(turf)}
                    >
                      EDIT
                    </button>
                    <button
                      className="op-delete-turf-button"
                      onClick={() => handleDeleteTurf(turf)}
                    >
                      DELETE
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="op-courts-container">
                      <div className="op-court-header">
                        <h4 className="op-court-title">Courts</h4>
                        <button
                          className="op-add-court-button"
                          onClick={() => handleAddCourt(turf._id)}
                        >
                          + Add Court
                        </button>
                      </div>

                      {courts.length === 0 ? (
                        <div className="op-no-courts-box">
                          <span className="op-no-courts-icon">🏟️</span>
                          <span className="op-no-court-text">
                            No courts added yet.
                          </span>
                        </div>
                      ) : (
                        courts.map((court) => (
                          <div key={court._id} className="op-court-card">
                            <div className="op-court-info">
                              <div className="op-court-name-row">
                                <h5 className="op-court-name">{court.name}</h5>
                                <span className="op-sport-pill">{court.sport}</span>
                              </div>
                              <p className="op-court-price">
                                ₹{Number(court.pricePerHour || 0).toLocaleString('en-IN')}/hour
                              </p>
                              {court.hasNightPricing && (
                                <>
                                  <span className="op-night-price-badge">
                                    🌙 Night ₹
                                    {Number(court.nightPricePerHour || 0).toLocaleString('en-IN')}/hr
                                  </span>
                                  <p className="op-night-time-text">
                                    {formatHour(court.nightStartHour)} —{' '}
                                    {formatHour(court.nightEndHour)}
                                  </p>
                                </>
                              )}
                            </div>
                            <div className="op-court-actions">
                              <button
                                className="op-small-edit-button"
                                onClick={() => handleEditCourt(turf._id, court)}
                              >
                                Edit
                              </button>
                              <button
                                className="op-small-delete-button"
                                onClick={() => handleDeleteCourt(turf._id, court)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* BOOKINGS */}
        <div className="op-section-header">
          <div className="op-section-title-row">
            <h2 className="op-section-title">Recent Bookings</h2>
            <span className="op-section-accent" />
          </div>
          <div className="op-booking-header-actions">
            {upcomingBookings.length > 3 && (
              <button
                className="op-see-all-bookings-button"
                onClick={() => setShowAllBookings((v) => !v)}
              >
                {showAllBookings ? 'Show Less' : 'See All'}
              </button>
            )}
            <span className="op-booking-count-pill">{upcomingBookings.length}</span>
          </div>
        </div>

        {fetchingBookings ? (
          <div className="op-loading-box">
            <span className="op-spinner" />
            <span className="op-loading-text">Loading recent bookings...</span>
          </div>
        ) : upcomingBookings.length === 0 ? (
          <div className="op-booking-empty-card">
            <div className="op-booking-empty-icon">📅</div>
            <h3 className="op-booking-empty-title">No bookings yet</h3>
            <p className="op-booking-empty-text">
              Customer details will appear here when someone books your turf.
            </p>
          </div>
        ) : (
          <div className="op-bookings-list">
            {visibleBookings.map((booking) => {
              const sc = getBookingStatusColors(booking.status);
              return (
                <div key={booking._id} className="op-booking-card">
                  <div className="op-booking-top-row">
                    <div className="op-customer-avatar">
                      {booking.customer?.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className="op-customer-main-info">
                      <p className="op-customer-name">
                        {booking.customer?.name || 'Customer'}
                      </p>
                      <p className="op-customer-phone">
                        📞 {booking.customer?.phone || 'Phone not available'}
                      </p>
                    </div>
                    <span
                      className="op-booking-status-pill"
                      style={{ backgroundColor: sc.bg, borderColor: sc.border, color: sc.text }}
                    >
                      {String(booking.status || 'confirmed').toUpperCase()}
                    </span>
                  </div>

                  <div className="op-booking-divider" />

                  <div className="op-booking-details-grid">
                    <div className="op-booking-detail-item">
                      <span className="op-booking-detail-label">TURF</span>
                      <span className="op-booking-detail-value">
                        {booking.turf?.name || '—'}
                      </span>
                    </div>
                    <div className="op-booking-detail-item">
                      <span className="op-booking-detail-label">COURT</span>
                      <span className="op-booking-detail-value">
                        {booking.court?.name || '—'}
                      </span>
                    </div>
                    <div className="op-booking-detail-item">
                      <span className="op-booking-detail-label">DATE</span>
                      <span className="op-booking-detail-value">
                        {formatBookingDate(booking.bookingDate)}
                      </span>
                    </div>
                    <div className="op-booking-detail-item">
                      <span className="op-booking-detail-label">TIME</span>
                      <span className="op-booking-detail-value">
                        {formatBookingTime(booking.startTime || booking.slot?.startTime)}
                        {' → '}
                        {formatBookingTime(booking.endTime || booking.slot?.endTime)}
                      </span>
                    </div>
                  </div>

                  <div className="op-booking-bottom-row">
                    <span className="op-booking-customer-hint">Customer contact</span>
                    <span className="op-booking-amount">
                      ₹
                      {Number(
                        booking.finalAmount ?? booking.grossAmount ?? 0,
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BANK */}
        <div className="op-section-header">
          <div className="op-section-title-row">
            <h2 className="op-section-title">Bank Account</h2>
            <span className="op-section-accent" />
          </div>
        </div>

        <div className="op-bank-card">
          <div className="op-bank-header-row">
            <div className="op-bank-icon-circle">🏦</div>
            <div className="op-bank-header-text">
              <h3 className="op-bank-header-title">Payout Account</h3>
              <p className="op-bank-header-subtitle">
                Where your earnings get transferred
              </p>
            </div>
          </div>

          {bankDetails.accountHolderName ? (
            <>
              <div className="op-info-row">
                <span className="op-info-label">Account Holder</span>
                <span className="op-info-value">{bankDetails.accountHolderName}</span>
              </div>
              <div className="op-info-row">
                <span className="op-info-label">Account Number</span>
                <span className="op-info-value">
                  {maskAccountNumber(bankDetails.accountNumber)}
                </span>
              </div>
              <div className="op-info-row">
                <span className="op-info-label">IFSC</span>
                <span className="op-info-value">{bankDetails.ifscCode}</span>
              </div>
            </>
          ) : (
            <div className="op-no-bank-box">
              <span className="op-no-bank-icon">💳</span>
              <p className="op-empty-text">No bank account details added yet.</p>
            </div>
          )}

          <button
            className="op-primary-button-full"
            onClick={() => setShowBankModal(true)}
          >
            {bankDetails.accountHolderName ? 'EDIT BANK DETAILS' : 'ADD BANK DETAILS'}
          </button>

          {bankDetails.accountHolderName && (
            <button
              className="op-delete-bank-button"
              onClick={handleDeleteBankDetails}
            >
              DELETE BANK DETAILS
            </button>
          )}
        </div>

        {/* DANGER */}
        <div className="op-danger-section">
          <div className="op-danger-header-row">
            <div className="op-danger-icon-circle">⚠️</div>
            <div className="op-danger-header-text">
              <h3 className="op-danger-section-title">Danger Zone</h3>
              <p className="op-danger-section-description">
                Permanently delete your owner account and associated turf data.
              </p>
            </div>
          </div>
          <button
            className="op-delete-account-button"
            onClick={handleDeleteOwnerAccount}
            disabled={loading}
          >
            {loading ? <span className="op-spinner" /> : 'DELETE OWNER ACCOUNT'}
          </button>
        </div>

        <button className="op-logout-button" onClick={handleLogout}>
          ⎋ LOGOUT
        </button>
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditProfile && (
        <div
          className="op-modal-overlay"
          onClick={() => setShowEditProfile(false)}
        >
          <div
            className="op-modal-card"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="op-modal-handle" />
            <span className="op-modal-badge">👤 PROFILE</span>
            <h2 className="op-modal-title">Edit Profile</h2>

            <label className="op-field-label">NAME</label>
            <input
              className="op-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
            />

            <label className="op-field-label">EMAIL</label>
            <input
              className="op-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />

            <label className="op-field-label">PHONE</label>
            <input
              className="op-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
            />

            <button
              className="op-primary-button-full"
              onClick={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? <span className="op-spinner" /> : 'SAVE CHANGES'}
            </button>

            <button
              className="op-cancel-button"
              onClick={() => setShowEditProfile(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div
          className="op-modal-overlay"
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="op-modal-card"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="op-modal-handle" />
            <span className="op-modal-badge">🔒 SECURITY</span>
            <h2 className="op-modal-title">Change Password</h2>

            <label className="op-field-label">CURRENT PASSWORD</label>
            <input
              className="op-input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />

            <label className="op-field-label">NEW PASSWORD</label>
            <input
              className="op-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />

            <p className="op-helper-text">Minimum 6 characters</p>

            <button
              className="op-primary-button-full"
              onClick={handleChangePassword}
              disabled={loading}
            >
              {loading ? <span className="op-spinner" /> : 'CHANGE PASSWORD'}
            </button>

            <button
              className="op-cancel-button"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TURF MODAL */}
      {showTurfModal && (
        <div className="op-modal-overlay" onClick={closeTurfModal}>
          <div
            className="op-modal-card wide"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="op-modal-handle" />
            <span className="op-modal-badge">🏟️ TURF</span>
            <h2 className="op-modal-title">
              {selectedTurf ? 'Edit Turf' : 'Add Turf'}
            </h2>

            <div className="op-edit-turf-image-card">
              <label className="op-field-label">TURF IMAGE</label>
              {turfImageUri ? (
                <img src={turfImageUri} alt="Turf" className="op-edit-turf-image-preview" />
              ) : (
                <div className="op-edit-turf-image-placeholder">
                  <span className="op-edit-turf-image-placeholder-icon">🏟️</span>
                  <span className="op-edit-turf-image-placeholder-text">
                    No turf image selected
                  </span>
                </div>
              )}
              <label className="op-secondary-action-button">
                <input
                  type="file"
                  accept="image/*"
                  disabled={turfImageUploading}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) pickTurfImage(file);
                  }}
                />
                {turfImageUploading ? (
                  <span className="op-spinner" />
                ) : (
                  <>
                    <span>📷</span>
                    <span>{turfImageUri ? 'CHANGE TURF IMAGE' : 'SELECT TURF IMAGE'}</span>
                  </>
                )}
              </label>
            </div>

            <label className="op-field-label">TURF NAME</label>
            <input
              className="op-input"
              value={turfName}
              onChange={(e) => setTurfName(e.target.value)}
              placeholder="Enter turf name"
            />

            <label className="op-field-label">DESCRIPTION</label>
            <textarea
              className="op-input op-textarea"
              value={turfDescription}
              onChange={(e) => setTurfDescription(e.target.value)}
              placeholder="Enter turf description"
            />

            <label className="op-field-label">ADDRESS</label>
            <input
              className="op-input"
              value={turfAddress}
              onChange={(e) => setTurfAddress(e.target.value)}
              placeholder="Enter address"
            />

            <label className="op-field-label">CITY</label>
            <input
              className="op-input"
              value={turfCity}
              onChange={(e) => setTurfCity(e.target.value)}
              placeholder="Enter city"
            />

            <label className="op-field-label">AMENITIES</label>
            <textarea
              className="op-input op-textarea-small"
              value={turfAmenities}
              onChange={(e) => setTurfAmenities(e.target.value)}
              placeholder="Parking, Washroom, Drinking Water, Changing Room"
            />
            <p className="op-helper-text">Enter amenities separated by commas.</p>

            <div className="op-location-edit-card">
              <div className="op-location-edit-header">
                <div className="op-location-edit-icon">📍</div>
                <div className="op-location-edit-header-text">
                  <h4 className="op-location-edit-title">Turf Location</h4>
                  <p className="op-location-edit-description">
                    Save the exact venue location as GeoJSON coordinates.
                  </p>
                </div>
              </div>

              <button
                className={`op-location-edit-button ${turfLocationLoading ? 'disabled' : ''}`}
                onClick={getTurfCurrentLocation}
                disabled={turfLocationLoading}
              >
                {turfLocationLoading ? (
                  <>
                    <span className="op-spinner" />
                    <span>GETTING LOCATION...</span>
                  </>
                ) : (
                  <>
                    <span>📍</span>
                    <span>USE CURRENT LOCATION</span>
                  </>
                )}
              </button>

              {turfLatitude !== null && turfLongitude !== null && (
                <div className="op-location-coordinates-box">
                  <span className="op-location-coordinates-title">LOCATION SAVED</span>
                  <p className="op-location-coordinates-text">
                    Latitude: {turfLatitude.toFixed(6)}
                  </p>
                  <p className="op-location-coordinates-text">
                    Longitude: {turfLongitude.toFixed(6)}
                  </p>
                  <p className="op-location-coordinates-geojson">
                    GeoJSON: [{turfLongitude.toFixed(6)}, {turfLatitude.toFixed(6)}]
                  </p>
                </div>
              )}
            </div>

            {!selectedTurf && (
              <>
                <div className="op-hours-section-title-row">
                  <h4 className="op-hours-section-title">Operating Hours</h4>
                  <span className="op-section-accent" />
                </div>
                <p className="op-hours-description">
                  Set the opening and closing time for each day.
                </p>

                {operatingHours.map((hour, index) => (
                  <div key={hour.day} className="op-operating-hour-card">
                    <div className="op-day-header">
                      <span className="op-day-name">{hour.day}</span>
                      <div className="op-open-status-row">
                        <span
                          className={`op-status-text ${!hour.isClosed ? 'open' : ''}`}
                        >
                          {hour.isClosed ? 'CLOSED' : 'OPEN'}
                        </span>
                        <input
                          type="checkbox"
                          checked={!hour.isClosed}
                          onChange={(e) =>
                            updateOperatingHour(index, 'isClosed', !e.target.checked)
                          }
                        />
                      </div>
                    </div>

                    {!hour.isClosed && (
                      <div className="op-time-row">
                        <div className="op-time-box">
                          <span className="op-time-label">OPENING</span>
                          <input
                            type="time"
                            className="op-time-input"
                            value={hour.openingTime}
                            onChange={(e) =>
                              updateOperatingHour(index, 'openingTime', e.target.value)
                            }
                          />
                        </div>
                        <span className="op-time-separator">→</span>
                        <div className="op-time-box">
                          <span className="op-time-label">CLOSING</span>
                          <input
                            type="time"
                            className="op-time-input"
                            value={hour.closingTime}
                            onChange={(e) =>
                              updateOperatingHour(index, 'closingTime', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            <button
              className="op-primary-button-full"
              onClick={handleSaveTurf}
              disabled={loading}
            >
              {loading ? (
                <span className="op-spinner" />
              ) : selectedTurf ? (
                'UPDATE TURF'
              ) : (
                'SAVE TURF'
              )}
            </button>

            <button className="op-cancel-button" onClick={closeTurfModal}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* COURT MODAL */}
      {showCourtModal && (
        <div
          className="op-modal-overlay"
          onClick={() => {
            setShowCourtModal(false);
            resetCourtForm();
          }}
        >
          <div
            className="op-modal-card wide"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="op-modal-handle" />
            <span className="op-modal-badge">⚽ COURT</span>
            <h2 className="op-modal-title">
              {selectedCourt ? 'Edit Court' : 'Add Court'}
            </h2>

            <label className="op-field-label">COURT NAME</label>
            <input
              className="op-input"
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
              placeholder="e.g. Court 1"
            />

            <label className="op-field-label">SPORT</label>
            <input
              className="op-input"
              value={courtSport}
              onChange={(e) => setCourtSport(e.target.value)}
              placeholder="e.g. Football, Cricket"
            />

            <label className="op-field-label">NORMAL PRICE PER HOUR</label>
            <input
              className="op-input"
              type="number"
              value={courtPrice}
              onChange={(e) => setCourtPrice(e.target.value)}
              placeholder="Enter base price"
            />

            <div className="op-full-day-discount-card">
              <h4 className="op-full-day-discount-title">
                🎉 Full Day / Long Booking Discount
              </h4>
              <p className="op-full-day-discount-description">
                Set the percentage discount applied when a customer uses Full Day
                booking and selects a continuous time range.
              </p>
              <label className="op-field-label">FULL DAY DISCOUNT (%)</label>
              <input
                className="op-input"
                value={courtFullDayDiscountPercent}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                  setCourtFullDayDiscountPercent(cleaned);
                }}
                placeholder="e.g. 4"
                maxLength={6}
              />
              <p className="op-full-day-discount-hint">
                Example: 4 means 4% OFF. Enter 0 for no discount. Maximum 100%.
              </p>
            </div>

            <div className="op-night-pricing-card">
              <div className="op-night-pricing-header">
                <div className="op-night-pricing-title-container">
                  <h4 className="op-night-pricing-title">🌙 Night Pricing</h4>
                  <p className="op-night-pricing-description">
                    Use a different hourly price during selected hours.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={courtHasNightPricing}
                  onChange={(e) => setCourtHasNightPricing(e.target.checked)}
                />
              </div>

              {courtHasNightPricing && (
                <>
                  <label className="op-field-label">NIGHT PRICE PER HOUR</label>
                  <input
                    className="op-input"
                    type="number"
                    value={courtNightPrice}
                    onChange={(e) => setCourtNightPrice(e.target.value)}
                    placeholder="e.g. 700"
                  />

                  <label className="op-field-label">NIGHT PRICING STARTS</label>
                  <input
                    className="op-input"
                    type="time"
                    value={courtNightStartTime}
                    onChange={(e) => setCourtNightStartTime(e.target.value)}
                  />

                  <label className="op-field-label">NIGHT PRICING ENDS</label>
                  <input
                    className="op-input"
                    type="time"
                    value={courtNightEndTime}
                    onChange={(e) => setCourtNightEndTime(e.target.value)}
                  />

                  <div className="op-pricing-preview">
                    <span className="op-pricing-preview-title">PRICING PREVIEW</span>
                    <div className="op-preview-row">
                      <span className="op-preview-label">Normal</span>
                      <span className="op-preview-value">₹{courtPrice || '0'}/hr</span>
                    </div>
                    <div className="op-preview-row">
                      <span className="op-preview-label">Night</span>
                      <span className="op-night-preview-value">
                        ₹{courtNightPrice || '0'}/hr
                      </span>
                    </div>
                    <p className="op-preview-time">
                      {courtNightStartTime} → {courtNightEndTime}
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              className="op-primary-button-full"
              onClick={handleSaveCourt}
              disabled={loading}
            >
              {loading ? (
                <span className="op-spinner" />
              ) : selectedCourt ? (
                'UPDATE COURT'
              ) : (
                'SAVE COURT'
              )}
            </button>

            {selectedCourt && (
              <button
                className="op-delete-full-button"
                onClick={() => {
                  if (!selectedTurfId) return;
                  handleDeleteCourt(selectedTurfId, selectedCourt);
                }}
                disabled={loading}
              >
                DELETE COURT
              </button>
            )}

            <button
              className="op-cancel-button"
              onClick={() => {
                setShowCourtModal(false);
                resetCourtForm();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* BANK MODAL */}
      {showBankModal && (
        <div
          className="op-modal-overlay"
          onClick={() => setShowBankModal(false)}
        >
          <div
            className="op-modal-card"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="op-modal-handle" />
            <span className="op-modal-badge">🏦 BANK</span>
            <h2 className="op-modal-title">Bank Account Details</h2>

            <label className="op-field-label">ACCOUNT HOLDER NAME</label>
            <input
              className="op-input"
              value={bankDetails.accountHolderName}
              onChange={(e) =>
                setBankDetails((p) => ({ ...p, accountHolderName: e.target.value }))
              }
              placeholder="Account Holder Name"
            />

            <label className="op-field-label">ACCOUNT NUMBER</label>
            <input
              className="op-input"
              value={bankDetails.accountNumber}
              onChange={(e) =>
                setBankDetails((p) => ({
                  ...p,
                  accountNumber: e.target.value.replace(/\D/g, ''),
                }))
              }
              placeholder="Account Number"
            />

            <label className="op-field-label">IFSC CODE</label>
            <input
              className="op-input"
              value={bankDetails.ifscCode}
              onChange={(e) =>
                setBankDetails((p) => ({
                  ...p,
                  ifscCode: e.target.value.toUpperCase(),
                }))
              }
              placeholder="IFSC Code"
            />

            <button
              className="op-primary-button-full"
              onClick={handleSaveBankDetails}
              disabled={loading}
            >
              {loading ? <span className="op-spinner" /> : 'SAVE BANK DETAILS'}
            </button>

            {bankDetails.accountHolderName && (
              <button
                className="op-delete-full-button"
                onClick={handleDeleteBankDetails}
                disabled={loading}
              >
                DELETE BANK DETAILS
              </button>
            )}

            <button
              className="op-cancel-button"
              onClick={() => setShowBankModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerProfileScreen;