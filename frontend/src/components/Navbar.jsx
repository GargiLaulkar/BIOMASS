import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, Factory, User, LogOut, ArrowRightLeft, Sparkles } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, role, logout, login } = useAuth();

  const handleDemoSwitch = async (targetRole) => {
    if (targetRole === 'farmer') {
      try {
        await login('farmer@bioplan.com', 'password123');
      } catch {
        // Fallback demo farmer
        await login('testfarmer@bioplan.com', 'password123');
      }
    } else {
      try {
        await login('buyer@bioplan.com', 'password123');
      } catch {
        // Fallback demo buyer
        await login('buyer_user@bioplan.com', 'password123');
      }
    }
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(10, 15, 24, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0.85rem 1.5rem'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)',
            color: '#fff'
          }}>
            <Leaf size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
                BioPlan<span style={{ color: 'var(--emerald-400)' }}>.AI</span>
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                v1.0 Live
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Intelligent Biomass Supply & Procurement
            </div>
          </div>
        </div>

        {/* User Info & Actions */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Role Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              background: role === 'farmer' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${role === 'farmer' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              color: role === 'farmer' ? 'var(--emerald-400)' : 'var(--amber-400)',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {role === 'farmer' ? <Leaf size={16} /> : <Factory size={16} />}
              <span>{role === 'farmer' ? 'Farmer Portal' : 'Buyer Portal'}</span>
            </div>

            {/* Quick Demo Switcher */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleDemoSwitch(role === 'farmer' ? 'buyer' : 'farmer')}
              title={`Switch to ${role === 'farmer' ? 'Buyer' : 'Farmer'} account`}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              <ArrowRightLeft size={14} />
              <span>Switch to {role === 'farmer' ? 'Buyer' : 'Farmer'}</span>
            </button>

            {/* User display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <User size={16} />
              </div>
              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </span>
            </div>

            {/* Logout */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={logout}
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
            >
              <LogOut size={15} />
              <span>Exit</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Demo Accounts:</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleDemoSwitch('farmer')}
            >
              <Leaf size={14} /> Demo Farmer
            </button>
            <button
              className="btn btn-warning btn-sm"
              onClick={() => handleDemoSwitch('buyer')}
            >
              <Factory size={14} /> Demo Buyer
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
