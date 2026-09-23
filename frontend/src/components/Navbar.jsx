import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Tractor, Menu, X, Bell, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Navbar({ sidebarOpen, setSidebarOpen }) {
  const { user, role } = useAuth();
  const { t, i18n } = useTranslation();

  const roleLabel  = role === 'farmer' ? 'Farmer Dashboard' : 'Buyer Dashboard';
  const roleColor  = role === 'farmer' ? 'var(--forest-600)' : 'var(--wheat-700)';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header className="site-navbar">
      {/* ── Left: hamburger + breadcrumb ─────────────────── */}
      <div className="navbar-left">
        {/* Hamburger — always visible on mobile, also on desktop for sidebar */}
        <button
          className="navbar-hamburger"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Wordmark — shown only when sidebar is closed / on mobile */}
        <div className="navbar-brand">
          <div className="navbar-logo-mark">
            <Tractor size={20} color="#fff" />
          </div>
          <div>
            <div className="navbar-brand-name">
              BioPlan<span style={{ color: 'var(--forest-600)' }}>.AI</span>
            </div>
            <div className="navbar-brand-sub">{t('tagline')}</div>
          </div>
        </div>

        {/* Page breadcrumb — only when logged in */}
        {user && (
          <div className="navbar-breadcrumb">
            <span className="navbar-breadcrumb-sep">›</span>
            <span className="navbar-breadcrumb-page" style={{ color: roleColor }}>{roleLabel}</span>
          </div>
        )}
      </div>

      {/* ── Right: date + language + alerts ─────────────── */}
      <div className="navbar-right">
        {/* Date chip */}
        <div className="navbar-date">{today}</div>

        {/* Language switcher */}
        <div className="navbar-lang">
          <Globe size={15} style={{ color: 'var(--text-muted)' }} />
          <select
            aria-label={t('language')}
            className="language-switcher navbar-lang-select"
            value={i18n.language}
            onChange={e => i18n.changeLanguage(e.target.value)}
          >
            <option value="en">{t('english')}</option>
            <option value="hi">{t('hindi')}</option>
            <option value="mr">{t('marathi')}</option>
          </select>
        </div>

        {/* Notification bell */}
        <button className="navbar-icon-btn" title="Notifications">
          <Bell size={18} />
          <span className="navbar-notif-dot" />
        </button>

        {/* User avatar chip */}
        {user && (
          <div className="navbar-user-chip">
            <div className="navbar-user-avatar">
              {user.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">
                {user.email?.split('@')[0]}
              </span>
              <span className="navbar-user-role" style={{ color: roleColor }}>
                {role === 'farmer' ? 'Farmer' : 'Buyer'}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
