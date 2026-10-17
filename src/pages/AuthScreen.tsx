// AuthScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import './AuthScreen.css';

/* =========================================================
   SHARED TYPES  (exported — used by App.tsx,
   AdminDashboardScreen.tsx, AddTurfScreen.tsx)
========================================================= */

export type UserRole = 'customer' | 'owner' | 'admin';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
}

export interface AuthScreenProps {
  onAuthSuccess?: (user: AuthUser, isNewSignup?: boolean) => void;
}

/* =========================================================
   API CONFIGURATION
========================================================= */

const RAW_API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL ||
  'https://turf-backend-q8w4.onrender.com/api';

if (!RAW_API_BASE_URL) {
  throw new Error('VITE_API_URL is missing. Please check your .env file.');
}

const API_BASE_URL = RAW_API_BASE_URL.trim().replace(/\/+$/, '');
const NORMALIZED_API_BASE_URL = /^https?:\/\//i.test(API_BASE_URL)
  ? API_BASE_URL
  : `https://${API_BASE_URL}`;

const getApiUrl = (endpoint: string): string =>
  `${NORMALIZED_API_BASE_URL}/${endpoint.trim().replace(/^\/+/, '')}`;

/* =========================================================
   HELPERS
========================================================= */

const isEmailValid = (v: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const getDigits = (v: string): string => v.replace(/\D/g, '');

interface PasswordStrength {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) return { level: 0, label: '', color: 'transparent' };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'Weak', color: '#EF4444' };
  if (score <= 2) return { level: 2, label: 'Fair', color: '#F59E0B' };
  if (score <= 3) return { level: 3, label: 'Good', color: '#3B82F6' };
  return { level: 4, label: 'Strong', color: '#22C55E' };
};

/* =========================================================
   SPINNER
========================================================= */

interface SpinnerProps {
  color?: string;
  size?: number;
}

const Spinner = ({ color = '#0B1220', size = 16 }: SpinnerProps) => (
  <span
    className="auth-spinner"
    style={{
      width: size,
      height: size,
      borderTopColor: color,
      borderColor: `${color}44`,
    }}
  />
);

/* =========================================================
   SUB-COMPONENTS  (Field / InputWrapper)
========================================================= */

interface FieldProps {
  id: string;
  label: string;
  labelRight?: React.ReactNode;
  children: React.ReactNode;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
}

const Field = ({ id, label, labelRight, children, registerRef }: FieldProps) => (
  <div className="auth-field" ref={(el) => registerRef(id, el)}>
    <div className="auth-label-row">
      <label className="auth-label">{label}</label>
      {labelRight}
    </div>
    {children}
  </div>
);

interface InputWrapperProps {
  focused: boolean;
  icon: string;
  children: React.ReactNode;
}

const InputWrapper = ({ focused, icon, children }: InputWrapperProps) => (
  <div className={`auth-input-wrapper ${focused ? 'focused' : ''}`}>
    <div className={`auth-icon-box ${focused ? 'focused' : ''}`}>{icon}</div>
    {children}
  </div>
);

/* =========================================================
   MAIN COMPONENT
========================================================= */

const AuthScreen = ({ onAuthSuccess }: AuthScreenProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [isLogin, setIsLogin] = useState<boolean>(true);

  /* LOGIN */
  const [identifier, setIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  /* SIGNUP */
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [showSignupPassword, setShowSignupPassword] = useState<boolean>(false);
  const [role, setRole] = useState<'customer' | 'owner'>('customer');

  const [loading, setLoading] = useState<boolean>(false);
  const [focused, setFocused] = useState<string | null>(null);

  /* =====================================================
     DERIVED STATE
  ===================================================== */

  const emailOk = isEmailValid(email);
  const phoneDigits = getDigits(phone).length;
  const phoneOk = phoneDigits >= 10;
  const loginIdentifierOk = identifier.includes('@')
    ? isEmailValid(identifier)
    : getDigits(identifier).length >= 10;
  const strength = getPasswordStrength(signupPassword);

  /* =====================================================
     SCROLL FOCUSED FIELD INTO VIEW
  ===================================================== */

  useEffect(() => {
    if (focused && fieldRefs.current[focused]) {
      fieldRefs.current[focused]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [focused]);

  const registerRef = (id: string, el: HTMLDivElement | null): void => {
    fieldRefs.current[id] = el;
  };

  /* =====================================================
     MODE SWITCH
  ===================================================== */

  const resetForms = (): void => {
    setIdentifier('');
    setLoginPassword('');
    setName('');
    setEmail('');
    setPhone('');
    setSignupPassword('');
    setShowLoginPassword(false);
    setShowSignupPassword(false);
  };

  const switchMode = (): void => {
    resetForms();
    setIsLogin((p) => !p);
    setTimeout(
      () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }),
      100,
    );
  };

  /* =====================================================
     VALIDATION
  ===================================================== */

  const validateLogin = (): boolean => {
    if (!identifier.trim()) {
      alert('Please enter your email or phone number.');
      return false;
    }
    if (!loginPassword.trim()) {
      alert('Please enter your password.');
      return false;
    }
    return true;
  };

  const validateSignup = (): boolean => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanPassword = signupPassword.trim();

    if (!cleanName) {
      alert('Please enter your full name.');
      return false;
    }
    if (cleanName.length < 2) {
      alert('Name must contain at least 2 characters.');
      return false;
    }
    if (!cleanEmail) {
      alert('Please enter your email address.');
      return false;
    }
    if (!isEmailValid(cleanEmail)) {
      alert('Please enter a valid email address.');
      return false;
    }
    if (!cleanPhone) {
      alert('Please enter your phone number.');
      return false;
    }
    if (getDigits(cleanPhone).length < 10) {
      alert('Please enter a valid 10-digit phone number.');
      return false;
    }
    if (!cleanPassword) {
      alert('Please create a password.');
      return false;
    }
    if (cleanPassword.length < 6) {
      alert('Password must contain at least 6 characters.');
      return false;
    }
    return true;
  };

  /* =====================================================
     LOGIN
  ===================================================== */

  const handleLogin = async (): Promise<void> => {
    if (!validateLogin()) return;

    try {
      setLoading(true);
      const res = await fetch(getApiUrl('auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: loginPassword.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Login failed. Please try again.');
      }

      const loggedInUser: AuthUser | undefined =
        data?.user || data?.data?.user;

      if (!loggedInUser) {
        throw new Error(
          'Login succeeded but user information was not returned by the server.',
        );
      }
      if (!loggedInUser._id || !loggedInUser.name || !loggedInUser.role) {
        throw new Error(
          'Invalid user information received from the server.',
        );
      }

      if (loggedInUser.role === 'admin') {
        if (
          window.confirm(
            `Admin Login Successful\n\nWelcome to TurfBook Admin Panel, ${loggedInUser.name}.`,
          )
        ) {
          onAuthSuccess?.(loggedInUser, false);
        }
        return;
      }

      onAuthSuccess?.(loggedInUser, false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to login.';
      alert(`Login Failed\n\n${message}`);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     SIGNUP
  ===================================================== */

  const handleSignup = async (): Promise<void> => {
    if (!validateSignup()) return;

    try {
      setLoading(true);
      const safeRole: 'customer' | 'owner' =
        role === 'owner' ? 'owner' : 'customer';

      const res = await fetch(getApiUrl('auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim().replace(/\s+/g, ''),
          password: signupPassword.trim(),
          role: safeRole,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Signup failed. Please try again.');
      }

      const createdUser: AuthUser | undefined =
        data?.user || data?.data?.user;

      if (!createdUser) {
        throw new Error(
          'Signup succeeded but user information was not returned by the server.',
        );
      }

      alert(`Account Created\n\nWelcome to TurfBook, ${createdUser.name}!`);
      onAuthSuccess?.(createdUser, true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to create your account.';
      alert(`Signup Failed\n\n${message}`);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit = (e?: React.FormEvent): void => {
    e?.preventDefault?.();
    if (loading) return;
    if (isLogin) handleLogin();
    else handleSignup();
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="auth-safe">
      <div className="auth-blob-top" />
      <div className="auth-blob-bottom" />

      <div className="auth-scroll" ref={scrollRef}>
        <div className="auth-container">
          {/* BRAND */}
          <div className="auth-brand-row">
            <div className="auth-brand-mark">⚽</div>
            <span className="auth-brand-text">TurfBook</span>
          </div>

          {/* KICKER */}
          <div className="auth-kicker-row">
            <span className="auth-kicker-line" />
            <span className="auth-kicker-text">
              {isLogin ? 'SIGN IN' : 'GET STARTED'}
            </span>
          </div>

          {/* HERO */}
          <h1 className="auth-hero-title">
            {isLogin ? (
              <>
                Welcome
                <br />
                back
              </>
            ) : (
              <>
                Create your
                <br />
                account
              </>
            )}
            <span className="auth-hero-title-dot">.</span>
          </h1>
          <p className="auth-hero-sub">
            {isLogin
              ? 'Sign in to continue booking turfs near you.'
              : 'Join thousands of players booking daily.'}
          </p>

          {/* CARD */}
          <form className="auth-card" onSubmit={handleSubmit}>
            {/* TABS */}
            <div className="auth-tabs-container">
              <button
                type="button"
                className={`auth-tab ${isLogin ? 'active' : ''}`}
                onClick={() => {
                  if (!isLogin) switchMode();
                }}
                disabled={loading}
              >
                Login
              </button>
              <button
                type="button"
                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => {
                  if (isLogin) switchMode();
                }}
                disabled={loading}
              >
                Sign up
              </button>
            </div>

            {isLogin ? (
              <>
                <Field
                  id="identifier"
                  label="Email or phone"
                  registerRef={registerRef}
                >
                  <InputWrapper focused={focused === 'identifier'} icon="✉️">
                    <input
                      className="auth-input"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      onFocus={() => setFocused('identifier')}
                      onBlur={() => setFocused(null)}
                      placeholder="you@example.com"
                      autoCapitalize="none"
                      autoCorrect="off"
                      type="text"
                      disabled={loading}
                    />
                    {loginIdentifierOk && (
                      <span className="auth-check-badge">✓</span>
                    )}
                  </InputWrapper>
                </Field>

                <Field
                  id="loginPwd"
                  label="Password"
                  registerRef={registerRef}
                  labelRight={
                    <button
                      type="button"
                      className="auth-forgot-text"
                      onClick={() =>
                        alert('Password reset will be available soon.')
                      }
                      disabled={loading}
                    >
                      Forgot?
                    </button>
                  }
                >
                  <InputWrapper focused={focused === 'loginPwd'} icon="🔒">
                    <input
                      className="auth-input"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      onFocus={() => setFocused('loginPwd')}
                      onBlur={() => setFocused(null)}
                      placeholder="Enter your password"
                      type={showLoginPassword ? 'text' : 'password'}
                      autoCapitalize="none"
                      autoCorrect="off"
                      disabled={loading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSubmit(e);
                      }}
                    />
                    <button
                      type="button"
                      className="auth-eye-button"
                      onClick={() => setShowLoginPassword((p) => !p)}
                      disabled={loading}
                    >
                      {showLoginPassword ? '🙈' : '👁'}
                    </button>
                  </InputWrapper>
                </Field>

                <button
                  type="submit"
                  className={`auth-submit-button ${loading ? 'disabled' : ''}`}
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner />
                  ) : (
                    <span className="auth-submit-content">
                      Continue <span className="auth-submit-icon">→</span>
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="auth-section-row">
                  <span className="auth-section-number">01</span>
                  <span className="auth-section-text">Your details</span>
                </div>

                <Field id="name" label="Full name" registerRef={registerRef}>
                  <InputWrapper focused={focused === 'name'} icon="👤">
                    <input
                      className="auth-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused(null)}
                      placeholder="Enter your full name"
                      disabled={loading}
                    />
                  </InputWrapper>
                </Field>

                <Field id="email" label="Email" registerRef={registerRef}>
                  <InputWrapper focused={focused === 'email'} icon="✉️">
                    <input
                      className="auth-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused(null)}
                      placeholder="you@example.com"
                      type="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      disabled={loading}
                    />
                    {emailOk && <span className="auth-check-badge">✓</span>}
                  </InputWrapper>
                </Field>

                <Field
                  id="phone"
                  label="Phone"
                  registerRef={registerRef}
                  labelRight={
                    phone.length > 0 ? (
                      <span
                        className={`auth-counter-text ${
                          phoneOk ? 'ok' : ''
                        }`}
                      >
                        {phoneDigits}/10
                      </span>
                    ) : undefined
                  }
                >
                  <InputWrapper focused={focused === 'phone'} icon="📞">
                    <input
                      className="auth-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onFocus={() => setFocused('phone')}
                      onBlur={() => setFocused(null)}
                      placeholder="10-digit number"
                      type="tel"
                      maxLength={15}
                      disabled={loading}
                    />
                    {phoneOk && <span className="auth-check-badge">✓</span>}
                  </InputWrapper>
                </Field>

                <Field
                  id="signupPwd"
                  label="Password"
                  registerRef={registerRef}
                >
                  <InputWrapper focused={focused === 'signupPwd'} icon="🔒">
                    <input
                      className="auth-input"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      onFocus={() => setFocused('signupPwd')}
                      onBlur={() => setFocused(null)}
                      placeholder="Create a password"
                      type={showSignupPassword ? 'text' : 'password'}
                      autoCapitalize="none"
                      autoCorrect="off"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="auth-eye-button"
                      onClick={() => setShowSignupPassword((p) => !p)}
                      disabled={loading}
                    >
                      {showSignupPassword ? '🙈' : '👁'}
                    </button>
                  </InputWrapper>

                  {signupPassword.length > 0 && (
                    <div className="auth-strength-row">
                      <div className="auth-strength-bars">
                        {[1, 2, 3, 4].map((seg) => (
                          <div
                            key={seg}
                            className="auth-strength-bar"
                            style={{
                              backgroundColor:
                                seg <= strength.level
                                  ? strength.color
                                  : undefined,
                            }}
                          />
                        ))}
                      </div>
                      <span
                        className="auth-strength-label"
                        style={{ color: strength.color }}
                      >
                        {strength.label}
                      </span>
                    </div>
                  )}
                </Field>

                <div className="auth-section-row">
                  <span className="auth-section-number">02</span>
                  <span className="auth-section-text">Account type</span>
                </div>

                <div className="auth-role-row">
                  <button
                    type="button"
                    className={`auth-role-card ${
                      role === 'customer' ? 'active' : ''
                    }`}
                    onClick={() => setRole('customer')}
                    disabled={loading}
                  >
                    {role === 'customer' && (
                      <span className="auth-role-check">✓</span>
                    )}
                    <span
                      className={`auth-role-icon-box ${
                        role === 'customer' ? 'active' : ''
                      }`}
                    >
                      ⚽
                    </span>
                    <span
                      className={`auth-role-name ${
                        role === 'customer' ? 'active' : ''
                      }`}
                    >
                      Player
                    </span>
                    <span
                      className={`auth-role-desc ${
                        role === 'customer' ? 'active' : ''
                      }`}
                    >
                      Book turfs
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`auth-role-card ${
                      role === 'owner' ? 'active' : ''
                    }`}
                    onClick={() => setRole('owner')}
                    disabled={loading}
                  >
                    {role === 'owner' && (
                      <span className="auth-role-check">✓</span>
                    )}
                    <span
                      className={`auth-role-icon-box ${
                        role === 'owner' ? 'active' : ''
                      }`}
                    >
                      🏢
                    </span>
                    <span
                      className={`auth-role-name ${
                        role === 'owner' ? 'active' : ''
                      }`}
                    >
                      Turf Owner
                    </span>
                    <span
                      className={`auth-role-desc ${
                        role === 'owner' ? 'active' : ''
                      }`}
                    >
                      Manage turfs
                    </span>
                  </button>
                </div>

                <button
                  type="submit"
                  className={`auth-submit-button ${loading ? 'disabled' : ''}`}
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner />
                  ) : (
                    <span className="auth-submit-content">
                      Create account{' '}
                      <span className="auth-submit-icon">→</span>
                    </span>
                  )}
                </button>
              </>
            )}

            {/* SWITCH */}
            <div className="auth-switch-row">
              <span className="auth-switch-text">
                {isLogin
                  ? "Don't have an account?"
                  : 'Already have an account?'}
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
            By continuing you agree to our Terms &amp; Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;