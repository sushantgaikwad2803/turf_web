
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './HomeScreen.css';
import type { AuthUser } from './AuthScreen';

const API_BASE_URL = (
  (import.meta as any).env?.VITE_API_URL ||
  'https://turf-backend-q8w4.onrender.com/api'
).trim().replace(/\/+$/, '');

const LIKED_TURFS_KEY_PREFIX = '@turfbook_liked_turfs_';
const NEARBY_LIMIT = 3;

export interface TurfCourt {
  _id?: string;
  id?: string;
  name?: string;
  sport?: string;
  sports?: string[];
  pricePerHour?: number;
  status?: string;
}

export interface TurfImage {
  url?: string;
  isPrimary?: boolean;
}

export interface Turf {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  pricePerHour?: number;
  sports?: string[];
  courts?: TurfCourt[];
  images?: TurfImage[];
  status?: 'active' | 'inactive' | 'maintenance';
  location?: {
    type?: 'Point';
    coordinates?: [number, number];
  };
}

export interface HomeScreenProps {
  user: AuthUser | null;
  onLogout: () => void;
  onSelectTurf: (turf: Turf) => void;
  onNavigateToLogin: () => void;
  onNavigateToAddTurf?: () => void;
  onNavigateToOwnerProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSaved?: () => void;
  onNavigateToOwnerDashboard?: () => void;
}

const SPORT_CATEGORIES = [
  { id: 'all', name: 'All', icon: '🏆' },
  { id: 'cricket', name: 'Cricket', icon: '🏏' },
  { id: 'football', name: 'Football', icon: '⚽' },
  { id: 'badminton', name: 'Badminton', icon: '🏸' },
  { id: 'basketball', name: 'Basketball', icon: '🏀' },
  { id: 'volleyball', name: 'Volleyball', icon: '🏐' },
];

const normalizeSport = (sport?: string) =>
  (sport || '').trim().toLowerCase();

const formatSportName = (sport: string) =>
  sport
    ? sport[0].toUpperCase() + sport.slice(1).toLowerCase()
    : '';

const getCourtSports = (court: TurfCourt): string[] => {
  const sports: string[] = [];

  if (typeof court.sport === 'string' && court.sport.trim()) {
    sports.push(court.sport);
  }

  if (Array.isArray(court.sports)) {
    sports.push(...court.sports);
  }

  return Array.from(
    new Set(sports.map(normalizeSport).filter(Boolean))
  );
};

const getTurfSports = (turf: Turf): string[] => {
  const sports = new Set<string>();

  if (Array.isArray(turf.courts)) {
    turf.courts.forEach((court) => {
      getCourtSports(court).forEach((sport) => sports.add(sport));
    });
  }

  if (sports.size === 0 && Array.isArray(turf.sports)) {
    turf.sports.forEach((sport) => {
      const normalized = normalizeSport(sport);
      if (normalized) sports.add(normalized);
    });
  }

  return Array.from(sports);
};

const getCourtCount = (turf: Turf) =>
  Array.isArray(turf.courts) ? turf.courts.length : 0;

const getSportPrice = (
  turf: Turf,
  sport: string
): number | null => {
  const courts = Array.isArray(turf.courts)
    ? turf.courts
    : [];

  const validCourts = courts.filter(
    (court) =>
      typeof court.pricePerHour === 'number' &&
      Number.isFinite(court.pricePerHour) &&
      court.pricePerHour >= 0
  );

  if (validCourts.length === 0) {
    if (
      typeof turf.pricePerHour === 'number' &&
      Number.isFinite(turf.pricePerHour) &&
      turf.pricePerHour >= 0
    ) {
      return turf.pricePerHour;
    }

    return null;
  }

  const category = normalizeSport(sport);

  if (category === 'all') {
    const cricketPrices = validCourts
      .filter((court) =>
        getCourtSports(court).includes('cricket')
      )
      .map((court) => court.pricePerHour!);

    if (cricketPrices.length > 0) {
      return Math.min(...cricketPrices);
    }

    return Math.min(
      ...validCourts.map((court) => court.pricePerHour!)
    );
  }

  const matchingPrices = validCourts
    .filter((court) =>
      getCourtSports(court).includes(category)
    )
    .map((court) => court.pricePerHour!);

  return matchingPrices.length > 0
    ? Math.min(...matchingPrices)
    : null;
};

const getTurfImage = (turf: Turf): string | null => {
  if (!Array.isArray(turf.images) || turf.images.length === 0) {
    return null;
  }

  const primaryImage = turf.images.find(
    (image) => image.isPrimary === true
  );

  return primaryImage?.url || turf.images[0]?.url || null;
};

const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const earthRadius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    earthRadius *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
};

const getTurfDistance = (
  turf: Turf,
  location: { lat: number; lon: number } | null
): number | null => {
  if (!location) return null;

  const coordinates = turf.location?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return null;
  }

  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return calculateDistanceKm(
    location.lat,
    location.lon,
    lat,
    lon
  );
};

const formatDistance = (km: number | null) => {
  if (km === null || !Number.isFinite(km) || km < 0) {
    return 'Distance unavailable';
  }

  return km < 10
    ? `${km.toFixed(1)} km`
    : `${Math.round(km)} km`;
};

const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onNavigateToLogin,
  onSelectTurf,
  onNavigateToOwnerProfile,
  onNavigateToNotifications,
  onNavigateToProfile,
  onNavigateToSaved,
  onNavigateToOwnerDashboard,
}) => {
  const isGuest = !user;
  const isOwner = user?.role === 'owner';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [likedTurfs, setLikedTurfs] = useState<string[]>([]);
  const [likesLoaded, setLikesLoaded] = useState(false);

  const [userCity, setUserCity] = useState('Detecting location...');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const likedTurfsKey = useMemo(() => {
    const id = user?._id || 'guest';
    return `${LIKED_TURFS_KEY_PREFIX}${String(id)}`;
  }, [user?._id]);

  const fetchLiveLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setUserCity('Location Disabled');
      setUserLocation(null);
      setLoadingLocation(false);
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setUserLocation({ lat, lon });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          );

          if (!response.ok) {
            throw new Error('Unable to identify city');
          }

          const data = await response.json();

          const city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            data?.address?.suburb ||
            data?.address?.state_district ||
            data?.address?.state ||
            'Current Location';

          setUserCity(city);
        } catch {
          setUserCity('Unknown City');
        } finally {
          setLoadingLocation(false);
        }
      },
      () => {
        setUserCity('Location Unavailable');
        setUserLocation(null);
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
    );
  }, []);

  const fetchTurfs = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const response = await fetch(`${API_BASE_URL}/turfs`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      const list: Turf[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.turfs)
          ? data.turfs
          : [];

      setTurfs(
        list.filter(
          (turf) => !turf.status || turf.status === 'active'
        )
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load turfs.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(likedTurfsKey);

      if (stored) {
        const parsed = JSON.parse(stored);

        setLikedTurfs(
          Array.isArray(parsed) ? parsed.map(String) : []
        );
      } else {
        setLikedTurfs([]);
      }
    } catch {
      setLikedTurfs([]);
    } finally {
      setLikesLoaded(true);
    }
  }, [likedTurfsKey]);

  useEffect(() => {
    if (!likesLoaded || isGuest) return;

    try {
      localStorage.setItem(
        likedTurfsKey,
        JSON.stringify(Array.from(new Set(likedTurfs)))
      );
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, [likedTurfs, likedTurfsKey, likesLoaded, isGuest]);

  const toggleLike = (turfId: string) => {
    if (isGuest) {
      onNavigateToLogin();
      return;
    }

    const id = String(turfId || '').trim();

    if (!id) return;

    setLikedTurfs((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  // Load location and turfs once when HomeScreen mounts.
  // No automatic 30-second polling.
  useEffect(() => {
    fetchLiveLocation();
    fetchTurfs();
  }, [fetchLiveLocation, fetchTurfs]);

  const filteredTurfs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = turfs.filter((turf) => {
      const name = (turf.name || '').toLowerCase();
      const city = (turf.city || '').toLowerCase();
      const address = (turf.address || '').toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        city.includes(query) ||
        address.includes(query);

      const sports = getTurfSports(turf);

      const matchesCategory =
        selectedCategory === 'all' ||
        sports.includes(normalizeSport(selectedCategory));

      return matchesSearch && matchesCategory;
    });

    return [...filtered].sort((a, b) => {
      const distanceA = getTurfDistance(a, userLocation);
      const distanceB = getTurfDistance(b, userLocation);

      if (distanceA === null && distanceB === null) return 0;
      if (distanceA === null) return 1;
      if (distanceB === null) return -1;

      return distanceA - distanceB;
    });
  }, [turfs, searchQuery, selectedCategory, userLocation]);

  const isSearching = searchQuery.trim().length > 0;

  const displayedTurfs = isSearching
    ? filteredTurfs
    : filteredTurfs.slice(0, NEARBY_LIMIT);

  const moreNearby = isSearching
    ? []
    : filteredTurfs.slice(NEARBY_LIMIT);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  return (
    <div className="hs-safe">
      <div className="hs-container">
        <div className="hs-header">
          <div className="hs-header-left">
            <h1 className="hs-greeting">
              Hi, {isGuest ? 'Guest' : user?.name || 'Player'}
            </h1>

            <button
              className="hs-location-row"
              onClick={fetchLiveLocation}
              type="button"
              aria-label="Refresh current location"
            >
              <span className="hs-location-icon">📍</span>
              <span className="hs-location-text">
                {loadingLocation ? 'Detecting...' : userCity}
              </span>
            </button>
          </div>

          <div className="hs-header-right">
            {isGuest ? (
              <button
                className="hs-login-btn"
                onClick={onNavigateToLogin}
                type="button"
              >
                Login
              </button>
            ) : (
              <button
                className="hs-bell-button"
                onClick={onNavigateToNotifications}
                aria-label="Notifications"
                type="button"
              >
                🔔
              </button>
            )}
          </div>
        </div>

        <div className="hs-search-container">
          <span className="hs-search-icon">🔍</span>
          <input
            className="hs-search-input"
            placeholder="Search turf, city or location"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Search turf, city or location"
          />
        </div>

        {!isSearching && (
          <div className="hs-banner">
            <div className="hs-banner-decor-1" />
            <div className="hs-banner-decor-2" />

            <div className="hs-banner-content">
              <span className="hs-banner-badge">🏆 TURFBOOK</span>
              <h2 className="hs-banner-title">
                Find Your Perfect
                <br />
                Turf
              </h2>
              <p className="hs-banner-subtext">
                Book your slot in seconds
              </p>
              <button
                className="hs-banner-button"
                onClick={clearFilters}
                type="button"
              >
                EXPLORE TURFS →
              </button>
            </div>

            <div className="hs-banner-ball">⚽</div>
            <button
              className="hs-banner-gear"
              aria-label="Settings"
              type="button"
            >
              ⚙
            </button>
          </div>
        )}

        {!isSearching && (
          <div className="hs-section">
            <div className="hs-section-title-row">
              <h2 className="hs-section-title">Sports</h2>
              <span className="hs-section-accent" />
            </div>

            <div className="hs-category-scroll">
              {SPORT_CATEGORIES.map((category) => {
                const active = selectedCategory === category.id;

                return (
                  <button
                    key={category.id}
                    className={`hs-category-card ${active ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category.id)}
                    type="button"
                  >
                    <span
                      className={`hs-category-icon-wrapper ${active ? 'active' : ''}`}
                    >
                      {category.icon}
                    </span>
                    <span className="hs-category-name">
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="hs-section">
          <div className="hs-nearby-header">
            <div>
              <div className="hs-section-title-row">
                <h2 className="hs-section-title">
                  {isSearching ? 'Search Results' : 'Nearby Arenas'}
                </h2>
                <span className="hs-section-accent" />
              </div>

              <p className="hs-price-mode-text">
                {isSearching
                  ? `${filteredTurfs.length} turf${filteredTurfs.length === 1 ? '' : 's'} found`
                  : selectedCategory === 'all'
                    ? 'Showing nearest Cricket court price'
                    : `Showing nearest ${
                        SPORT_CATEGORIES.find(
                          (category) => category.id === selectedCategory
                        )?.name || 'selected'
                      } price`}
              </p>
            </div>

            <button
              className="hs-view-all-button"
              onClick={clearFilters}
              type="button"
            >
              {isSearching ? 'Clear' : 'View all'}
            </button>
          </div>

          {errorMessage && !loading && (
            <div className="hs-error-card">
              <span>⚠</span>
              <p className="hs-error-text">{errorMessage}</p>
              <button
                className="hs-retry-button"
                onClick={fetchTurfs}
                type="button"
              >
                RETRY
              </button>
            </div>
          )}

          {loading ? (
            <div className="hs-loading-container">
              <span className="hs-spinner" />
              <p className="hs-loading-text">
                Finding nearby turfs...
              </p>
            </div>
          ) : filteredTurfs.length === 0 ? (
            <div className="hs-empty-container">
              <div className="hs-empty-icon-wrapper">🔍</div>
              <h3 className="hs-empty-title">No turfs found</h3>
              <p className="hs-empty-text">
                No turf is available for the selected sport or search.
              </p>
              <button
                className="hs-clear-filter-button"
                onClick={clearFilters}
                type="button"
              >
                CLEAR FILTERS
              </button>
            </div>
          ) : (
            <>
              {isSearching ? (
                <div className="hs-more-list">
                  {displayedTurfs.map((item) => (
                    <MoreTurfCard
                      key={item._id || item.id}
                      item={item}
                      category={selectedCategory}
                      liked={likedTurfs}
                      toggleLike={toggleLike}
                      loc={userLocation}
                      onSelect={onSelectTurf}
                      isOwner={isOwner}
                    />
                  ))}
                </div>
              ) : (
                <div className="hs-horizontal-scroll">
                  {displayedTurfs.map((item) => (
                    <TurfCard
                      key={item._id || item.id}
                      item={item}
                      category={selectedCategory}
                      liked={likedTurfs}
                      toggleLike={toggleLike}
                      loc={userLocation}
                      onSelect={onSelectTurf}
                      isOwner={isOwner}
                    />
                  ))}
                </div>
              )}

              {moreNearby.length > 0 && (
                <div className="hs-more-section">
                  <div className="hs-section-title-row">
                    <h2 className="hs-section-title">
                      More Nearby Arenas
                    </h2>
                    <span className="hs-section-accent" />
                  </div>

                  <p className="hs-more-subtitle">
                    Other turfs near your location
                  </p>

                  <div className="hs-more-list">
                    {moreNearby.map((item) => (
                      <MoreTurfCard
                        key={item._id || item.id}
                        item={item}
                        category={selectedCategory}
                        liked={likedTurfs}
                        toggleLike={toggleLike}
                        loc={userLocation}
                        onSelect={onSelectTurf}
                        isOwner={isOwner}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ height: 100 }} />
      </div>

      <nav className="hs-bottom-bar">
        <button className="hs-tab-button active" type="button">
          <span className="hs-tab-icon active">🏠</span>
          <span className="hs-tab-label active">Home</span>
        </button>

        {isGuest ? (
          <button
            className="hs-tab-button"
            onClick={onNavigateToLogin}
            type="button"
          >
            <span className="hs-tab-icon">👤</span>
            <span className="hs-tab-label">Login</span>
          </button>
        ) : (
          <>
            <button
              className="hs-tab-button"
              onClick={onNavigateToNotifications}
              type="button"
            >
              <span className="hs-tab-icon">🔔</span>
              <span className="hs-tab-label">Alerts</span>
            </button>

            {isOwner ? (
              <button
                className="hs-tab-button"
                onClick={onNavigateToOwnerDashboard}
                type="button"
              >
                <span className="hs-tab-icon">📊</span>
                <span className="hs-tab-label">Dashboard</span>
              </button>
            ) : (
              <button
                className="hs-tab-button"
                onClick={onNavigateToSaved}
                type="button"
              >
                <span className="hs-tab-icon">❤</span>
                <span className="hs-tab-label">Liked</span>
              </button>
            )}

            <button
              className="hs-tab-button"
              onClick={
                isOwner
                  ? onNavigateToOwnerProfile
                  : onNavigateToProfile
              }
              type="button"
            >
              <span className="hs-tab-icon">👤</span>
              <span className="hs-tab-label">Profile</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
};

interface TurfCardProps {
  item: Turf;
  category: string;
  liked: string[];
  toggleLike: (turfId: string) => void;
  loc: { lat: number; lon: number } | null;
  onSelect: (turf: Turf) => void;
  isOwner: boolean;
}

const TurfCard: React.FC<TurfCardProps> = ({
  item,
  category,
  liked,
  toggleLike,
  loc,
  onSelect,
  isOwner,
}) => {
  const turfId = String(item._id || item.id || '');
  const isLiked = turfId ? liked.includes(turfId) : false;
  const image = getTurfImage(item);
  const price = getSportPrice(item, category);
  const courtCount = getCourtCount(item);
  const sports = getTurfSports(item);
  const distance = getTurfDistance(item, loc);

  return (
    <div
      className="hs-turf-card"
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(item);
        }
      }}
    >
      <div className="hs-turf-image-wrapper">
        {image ? (
          <img
            src={image}
            alt={item.name || 'Turf'}
            className="hs-turf-image"
            loading="lazy"
          />
        ) : (
          <div className="hs-turf-image-placeholder">
            <span>⚽</span>
            <small>No Image</small>
          </div>
        )}

        {!isOwner && (
          <button
            className="hs-heart-overlay"
            onClick={(event) => {
              event.stopPropagation();
              toggleLike(turfId);
            }}
            type="button"
            aria-label={isLiked ? 'Remove from liked turfs' : 'Add to liked turfs'}
          >
            {isLiked ? '❤' : '🤍'}
          </button>
        )}

        {price !== null && (
          <span className="hs-price-pill">₹{price}/hr</span>
        )}

        <span className="hs-distance-badge">
          📍 {formatDistance(distance)}
        </span>
      </div>

      <div className="hs-turf-info">
        <h3 className="hs-turf-name">
          {item.name || 'Unnamed Turf'}
        </h3>
        <p className="hs-turf-city">
          📍 {item.city || 'City unavailable'}
        </p>

        <div className="hs-turf-meta-row">
          {price !== null ? (
            <span className="hs-price-text">From ₹{price}/hr</span>
          ) : (
            <span className="hs-price-unavailable">
              Price unavailable
            </span>
          )}
          <span className="hs-court-badge">▦ {courtCount}</span>
        </div>

        {sports.length > 0 ? (
          <p className="hs-sports-text">
            {sports.map(formatSportName).join(' • ')}
          </p>
        ) : (
          <p className="hs-no-sports">Sports not available</p>
        )}
      </div>
    </div>
  );
};

const MoreTurfCard: React.FC<TurfCardProps> = ({
  item,
  category,
  liked,
  toggleLike,
  loc,
  onSelect,
  isOwner,
}) => {
  const turfId = String(item._id || item.id || '');
  const image = getTurfImage(item);
  const price = getSportPrice(item, category);
  const courtCount = getCourtCount(item);
  const sports = getTurfSports(item);
  const distance = getTurfDistance(item, loc);
  const isLiked = turfId ? liked.includes(turfId) : false;

  return (
    <div
      className="hs-more-card"
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(item);
        }
      }}
    >
      <div className="hs-more-image-wrapper">
        {image ? (
          <img
            src={image}
            alt={item.name || 'Turf'}
            className="hs-more-image"
            loading="lazy"
          />
        ) : (
          <div className="hs-more-image-placeholder">⚽</div>
        )}

        {!isOwner && (
          <button
            className="hs-more-heart"
            onClick={(event) => {
              event.stopPropagation();
              toggleLike(turfId);
            }}
            type="button"
            aria-label={isLiked ? 'Remove from liked turfs' : 'Add to liked turfs'}
          >
            {isLiked ? '❤' : '🤍'}
          </button>
        )}
      </div>

      <div className="hs-more-info">
        <h3 className="hs-more-name">
          {item.name || 'Unnamed Turf'}
        </h3>
        <p className="hs-more-city">
          📍 {item.city || 'City unavailable'}
        </p>

        <div className="hs-more-distance-row">
          <span className="hs-more-distance">
            📍 {formatDistance(distance)}
          </span>
          {price !== null && (
            <span className="hs-more-price">₹{price}/hr</span>
          )}
        </div>

        <div className="hs-more-meta-row">
          <span className="hs-more-court-badge">▦ {courtCount}</span>
          {sports.length > 0 && (
            <span className="hs-more-sports">
              {sports.map(formatSportName).join(' • ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;