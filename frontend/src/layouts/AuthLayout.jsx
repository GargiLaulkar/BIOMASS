import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function AuthLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Use Outlet context to pass activeSection up to Sidebar
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="app-shell">
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="app-body">
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main className={`main-content ${sidebarOpen ? 'main-content--shifted' : ''}`}>
          {/* Outlet renders the dashboard and we pass activeSection via context */}
          <Outlet context={{ activeSection, setActiveSection }} />

          <footer className="app-footer">
            <div className="app-footer-inner">
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
