import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import BiomassMap from './BiomassMap';
import {
  Leaf,
  Plus,
  Sparkles,
  TrendingUp,
  MapPin,
  DollarSign,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Building,
  Scale,
  Trash2,
  Loader2
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function FarmerDashboard() {
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

  const [farms, setFarms] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Prediction & Matches State
  const [predictionData, setPredictionData] = useState(null);
  const [matchesData, setMatchesData] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [matchingLoading, setMatchingLoading] = useState(false);

  // GIS Nearby Buyers State
  const [nearbyBuyers, setNearbyBuyers] = useState([]);
  const [radiusKm, setRadiusKm] = useState(50);

  // New Farm Modal State
  const [showAddFarmModal, setShowAddFarmModal] = useState(false);
  const [submittingFarm, setSubmittingFarm] = useState(false);
  const [newFarm, setNewFarm] = useState({
    farm_name: '',
    latitude: null,
    longitude: null,
    area: 5.0,
    district: '',
    state: '',
    crop_id: 1,
    season: 'Kharif',
    cultivated_area: 5.0,
    expected_harvest_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  // Location / geocoding state for Add Farm modal
  const [locationQuery, setLocationQuery] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState(null);  // { display_name, lat, lon }
  const [geocodeError, setGeocodeError] = useState('');
  // Delete confirm state: stores the farm id pending confirmation, or null
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch Initial Data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [farmsRes, cropsRes] = await Promise.all([
        api.getFarms(),
        api.getCrops()
      ]);
      setFarms(farmsRes);
      setCrops(cropsRes);

      if (farmsRes && farmsRes.length > 0) {
        const first = farmsRes[0];
        setSelectedFarm(first);
        loadFarmDetails(first.id, first);
      }
    } catch (err) {
      console.error("Failed to load farmer data:", err);
      setError(err.message || 'Failed to load farmer data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadFarmDetails = async (farmId, farmObj) => {
    try {
      setMatchingLoading(true);
      // Fetch latest predictions
      const predRes = await api.getFarmPrediction(farmId).catch(() => null);
      if (predRes && predRes.biomass_prediction) {
        setPredictionData(predRes);
      } else {
        setPredictionData(null);
      }

      // Fetch matching buyers
      const matchRes = await api.getFarmMatches(farmId).catch(() => null);
      setMatchesData(matchRes);

      // Fetch GIS nearby buyers
      const gisRes = await api.getNearbyBuyers(farmId, radiusKm).catch(() => []);
      setNearbyBuyers(gisRes.map(item => ({
        ...item.buyer,
        distance_km: item.distance_km
      })));
    } catch (err) {
      console.error("Error loading farm details:", err);
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleSelectFarm = (farm) => {
    setSelectedFarm(farm);
    loadFarmDetails(farm.id, farm);
  };

  const handleRunPrediction = async () => {
    if (!selectedFarm) return;
    setPredicting(true);
    try {
      const fCrops = selectedFarm.farm_crops || selectedFarm.crops || [];
      const cropId = fCrops.length > 0 ? fCrops[0].crop_id : 1;
      const cultivatedArea = fCrops.length > 0 ? fCrops[0].cultivated_area : selectedFarm.area;
      const harvestDate = fCrops.length > 0 ? fCrops[0].expected_harvest_date : new Date().toISOString().split('T')[0];

      await api.predictBiomass({
        farm_id: selectedFarm.id,
        crop_id: cropId,
        cultivated_area: cultivatedArea,
        expected_harvest_date: harvestDate
      });

      // Reload farm details and matches
      await loadFarmDetails(selectedFarm.id, selectedFarm);
    } catch (err) {
      alert(`Prediction failed: ${err.message}`);
    } finally {
      setPredicting(false);
    }
  };

  const handleRadiusChange = async (newRadius) => {
    setRadiusKm(newRadius);
    if (selectedFarm) {
      try {
        const gisRes = await api.getNearbyBuyers(selectedFarm.id, newRadius);
        setNearbyBuyers(gisRes.map(item => ({
          ...item.buyer,
          distance_km: item.distance_km
        })));
      } catch (err) {
        console.error("Failed to update radius GIS:", err);
      }
    }
  };

  // ── Geocode a typed location via Nominatim (OSM) ──────────────────────────
  const geocodeLocation = async (query) => {
    const q = query.trim();
    if (!q) return;
    setGeocoding(true);
    setGeocodeError('');
    setGeocodeResult(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=in`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'BioPlanAI/1.0 (agricultural-biomass-platform)' }
      });
      if (!res.ok) throw new Error('Geocoding service unavailable');
      const results = await res.json();
      if (!results || results.length === 0) {
        setGeocodeError("Couldn't find that location — try being more specific, e.g. add state name.");
        return;
      }
      const hit = results[0];
      const lat = parseFloat(hit.lat);
      const lon = parseFloat(hit.lon);
      // Auto-extract district / state from address components when available
      const addr = hit.address || {};
      const district = addr.county || addr.district || addr.city || addr.town || addr.village || '';
      const state = addr.state || '';
      setGeocodeResult({ display_name: hit.display_name, lat, lon });
      setNewFarm(prev => ({
        ...prev,
        latitude: lat,
        longitude: lon,
        district: district || prev.district,
        state: state || prev.state
      }));
    } catch (err) {
      setGeocodeError(`Geocoding failed: ${err.message}`);
    } finally {
      setGeocoding(false);
    }
  };

  const resetModal = () => {
    setShowAddFarmModal(false);
    setLocationQuery('');
    setGeocodeResult(null);
    setGeocodeError('');
    setNewFarm({
      farm_name: '',
      latitude: null,
      longitude: null,
      area: 5.0,
      district: '',
      state: '',
      crop_id: 1,
      season: 'Kharif',
      cultivated_area: 5.0,
      expected_harvest_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const handleCreateFarm = async (e) => {
    e.preventDefault();
    if (newFarm.latitude === null || newFarm.longitude === null) {
      setGeocodeError("Please enter a location name and wait for it to be resolved before submitting.");
      return;
    }
    setSubmittingFarm(true);
    try {
      const payload = {
        farm_name: newFarm.farm_name,
        latitude: parseFloat(newFarm.latitude),
        longitude: parseFloat(newFarm.longitude),
        area: parseFloat(newFarm.area),
        district: newFarm.district,
        state: newFarm.state,
        crops: [
          {
            crop_id: parseInt(newFarm.crop_id),
            season: newFarm.season,
            cultivated_area: parseFloat(newFarm.cultivated_area),
            expected_harvest_date: newFarm.expected_harvest_date
          }
        ]
      };

      const created = await api.createFarm(payload);
      resetModal();

      // Refresh data
      await fetchData();
      setSelectedFarm(created);
      loadFarmDetails(created.id, created);
    } catch (err) {
      alert(`Failed to create farm: ${err.message}`);
    } finally {
      setSubmittingFarm(false);
    }
  };

  // ── Delete farm ────────────────────────────────────────────────────────────
  const handleDeleteFarm = async (farmId) => {
    setDeletingId(farmId);
    try {
      await api.deleteFarm(farmId);
      // Remove from local state immediately for instant UI feedback
      const remaining = farms.filter(f => f.id !== farmId);
      setFarms(remaining);
      if (selectedFarm?.id === farmId) {
        const next = remaining[0] || null;
        setSelectedFarm(next);
        setPredictionData(null);
        setMatchesData(null);
        setNearbyBuyers([]);
        if (next) loadFarmDetails(next.id, next);
      }
    } catch (err) {
      alert(`Failed to delete farm: ${err.message}`);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // Compute Total Metrics
  const totalFarms = farms.length;
  const totalBiomass = farms.reduce((acc, f) => {
    const b = f.biomass_predictions?.[0]?.biomass_quantity || 0;
    return acc + b;
  }, 0);
  const bestMatch = matchesData?.matches?.[0] || null;

  // Chart Data
  const chartData = {
    labels: farms.map(f => f.farm_name),
    datasets: [
      {
        label: t('area'),
        data: farms.map(f => f.area),
        backgroundColor: 'rgba(104, 75, 53, 0.72)',
        borderRadius: 6
      },
      {
        label: t('totalBiomass'),
        data: farms.map(f => f.biomass_predictions?.[0]?.biomass_quantity || 0),
        backgroundColor: 'rgba(50, 100, 71, 0.78)',
        borderRadius: 6
      }
    ]
  };

  return (
    <div id="section-overview" style={{ paddingBottom: '2rem' }}>
      {/* Top Banner & Quick Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>{t('farmerDashboard')}</span>
            <span className="badge badge-emerald">{t('activeSupply')}</span>
          </h1>
          <p>{t('farmerManageDesc')}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddFarmModal(true)}
        >
          <Plus size={18} />
          <span>{t('addFarm')}</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper stat-icon-green">
            <Leaf size={24} />
          </div>
          <div>
            <div className="stat-value">{totalFarms}</div>
            <div className="stat-label">{t('registeredFarms')}</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper stat-icon-amber">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-value">
              {totalBiomass > 0
                ? `${totalBiomass.toFixed(1)} MT`
                : (predictionData?.biomass_prediction?.biomass_quantity
                  ? `${predictionData.biomass_prediction.biomass_quantity.toFixed(1)} MT`
                  : <span title="Run a prediction to see estimates" style={{ cursor: 'help' }}>—</span>)}
            </div>
            <div className="stat-label">{t('totalBiomass')}</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper stat-icon-blue">
            <Building size={24} />
          </div>
          <div>
            <div className="stat-value">{nearbyBuyers.length}</div>
            <div className="stat-label">{t('nearbyBuyers')}</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper stat-icon-purple">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="stat-value">
              {bestMatch?.estimated_profit != null
                ? `₹${bestMatch.estimated_profit.toLocaleString()}`
                : <span title="Run a prediction to see estimates" style={{ cursor: 'help' }}>—</span>}
            </div>
            <div className="stat-label">{t('maxProfit')}</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Farm Explorer & AI Matches      {/* ── Stacked Dashboard Layout ────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        {/* Left Column: Farm Selector & AI Prediction Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Farm Selection List */}
          <div id="section-portfolio" className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={20} color="var(--emerald-400)" />
                <span>{t('farmPortfolio')}</span>
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={fetchData}>
                <RefreshCw size={14} /> {t('refresh')}
              </button>
            </div>

            {farms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                <Leaf size={32} color="var(--emerald-400)" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{t('noFarms')}</div>
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>{t('farmerRegisterDesc')}</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddFarmModal(true)}>
                  <Plus size={16} /> {t('createFarm')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {farms.map((farm) => {
                  const isSelected = selectedFarm?.id === farm.id;
                  const isPendingDelete = confirmDeleteId === farm.id;
                  const isDeleting = deletingId === farm.id;
                  return (
                    <div
                      key={farm.id}
                      onClick={() => !isPendingDelete && handleSelectFarm(farm)}
                      className={`glass-panel glass-card-interactive`}
                      style={{
                        padding: '1rem',
                        border: isSelected ? '2px solid var(--emerald-400)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card)',
                        opacity: isDeleting ? 0.5 : 1,
                        transition: 'opacity 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <strong style={{ fontSize: '1.05rem', color: isSelected ? 'var(--emerald-400)' : 'var(--ink-900)' }}>
                          {farm.farm_name}
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-emerald">{farm.area} ha</span>
                          {/* Delete affordance */}
                          {!isPendingDelete ? (
                            <button
                              className="btn btn-sm"
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(farm.id); }}
                              title="Delete this farm"
                              style={{ padding: '0.25rem 0.45rem', background: 'transparent', border: '1px solid #d4bfa9', color: 'var(--soil-800)', borderRadius: '6px' }}
                              disabled={isDeleting}
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.35rem' }} onClick={e => e.stopPropagation()}>
                              <span style={{ fontSize: '0.75rem', color: '#b43c30', fontWeight: 600, alignSelf: 'center' }}>{t('deleteQ')}</span>
                              <button
                                className="btn btn-sm"
                                onClick={(e) => { e.stopPropagation(); handleDeleteFarm(farm.id); }}
                                style={{ padding: '0.2rem 0.55rem', background: '#b43c30', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem' }}
                                disabled={isDeleting}
                              >
                                {isDeleting ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'Yes'}
                              </button>
                              <button
                                className="btn btn-sm"
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                style={{ padding: '0.2rem 0.55rem', background: 'var(--cream-200)', color: 'var(--ink-700)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '0.75rem' }}
                              >
                                No
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                        <span>📍 {farm.district}, {farm.state}</span>
                        <span>🌐 [{farm.latitude.toFixed(3)}, {farm.longitude.toFixed(3)}]</span>
                      </div>
                      {(farm.farm_crops || farm.crops) && (farm.farm_crops || farm.crops).length > 0 && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {(farm.farm_crops || farm.crops).map((c, i) => (
                            <span key={i} className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                              🌾 {c.crop?.crop_name || `Crop #${c.crop_id}`} ({c.season}) - {c.cultivated_area} ha
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Biomass Prediction Action Card */}
          {selectedFarm && (
            <div id="section-prediction" className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={20} color="var(--emerald-400)" />
                  <span>AI Crop Yield & Biomass Prediction</span>
                </h3>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleRunPrediction}
                  disabled={predicting}
                >
                  {predicting ? (
                    <span>{t('runningMLModel')}</span>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      <span>{t('forecastBiomass')}</span>
                    </>
                  )}
                </button>
              </div>

              {predictionData?.biomass_prediction ? (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('predictedYield')}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--blue-400)' }}>
                        {predictionData.yield_prediction ? `${predictionData.yield_prediction.toFixed(2)} MT/ha` : '4.2 MT/ha'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('residueBiomass')}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--emerald-400)' }}>
                        {predictionData.biomass_prediction.biomass_quantity.toFixed(1)} Metric Tons
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('residueRatio')}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--amber-400)' }}>
                        {predictionData.residue_ratio != null ? `${predictionData.residue_ratio}x` : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('recoveryFactor')}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                        {predictionData.recovery_factor != null ? `${(predictionData.recovery_factor * 100).toFixed(0)}%` : '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                    💡 <em>Formula: Biomass (MT) = Yield (MT/ha) × Cultivated Area ({predictionData.cultivated_area ?? '—'} ha) × Residue Ratio ({predictionData.residue_ratio ?? '—'}) × Recovery ({predictionData.recovery_factor ?? '—'})</em>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                    {t('noPredictionText')}
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={handleRunPrediction} disabled={predicting}>
                    <Sparkles size={16} /> Run Prediction Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI Buyer Matches */}
          {selectedFarm && (
            <div id="section-matches" className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Scale size={20} color="var(--amber-400)" />
                  <span>{t('aiBuyerRecommendations')}</span>
                </h3>
                {matchingLoading && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('computingMatches')}</span>}
              </div>

              {matchesData?.matches && matchesData.matches.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {matchesData.matches.map((match, index) => (
                    <div
                      key={index}
                      className="glass-panel"
                      style={{
                        padding: '1.25rem',
                        background: index === 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-card)',
                        border: index === 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={index === 0 ? "badge badge-amber" : "badge badge-blue"}>
                            {index === 0 ? "🌟 Top Recommendation" : `Rank #${index + 1}`}
                          </span>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--ink-900)' }}>
                            {match.buyer?.company_name || 'Unknown Buyer'}
                          </strong>
                        </div>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          color: match.match_score >= 80 ? 'var(--emerald-400)' : 'var(--amber-400)',
                          background: 'rgba(0,0,0,0.4)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '8px'
                        }}>
                          {match.match_score.toFixed(1)} / 100
                        </div>
                      </div>

                      {/* Economics Breakdown */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('offeredPrice')}</div>
                          <div style={{ fontWeight: 700, color: 'var(--emerald-400)' }}>₹{match.estimated_price?.toLocaleString()}/MT</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('distance')}</div>
                          <div style={{ fontWeight: 700, color: 'var(--ink-900)' }}>{match.distance_km} km</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('transportCost')}</div>
                          <div style={{ fontWeight: 700, color: '#f87171' }}>-₹{match.estimated_transport_cost?.toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Net Profit</div>
                          <div style={{ fontWeight: 800, color: 'var(--amber-400)' }}>₹{match.estimated_profit?.toLocaleString()}</div>
                        </div>
                      </div>

                      {/* Explainability Reason Text */}
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <CheckCircle2 size={16} color="var(--emerald-400)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span><strong>Match Reasoning:</strong> {match.reason_text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No active buyer demands found for the crop types in this farm. Try expanding search or checking back later.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: GIS Leaflet Map & Biomass Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Interactive Leaflet Map */}
          <div id="section-gis" className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={20} color="var(--emerald-400)" />
                <span>Spatial GIS Logistics Map</span>
              </h3>
              
              {/* Radius Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Search Radius:</span>
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
                farms={selectedFarm ? [selectedFarm] : farms}
                buyers={nearbyBuyers}
                selectedFarm={selectedFarm}
                radiusKm={radiusKm}
                height="500px"
              />
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>📍 Showing <strong>{nearbyBuyers.length}</strong> active biomass buyers within {radiusKm}km</span>
              <span>⚡ Haversine real-time geodesic routing</span>
            </div>
          </div>

          {/* Biomass Analytics Chart */}
          <div id="section-analytics" className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <TrendingUp size={20} color="var(--blue-400)" />
              <span>Biomass Output by Registered Farm</span>
            </h3>
            <div style={{ height: '260px' }}>
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: { color: '#475044', font: { family: 'Inter', size: 12 } }
                    }
                  },
                  scales: {
                    x: {
                      ticks: { color: '#697166' }, grid: { color: 'rgba(104,75,53,0.12)' }
                    },
                    y: {
                      ticks: { color: '#697166' }, grid: { color: 'rgba(104,75,53,0.12)' }
                    }
                  }
                }}
              />
            </div>
          </div>

        </div>

      </div>

      {/* New Farm Registration Modal */}
      {showAddFarmModal && (
        <div className="modal-overlay" onClick={resetModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Register New Agricultural Farm</h2>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Enter the farm location by name — coordinates are resolved automatically from OpenStreetMap.
            </p>

            <form onSubmit={handleCreateFarm}>
              <div className="form-group">
                <label className="form-label">Farm Name / Identifier</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ludhiana Golden Fields"
                  value={newFarm.farm_name}
                  onChange={(e) => setNewFarm({ ...newFarm, farm_name: e.target.value })}
                  required
                />
              </div>

              {/* Location field — replaces manual lat/lng inputs */}
              <div className="form-group">
                <label className="form-label">Farm Location</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Ludhiana, Punjab  or  Nashik, Maharashtra"
                    value={locationQuery}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      // Clear previous result when user edits the field
                      setGeocodeResult(null);
                      setGeocodeError('');
                      setNewFarm(prev => ({ ...prev, latitude: null, longitude: null }));
                    }}
                    onBlur={() => geocodeLocation(locationQuery)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => geocodeLocation(locationQuery)}
                    disabled={geocoding || !locationQuery.trim()}
                    title="Locate on map"
                    style={{ flexShrink: 0, padding: '0 0.9rem' }}
                  >
                    {geocoding
                      ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      : <MapPin size={15} />}
                  </button>
                </div>

                {/* Geocoding feedback */}
                {geocoding && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Locating…
                  </div>
                )}
                {geocodeResult && !geocoding && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--forest-700)', background: 'var(--forest-100)', border: '1px solid #b8cfb9', borderRadius: '6px', padding: '0.4rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={13} />
                    <span>📍 Located near: <strong>{geocodeResult.display_name.split(',').slice(0, 3).join(',')}</strong> ({geocodeResult.lat.toFixed(4)}, {geocodeResult.lon.toFixed(4)})</span>
                  </div>
                )}
                {geocodeError && !geocoding && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#b43c30', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.4rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={13} />
                    <span>{geocodeError}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Total Area (ha)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={newFarm.area}
                    onChange={(e) => setNewFarm({ ...newFarm, area: e.target.value, cultivated_area: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">District</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Auto-filled from location"
                    value={newFarm.district}
                    onChange={(e) => setNewFarm({ ...newFarm, district: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Auto-filled from location"
                    value={newFarm.state}
                    onChange={(e) => setNewFarm({ ...newFarm, state: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Crop Information */}
              <div style={{ background: 'rgba(35,75,53,0.07)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', border: '1px solid var(--forest-100)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--forest-700)', marginBottom: '0.75rem' }}>
                  🌾 Planted Crop & Residue Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Crop Type</label>
                    <select
                      className="form-control"
                      value={newFarm.crop_id}
                      onChange={(e) => setNewFarm({ ...newFarm, crop_id: e.target.value })}
                    >
                      {crops.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.crop_name} (Residue: {c.residue_ratio}x)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Growing Season</label>
                    <select
                      className="form-control"
                      value={newFarm.season}
                      onChange={(e) => setNewFarm({ ...newFarm, season: e.target.value })}
                    >
                      <option value="Kharif">Kharif (Monsoon / Autumn)</option>
                      <option value="Rabi">Rabi (Winter / Spring)</option>
                      <option value="Zaid">Zaid (Summer)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Cultivated Area (ha)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={newFarm.cultivated_area}
                      onChange={(e) => setNewFarm({ ...newFarm, cultivated_area: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Expected Harvest Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newFarm.expected_harvest_date}
                      onChange={(e) => setNewFarm({ ...newFarm, expected_harvest_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingFarm || newFarm.latitude === null}
                  title={newFarm.latitude === null ? 'Resolve location first' : ''}
                >
                  {submittingFarm ? 'Registering Farm...' : 'Register Farm & Compute AI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
