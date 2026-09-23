import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';
import {
  Leaf,
  Factory,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Zap,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Lock,
  Mail,
  User,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';

export default function AuthView() {
  const { login, register, loading, authError, setAuthError } = useAuth();
  const { t } = useTranslation();
  
  // View mode: 'signin' | 'register' | 'forgot' | 'reset'
  const [viewMode, setViewMode] = useState('signin');
  const [role, setRole] = useState('farmer'); // 'farmer' or 'buyer'
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Forgot / Reset password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Field touched state for inline validation
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
    forgotEmail: false,
    resetToken: false,
    newPassword: false,
    confirmNewPassword: false
  });

  const markTouched = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Real-time validations
  const errors = useMemo(() => {
    const errs = {};

    if (viewMode === 'register') {
      if (!name.trim()) {
        errs.name = 'Full name is required';
      } else if (name.trim().length < 2) {
        errs.name = 'Name must be at least 2 characters';
      }
    }

    if (viewMode === 'signin' || viewMode === 'register') {
      if (!email.trim()) {
        errs.email = 'Email address is required';
      } else if (!emailRegex.test(email.trim())) {
        errs.email = 'Please enter a valid email address (e.g. user@example.com)';
      }

      if (!password) {
        errs.password = 'Password is required';
      } else if (password.length < 6) {
        errs.password = 'Password must be at least 6 characters';
      }

      if (viewMode === 'register') {
        if (!confirmPassword) {
          errs.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
          errs.confirmPassword = 'Passwords do not match';
        }
      }
    }

    if (viewMode === 'forgot') {
      if (!forgotEmail.trim()) {
        errs.forgotEmail = 'Email address is required';
      } else if (!emailRegex.test(forgotEmail.trim())) {
        errs.forgotEmail = 'Please enter a valid email address';
      }
    }

    if (viewMode === 'reset') {
      if (!resetToken.trim()) {
        errs.resetToken = 'Verification reset token is required';
      } else if (resetToken.trim().length < 4) {
        errs.resetToken = 'Token must be at least 4 characters';
      }

      if (!newPassword) {
        errs.newPassword = 'New password is required';
      } else if (newPassword.length < 6) {
        errs.newPassword = 'Password must be at least 6 characters';
      }

      if (!confirmNewPassword) {
        errs.confirmNewPassword = 'Please confirm your new password';
      } else if (newPassword !== confirmNewPassword) {
        errs.confirmNewPassword = 'Passwords do not match';
      }
    }

    return errs;
  }, [viewMode, name, email, password, confirmPassword, forgotEmail, resetToken, newPassword, confirmNewPassword]);

  // Password strength helper
  const passwordStrength = useMemo(() => {
    const pwd = viewMode === 'reset' ? newPassword : password;
    if (!pwd) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: '#ef4444' };
    if (score === 2) return { score: 50, label: 'Fair', color: '#f59e0b' };
    if (score === 3) return { score: 75, label: 'Good', color: '#3b82f6' };
    return { score: 100, label: 'Strong', color: '#10b981' };
  }, [password, newPassword, viewMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);

    // Mark all current fields as touched
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      forgotEmail: true,
      resetToken: true,
      newPassword: true,
      confirmNewPassword: true
    });

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      if (viewMode === 'register') {
        await register(name.trim(), email.trim(), password, role);
      } else if (viewMode === 'signin') {
        await login(email.trim(), password);
      }
    } catch (err) {
      // Error is stored in AuthContext
    }
  };

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    markTouched('forgotEmail');
    if (errors.forgotEmail) return;

    setForgotLoading(true);
    setForgotMessage(null);
    try {
      const res = await api.forgotPassword(forgotEmail.trim());
      setForgotMessage({
        type: 'success',
        text: res.message || 'Password reset token generated successfully!'
      });
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
      // Proceed to reset view
      setTimeout(() => {
        setViewMode('reset');
      }, 1000);
    } catch (err) {
      setForgotMessage({
        type: 'error',
        text: err.message || 'Failed to process password reset request.'
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    markTouched('resetToken');
    markTouched('newPassword');
    markTouched('confirmNewPassword');

    if (errors.resetToken || errors.newPassword || errors.confirmNewPassword) return;

    setForgotLoading(true);
    setForgotMessage(null);
    try {
      const res = await api.resetPassword(forgotEmail.trim(), resetToken.trim(), newPassword);
      setForgotSuccess(true);
      setForgotMessage({
        type: 'success',
        text: res.message || 'Password reset successfully! You can now log in.'
      });
      setEmail(forgotEmail);
      setPassword('');
      setTimeout(() => {
        setViewMode('signin');
        setForgotMessage(null);
        setForgotSuccess(false);
      }, 2000);
    } catch (err) {
      setForgotMessage({
        type: 'error',
        text: err.message || 'Failed to reset password. Please check your token.'
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleQuickDemo = async (demoRole) => {
    setAuthError(null);
    if (demoRole === 'farmer') {
      try {
        await login('farmer@bioplan.com', 'password123');
      } catch {
        await register('Demo Farmer', `farmer_${Date.now()}@bioplan.com`, 'password123', 'farmer');
      }
    } else {
      try {
        await login('buyer@bioplan.com', 'password123');
      } catch {
        await register('Demo Buyer Corp', `buyer_${Date.now()}@bioplan.com`, 'password123', 'buyer');
      }
    }
  };

  return (
    <div style={{
      maxWidth: '480px',
      margin: '4rem auto',
      alignItems: 'center'
    }}>
      {/* Quick Demo Logins - Moved above the auth card for easy access */}
      <div className="glass-panel auth-demo-panel" style={{ padding: '1.25rem', border: '1px dashed rgba(16, 185, 129, 0.4)', marginBottom: '2rem' }}>
        <div className="auth-demo-heading" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          ⚡ Instant 1-Click Demo Portals:
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleQuickDemo('farmer')}
            disabled={loading}
          >
            <Leaf size={16} /> Demo Farmer (Ludhiana Farms)
          </button>
          <button
            type="button"
            className="btn btn-warning btn-sm"
            onClick={() => handleQuickDemo('buyer')}
            disabled={loading}
          >
            <Factory size={16} /> Demo Buyer (Satluj Starch)
          </button>
        </div>
      </div>

      {/* Auth Card */}
      <div className="glass-panel" style={{ padding: '2.25rem', border: '1px solid rgba(255, 255, 255, 0.12)', position: 'relative' }}>
        
        {/* Toggle Mode (only in signin or register mode) */}
        {(viewMode === 'signin' || viewMode === 'register') && (
          <div className="auth-mode-toggle" style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem'
          }}>
            <button
              className="auth-mode-tab"
              type="button"
              onClick={() => { setViewMode('signin'); setAuthError(null); }}
              style={{
                flex: 1,
                padding: '0.65rem',
                border: 'none',
                background: viewMode === 'signin' ? 'var(--bg-card-solid)' : 'transparent',
                color: viewMode === 'signin' ? 'var(--ink-900)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.9rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {t('signIn')}
            </button>
            <button
              className="auth-mode-tab"
              type="button"
              onClick={() => { setViewMode('register'); setAuthError(null); }}
              style={{
                flex: 1,
                padding: '0.65rem',
                border: 'none',
                background: viewMode === 'register' ? 'var(--bg-card-solid)' : 'transparent',
                color: viewMode === 'register' ? 'var(--ink-900)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.9rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {t('createAccount')}
            </button>
          </div>
        )}

        {/* Header Titles */}
        {viewMode === 'signin' && (
          <>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={20} color="var(--emerald-400)" /> {t('welcomeBack')}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Enter your verified email and password to access your dashboard.
            </p>
          </>
        )}

        {viewMode === 'register' && (
          <>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="var(--emerald-400)" /> Create BioPlan Account
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Join as a farmer or biomass buyer to monetize and procure agricultural residue.
            </p>
          </>
        )}

        {viewMode === 'forgot' && (
          <>
            <button
              type="button"
              onClick={() => { setViewMode('signin'); setForgotMessage(null); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--emerald-400)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                marginBottom: '1rem',
                padding: 0
              }}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={20} color="var(--amber-400)" /> {t('forgotPassword')}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Enter your registered account email to receive a password reset verification token.
            </p>
          </>
        )}

        {viewMode === 'reset' && (
          <>
            <button
              type="button"
              onClick={() => { setViewMode('forgot'); setForgotMessage(null); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--emerald-400)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                marginBottom: '1rem',
                padding: 0
              }}
            >
              <ArrowLeft size={16} /> Back to Request Token
            </button>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RotateCcw size={20} color="var(--emerald-400)" /> {t('setNewPassword')}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Enter the verification token and choose your new secure password.
            </p>
          </>
        )}

        {/* Global Auth Error Alert */}
        {authError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{authError}</span>
          </div>
        )}

        {/* Forgot Password Message Alert */}
        {forgotMessage && (
          <div style={{
            background: forgotMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${forgotMessage.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: forgotMessage.type === 'success' ? '#6ee7b7' : '#fca5a5',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {forgotMessage.type === 'success' ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
            <span>{forgotMessage.text}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Sign In & Register Form */}
        {/* ------------------------------------------------------------- */}
        {(viewMode === 'signin' || viewMode === 'register') && (
          <form onSubmit={handleSubmit} noValidate>
            {viewMode === 'register' && (
              <>
                {/* Role Selector */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>{t('selectRole')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div
                      onClick={() => setRole('farmer')}
                      style={{
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: role === 'farmer' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.25)',
                        border: `2px solid ${role === 'farmer' ? 'var(--emerald-500)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Leaf size={22} color={role === 'farmer' ? 'var(--emerald-400)' : 'var(--text-secondary)'} style={{ margin: '0 auto 4px' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: role === 'farmer' ? 'var(--ink-900)' : 'var(--text-secondary)' }}>
                        {t('farmer')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('residueSupplier')}</div>
                    </div>

                    <div
                      onClick={() => setRole('buyer')}
                      style={{
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: role === 'buyer' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0,0,0,0.25)',
                        border: `2px solid ${role === 'buyer' ? 'var(--amber-500)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Factory size={22} color={role === 'buyer' ? 'var(--amber-400)' : 'var(--text-secondary)'} style={{ margin: '0 auto 4px' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: role === 'buyer' ? 'var(--ink-900)' : 'var(--text-secondary)' }}>
                        {t('buyer')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('biomassPurchaser')}</div>
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t('fullName')}</span>
                    {touched.name && !errors.name && (
                      <span style={{ color: 'var(--emerald-400)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={12} /> Valid
                      </span>
                    )}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Gurpreet Singh / Satluj Starch"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => markTouched('name')}
                      style={{
                        paddingLeft: '2.5rem',
                        borderColor: touched.name && errors.name ? '#ef4444' : undefined
                      }}
                    />
                    <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                  {touched.name && errors.name && (
                    <div style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                      {errors.name}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Email */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('email')}</span>
                {touched.email && !errors.email && (
                  <span style={{ color: 'var(--emerald-400)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle2 size={12} /> Valid
                  </span>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-control"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => markTouched('email')}
                  style={{
                    paddingLeft: '2.5rem',
                    borderColor: touched.email && errors.email ? '#ef4444' : undefined
                  }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              {touched.email && errors.email && (
                <div style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                  {errors.email}
                </div>
              )}
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ margin: 0 }}>{t('password')}</label>
                {viewMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setViewMode('forgot');
                      setAuthError(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--emerald-400)',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => markTouched('password')}
                  style={{
                    paddingLeft: '2.5rem',
                    paddingRight: '2.5rem',
                    borderColor: touched.password && errors.password ? '#ef4444' : undefined
                  }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {touched.password && errors.password && (
                <div style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                  {errors.password}
                </div>
              )}

              {/* Password strength bar in registration */}
              {viewMode === 'register' && password && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '3px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Strength:</span>
                    <span style={{ color: passwordStrength.color, fontWeight: 600 }}>{passwordStrength.label}</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${passwordStrength.score}%`,
                      height: '100%',
                      background: passwordStrength.color,
                      transition: 'all 0.3s ease'
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password (Registration Only) */}
            {viewMode === 'register' && (
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('confirmPassword')}</span>
                  {touched.confirmPassword && !errors.confirmPassword && (
                    <span style={{ color: 'var(--emerald-400)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <CheckCircle2 size={12} /> Matched
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => markTouched('confirmPassword')}
                    style={{
                      paddingLeft: '2.5rem',
                      paddingRight: '2.5rem',
                      borderColor: touched.confirmPassword && errors.confirmPassword ? '#ef4444' : undefined
                    }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <div style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                    {errors.confirmPassword}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem', fontWeight: 600 }}
              disabled={loading}
            >
              {loading ? (
                <span>{t('authenticating')}</span>
              ) : (
                <>
                  <span>{viewMode === 'register' ? 'Complete Registration' : 'Sign In to Dashboard'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Forgot Password Form (Step 1: Request Token) */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'forgot' && (
          <form onSubmit={handleForgotPasswordRequest} noValidate>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">{t('registeredAccountEmail')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-control"
                  placeholder="user@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  onBlur={() => markTouched('forgotEmail')}
                  style={{
                    paddingLeft: '2.5rem',
                    borderColor: touched.forgotEmail && errors.forgotEmail ? '#ef4444' : undefined
                  }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              {touched.forgotEmail && errors.forgotEmail && (
                <div style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                  {errors.forgotEmail}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-warning"
              style={{ width: '100%', padding: '0.85rem', fontWeight: 600 }}
              disabled={forgotLoading}
            >
              {forgotLoading ? (
                <span>{t('generatingToken')}</span>
              ) : (
                <>
                  <span>{t('generateResetToken')}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setViewMode('reset')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Already have a reset token? Enter it here
              </button>
            </div>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Reset Password Form (Step 2: Enter Token & New Password) */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'reset' && (
          <form onSubmit={handleResetPasswordSubmit} noValidate>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">{t('accountEmail')}</label>
              <input
                type="email"
                className="form-control"
                placeholder="user@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">{t('verificationResetToken')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Paste reset token here"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  onBlur={() => markTouched('resetToken')}
                  style={{
                    paddingLeft: '2.5rem',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    borderColor: touched.resetToken && errors.resetToken ? '#ef4444' : undefined
                  }}
                />
                <KeyRound size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              {touched.resetToken && errors.resetToken && (
                <div style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                  {errors.resetToken}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">{t('newPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={() => markTouched('newPassword')}
                  style={{
                    paddingLeft: '2.5rem',
                    paddingRight: '2.5rem',
                    borderColor: touched.newPassword && errors.newPassword ? '#ef4444' : undefined
                  }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {touched.newPassword && errors.newPassword && (
                <div style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                  {errors.newPassword}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">{t('confirmNewPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Repeat new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  onBlur={() => markTouched('confirmNewPassword')}
                  style={{
                    paddingLeft: '2.5rem',
                    borderColor: touched.confirmNewPassword && errors.confirmNewPassword ? '#ef4444' : undefined
                  }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              {touched.confirmNewPassword && errors.confirmNewPassword && (
                <div style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                  {errors.confirmNewPassword}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontWeight: 600 }}
              disabled={forgotLoading || forgotSuccess}
            >
              {forgotLoading ? (
                <span>{t('resettingPassword')}</span>
              ) : (
                <>
                  <span>{t('saveNewPassword')}</span>
                  <CheckCircle2 size={16} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
