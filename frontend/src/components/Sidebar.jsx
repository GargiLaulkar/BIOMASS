import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Tractor, Factory, LayoutDashboard, MapPin, Sparkles, BarChart3,
  Users, ShoppingCart, Leaf, LogOut, ChevronRight, ArrowRightLeft, User
} from 'lucide-react';

/* ─── Sidebar navigation items per role ─── */
const FARMER_NAV = [
  { id: 'overview',    icon: LayoutDashboard, label: 'Dashboard Overview' },
  { id: 'portfolio',   icon: Leaf,            label: 'Farm Portfolio' },
  { id: 'prediction',  icon: Sparkles,        label: 'AI Biomass Forecast' },
  { id: 'gis',         icon: MapPin,          label: 'GIS Logistics Map' },
  { id: 'analytics',   icon: BarChart3,       label: 'Biomass Analytics' },
  { id: 'matches',     icon: Users,           label: 'Buyer Matches' },
];

const BUYER_NAV = [
  { id: 'overview',    icon: LayoutDashboard, label: 'Dashboard Overview' },
  { id: 'demands',     icon: ShoppingCart,    label: 'My Demands' },
  { id: 'matches',     icon: Sparkles,        label: 'Farm Matches' },
  { id: 'gis',         icon: MapPin,          label: 'GIS Supplier Map' },
  { id: 'analytics',   icon: BarChart3,       label: 'Market Analytics' },
];

export default function Sidebar({ activeSection, setActiveSection, sidebarOpen, setSidebarOpen }) {
  const { user, role, logout, login } = useAuth();
  const { t } = useTranslation();

  const navItems = role === 'farmer' ? FARMER_NAV : BUYER_NAV;

  const handleDemoSwitch = async (targetRole) => {
    try {
      await login(targetRole === 'farmer' ? 'farmer@bioplan.com' : 'buyer@bioplan.com', 'password123');
    } catch {
      await login(targetRole === 'farmer' ? 'testfarmer@bioplan.com' : 'buyer_user@bioplan.com', 'password123');
    }
  };

  const isFarmer = role === 'farmer';

  return (
    <>
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        {/* ── Brand / Logo ─────────────────────────────── */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Tractor size={22} color="#fff" />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">
              BioPlan<span className="sidebar-brand-accent">.AI</span>
            </span>
            <span className="sidebar-brand-sub">{t('tagline')}</span>
          </div>
        </div>

        {/* ── Role pill ─────────────────────────────────── */}
        <div className="sidebar-role-pill" data-role={role}>
          {isFarmer ? <Tractor size={14} /> : <Factory size={14} />}
          <span>{isFarmer ? 'Farmer Portal' : 'Buyer Portal'}</span>
        </div>

        {/* ── Navigation ────────────────────────────────── */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">{t('navigation', 'Navigation')}</div>
          {navItems.map(({ id, icon: Icon, label }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                className={`sidebar-nav-item ${active ? 'sidebar-nav-item--active' : ''}`}
                onClick={() => { 
                  setActiveSection(id); 
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
              >
                <Icon size={18} />
                <span>{t(id, label)}</span>
                {active && <ChevronRight size={14} className="sidebar-nav-chevron" />}
              </button>
            );
          })}
        </nav>

        {/* ── Quick switch ──────────────────────────────── */}
        <div className="sidebar-switch">
          <div className="sidebar-nav-label">{t('demo', 'Demo')}</div>
          <button
            className="sidebar-switch-btn"
            onClick={() => handleDemoSwitch(isFarmer ? 'buyer' : 'farmer')}
          >
            <ArrowRightLeft size={15} />
            <span>{t('switchTo', { role: isFarmer ? t('buyer') : t('farmer') })}</span>
          </button>
        </div>

        {/* ── User profile ──────────────────────────────── */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              <User size={16} />
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-email">{user?.email}</span>
              <span className="sidebar-user-role">{isFarmer ? t('farmerAccount', 'Farmer account') : t('buyerAccount', 'Buyer account')}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={logout} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
