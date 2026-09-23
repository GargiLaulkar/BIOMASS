import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import BiomassMap from './BiomassMap';
import {
  Factory,
  Plus,
  TrendingUp,
  MapPin,
  DollarSign,
  Truck,
  Building,
  Calendar,
  Layers,
  CheckCircle2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function BuyerDashboard() {
  const { t } = useTranslation();
  const outletContext = useOutletContext();
  const activeSection = outletContext?.activeSection;

  useEffect(() => {
    if (activeSection) {
      const el = document.getElementById(`section-${activeSection}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [activeSection]);

  const [profile, setProfile] = useState(null);
  const [demands, setDemands] = useState([]);
  const [crops, setCrops] = useState([]);
  const [nearbyFarms, setNearbyFarms] = useState([]);
  const [radiusKm, setRadiusKm] = useState(50);
  const [loading, setLoading] = useState(true);

  // Profile Modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    company_name: '',
    latitude: 30.9100,
    longitude: 75.8700,
    contact_information: ''
  });

  // Demand Modal
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [submittingDemand, setSubmittingDemand] = useState(false);
  const [newDemand, setNewDemand] = useState({
    biomass_type: 'Rice (Paddy)',
    required_quantity: 500.0,
    procurement_start: new Date().toISOString().split('T')[0],
    procurement_end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    offered_price: 3100.0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cropsRes, myDemandsRes] = await Promise.all([
        api.getCrops(),
        api.getMyDemands().catch(() => [])
      ]);
      setCrops(cropsRes);
      setDemands(myDemandsRes);

      // Check profile
      try {
        const myProfile = await api.getMyBuyerProfile();
        setProfile(myProfile);
        setProfileForm({
          company_name: myProfile.company_name,
          latitude: myProfile.latitude,
          longitude: myProfile.longitude,
          contact_information: myProfile.contact_information || ''
        });

        // Fetch nearby farms for this buyer
        const farmsGis = await api.getNearbyFarms(myProfile.id, radiusKm).catch(() => []);
        setNearbyFarms(farmsGis.map(item => ({
          ...item.farm,
          distance_km: item.distance_km
        })));
      } catch (err) {
        // No profile yet, prompt creation
        setShowProfileModal(true);
      }
    } catch (err) {
      console.error("Error fetching buyer dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRadiusChange = async (newRadius) => {
    setRadiusKm(newRadius);
    if (profile) {
      try {
        const farmsGis = await api.getNearbyFarms(profile.id, newRadius);
        setNearbyFarms(farmsGis.map(item => ({
          ...item.farm,
          distance_km: item.distance_km
        })));
      } catch (err) {
        console.error("Failed to update radius GIS:", err);
      }
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      let saved;
      if (profile) {
        saved = await api.updateBuyerProfile(profile.id, {
          company_name: profileForm.company_name,
          latitude: parseFloat(profileForm.latitude),
          longitude: parseFloat(profileForm.longitude),
          contact_information: profileForm.contact_information
        });
      } else {
        saved = await api.createBuyerProfile({
          company_name: profileForm.company_name,
          latitude: parseFloat(profileForm.latitude),
          longitude: parseFloat(profileForm.longitude),
          contact_information: profileForm.contact_information
        });
      }
      setProfile(saved);
      setShowProfileModal(false);
      await fetchData();
    } catch (err) {
      alert(`Failed to save buyer profile: ${err.message}`);
    }
  };

  const handleCreateDemand = async (e) => {
    e.preventDefault();
    setSubmittingDemand(true);
    try {
      await api.createDemand({
        biomass_type: newDemand.biomass_type,
        required_quantity: parseFloat(newDemand.required_quantity),
        procurement_start: newDemand.procurement_start,
        procurement_end: newDemand.procurement_end,
        offered_price: parseFloat(newDemand.offered_price)
      });
      setShowDemandModal(false);
      await fetchData();
    } catch (err) {
      alert(`Failed to create procurement demand: ${err.message}`);
    } finally {
      setSubmittingDemand(false);
    }
  };

  // Metrics
  const totalDemandedQty = demands.reduce((acc, d) => acc + d.required_quantity, 0);
  const totalBudget = demands.reduce((acc, d) => acc + (d.required_quantity * d.offered_price), 0);

  // Doughnut Chart Data by Biomass Type
  const biomassDemandMap = demands.reduce((acc, d) => {
    acc[d.biomass_type] = (acc[d.biomass_type] || 0) + d.required_quantity;
    return acc;
  }, {});

  const doughnutData = {
    labels: Object.keys(biomassDemandMap).length > 0 ? Object.keys(biomassDemandMap) : ['Rice (Paddy)', 'Wheat'],
    datasets: [
      {
        data: Object.values(biomassDemandMap).length > 0 ? Object.values(biomassDemandMap) : [500, 300],
        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899'],
        borderWidth: 0
      }
    ]
  };

  return (
    <div id="section-overview" style={{ paddingBottom: '2rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>{t('buyerDashboard')}</span>
            <span className="badge badge-amber">{t('demandMatching')}</span>
          </h1>
          <p>
            {profile ? `Managing facility: ${profile.company_name} | Coords: [${profile.latitude}, ${profile.longitude}]` : 'Setup your industrial procurement profile and post biomass tenders.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowProfileModal(true)}>
            <Building size={16} />
            <span>{profile ? t('editProfile') : t('setupProfile')}</span>
          </button>
          <button className="btn btn-warning" onClick={() => setShowDemandModal(true)}>
            <Plus size={18} />
            <span>{t('postDemand')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper stat-icon-amber">
            <Layers size={24} />
          </div>
          <div>
            <div className="stat-value">{demands.length}</div>
            <div className="stat-label">{t('activeDemands')}</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper stat-icon-green">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-value">{totalDemandedQty.toLocaleString()} MT</div>
            <div className="stat-label">{t('totalVolume')}</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper stat-icon-blue">
            <MapPin size={24} />
          </div>
          <div>
            <div className="stat-value">{nearbyFarms.length}</div>
            <div className="stat-label">{t('farmsInRadius', { radius: radiusKm })}</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper stat-icon-purple">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="stat-value">₹{(totalBudget / 100000).toFixed(1)}L</div>
            <div className="stat-label">{t('budget')}</div>
          </div>
        </div>
      </div>

      {/* ── Stacked Dashboard Layout ────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        {/* Left Column: Active Demands & Supplier Recommendations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Active Demands Table */}
          <div id="section-demands" className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} color="var(--amber-400)" />
                <span>{t('requirements')}</span>
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={fetchData}>
                <RefreshCw size={14} /> {t('refresh')}
              </button>
            </div>

            {demands.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                <Factory size={32} color="var(--amber-400)" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{t('noDemands')}</div>
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>{t('buyerDescText')}</p>
                <button className="btn btn-warning btn-sm" onClick={() => setShowDemandModal(true)}>
                  <Plus size={16} /> {t('createDemand')}
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>{t('biomass')}</th><th>{t('quantity')}</th><th>{t('price')}</th><th>{t('timeline')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demands.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <span className="badge badge-emerald">🌾 {d.biomass_type}</span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--ink-900)' }}>{d.required_quantity} MT</strong>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--amber-400)' }}>₹{d.offered_price}</strong> /MT
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {d.procurement_start} to {d.procurement_end}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Ranked Nearby Supplier Farms */}
          <div id="section-matches" className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Truck size={20} color="var(--emerald-400)" />
              <span>{t('farmSuppliers', { radius: radiusKm })}</span>
            </h3>

            {nearbyFarms.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {nearbyFarms.map((farm, idx) => (
                  <div
                    key={farm.id}
                    className="glass-panel"
                    style={{
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(0,0,0,0.2)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge badge-blue">Supplier #{idx + 1}</span>
                        <strong style={{ color: 'var(--ink-900)' }}>{farm.farm_name}</strong>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        📍 {farm.district}, {farm.state} • Area: {farm.area} ha
                      </div>
                      {farm.crops && farm.crops.length > 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--emerald-400)', marginTop: '0.25rem' }}>
                          Crops: {farm.crops.map(c => c.crop?.crop_name || `Crop #${c.crop_id}`).join(', ')}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--amber-400)' }}>
                        {farm.distance_km} km
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('transitDistance')}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {t('noSuppliers', { radius: radiusKm })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: GIS Map & Demand Distribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Spatial GIS Logistics Map */}
          <div id="section-gis" className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={20} color="var(--amber-400)" />
                <span>{t('geospatialNetwork')}</span>
              </h3>

              {/* Radius Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('radius')}</span>
                <select
                  value={radiusKm}
                  onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: 'var(--bg-card-solid)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--ink-900)',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value={10}>10 km</option>
                  <option value={25}>25 km</option>
                  <option value={50}>50 km (Standard)</option>
                  <option value={100}>100 km (Regional)</option>
                </select>
              </div>
            </div>

            <div className="map-card-wrapper">
              <BiomassMap
                center={profile ? [profile.latitude, profile.longitude] : [30.9100, 75.8700]}
                selectedBuyer={profile}
                buyers={profile ? [profile] : []}
                farms={nearbyFarms}
                radiusKm={radiusKm}
                height="500px"
              />
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>🏭 Facility location + <strong>{nearbyFarms.length}</strong> supplier farms mapped</span>
              <span>⚡ Haversine geodesic routing</span>
            </div>
          </div>

          {/* Demand Distribution Chart */}
          <div id="section-analytics" className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <TrendingUp size={20} color="var(--emerald-400)" />
              <span>{t('demandAllocation')}</span>
            </h3>
            <div style={{ height: '220px', display: 'flex', justifyContent: 'center' }}>
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } }
                    }
                  }
                }}
              />
            </div>
          </div>

        </div>

      </div>

      {/* Buyer Profile Setup Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              {profile ? t('editProfile') : t('setupProfile')}
            </h2>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Configure your industrial biomass processing plant, factory GPS coordinates, and procurement contacts.
            </p>

            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label className="form-label">{t('companyName')}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Satluj Bio-Ethanol Refinery"
                  value={profileForm.company_name}
                  onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('plantLatitude')}</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control"
                    value={profileForm.latitude}
                    onChange={(e) => setProfileForm({ ...profileForm, latitude: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('plantLongitude')}</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control"
                    value={profileForm.longitude}
                    onChange={(e) => setProfileForm({ ...profileForm, longitude: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('contact')}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. procurement@satlujbio.com, +91 98765 43210"
                  value={profileForm.contact_information}
                  onChange={(e) => setProfileForm({ ...profileForm, contact_information: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowProfileModal(false)}
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Biomass Demand Modal */}
      {showDemandModal && (
        <div className="modal-overlay" onClick={() => setShowDemandModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t('postDemand')}</h2>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Publish your biomass demand to the matching engine to connect with nearby agricultural farms.
            </p>

            <form onSubmit={handleCreateDemand}>
              <div className="form-group">
                <label className="form-label">{t('biomassType')}</label>
                <select
                  className="form-control"
                  value={newDemand.biomass_type}
                  onChange={(e) => setNewDemand({ ...newDemand, biomass_type: e.target.value })}
                >
                  {crops.map((c) => (
                    <option key={c.id} value={c.crop_name}>
                      {c.crop_name} (Residue ratio: {c.residue_ratio}x)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('quantity')}</label>
                  <input
                    type="number"
                    step="10"
                    className="form-control"
                    value={newDemand.required_quantity}
                    onChange={(e) => setNewDemand({ ...newDemand, required_quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('offeredPrice')}</label>
                  <input
                    type="number"
                    step="50"
                    className="form-control"
                    value={newDemand.offered_price}
                    onChange={(e) => setNewDemand({ ...newDemand, offered_price: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('startDate')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newDemand.procurement_start}
                    onChange={(e) => setNewDemand({ ...newDemand, procurement_start: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('endDate')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newDemand.procurement_end}
                    onChange={(e) => setNewDemand({ ...newDemand, procurement_end: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDemandModal(false)}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-warning"
                  disabled={submittingDemand}
                >
                  {submittingDemand ? t('publishing') : t('publish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
