// src/pages/SavedTurfsScreen.tsx
import React, { useMemo } from 'react';
import './SavedTurfsScreen.css';

export interface SavedTurfsScreenProps {
  turfs: any[];
  likedTurfs: string[];
  onSelectTurf?: (turf: any) => void;
  onToggleLike: (turfId: string) => void;
}

export const SavedTurfsScreen: React.FC<SavedTurfsScreenProps> = ({
  turfs,
  likedTurfs,
  onSelectTurf,
  onToggleLike,
}) => {
  const normalizedLiked = useMemo(() => new Set(likedTurfs.map((id) => String(id))), [likedTurfs]);

  const savedTurfsList = useMemo(
    () =>
      turfs.filter((turf) => {
        const id = String(turf._id || turf.id || '');
        return id.length > 0 && normalizedLiked.has(id);
      }),
    [turfs, normalizedLiked],
  );

  return (
    <div className="sv-safe">
      <div className="sv-container">
        <div className="sv-header">
          <span className="sv-header-badge">❤️ FAVORITES</span>
          <div className="sv-header-title-row">
            <h1 className="sv-header-title">Saved Turfs</h1>
            {savedTurfsList.length > 0 && (
              <span className="sv-count-badge">{savedTurfsList.length}</span>
            )}
          </div>
          <p className="sv-header-subtitle">Your favorite turfs in one place</p>
        </div>

        {savedTurfsList.length === 0 ? (
          <div className="sv-empty-container">
            <div className="sv-empty-icon-circle">♡</div>
            <h3 className="sv-empty-title">No saved turfs yet</h3>
            <p className="sv-empty-subtitle">
              Tap the heart icon on any turf to add it to your saved list.
            </p>
          </div>
        ) : (
          <div className="sv-list-container">
            {savedTurfsList.map((item) => {
              const turfId = String(item._id || item.id || '');
              return (
                <div
                  key={turfId}
                  className="sv-turf-card"
                  onClick={() => onSelectTurf?.(item)}
                >
                  <div className="sv-image-wrapper">
                    <img
                      src={
                        item.images && item.images.length > 0
                          ? item.images[0].url
                          : 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={item.name}
                      className="sv-turf-image"
                    />
                    <span className="sv-price-pill">₹{item.pricePerHour || '500'}/hr</span>
                    <button
                      className="sv-heart-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(turfId);
                      }}
                    >
                      ♥
                    </button>
                  </div>

                  <div className="sv-card-details">
                    <h3 className="sv-turf-name">{item.name}</h3>
                    <div className="sv-location-row">
                      <span className="sv-location-dot" />
                      <span className="sv-location-text">
                        {item.address || item.city}
                      </span>
                    </div>
                    <div className="sv-card-footer">
                      <div className="sv-price-row">
                        <span className="sv-price-label">From</span>
                        <span className="sv-price-text">
                          ₹{item.pricePerHour || '500'}
                          <span className="sv-price-unit">/hr</span>
                        </span>
                      </div>
                      <span className="sv-book-now-pill">VIEW →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedTurfsScreen;