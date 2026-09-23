import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import AuthLayout from './layouts/AuthLayout';
import LandingPage from './pages/LandingPage';
import AuthView from './components/AuthView';
import FarmerDashboard from './components/FarmerDashboard';
import BuyerDashboard from './components/BuyerDashboard';

// A wrapper to render the correct dashboard based on the authenticated user's role
function DashboardRouter() {
  const { role } = useAuth();
  
  if (role === 'farmer') {
    return <FarmerDashboard />;
  } else if (role === 'buyer') {
    return <BuyerDashboard />;
  }
  
  return <Navigate to="/" replace />;
}

// Ensure logged-in users don't see the public landing/login pages unnecessarily
function PublicOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes (No Sidebar) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
            <Route path="/login" element={<PublicOnlyRoute><AuthView /></PublicOnlyRoute>} />
          </Route>

          {/* Authenticated Routes (With Sidebar & Full Navbar) */}
          <Route element={<AuthLayout />}>
            <Route path="/dashboard" element={<DashboardRouter />} />
            {/* Catch-all for authenticated users */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

