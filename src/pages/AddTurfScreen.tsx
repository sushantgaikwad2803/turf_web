// AddTurfScreen.tsx
import { useState } from 'react';
import './AddTurfScreen.css';

/* =========================================================
   TYPES
========================================================= */

export interface AuthUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface AddTurfPayload {
  turfId?: string;
  turf?: any;
}

export interface AddTurfScreenProps {
  onBack?: () => void;
  onNavigateAddCourt?: (payload: AddTurfPayload) => void;
  /** 👇 NEW: called after turf is created and user chooses "Back to Home" */
  onComplete?: (turf?: any) => void;
  /** 👇 NEW: called if user clicks "Skip for now" (or back from signup flow) */
  onSkip?: () => void;
  user?: AuthUser;
  ownerId?: string;
}

interface TurfImagePayload {
  url: string;
  isPrimary: boolean;
}

/* =========================================================
   API CONFIGURATION (unchanged)
========================================================= */

const RAW_API_BASE_URL: string = (
  (import.meta as any).env?.VITE_API_URL ||
  'https://turf-backend-q8w4.onrender.com/api'
).trim();

const normalizeApiBaseUrl = (value: string): string => {
  let url = value.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!/\/api$/i.test(url)) url = `${url}/api`;
  return url;
};

const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);

const validateApiUrl = (): void => {
  if (!API_BASE_URL) {
    throw new Error('API URL is missing. Please configure VITE_API_URL.');
  }
  try {
    const u = new URL(API_BASE_URL);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error(`Unsupported protocol: ${u.protocol}`);
    }
  } catch {
    throw new Error(
      `Invalid API URL:\n\n${API_BASE_URL}\n\nExpected: https://your-backend-url/api`,
    );
  }
};

const uploadImageToBackend = async (file: File): Promise<string> => {
  if (!file) throw new Error('No image was selected.');
  validateApiUrl();

  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_BASE_URL}/upload/turf-image`, {
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
      `Image upload failed (${res.status}): ${
        data?.error || data?.message || text || 'Unknown error'
      }`,
    );
  }

  const imageUrl =
    data?.url || data?.imageUrl || data?.secure_url || data?.image?.url;
  if (!imageUrl) {
    throw new Error(
      data?.error || data?.message || 'Server did not return an image URL.',
    );
  }
  return String(imageUrl);
};

interface SpinnerProps {
  color?: string;
  size?: number;
}

const Spinner = ({ color = '#0B1220', size = 16 }: SpinnerProps) => (
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
   MAIN COMPONENT
========================================================= */

const AddTurfScreen = ({
  onBack,
  onNavigateAddCourt,
  onComplete,   // 👇 NEW
  onSkip,       // 👇 NEW
  user,
  ownerId: ownerIdProp,
}: AddTurfScreenProps) => {
  const ownerId = user?._id || user?.id || ownerIdProp || '';

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [amenities, setAmenities] = useState<string>('');

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [imageUploading, setImageUploading] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);

  /* ---------- header back ---------- */
  // 👇 NEW: if parent provided onSkip (signup flow), go Home instead of browser back
  const handleHeaderBack = () => {
    if (onSkip) {
      onSkip();
    } else if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadedImageUrl('');
    setImageUploading(true);

    try {
      const url = await uploadImageToBackend(file);
      setUploadedImageUrl(url);
      alert('Turf image uploaded successfully.');
    } catch (err) {
      setImageFile(null);
      setImagePreview(null);
      setUploadedImageUrl('');
      const message =
        err instanceof Error ? err.message : 'Could not upload the image.';
      alert(`Upload Failed\n\n${message}`);
    } finally {
      setImageUploading(false);
    }
  };

  const getCurrentLocation = (): void => {
    if (locationLoading) return;
    if (!navigator.geolocation) {
      alert('Location Error\n\nGeolocation is not supported by your browser.');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          alert('Location Error\nThe device returned an invalid location.');
          setLocationLoading(false);
          return;
        }
        setLatitude(lat);
        setLongitude(lng);
        setLocationLoading(false);
        alert(
          'Location Captured\n\nYour current turf location has been selected successfully.',
        );
      },
      (err) => {
        setLocationLoading(false);
        alert(
          `Location Error\n\n${
            err.message || 'Unable to get your current location.'
          }`,
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      alert('Please enter the turf name.');
      return false;
    }
    if (!address.trim()) {
      alert('Please enter the turf address.');
      return false;
    }
    if (!city.trim()) {
      alert('Please enter the city.');
      return false;
    }
    if (!ownerId) {
      alert('Logged-in owner information was not found. Please login again.');
      return false;
    }
    if (
      latitude === null ||
      longitude === null ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      alert(
        'Please select the turf location using the "Use Current Location" button.',
      );
      return false;
    }
    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      alert('The selected latitude or longitude is outside the valid range.');
      return false;
    }
    if (imageUploading) {
      alert('The turf image is still uploading.');
      return false;
    }
    if (!uploadedImageUrl) {
      alert('Please select a turf image and wait for the upload to finish.');
      return false;
    }
    return true;
  };

  /* ---------- submit ---------- */
  const handleSubmit = async (): Promise<void> => {
    if (loading) return;
    if (!validateForm()) return;

    try {
      validateApiUrl();
      setLoading(true);

      const amenityList = amenities
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const cleanOwnerId = ownerId.trim();
      const lat = latitude as number;
      const lng = longitude as number;

      const payload = {
        owner: cleanOwnerId,
        name: name.trim(),
        description: description.trim(),
        address: address.trim(),
        city: city.trim(),
        location: { type: 'Point', coordinates: [lng, lat] },
        images: [
          { url: uploadedImageUrl, isPrimary: true } satisfies TurfImagePayload,
        ],
        amenities: amenityList,
      };

      const res = await fetch(`${API_BASE_URL}/turfs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }

      if (!res.ok) {
        const reason =
          data?.details ||
          data?.message ||
          data?.error ||
          text ||
          `Failed (${res.status})`;
        throw new Error(`Server returned ${res.status}: ${reason}`);
      }

      const createdTurf = data?.turf || data?.data || data;
      const turfId: string | undefined =
        createdTurf?._id || createdTurf?.id || data?.turfId;

      const goAddCourt = window.confirm(
        'Turf Submitted Successfully!\n\nYour turf has been submitted and is waiting for admin approval.\n\nClick OK to add a court, or Cancel to go back.',
      );

      // 👇 NEW: route to Home after creation instead of only onBack
      if (goAddCourt) {
        onNavigateAddCourt?.({ turfId, turf: createdTurf });
        // If parent didn't wire onNavigateAddCourt, fall back to Home
        if (!onNavigateAddCourt) {
          (onComplete ?? onSkip ?? (() => {
            window.location.hash = '#home';
          }))(createdTurf);
        }
      } else {
        // User chose "go back" → Home
        if (onComplete) {
          onComplete(createdTurf);
        } else if (onSkip) {
          onSkip();
        } else if (onBack) {
          onBack();
        } else {
          window.location.hash = '#home';
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to create turf.';
      alert(`Create Turf Failed\n\n${message}`);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="tb-addturf-safe">
      <div className="tb-addturf-scroll">
        {/* HEADER */}
        <div className="tb-header">
          {/* 👇 NEW: use handleHeaderBack */}
          <button
            className="tb-back-button"
            onClick={handleHeaderBack}
            aria-label="Back"
          >
            ‹
          </button>
          <div className="tb-header-text">
            <span className="tb-header-badge">🏟️ NEW TURF</span>
            <h1 className="tb-header-title">Add Turf</h1>
            <p className="tb-header-subtitle">
              Create and manage your turf venue
            </p>
          </div>
        </div>

        {/* 👇 NEW: Signup onboarding banner */}
        {onSkip && (
          <div
            style={{
              background: '#F4FBE6',
              border: '1px solid #D9DCE7',
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, color: '#6F9D28', fontWeight: 600 }}>
              🎉 Welcome! Add your first turf to get started — or skip and
              explore Home.
            </span>
            <button
              type="button"
              onClick={onSkip}
              style={{
                background: 'transparent',
                border: '1px solid #6F9D28',
                color: '#6F9D28',
                borderRadius: 10,
                padding: '6px 12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* BASIC DETAILS */}
        <div className="tb-card">
          <SectionHeader
            number="1"
            title="Basic Details"
            subtitle="Enter information about your venue"
          />

          <label className="tb-label">TURF NAME *</label>
          <input
            className="tb-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. City Sports Arena"
          />

          <label className="tb-label">DESCRIPTION</label>
          <textarea
            className="tb-input tb-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your turf, facilities and services"
          />

          <label className="tb-label">ADDRESS *</label>
          <input
            className="tb-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter complete turf address"
          />

          <label className="tb-label">CITY *</label>
          <input
            className="tb-input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city"
          />

          <label className="tb-label">AMENITIES</label>
          <input
            className="tb-input"
            value={amenities}
            onChange={(e) => setAmenities(e.target.value)}
            placeholder="Parking, Washroom, Changing Room"
          />
          <p className="tb-helper-text">
            Separate multiple amenities with commas.
          </p>
        </div>

        {/* LOCATION */}
        <div className="tb-card">
          <SectionHeader
            number="2"
            title="Turf Location"
            subtitle="Select the exact venue location"
          />

          <div className="tb-location-info-box">
            <div className="tb-location-info-icon">📍</div>
            <div>
              <p className="tb-location-info-title">Map Location Required</p>
              <p className="tb-location-info-text">
                Your turf location is saved as GeoJSON coordinates for nearby
                turf search and maps.
              </p>
            </div>
          </div>

          <button
            className={`tb-location-button ${
              locationLoading ? 'tb-disabled' : ''
            }`}
            onClick={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <span className="tb-inline-row">
                <Spinner color="#0B1220" /> <span>Getting Location...</span>
              </span>
            ) : (
              <span className="tb-inline-row">
                <span>📍</span>
                <span>
                  {latitude !== null && longitude !== null
                    ? 'Update Turf Location'
                    : 'Use Current Location'}
                </span>
              </span>
            )}
          </button>

          {latitude !== null && longitude !== null && (
            <div className="tb-coordinates-card">
              <div className="tb-coordinate-row">
                <span className="tb-coordinate-label">Latitude</span>
                <span className="tb-coordinate-value">
                  {latitude.toFixed(6)}
                </span>
              </div>
              <div className="tb-coordinate-divider" />
              <div className="tb-coordinate-row">
                <span className="tb-coordinate-label">Longitude</span>
                <span className="tb-coordinate-value">
                  {longitude.toFixed(6)}
                </span>
              </div>
              <div className="tb-geojson-box">
                <span className="tb-geojson-label">GeoJSON coordinates</span>
                <span className="tb-geojson-value">
                  [{longitude.toFixed(6)}, {latitude.toFixed(6)}]
                </span>
              </div>
              <div className="tb-location-success-row">
                <span className="tb-location-success-icon">✓</span>
                <span className="tb-location-success-text">
                  Turf location is ready to submit
                </span>
              </div>
            </div>
          )}

          {latitude === null && longitude === null && (
            <p className="tb-location-helper-text">
              Location is required before you can create the turf.
            </p>
          )}
        </div>

        {/* IMAGE */}
        <div className="tb-card">
          <SectionHeader
            number="3"
            title="Turf Image"
            subtitle="Add a clear photo of your venue"
          />

          <label
            className={`tb-image-picker-button ${
              imageUploading ? 'tb-disabled' : ''
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={imageUploading}
              style={{ display: 'none' }}
            />
            {imageUploading ? (
              <span className="tb-inline-row">
                <Spinner color="#87B936" /> <span>Uploading Image...</span>
              </span>
            ) : (
              <>
                <span className="tb-plus-circle">+</span>
                <span className="tb-image-picker-text">
                  {imageFile ? 'Change Turf Image' : 'Select Turf Image'}
                </span>
              </>
            )}
          </label>

          {imagePreview && (
            <div className="tb-image-preview-container">
              <img
                src={imagePreview}
                alt="Turf preview"
                className="tb-image-preview"
              />
              {imageUploading && (
                <div className="tb-image-uploading-overlay">
                  <Spinner color="#fff" size={32} />
                  <span className="tb-uploading-text">Uploading...</span>
                </div>
              )}
              {!imageUploading && uploadedImageUrl && (
                <span className="tb-image-success-badge">✓ UPLOADED</span>
              )}
            </div>
          )}

          {uploadedImageUrl && (
            <div className="tb-success-badge">
              <span>✓ Image uploaded successfully</span>
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="tb-info-card">
          <div className="tb-info-header">
            <span className="tb-info-icon-circle">i</span>
            <span className="tb-info-title">Turf &amp; Court Structure</span>
          </div>
          <p className="tb-info-text">
            This screen creates the main turf venue.
          </p>
          <p className="tb-info-text">
            After creating the turf, you can add individual courts with their
            sport and hourly price.
          </p>
          <p className="tb-info-text">
            Court-specific pricing, sport, slots and booking configuration
            should be managed from the court section.
          </p>
        </div>

        {/* SUBMIT */}
        <button
          className={`tb-submit-button ${
            loading || imageUploading ? 'tb-disabled' : ''
          }`}
          onClick={handleSubmit}
          disabled={loading || imageUploading}
        >
          {loading ? (
            <span className="tb-inline-row">
              <Spinner color="#0B1220" /> <span>Creating Turf...</span>
            </span>
          ) : (
            <span className="tb-inline-row">
              <span className="tb-submit-icon">+</span>{' '}
              <span>CREATE TURF</span>
            </span>
          )}
        </button>

        <p className="tb-required-text">* Required fields</p>
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
};

/* =========================================================
   SUB-COMPONENTS
========================================================= */

interface SectionHeaderProps {
  number: string;
  title: string;
  subtitle: string;
}

const SectionHeader = ({ number, title, subtitle }: SectionHeaderProps) => (
  <div className="tb-section-header">
    <div className="tb-section-icon">{number}</div>
    <div>
      <div className="tb-section-title-row">
        <h2 className="tb-section-title">{title}</h2>
        <span className="tb-section-title-accent" />
      </div>
      <p className="tb-section-subtitle">{subtitle}</p>
    </div>
  </div>
);

export default AddTurfScreen;