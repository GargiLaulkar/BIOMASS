import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, Factory, Sparkles, ArrowRight, ShieldCheck, TrendingUp, MapPin, Zap } from 'lucide-react';

export default function AuthView() {
  const { login, register, loading, authError, setAuthError } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState('farmer'); // 'farmer' or 'buyer'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isRegistering) {
        await register(name || 'BioPlan User', email, password, role);
      } else {
        await login(email, password);
      }
    } catch (err) {
      // Error is set inside AuthContext
    }
  };

  const handleQuickDemo = async (demoRole) => {
    setAuthError(null);
    if (demoRole === 'farmer') {
      try {
        await login('farmer@bioplan.com', 'password123');
      } catch {
        // Fallback register and login
        await register('Demo Farmer', `farmer_${Date.now()}@bioplan.com`, 'password123', 'farmer');
      }
    } else {
      try {
        await login('buyer@bioplan.com', 'password123');
      } catch {
        // Fallback register and login
        await register('Demo Buyer Corp', `buyer_${Date.now()}@bioplan.com`, 'password123', 'buyer');
      }
    }
  };

  return (
    <div style={{
      maxWidth: '1100px',
      margin: '2rem auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      gap: '2.5rem',
      alignItems: 'center'
    }}>
      {/* Left Column: Hero Showcase */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--emerald-400)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem' }}>
          <Sparkles size={16} />
          <span>Next-Gen Agricultural Biomass Platform</span>
        </div>

        <h1 style={{ fontSize: '2.75rem', lineHeight: 1.15, marginBottom: '1.25rem' }}>
          Monetize Crop Residue with <span style={{ background: 'linear-gradient(135deg, #34d399, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI & Spatial Matching</span>
        </h1>

        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Connect farms generating agricultural residue with biomass buyers, ethanol biorefineries, and boiler plants using ML crop yield prediction, automated GIS distance logistics, and dynamic fair pricing.
        </p>

        {/* Feature Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <div style={{ color: 'var(--emerald-400)', marginBottom: '0.5rem' }}>
              <TrendingUp size={22} />
            </div>
            <strong style={{ display: 'block', color: '#fff', fontSize: '0.95rem' }}>AI Biomass Forecast</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Predict crop yield & residual biomass in metric tons.</span>
          </div>

          <div className="glass-panel" style={{ padding: '1rem' }}>
            <div style={{ color: 'var(--amber-400)', marginBottom: '0.5rem' }}>
              <MapPin size={22} />
            </div>
            <strong style={{ display: 'block', color: '#fff', fontSize: '0.95rem' }}>GIS Haversine Engine</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Calculate exact transit radius & logistics transport costs.</span>
          </div>

          <div className="glass-panel" style={{ padding: '1rem' }}>
            <div style={{ color: 'var(--blue-400)', marginBottom: '0.5rem' }}>
              <Zap size={22} />
            </div>
            <strong style={{ display: 'block', color: '#fff', fontSize: '0.95rem' }}>Dynamic Match Score</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Algorithmic scoring factoring distance, price, and net profit.</span>
          </div>
        </div>

        {/* Quick Demo Logins */}
        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px dashed rgba(16, 185, 129, 0.4)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.75rem' }}>
            ⚡ Instant 1-Click Demo Portals:
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleQuickDemo('farmer')}
              disabled={loading}
            >
              <Leaf size={16} /> Demo Farmer (Ludhiana Farms)
            </button>
            <button
              className="btn btn-warning btn-sm"
              onClick={() => handleQuickDemo('buyer')}
              disabled={loading}
            >
              <Factory size={16} /> Demo Buyer (Satluj Starch)
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Auth Card */}
      <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
        {/* Toggle Mode */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem'
        }}>
          <button
            type="button"
            onClick={() => { setIsRegistering(false); setAuthError(null); }}
            style={{
              flex: 1,
              padding: '0.6rem',
              border: 'none',
              background: !isRegistering ? 'var(--bg-card-solid)' : 'transparent',
              color: !isRegistering ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegistering(true); setAuthError(null); }}
            style={{
              flex: 1,
              padding: '0.6rem',
              border: 'none',
              background: isRegistering ? 'var(--bg-card-solid)' : 'transparent',
              color: isRegistering ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Create Account
          </button>
        </div>

        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
          {isRegistering ? 'Join BioPlan AI Platform' : 'Welcome Back'}
        </h2>
        <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {isRegistering ? 'Select your primary role and enter your details.' : 'Enter your credentials to access your dashboard.'}
        </p>

        {authError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <>
              {/* Role Selector */}
              <div className="form-group">
                <label className="form-label">I am registering as a:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div
                    onClick={() => setRole('farmer')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: role === 'farmer' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.2)',
                      border: `2px solid ${role === 'farmer' ? 'var(--emerald-500)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <Leaf size={20} color={role === 'farmer' ? 'var(--emerald-400)' : 'var(--text-secondary)'} style={{ margin: '0 auto 4px' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: role === 'farmer' ? '#fff' : 'var(--text-secondary)' }}>
                      Farmer
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Residue Supplier</div>
                  </div>

                  <div
                    onClick={() => setRole('buyer')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: role === 'buyer' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0,0,0,0.2)',
                      border: `2px solid ${role === 'buyer' ? 'var(--amber-500)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <Factory size={20} color={role === 'buyer' ? 'var(--amber-400)' : 'var(--text-secondary)'} style={{ margin: '0 auto 4px' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: role === 'buyer' ? '#fff' : 'var(--text-secondary)' }}>
                      Buyer / Industry
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Biomass Purchaser</div>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="form-label">Full Name or Company Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Gurpreet Singh / Satluj Starch"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem' }}
            disabled={loading}
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>{isRegistering ? 'Complete Registration' : 'Sign In to Dashboard'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
