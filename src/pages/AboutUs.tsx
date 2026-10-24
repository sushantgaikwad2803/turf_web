
// import React from 'react';
import './AboutUs.css';

type AboutUsProps = {
  onNavigate?: (page: string) => void;
};

const playerBenefits = [
  {
    icon: '🔎',
    title: 'Discover Your Turf',
    description:
      'Explore cricket, football, badminton and other sports venues with helpful details about location, pricing and facilities.',
  },
  {
    icon: '📅',
    title: 'Choose Your Slot',
    description:
      'Select your preferred date and available playing time to plan your next match with your team.',
  },
  {
    icon: '💳',
    title: 'Convenient Booking',
    description:
      'Follow a simple booking flow and use the payment options offered by the platform.',
  },
];

const ownerBenefits = [
  {
    icon: '🏟️',
    title: 'Showcase Your Turf',
    description:
      'Create a turf listing with photos, location, sports, amenities and pricing information.',
  },
  {
    icon: '📊',
    title: 'Manage Your Business',
    description:
      'Use the owner dashboard to manage your turf information and access available management tools.',
  },
  {
    icon: '🤝',
    title: 'Reach More Players',
    description:
      'Make it easier for sports enthusiasts to discover your venue online.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Explore',
    description: 'Find a venue that suits your sport, location and budget.',
  },
  {
    number: '02',
    title: 'Select',
    description: 'Choose your turf, preferred date and available time slots.',
  },
  {
    number: '03',
    title: 'Book & Play',
    description: 'Complete the booking process and get ready for game time.',
  },
];

export default function AboutUs({ onNavigate }: AboutUsProps) {
  const navigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.hash = page;
    }
  };

  return (
    <main className="about-page">
      {/* HERO */}
      <section className="about-hero">
        <div className="about-hero-pattern" />

        <div className="about-container about-hero-grid">
          <div className="about-hero-copy">
            <span className="about-eyebrow">
              <span className="about-live-dot" />
              YOUR GAME. YOUR GROUND.
            </span>

            <h1>
              Every great game
              <br />
              starts with a <span>place to play.</span>
            </h1>

            <p className="about-hero-description">
              TurfBooking brings players and turf owners together in one
              convenient platform. Discover sports venues, explore available
              options and make planning your next game easier.
            </p>

            <div className="about-hero-actions">
              <button
                className="about-button about-button-primary"
                onClick={() => navigate('home')}
              >
                Explore Turfs <span aria-hidden="true">→</span>
              </button>

              <button
                className="about-button about-button-outline"
                onClick={() => navigate('addTurf')}
              >
                List Your Turf
              </button>
            </div>

            <div className="about-hero-note">
              <span>⚽</span>
              <span>Find your ground. Gather your team. Play your game.</span>
            </div>
          </div>

          <div className="about-hero-visual">
            <div className="about-image-frame">
              <img
                src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1100&q=85"
                alt="Green sports field ready for a game"
              />

              <div className="about-image-shade" />

              <div className="about-visual-label">
                <span className="about-visual-icon">🏆</span>
                <div>
                  <strong>Game time starts here</strong>
                  <small>Your next match is waiting.</small>
                </div>
              </div>
            </div>

            <div className="about-floating-ball" aria-hidden="true">
              ⚽
            </div>
            <div className="about-floating-tag">
              <span>✦</span> MADE FOR SPORTS LOVERS
            </div>
          </div>
        </div>
      </section>

      {/* INTRODUCTION */}
      <section className="about-intro">
        <div className="about-container about-intro-grid">
          <div>
            <span className="about-section-label">WHO WE ARE</span>
            <h2>
              More than a booking.
              <br />
              <span>A better way to play.</span>
            </h2>
          </div>

          <div className="about-intro-copy">
            <p>
              We believe finding a place to play should be straightforward.
              Organising a cricket match, planning a football game or arranging
              a session with friends should start with the excitement of sport,
              not the hassle of finding a venue.
            </p>

            <p>
              TurfBooking is designed to connect sports enthusiasts with turf
              owners through a single digital platform. Players can explore
              venues, while owners can present their facilities and manage
              their turf through the tools available to them.
            </p>
          </div>
        </div>
      </section>

      {/* MISSION AND VISION */}
      <section className="about-purpose">
        <div className="about-container about-purpose-grid">
          <article className="about-purpose-card about-purpose-main">
            <div className="about-purpose-icon">🎯</div>
            <span>OUR MISSION</span>
            <h3>Make finding your next game easier.</h3>
            <p>
              Help players discover suitable sports venues and make turf
              booking more convenient through a simple, accessible experience.
            </p>
          </article>

          <article className="about-purpose-card">
            <div className="about-purpose-icon">🌟</div>
            <span>OUR VISION</span>
            <h3>Bring more people closer to sport.</h3>
            <p>
              Build a connected sports ecosystem where players and venue
              owners can find opportunities to play, connect and grow.
            </p>
          </article>

          <article className="about-purpose-card">
            <div className="about-purpose-icon">💚</div>
            <span>OUR VALUES</span>
            <h3>Simple. Helpful. Sport-focused.</h3>
            <p>
              We value convenience, clear venue information and an experience
              that keeps the focus on enjoying the game.
            </p>
          </article>
        </div>
      </section>

      {/* FOR PLAYERS */}
      <section className="about-benefits">
        <div className="about-container">
          <div className="about-section-heading">
            <span className="about-section-label">FOR THE PLAYERS</span>
            <h2>Your next game, made easier.</h2>
            <p>
              Spend less time organising and more time doing what you love.
            </p>
          </div>

          <div className="about-benefit-grid">
            {playerBenefits.map((benefit, index) => (
              <article className="about-benefit-card" key={benefit.title}>
                <div className="about-benefit-top">
                  <span className="about-benefit-icon">{benefit.icon}</span>
                  <span className="about-card-number">
                    0{index + 1}
                  </span>
                </div>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FOR TURF OWNERS */}
      <section className="about-owner-section">
        <div className="about-container about-owner-grid">
          <div className="about-owner-visual">
            <img
              src="https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1100&q=85"
              alt="Sports stadium and playing field"
              loading="lazy"
            />

            <div className="about-owner-caption">
              <span>🏟️</span>
              <div>
                <strong>Your turf deserves to be discovered.</strong>
                <small>Bring your venue online with TurfBooking.</small>
              </div>
            </div>
          </div>

          <div className="about-owner-copy">
            <span className="about-section-label">FOR TURF OWNERS</span>
            <h2>
              Your ground.
              <br />
              <span>More opportunities.</span>
            </h2>

            <p>
              Your turf is where teams come together and great memories are
              made. TurfBooking helps you showcase your facility online and
              gives you access to tools for managing your listing.
            </p>

            <div className="about-owner-features">
              {ownerBenefits.map((benefit) => (
                <div className="about-owner-feature" key={benefit.title}>
                  <span className="about-owner-feature-icon">
                    {benefit.icon}
                  </span>
                  <div>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="about-button about-button-primary"
              onClick={() => navigate('addTurf')}
            >
              Get Started as an Owner <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="about-how">
        <div className="about-container">
          <div className="about-section-heading">
            <span className="about-section-label">HOW IT WORKS</span>
            <h2>Three steps. One great game.</h2>
            <p>From discovering a venue to getting your team on the field.</p>
          </div>

          <div className="about-steps-grid">
            {steps.map((step, index) => (
              <article className="about-step" key={step.number}>
                <div className="about-step-number">{step.number}</div>
                {index < steps.length - 1 && (
                  <div className="about-step-connector" />
                )}
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="about-cta-section">
        <div className="about-container">
          <div className="about-cta">
            <div className="about-cta-decoration" aria-hidden="true">
              ⚽
            </div>

            <span className="about-cta-label">YOUR NEXT GAME STARTS HERE</span>
            <h2>
              Ready to get
              <br />
              <span>back in the game?</span>
            </h2>
            <p>
              Discover a place to play or bring your sports venue to
              TurfBooking. Your next move starts here.
            </p>

            <div className="about-cta-actions">
              <button
                className="about-button about-button-dark"
                onClick={() => navigate('home')}
              >
                Find a Turf <span aria-hidden="true">→</span>
              </button>
              <button
                className="about-button about-button-light"
                onClick={() => navigate('addTurf')}
              >
                Join as a Turf Owner
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
