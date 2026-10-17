// src/pages/TurfDetailsScreen.tsx
import React, { useCallback, useMemo, useState } from 'react';
import './TurfDetailsScreen.css';

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
  status?: string; hasNightPricing?: boolean; nightPricePerHour?: number;
};
type Turf = {
  _id?: string; id?: string; name?: string; description?: string;
  city?: string; address?: string; pricePerHour?: number;
  sports?: string[]; amenities?: string[]; images?: TurfImage[];
  image?: string;
  location?: { coordinates?: number[] };
  openingTime?: string; closingTime?: string;
  operatingHours?: OperatingHour[];
  courts?: TurfCourt[];
};

export interface TurfDetailsScreenProps {
  turf?: Turf;
  onBack: () => void;
  onBook: (turf: Turf) => void;
}

/* =========================================================
   CONSTANTS
========================================================= */

const API_URL = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/+$/, '');
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const HERO_HEIGHT = 260;

/* =========================================================
   HELPERS
========================================================= */

const getTurfId = (t: Turf) => String(t._id || t.id || '');
const getCourtId = (c: TurfCourt) => String(c._id || c.id || '');
const getCourtName = (c: TurfCourt, i: number) => c.name || c.courtName || `Court ${i + 1}`;

const getCourtPrice = (court: TurfCourt, turf: Turf): number => {
  const p = Number(court.pricePerHour ?? turf.pricePerHour ?? 0);
  return Number.isFinite(p) ? p : 0;
};

const getCourtSports = (court: TurfCourt): string[] => {
  if (Array.isArray(court.sports) && court.sports.length) return court.sports;
  if (court.sport) return [court.sport];
  return [];
};

const resolveImageUrl = (image?: string): string | undefined => {
  if (!image) return undefined;
  const trimmed = image.trim();
  if (!trimmed) return undefined;
  if (/^(https?:|data:|file:)/i.test(trimmed)) return trimmed;
  if (!API_URL) return trimmed;
  return trimmed.startsWith('/') ? `${API_URL}${trimmed}` : `${API_URL}/${trimmed}`;
};

const getGalleryImages = (turf: Turf): string[] => {
  const urls = (turf.images || []).map((i) => resolveImageUrl(i?.url)).filter((u): u is string => !!u);
  if (urls.length) {
    const primary = (turf.images || []).find((i) => i?.isPrimary && i?.url);
    if (primary?.url) {
      const pUrl = resolveImageUrl(primary.url);
      if (pUrl) return [pUrl, ...urls.filter((u) => u !== pUrl)];
    }
    return urls;
  }
  const single = resolveImageUrl(turf.image);
  return single ? [single] : [];
};

const findHoursForDay = (turf: Turf, dayName: string): OperatingHour | undefined => {
  const hours = turf.operatingHours || [];
  const target = dayName.toLowerCase();
  return hours.find((h) => String(h.dayOfWeek || h.day || '').toLowerCase() === target);
};

const getHoursForDay = (turf: Turf, dayName: string) => {
  const item = findHoursForDay(turf, dayName);
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

const getAmenityIcon = (amenity: string): string => {
  const key = amenity.toLowerCase();
  if (key.includes('wifi')) return '📶';
  if (key.includes('park')) return '🅿️';
  if (key.includes('shower') || key.includes('bath')) return '🚿';
  if (key.includes('light')) return '💡';
  if (key.includes('water') || key.includes('drink')) return '💧';
  if (key.includes('cafe') || key.includes('food')) return '☕';
  if (key.includes('locker')) return '🔒';
  if (key.includes('first') || key.includes('aid')) return '🩺';
  if (key.includes('toilet') || key.includes('washroom')) return '🚻';
  if (key.includes('changing')) return '👕';
  if (key.includes('cctv') || key.includes('camera')) return '📹';
  if (key.includes('ac') || key.includes('air')) return '❄️';
  if (key.includes('coach') || key.includes('trainer')) return '🏋️';
  if (key.includes('racket') || key.includes('equipment')) return '🎾';
  return '✓';
};

/* =========================================================
   IMAGE GALLERY
========================================================= */

const ImageGallery: React.FC<{ images: string[] }> = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images.length) {
    return (
      <div className="td-hero-placeholder">
        <span className="td-hero-placeholder-icon">🏟️</span>
        <span className="td-hero-placeholder-text">No image available</span>
      </div>
    );
  }

  return (
    <div className="td-hero" style={{ height: HERO_HEIGHT }}>
      <img
        src={images[activeIndex]}
        alt={`Turf ${activeIndex + 1}`}
        className="td-hero-image"
      />
      {images.length > 1 && (
        <>
          <button
            className="td-hero-nav prev"
            onClick={() => setActiveIndex((i) => (i - 1 + images.length) % images.length)}
          >
            ‹
          </button>
          <button
            className="td-hero-nav next"
            onClick={() => setActiveIndex((i) => (i + 1) % images.length)}
          >
            ›
          </button>
          <div className="td-dots-row">
            {images.map((_, i) => (
              <button
                key={i}
                className={`td-dot ${i === activeIndex ? 'active' : ''}`}
                onClick={() => setActiveIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* =========================================================
   MAIN
========================================================= */

const TurfDetailsScreen: React.FC<TurfDetailsScreenProps> = ({ turf, onBack, onBook }) => {
  const [hoursExpanded, setHoursExpanded] = useState(false);

  const images = useMemo(() => (turf ? getGalleryImages(turf) : []), [turf]);

  const activeCourts = useMemo(
    () =>
      (turf?.courts || []).filter(
        (c) => String(c.status || 'active').toLowerCase() === 'active',
      ),
    [turf],
  );

  const turfId = turf ? getTurfId(turf) : '';

  const priceRange = useMemo(() => {
    if (!turf) return null;
    const prices = activeCourts.map((c) => getCourtPrice(c, turf)).filter((p) => p > 0);
    if (!prices.length) {
      const fallback = Number(turf.pricePerHour || 0);
      return fallback > 0 ? { min: fallback, max: fallback } : null;
    }
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [activeCourts, turf]);

  const todayName = DAYS[new Date().getDay()];
  const todayHours = useMemo(
    () => (turf ? getHoursForDay(turf, todayName) : { openingTime: '', closingTime: '', isClosed: false }),
    [turf, todayName],
  );
  const weekHours = useMemo(
    () => (turf ? DAYS.map((day) => ({ day, ...getHoursForDay(turf, day) })) : []),
    [turf],
  );

  const handleOpenMap = useCallback(() => {
    if (!turf) return;
    const coords = turf.location?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
        return;
      }
    }
    const address = [turf.address, turf.city].filter(Boolean).join(', ');
    if (!address) { alert('This turf does not have a valid location or address.'); return; }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  }, [turf]);

  const handleBookTurf = useCallback(() => {
    if (!turf) return alert('Turf information could not be loaded.');
    if (!turfId) return alert('This turf does not have a valid ID.');
    if (activeCourts.length === 0) return alert('There are currently no active courts available for booking.');
    onBook(turf);
  }, [turf, turfId, activeCourts.length, onBook]);

  if (!turf) {
    return (
      <div className="td-safe">
        <div className="td-empty-container">
          <span className="td-empty-icon">🏟️</span>
          <h1 className="td-empty-title">Turf not found</h1>
          <p className="td-empty-subtitle">We couldn't load this turf's information.</p>
          <button className="td-back-button" onClick={onBack}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="td-safe">
      <div className="td-container">
        <ImageGallery images={images} />

        {/* FLOATING HEADER */}
        <div className="td-floating-header">
          <button className="td-floating-button" onClick={onBack}>‹</button>
          <button
            className="td-floating-button"
            onClick={() => alert('Sharing will be available soon.')}
          >
            ⤴
          </button>
        </div>

        <div className="td-content-card">
          {/* INFO CARD */}
          <div className="td-info-card">
            <div className="td-title-row">
              <div className="td-title-container">
                <h1 className="td-turf-name">{turf.name || 'Unnamed Turf'}</h1>
                {!!turf.city && (
                  <div className="td-city-row">
                    <span>📍</span>
                    <span className="td-city-text">{turf.city}</span>
                  </div>
                )}
              </div>
              {priceRange && (
                <div className="td-price-box">
                  <span className="td-price-label">From</span>
                  <span className="td-price">₹{priceRange.min}</span>
                  <span className="td-price-unit">
                    {priceRange.min === priceRange.max ? '/hr' : `– ₹${priceRange.max}`}
                  </span>
                </div>
              )}
            </div>

            {!!turf.address && (
              <button className="td-address-row" onClick={handleOpenMap}>
                <span className="td-address-icon-wrapper">📍</span>
                <div className="td-address-content">
                  <p className="td-address-text">{turf.address}</p>
                  {!!turf.city && <p className="td-address-city">{turf.city}</p>}
                </div>
                <span className="td-map-button">➤</span>
              </button>
            )}

            <div className={`td-status-badge ${todayHours.isClosed ? 'closed' : 'open'}`}>
              <span className={`td-status-dot ${todayHours.isClosed ? 'closed' : 'open'}`} />
              <span className={`td-status-text ${todayHours.isClosed ? 'closed' : 'open'}`}>
                {todayHours.isClosed
                  ? 'Closed Today'
                  : `Open ${todayHours.openingTime} – ${todayHours.closingTime}`}
              </span>
            </div>
          </div>

          {/* ABOUT */}
          <div className="td-section-card">
            <div className="td-section-title-row">
              <h2 className="td-section-title">About Turf</h2>
              <span className="td-section-title-accent" />
            </div>
            <p className="td-description">
              {turf.description?.trim() || 'Enjoy a great sports experience at this turf.'}
            </p>
          </div>

          {/* SPORTS */}
          {!!turf.sports?.length && (
            <div className="td-section-card">
              <div className="td-section-title-row">
                <h2 className="td-section-title">Sports</h2>
                <span className="td-section-title-accent" />
              </div>
              <div className="td-chip-container">
                {turf.sports.map((sport, i) => (
                  <span key={`${sport}-${i}`} className="td-chip">{sport}</span>
                ))}
              </div>
            </div>
          )}

          {/* AMENITIES */}
          {!!turf.amenities?.length && (
            <div className="td-section-card">
              <div className="td-section-title-row">
                <h2 className="td-section-title">Amenities</h2>
                <span className="td-section-title-accent" />
              </div>
              <div className="td-amenities-grid">
                {turf.amenities.map((amenity, i) => (
                  <div key={`${amenity}-${i}`} className="td-amenity-item">
                    <span className="td-amenity-icon">{getAmenityIcon(amenity)}</span>
                    <span className="td-amenity-text">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COURTS */}
          <div className="td-section-card">
            <div className="td-section-header-row">
              <div className="td-section-title-row">
                <h2 className="td-section-title">Courts</h2>
                <span className="td-section-title-accent" />
              </div>
              {activeCourts.length > 0 && (
                <span className="td-section-count">
                  {activeCourts.length} {activeCourts.length === 1 ? 'court' : 'courts'}
                </span>
              )}
            </div>

            {activeCourts.length === 0 ? (
              <div className="td-no-courts">
                <span className="td-no-courts-icon">🚫</span>
                <p className="td-no-courts-text">No active courts available.</p>
              </div>
            ) : (
              activeCourts.map((court, index) => {
                const price = getCourtPrice(court, turf);
                const sports = getCourtSports(court);
                return (
                  <div key={getCourtId(court) || `court-${index}`} className="td-court-card">
                    <div className="td-court-left">
                      <p className="td-court-name">{getCourtName(court, index)}</p>
                      <div className="td-court-meta-row">
                        {sports.length > 0 && (
                          <span className="td-court-sports-inline">
                            {sports.slice(0, 2).join(' • ')}
                          </span>
                        )}
                        {court.hasNightPricing && court.nightPricePerHour !== undefined && (
                          <span className="td-night-badge">🌙 ₹{court.nightPricePerHour}</span>
                        )}
                      </div>
                    </div>
                    <div className="td-court-right">
                      <span className="td-court-price">₹{price}</span>
                      <span className="td-court-unit">/hr</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* HOURS */}
          <div className="td-section-card">
            <div className="td-section-header-row">
              <div className="td-section-title-row">
                <h2 className="td-section-title">Opening Hours</h2>
                <span className="td-section-title-accent" />
              </div>
              <button
                className="td-link-text"
                onClick={() => setHoursExpanded((v) => !v)}
              >
                {hoursExpanded ? 'Hide' : 'Full week'}
              </button>
            </div>

            <div className="td-hours-card">
              <div className="td-hours-row">
                <span className="td-hours-day">Today ({todayName.slice(0, 3)})</span>
                <span className={`td-hours-time ${todayHours.isClosed ? 'closed' : ''}`}>
                  {todayHours.isClosed
                    ? 'Closed'
                    : `${todayHours.openingTime} – ${todayHours.closingTime}`}
                </span>
              </div>
              {hoursExpanded &&
                weekHours.map((h) => (
                  <div key={h.day} className="td-hours-row divided">
                    <span className="td-hours-day-small">{h.day}</span>
                    <span className={`td-hours-time-small ${h.isClosed ? 'closed' : ''}`}>
                      {h.isClosed ? 'Closed' : `${h.openingTime} – ${h.closingTime}`}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="td-floating-bottom-bar">
          <div className="td-bottom-info">
            <span className="td-bottom-label">Starting from</span>
            <span className="td-bottom-value">
              {priceRange ? `₹${priceRange.min}` : '—'}
              <span className="td-bottom-unit">/hour</span>
            </span>
          </div>
          <button
            className="td-book-button"
            disabled={activeCourts.length === 0}
            onClick={handleBookTurf}
          >
            BOOK NOW
          </button>
        </div>
      </div>
    </div>
  );
};

export default TurfDetailsScreen;