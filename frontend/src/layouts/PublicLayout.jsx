import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Tractor, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PublicLayout() {
  const { t, i18n } = useTranslation();

  return (
    <div className="app-shell">
      <header className="site-navbar">
        <div className="navbar-left">
          <Link to="/" style={{ textDecoration: 'none' }} className="navbar-brand">
            <div className="navbar-logo-mark">
              <Tractor size={20} color="#fff" />
            </div>
            <div>
              <div className="navbar-brand-name">
                BioPlan<span style={{ color: 'var(--forest-600)' }}>.AI</span>
              </div>
              <div className="navbar-brand-sub">{t('tagline')}</div>
            </div>
          </Link>
        </div>

        <div className="navbar-right">
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
          <Link to="/login" className="btn btn-primary btn-sm" style={{ padding: '0.45rem 1rem' }}>
            {t('signIn')}
          </Link>
        </div>
      </header>

      <div className="app-body">
        <main className="main-content" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Outlet />
          </div>
          
          <footer className="app-footer" style={{ margin: 0, padding: '1.5rem 2rem', background: 'rgba(255, 253, 248, 0.6)' }}>
            <div className="app-footer-inner" style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <span className="footer-brand">
                <strong>BioPlan AI</strong> — {t('tagline')}
              </span>
              <span className="footer-stack">
                FastAPI · React 19 · Leaflet GIS · RandomForest AI Engine
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
