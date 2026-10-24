import React from 'react';
import './SiteFooter.css';

interface SiteFooterProps {
  onNavigate?: (page: string) => void;
}

const SiteFooter: React.FC<SiteFooterProps> = ({ onNavigate }) => {
  const goToPage = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      // Fallback for standalone usage.
      window.location.hash = page;
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <footer className="site-footer">
      <div className="site-footer-container">
        {/* Brand and description */}
        <div className="site-footer-brand">
          <h2>
            <span aria-hidden="true">⚽</span> TurfBooking
          </h2>

          <p>
            Find your perfect turf, choose your preferred slot,
            and get ready to play. Your next game starts here!
          </p>
        </div>

        {/* Quick Links */}
        <div className="site-footer-column">
          <h3>Quick Links</h3>

          <button type="button" onClick={() => goToPage('home')}>
            Home
          </button>

          <button type="button" onClick={() => goToPage('home')}>
            Explore Turfs
          </button>

          <button type="button" onClick={() => goToPage('auth')}>
            Login / Register
          </button>

          <button type="button" onClick={() => goToPage('savedTurfs')}>
            Saved Turfs
          </button>
        </div>

        {/* About and Owner Links */}
        <div className="site-footer-column">
          <h3>About Us</h3>

          <button type="button" onClick={() => goToPage('about')}>
            About TurfBooking
          </button>

          <button type="button" onClick={() => goToPage('addTurf')}>
            List Your Turf
          </button>

          <button type="button" onClick={() => goToPage('owner')}>
            Owner Dashboard
          </button>
        </div>

        {/* Legal and Support */}
        <div className="site-footer-column">
          <h3>Legal &amp; Support</h3>

          <button
            type="button"
            onClick={() => goToPage('privacy-policy')}
          >
            Privacy Policy
          </button>

          <button
            type="button"
            onClick={() => goToPage('terms-conditions')}
          >
            Terms &amp; Conditions
          </button>

          <a href="mailto:mavinmarvishal601@gmail.com">
            Contact Us
          </a>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="site-footer-bottom">
        <p>
          © {new Date().getFullYear()} TurfBooking.
          All rights reserved.
        </p>

        <span>Made for sports lovers 🏆</span>
      </div>
    </footer>
  );
};

export default SiteFooter;
