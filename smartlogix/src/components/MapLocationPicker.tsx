import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, X, Check } from 'lucide-react';
import { Badge } from './ui/Badge';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

interface MapLocationPickerProps {
  value?: { latitude: number | null; longitude: number | null } | null;
  onChange: (coords: LocationCoordinates | null) => void;
  label?: string;
  markerType?: 'warehouse' | 'location';
  required?: boolean;
  height?: string;
  disabled?: boolean;
  defaultCenter?: [number, number];
}

// Custom Leaflet Icons (Singleton Instances for Performance)
const whPickerIcon = L.divIcon({
  className: 'custom-picker-pin',
  html: `
    <div style="
      background: #154734;
      color: #ffffff;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-weight: 800;
      font-size: 11px;
      cursor: grab;
    ">
      WH
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

const locPickerIcon = L.divIcon({
  className: 'custom-picker-pin',
  html: `
    <div style="
      background: #0284c7;
      color: #ffffff;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-weight: 800;
      font-size: 11px;
      cursor: grab;
    ">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

const createPickerIcon = (type: 'warehouse' | 'location') => {
  return type === 'warehouse' ? whPickerIcon : locPickerIcon;
};

// Map Subcomponent: handles clicks to place pin
function MapClickHandler({ 
  onPick, 
  disabled 
}: { 
  onPick: (lat: number, lng: number) => void; 
  disabled?: boolean;
}) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onPick(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
    }
  });
  return null;
}

// Map Subcomponent: handles modal resizing and center synchronization
function MapController({ 
  coords, 
  defaultCenter 
}: { 
  coords: LocationCoordinates | null; 
  defaultCenter?: [number, number];
}) {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    // Invalidate size across mount delays (critical for modal dialogs)
    const t1 = setTimeout(() => map.invalidateSize(), 60);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  useEffect(() => {
    if (coords && !hasCenteredRef.current) {
      map.setView([coords.latitude, coords.longitude], Math.max(map.getZoom(), 12));
      hasCenteredRef.current = true;
    } else if (!coords && defaultCenter && !hasCenteredRef.current) {
      map.setView(defaultCenter, map.getZoom());
    }
  }, [map, coords, defaultCenter]);

  return null;
}



export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  value,
  onChange,
  label = 'Geographic Location',
  markerType = 'location',
  required = false,
  height = '240px',
  disabled = false,
  defaultCenter = [40.7128, -74.0060] // New York metropolitan default
}) => {
  const currentCoords: LocationCoordinates | null = useMemo(() => {
    if (value && value.latitude !== null && value.longitude !== null && !isNaN(value.latitude) && !isNaN(value.longitude)) {
      return {
        latitude: Number(value.latitude),
        longitude: Number(value.longitude)
      };
    }
    return null;
  }, [value]);

  const mapCenter: [number, number] = currentCoords 
    ? [currentCoords.latitude, currentCoords.longitude] 
    : defaultCenter;

  const markerIcon = useMemo(() => createPickerIcon(markerType), [markerType]);

  const handlePointSelect = (lat: number, lng: number) => {
    onChange({ latitude: lat, longitude: lng });
  };

  return (
    <div className="space-y-2">
      {/* Header & Status Indicator */}
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-brand-text flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-brand-primary" />
          <span>{label} {required && <span className="text-red-500">*</span>}</span>
        </label>

        {currentCoords ? (
          <div className="flex items-center gap-1.5">
            <Badge variant="success" className="text-[10px] py-0.5 flex items-center gap-1 font-mono">
              <Check className="w-2.5 h-2.5" />
              <span>{currentCoords.latitude.toFixed(4)}°, {currentCoords.longitude.toFixed(4)}°</span>
            </Badge>
            {!required && !disabled && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-stone-400 hover:text-stone-700 p-0.5"
                title="Clear selected coordinates"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <Badge variant="warning" className="text-[10px] py-0.5">
            No pin selected
          </Badge>
        )}
      </div>

      {/* Interactive Map Box */}
      <div 
        className="relative rounded-lg overflow-hidden border border-brand-border bg-stone-100 shadow-inner"
        style={{ height }}
      >
        <MapContainer
          center={mapCenter}
          zoom={currentCoords ? 13 : 11}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController coords={currentCoords} defaultCenter={defaultCenter} />
          <MapClickHandler onPick={handlePointSelect} disabled={disabled} />

          {currentCoords && (
            <Marker
              key={`picker-pin-${currentCoords.latitude}-${currentCoords.longitude}`}
              position={[currentCoords.latitude, currentCoords.longitude]}
              icon={markerIcon}
              draggable={!disabled}
              eventHandlers={{
                drag: (e) => {
                  const marker = e.target;
                  const p = marker.getLatLng();
                  onChange({
                    latitude: parseFloat(p.lat.toFixed(6)),
                    longitude: parseFloat(p.lng.toFixed(6))
                  });
                },
                dragend: (e) => {
                  const marker = e.target;
                  const p = marker.getLatLng();
                  onChange({
                    latitude: parseFloat(p.lat.toFixed(6)),
                    longitude: parseFloat(p.lng.toFixed(6))
                  });
                }
              }}
            />
          )}
        </MapContainer>

        {/* Guidance Overlay Prompt */}
        {!currentCoords && !disabled && (
          <div className="absolute inset-x-3 bottom-3 z-[1000] pointer-events-none">
            <div className="bg-white/95 backdrop-blur-sm border border-brand-border px-3 py-1.5 rounded-lg shadow-sm text-center">
              <p className="text-[11px] font-semibold text-brand-text flex items-center justify-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                Click anywhere on the map to drop the location marker
              </p>
            </div>
          </div>
        )}

        {currentCoords && !disabled && (
          <div className="absolute left-2.5 bottom-2.5 z-[1000] pointer-events-none">
            <span className="bg-stone-900/80 text-white text-[10px] px-2 py-0.5 rounded shadow">
              Drag marker to fine-tune position
            </span>
          </div>
        )}
      </div>

      {/* Coordinate display / verification footer */}
      {currentCoords ? (
        <div className="flex items-center justify-between text-[11px] text-brand-text-secondary px-1 font-mono">
          <span>Lat: <strong>{currentCoords.latitude.toFixed(6)}</strong></span>
          <span>Lng: <strong>{currentCoords.longitude.toFixed(6)}</strong></span>
        </div>
      ) : (
        <p className="text-[11px] text-amber-700 font-medium px-1">
          {required ? 'Please click on the map to set location coordinates.' : 'Optional: Click on the map to capture coordinates.'}
        </p>
      )}
    </div>
  );
};
