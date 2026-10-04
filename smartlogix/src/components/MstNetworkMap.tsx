import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { KruskalNode, KruskalEdge } from '../algorithms/kruskal';
import { Network, MapPin, Building2, Layers } from 'lucide-react';

const createWarehouseIcon = (name: string) => {
  return L.divIcon({
    className: 'custom-wh-marker',
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
        border: 2px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-weight: 800;
        font-size: 11px;
      " title="${name}">
        WH
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const createLocationIcon = (label: string, name: string) => {
  return L.divIcon({
    className: 'custom-stop-marker',
    html: `
      <div style="
        background: #d97706;
        color: #ffffff;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 3px 8px rgba(0,0,0,0.25);
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-weight: 700;
        font-size: 10px;
      " title="${name}">
        ${label}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13]
  });
};

function MapBoundsController({ bounds, defaultCenter }: { bounds: L.LatLngBounds | null; defaultCenter: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true });
      } else {
        map.setView(defaultCenter, 12);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [map, bounds, defaultCenter]);

  return null;
}

export interface MstNetworkMapProps {
  nodes: KruskalNode[];
  mstEdges: KruskalEdge[];
  className?: string;
  height?: string;
}

export const MstNetworkMap: React.FC<MstNetworkMapProps> = ({
  nodes,
  mstEdges,
  className = '',
  height = '400px'
}) => {
  // Map of nodes by ID for coordinate lookup
  const nodeCoordsMap = useMemo(() => {
    const map = new Map<string, [number, number]>();
    for (const node of nodes) {
      if (typeof node.latitude === 'number' && typeof node.longitude === 'number' && !isNaN(node.latitude) && !isNaN(node.longitude)) {
        map.set(node.id, [node.latitude, node.longitude]);
      }
    }
    return map;
  }, [nodes]);

  // Compute bounding box
  const { bounds, defaultCenter } = useMemo(() => {
    const coords = Array.from(nodeCoordsMap.values());
    if (coords.length === 0) {
      return { bounds: null, defaultCenter: [12.9716, 77.5946] as [number, number] };
    }

    const latLngs = coords.map(([lat, lng]) => L.latLng(lat, lng));
    const b = L.latLngBounds(latLngs);
    const center: [number, number] = [b.getCenter().lat, b.getCenter().lng];
    return { bounds: b, defaultCenter: center };
  }, [nodeCoordsMap]);

  // Build edge coordinate paths
  const plottedEdges = useMemo(() => {
    return mstEdges.map((edge) => {
      const fromCoord = nodeCoordsMap.get(edge.from);
      const toCoord = nodeCoordsMap.get(edge.to);
      return {
        edge,
        hasCoords: !!(fromCoord && toCoord),
        positions: fromCoord && toCoord ? [fromCoord, toCoord] as [number, number][] : []
      };
    }).filter(e => e.hasCoords);
  }, [mstEdges, nodeCoordsMap]);

  if (nodeCoordsMap.size === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-brand-surface/40 border border-brand-border rounded-xl text-brand-text-secondary ${className}`} style={{ height }}>
        <Network className="w-8 h-8 text-brand-text-secondary/60 mb-2" />
        <p className="text-xs font-semibold">Location coordinates are unavailable for visual map plotting.</p>
        <p className="text-[11px] text-brand-text-secondary mt-1">Review the tabular MST edges and distances below.</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-brand-border shadow-sm ${className}`} style={{ height }}>
      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-brand-border text-xs font-semibold text-brand-text flex items-center gap-2 shadow-sm">
        <Network className="w-4 h-4 text-emerald-600" />
        <span>Logistics Network Spanning Tree ({plottedEdges.length} Visual Edges)</span>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsController bounds={bounds} defaultCenter={defaultCenter} />

        {/* MST Backbone Polylines */}
        {plottedEdges.map(({ edge, positions }, idx) => (
          <Polyline
            key={`mst-edge-${edge.from}-${edge.to}-${idx}`}
            positions={positions}
            pathOptions={{
              color: '#059669',
              weight: 4,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          >
            <Popup>
              <div className="p-2 space-y-1 text-xs">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>MST Backbone Edge</span>
                </div>
                <div className="text-brand-text font-semibold">
                  {edge.fromName} ↔ {edge.toName}
                </div>
                <div className="text-brand-text-secondary font-mono text-[11px]">
                  Segment Distance: <span className="font-bold text-brand-dark">{edge.weight} km</span>
                </div>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Node Markers */}
        {nodes.map((node, idx) => {
          const coord = nodeCoordsMap.get(node.id);
          if (!coord) return null;

          const isWarehouse = node.type === 'warehouse';
          const icon = isWarehouse
            ? createWarehouseIcon(node.name)
            : createLocationIcon(String(idx), node.name);

          return (
            <Marker key={node.id} position={coord} icon={icon}>
              <Popup>
                <div className="p-2 space-y-1 text-xs">
                  <div className="font-bold text-brand-text flex items-center gap-1.5">
                    {isWarehouse ? (
                      <Building2 className="w-3.5 h-3.5 text-brand-primary" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>{node.name}</span>
                  </div>
                  <div className="text-[11px] text-brand-text-secondary">
                    {isWarehouse ? 'Central Warehouse Hub (Depot)' : `Delivery Location Stop #${idx}`}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
