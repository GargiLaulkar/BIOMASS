import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthView from './components/AuthView';
import FarmerDashboard from './components/FarmerDashboard';
import BuyerDashboard from './components/BuyerDashboard';
import { Leaf, Factory, ShieldCheck, Heart } from 'lucide-react';

function MainApp() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        {!user ? (
          <AuthView />
        ) : (
          <>
            {role === 'farmer' ? (
              <FarmerDashboard />
            ) : (
              <BuyerDashboard />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(10, 15, 24, 0.95)',
        padding: '1.5rem',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="font-display" style={{ fontWeight: 700, color: '#fff' }}>BioPlan AI</span>
            <span>• Agricultural Biomass & Supply Intelligence</span>
          </div>
          <div>
            FastAPI Backend • React 19 + Leaflet GIS • AI Yield & Haversine Distance Engine
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
