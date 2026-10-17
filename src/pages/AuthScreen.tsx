// src/pages/AuthScreen.tsx
import React, { useState } from 'react';
import './AuthScreen.css';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'owner' | 'admin';
}

interface AuthScreenProps {
  onAuthSuccess: (user: AuthUser, isNewSignup?: boolean) => void;
}

const API_URL = ((import.meta as any).env?.VITE_API_URL || 'https://turf-backend-q8w4.onrender.com/api').replace(/\/+$/, '');

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form States
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'owner'>('customer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      const endpoint = isLogin ? 'auth/login' : 'auth/signup';
      
      const body = isLogin 
        ? { identifier, password: loginPassword }
        : { name, email, phone, password: signupPassword, role };

      const res = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Authentication failed');
      }

      const user = data?.user || data?.data?.user;
      if (!user) throw new Error('Invalid response from server');

      onAuthSuccess(user, !isLogin);
    } catch (err: any) {
      alert(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
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
            <span className="auth-kicker-text">{isLogin ? 'SIGN IN' : 'GET STARTED'}</span>
          </div>

          <h1 className="auth-hero-title">
            {isLogin ? 'Welcome\nback' : 'Create your\naccount'}
            <span className="auth-hero-title-dot">.</span>
          </h1>

          <form className="auth-card" onSubmit={handleSubmit}>
            <div className="auth-tabs-container">
              <button type="button" className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Login</button>
              <button type="button" className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>Sign up</button>
            </div>

            {isLogin ? (
              <>
                <div className="auth-field">
                  <label className="auth-label">Email or Phone</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-icon-box">📧</div>
                    <input type="text" className="auth-input" placeholder="Enter email or phone" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-icon-box">🔒</div>
                    <input type={showPassword ? 'text' : 'password'} className="auth-input" placeholder="Enter password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                    <button type="button" className="auth-eye-button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '🙈' : '👁'}</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="auth-field">
                  <label className="auth-label">Full Name</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-icon-box">👤</div>
                    <input type="text" className="auth-input" placeholder="Enter full name" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Email</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-icon-box">📧</div>
                    <input type="email" className="auth-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Phone</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-icon-box">📞</div>
                    <input type="tel" className="auth-input" placeholder="10-digit number" value={phone} onChange={e => setPhone(e.target.value)} required />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-icon-box">🔒</div>
                    <input type={showPassword ? 'text' : 'password'} className="auth-input" placeholder="Create password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required />
                    <button type="button" className="auth-eye-button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '🙈' : '👁'}</button>
                  </div>
                </div>

                <div className="auth-role-row">
                  <button type="button" className={`auth-role-card ${role === 'customer' ? 'active' : ''}`} onClick={() => setRole('customer')}>
                    {role === 'customer' && <span className="auth-role-check">✓</span>}
                    <span className="auth-role-icon-box">⚽</span>
                    <span className="auth-role-name">Player</span>
                    <span className="auth-role-desc">Book turfs</span>
                  </button>
                  <button type="button" className={`auth-role-card ${role === 'owner' ? 'active' : ''}`} onClick={() => setRole('owner')}>
                    {role === 'owner' && <span className="auth-role-check">✓</span>}
                    <span className="auth-role-icon-box">🏢</span>
                    <span className="auth-role-name">Turf Owner</span>
                    <span className="auth-role-desc">Manage turfs</span>
                  </button>
                </div>
              </>
            )}

            <button type="submit" className="auth-submit-button" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : (isLogin ? 'Continue' : 'Create account')}
            </button>

            <div className="auth-switch-row">
              <span className="auth-switch-text">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </span>
              <button type="button" className="auth-switch-link" onClick={() => setIsLogin(!isLogin)}>
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