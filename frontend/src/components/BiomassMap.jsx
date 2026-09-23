import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';

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
        background: #326447;
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(35, 75, 53, 0.38);
        color: white;
        font-size: ${isSelected ? '18px' : '14px'};
        transition: all 0.3s ease;
      ">
        ◆
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
        background: #a96f13;
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(169, 111, 19, 0.35);
        color: white;
        font-size: ${isSelected ? '18px' : '14px'};
        transition: all 0.3s ease;
      ">
        ●
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
  const { t } = useTranslation();
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
        
        {/* OpenStreetMap tile layer (free, no API key required) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Optional Radius Ring */}
        {radiusKm && selectedFarm && (
          <Circle
            center={[selectedFarm.latitude, selectedFarm.longitude]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#326447',
              fillColor: '#326447',
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
              color: '#a96f13',
              fillColor: '#a96f13',
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
                    <strong style={{ fontSize: '1rem', color: '#234b35' }}>{farm.farm_name}</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>
                    {farm.district}, {farm.state}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    <strong>{t('areaLabel')}</strong> {farm.area} ha
                  </div>
                  {(farm.farm_crops || farm.crops) && (farm.farm_crops || farm.crops).length > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '0.8rem', background: '#e4eee2', padding: '4px 6px', borderRadius: '6px', color: '#234b35' }}>
                      {t('crops')} {(farm.farm_crops || farm.crops).map(c => c.crop?.crop_name || `Crop #${c.crop_id}`).join(', ')}
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
                    <strong style={{ fontSize: '1rem', color: '#684b35' }}>{buyer.company_name}</strong>
                  </div>
                  {buyer.distance_km !== undefined && (
                    <div style={{ fontSize: '0.85rem', color: '#a96f13', fontWeight: '600' }}>
                      {t('distance')} {buyer.distance_km} km
                    </div>
                  )}
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                    {buyer.contact_information || t('noContact')}
                  </div>
                  {buyer.demands && buyer.demands.length > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '0.8rem', background: '#f8e8bd', padding: '4px 6px', borderRadius: '6px', color: '#76500d' }}>
                      {t('activeDemand')} {buyer.demands[0].required_quantity} MT {buyer.demands[0].biomass_type}
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
        background: 'rgba(255, 253, 248, 0.94)',
        padding: '8px 12px',
        borderRadius: '10px',
        border: '1px solid #d8ceb9',
        display: 'flex',
        gap: '12px',
        fontSize: '0.75rem',
        color: '#20251f'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#326447', display: 'inline-block' }}></span>
          <span>{t('mapFarms')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#a96f13', display: 'inline-block' }}></span>
          <span>{t('mapBuyers')}</span>
        </div>
      </div>
    </div>
  );
}
