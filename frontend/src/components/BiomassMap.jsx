import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

// Component to handle recentering map when center coordinate changes
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 11);
    }
  }, [center, zoom, map]);
  return null;
}

// Custom DivIcons using HTML + SVG for crispy, foolproof rendering without asset path issues
const createFarmIcon = (isSelected = false) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        width: ${isSelected ? '38px' : '30px'};
        height: ${isSelected ? '38px' : '30px'};
        background: linear-gradient(135deg, #10b981, #047857);
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.6);
        color: white;
        font-size: ${isSelected ? '18px' : '14px'};
        transition: all 0.3s ease;
      ">
        🌱
      </div>
    `,
    iconSize: isSelected ? [38, 38] : [30, 30],
    iconAnchor: isSelected ? [19, 19] : [15, 15],
    popupAnchor: [0, -18]
  });
};

const createBuyerIcon = (isSelected = false) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        width: ${isSelected ? '38px' : '30px'};
        height: ${isSelected ? '38px' : '30px'};
        background: linear-gradient(135deg, #f59e0b, #d97706);
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(245, 158, 11, 0.6);
        color: white;
        font-size: ${isSelected ? '18px' : '14px'};
        transition: all 0.3s ease;
      ">
        🏭
      </div>
    `,
    iconSize: isSelected ? [38, 38] : [30, 30],
    iconAnchor: isSelected ? [19, 19] : [15, 15],
    popupAnchor: [0, -18]
  });
};

export default function BiomassMap({
  center = [30.9002, 75.8572], // Default Ludhiana, Punjab
  zoom = 10,
  farms = [],
  buyers = [],
  selectedFarm = null,
  selectedBuyer = null,
  radiusKm = null,
  height = "420px"
}) {
  const mapCenter = selectedFarm 
    ? [selectedFarm.latitude, selectedFarm.longitude] 
    : (selectedBuyer ? [selectedBuyer.latitude, selectedBuyer.longitude] : center);

  return (
    <div style={{ width: '100%', height, position: 'relative', borderRadius: '16px', overflow: 'hidden' }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeView center={mapCenter} zoom={zoom} />
        
        {/* Modern dark carto tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Optional Radius Ring */}
        {radiusKm && selectedFarm && (
          <Circle
            center={[selectedFarm.latitude, selectedFarm.longitude]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: '4, 8'
            }}
          />
        )}

        {radiusKm && selectedBuyer && (
          <Circle
            center={[selectedBuyer.latitude, selectedBuyer.longitude]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#f59e0b',
              fillColor: '#f59e0b',
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: '4, 8'
            }}
          />
        )}

        {/* Render Farms */}
        {farms.map((farm) => {
          if (!farm.latitude || !farm.longitude) return null;
          const isSelected = selectedFarm && selectedFarm.id === farm.id;
          return (
            <Marker
              key={`farm-${farm.id}`}
              position={[farm.latitude, farm.longitude]}
              icon={createFarmIcon(isSelected)}
            >
              <Popup>
                <div style={{ color: '#0f172a', padding: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.1rem' }}>🌱</span>
                    <strong style={{ fontSize: '1rem', color: '#065f46' }}>{farm.farm_name}</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>
                    📍 {farm.district}, {farm.state}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    <strong>Area:</strong> {farm.area} ha
                  </div>
                  {(farm.farm_crops || farm.crops) && (farm.farm_crops || farm.crops).length > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '0.8rem', background: '#ecfdf5', padding: '4px 6px', borderRadius: '6px', color: '#047857' }}>
                      Crops: {(farm.farm_crops || farm.crops).map(c => c.crop?.crop_name || `Crop #${c.crop_id}`).join(', ')}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render Buyers */}
        {buyers.map((buyer) => {
          if (!buyer.latitude || !buyer.longitude) return null;
          const isSelected = selectedBuyer && selectedBuyer.id === buyer.id;
          return (
            <Marker
              key={`buyer-${buyer.id}`}
              position={[buyer.latitude, buyer.longitude]}
              icon={createBuyerIcon(isSelected)}
            >
              <Popup>
                <div style={{ color: '#0f172a', padding: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.1rem' }}>🏭</span>
                    <strong style={{ fontSize: '1rem', color: '#92400e' }}>{buyer.company_name}</strong>
                  </div>
                  {buyer.distance_km !== undefined && (
                    <div style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: '600' }}>
                      🚀 Distance: {buyer.distance_km} km
                    </div>
                  )}
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                    📞 {buyer.contact_information || 'No contact provided'}
                  </div>
                  {buyer.demands && buyer.demands.length > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '0.8rem', background: '#fffbeb', padding: '4px 6px', borderRadius: '6px', color: '#b45309' }}>
                      Active Demand: {buyer.demands[0].required_quantity} MT of {buyer.demands[0].biomass_type}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend overlay */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        zIndex: 500,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        padding: '8px 12px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: '12px',
        fontSize: '0.75rem',
        color: '#f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          <span>Farms / Supply</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
          <span>Buyers / Industry</span>
        </div>
      </div>
    </div>
  );
}
