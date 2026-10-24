// src/pages/AuthScreen.tsx
import React, { useState } from 'react';
import './AuthScreen.css';

/* =========================================================
   API
========================================================= */

const RAW_API_BASE_URL = (
  (import.meta as any).env?.VITE_API_URL ||
  'https://turf-backend-q8w4.onrender.com/api'
).trim();

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

export type UserRole = 'customer' | 'owner' | 'admin';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
}

/**
 * Route the app should navigate to after authentication.
 * - login  → HOME
 * - signup → ADD TURF first, then HOME (handled by AddTurfScreen on finish)
 */
export type PostAuthRoute = '/home' | '/owner/add-turf' | '/admin';

/**
 * Decide where to send the user after auth.
 *
 * Rules (per product requirement):
 *   - LOGIN  (any role)  → Home
 *   - SIGNUP (any role)  → Add Turf screen first
 *   - ADMIN  (login)     → Admin dashboard (explicit override)
 */
export const getPostAuthRoute = (
  user: Pick<AuthUser, 'role'>,
  isNewSignup: boolean,
): PostAuthRoute => {
  // Admin always goes to the admin dashboard
  if (user.role === 'admin') return '/admin';

  // Signup → Add Turf first (for both customer and owner)
  if (isNewSignup) return '/owner/add-turf';

  // Login → Home (for both customer and owner)
  return '/home';
};

interface AuthScreenProps {
  onAuthSuccess: (user: AuthUser, isNewSignup?: boolean) => void;
  /**
   * Optional navigation callback. If provided, AuthScreen will call it
   * with the correct post-auth route so the parent can navigate immediately.
   */
  onNavigate?: (route: PostAuthRoute, user: AuthUser) => void;
}

/* =========================================================
   HELPERS
========================================================= */

const isEmailValid = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const getDigits = (value: string): string => value.replace(/\D/g, '');

const persistSession = (user: AuthUser): void => {
  try {
    localStorage.setItem('turfbook_user', JSON.stringify(user));
  } catch {
    /* ignore */
  }
};

/* =========================================================
   COMPONENT
========================================================= */

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, onNavigate }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* LOGIN */
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  /* SIGNUP */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'owner'>('customer');

  /* VALIDATION */

  const validateLogin = (): string | null => {
    if (!identifier.trim()) return 'Please enter your email or phone number.';
    if (!loginPassword.trim()) return 'Please enter your password.';
    return null;
  };

  const validateSignup = (): string | null => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanPassword = signupPassword.trim();

    if (!cleanName) return 'Please enter your full name.';
    if (cleanName.length < 2) return 'Name must contain at least 2 characters.';
    if (!cleanEmail) return 'Please enter your email address.';
    if (!isEmailValid(cleanEmail)) return 'Please enter a valid email address.';
    if (!cleanPhone) return 'Please enter your phone number.';
    if (getDigits(cleanPhone).length < 10)
      return 'Please enter a valid 10-digit phone number.';
    if (!cleanPassword) return 'Please create a password.';
    if (cleanPassword.length < 6)
      return 'Password must contain at least 6 characters.';
    return null;
  };

  /* SUBMIT */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMessage(null);

    const validationError = isLogin ? validateLogin() : validateSignup();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setLoading(true);

      const endpoint = isLogin ? 'auth/login' : 'auth/signup';
      const isNewSignup = !isLogin;

      const body = isLogin
        ? { identifier: identifier.trim(), password: loginPassword.trim() }
        : {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim().replace(/\s+/g, ''),
            password: signupPassword.trim(),
            role: role === 'owner' ? 'owner' : 'customer',
          };

      const res = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data: any = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      if (!res.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            (isLogin
              ? 'Login failed. Please try again.'
              : 'Signup failed. Please try again.'),
        );
      }

      const user: AuthUser | undefined = data?.user || data?.data?.user;
      if (!user) throw new Error('Server did not return user information.');
      if (!user._id || !user.name || !user.role) {
        throw new Error('Invalid user information received from the server.');
      }

      persistSession(user);

      // Tell the parent who logged in + whether it was a new signup.
      onAuthSuccess(user, isNewSignup);

      // Tell the parent where to go.
      if (onNavigate) {
        onNavigate(getPostAuthRoute(user, isNewSignup), user);
      }

      if (user.role === 'admin') {
        alert(`Welcome to TurfBook Admin Panel, ${user.name}.`);
      }
    } catch (err: any) {
      const message =
        err?.message ||
        (isLogin
          ? 'Unable to login. Please check your connection and try again.'
          : 'Unable to create your account. Please try again.');
      setErrorMessage(message);
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setErrorMessage(null);
    setIsLogin((prev) => !prev);
  };

  return (
    <div className="auth-safe">
      <div className="auth-blob-top" />
      <div className="auth-blob-bottom" />

      <div className="auth-scroll">
        <div className="auth-container">
          <div className="auth-brand-row">
            <div className="auth-brand-mark">⚽</div>
            <span className="auth-brand-text">TurfBook</span>
          </div>

          <div className="auth-kicker-row">
            <span className="auth-kicker-line" />
            <span className="auth-kicker-text">
              {isLogin ? 'SIGN IN' : 'GET STARTED'}
            </span>
          </div>

          <h1 className="auth-hero-title">
            {isLogin ? 'Welcome\nback' : 'Create your\naccount'}
            <span className="auth-hero-title-dot">.</span>
          </h1>

          <p className="auth-hero-sub">
            {isLogin
              ? 'Sign in to continue booking turfs near you.'
              : 'Join thousands of players booking daily.'}
          </p>

          <form className="auth-card" onSubmit={handleSubmit}>
            <div className="auth-tabs-container">
              <button
                type="button"
                className={`auth-tab ${isLogin ? 'active' : ''}`}
                onClick={() => !isLogin && switchMode()}
                disabled={loading}
              >
                Login
              </button>
              <button
                type="button"
                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => isLogin && switchMode()}
                disabled={loading}
              >
                Sign up
              </button>
            </div>

            {errorMessage && (
              <div
                role="alert"
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#B91C1C',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 12,
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}
              >
                {errorMessage}
              </div>
            )}

            {isLogin ? (
              <>
                <div className="auth-field">
                  <label className="auth-label">Email or Phone</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-icon-box">📧</div>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="Enter email or phone"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoComplete="username"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-icon-box">🔒</div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="auth-eye-button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="auth-field">
                  <label className="auth-label">Full Name</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-icon-box">👤</div>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="Enter full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Email</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-icon-box">📧</div>
                    <input
                      type="email"
                      className="auth-input"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Phone</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-icon-box">📞</div>
                    <input
                      type="tel"
                      className="auth-input"
                      placeholder="10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      maxLength={15}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-icon-box">🔒</div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="Create password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="auth-eye-button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <div className="auth-role-row">
                  <button
                    type="button"
                    className={`auth-role-card ${role === 'customer' ? 'active' : ''}`}
                    onClick={() => setRole('customer')}
                    disabled={loading}
                  >
                    {role === 'customer' && <span className="auth-role-check">✓</span>}
                    <span className="auth-role-icon-box">⚽</span>
                    <span className="auth-role-name">Player</span>
                    <span className="auth-role-desc">Book turfs</span>
                  </button>
                  <button
                    type="button"
                    className={`auth-role-card ${role === 'owner' ? 'active' : ''}`}
                    onClick={() => setRole('owner')}
                    disabled={loading}
                  >
                    {role === 'owner' && <span className="auth-role-check">✓</span>}
                    <span className="auth-role-icon-box">🏢</span>
                    <span className="auth-role-name">Turf Owner</span>
                    <span className="auth-role-desc">Manage turfs</span>
                  </button>
                </div>
              </>
            )}

            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : isLogin ? (
                'Continue'
              ) : (
                'Create account'
              )}
            </button>

            <div className="auth-switch-row">
              <span className="auth-switch-text">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </span>
              <button
                type="button"
                className="auth-switch-link"
                onClick={switchMode}
                disabled={loading}
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </div>
          </form>

          <p className="auth-footer-text">
            By continuing you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;