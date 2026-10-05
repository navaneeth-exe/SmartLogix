import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Warehouse as WarehouseIcon,
  AlertTriangle,
  Compass,
  Info,
  Maximize2,
  Minimize2,
  Layers,
  Zap
} from 'lucide-react';
import type { DeliveryPlan, RouteStop, Warehouse, DeliveryLocation } from '../types/database.types';

// Create custom DOM DivIcons for stops with memoized cache
const routeIconCache = new Map<string, L.DivIcon>();

const getRouteIcon = (key: string, factory: () => L.DivIcon): L.DivIcon => {
  const existing = routeIconCache.get(key);
  if (existing) return existing;
  const created = factory();
  routeIconCache.set(key, created);
  return created;
};

const createWarehouseIcon = (label: string = 'WH', isReturn: boolean = false) => {
  const cacheKey = `wh-${label}-${isReturn}`;
  return getRouteIcon(cacheKey, () => L.divIcon({
    className: 'custom-warehouse-marker',
    html: `
      <div style="
        background: ${isReturn ? '#064e3b' : '#154734'};
        color: #ffffff;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-weight: 800;
        font-size: 11px;
        letter-spacing: -0.5px;
        cursor: pointer;
      ">
        ${isReturn ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>' : label}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  }));
};

const createDeliveryStopIcon = (sequence: number) => {
  const cacheKey = `stop-${sequence}`;
  return getRouteIcon(cacheKey, () => L.divIcon({
    className: 'custom-stop-marker',
    html: `
      <div style="
        background: #d97706;
        color: #ffffff;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid #ffffff;
        box-shadow: 0 3px 10px rgba(0,0,0,0.28);
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-weight: 800;
        font-size: 12px;
        cursor: pointer;
      ">
        ${sequence}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  }));
};

// Map Viewport Controller to handle auto-fit bounds and modal resize
interface MapControllerProps {
  bounds: L.LatLngBounds | null;
  defaultCenter: [number, number];
}

function MapController({ bounds, defaultCenter }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    // Invalidate map size to handle modal transitions smoothly
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [45, 45],
          maxZoom: 14,
          animate: true
        });
      } else {
        map.setView(defaultCenter, 11);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [map, bounds, defaultCenter]);

  return null;
}

interface PlottedStop {
  stop: RouteStop;
  lat: number;
  lng: number;
  isDepot: boolean;
  isReturn: boolean;
  associatedOrders: string[];
}

export interface RouteMapProps {
  plan: DeliveryPlan;
  allLocations?: DeliveryLocation[];
  allWarehouses?: Warehouse[];
  className?: string;
  height?: string;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  plan,
  allLocations = [],
  allWarehouses = [],
  className = '',
  height = '420px'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 1. Resolve coordinates for every stop in the saved Phase 10 route
  const { plottedStops, missingStops, defaultCenter } = useMemo(() => {
    if (!plan.route_stops || plan.route_stops.length === 0) {
      return { plottedStops: [], missingStops: [], defaultCenter: [40.7128, -74.0060] as [number, number] };
    }

    // Build lookup maps by stable location ID
    const locMap = new Map<string, DeliveryLocation>();
    allLocations.forEach(l => locMap.set(l.id, l));

    const whMap = new Map<string, Warehouse>();
    allWarehouses.forEach(w => whMap.set(w.id, w));
    if (plan.warehouse) {
      whMap.set(plan.warehouse.id, plan.warehouse);
    }

    // Also extract delivery locations from plan orders
    plan.delivery_plan_orders?.forEach(dpo => {
      if (dpo.order?.delivery_location) {
        locMap.set(dpo.order.delivery_location.id, dpo.order.delivery_location);
      }
    });

    // Map orders to location IDs for popup details
    const ordersByLocation = new Map<string, string[]>();
    plan.delivery_plan_orders?.forEach(dpo => {
      const locId = dpo.order?.delivery_location_id;
      const orderNum = dpo.order?.order_number;
      if (locId && orderNum) {
        const list = ordersByLocation.get(locId) || [];
        list.push(orderNum);
        ordersByLocation.set(locId, list);
      }
    });

    const plotted: PlottedStop[] = [];
    const missing: RouteStop[] = [];

    plan.route_stops.forEach(stop => {
      let lat: number | null = stop.latitude ?? null;
      let lng: number | null = stop.longitude ?? null;

      // Stable lookup if not attached directly to stop
      if (lat === null || lng === null) {
        if (stop.type === 'warehouse' || stop.locationId === plan.warehouse_id) {
          const wh = whMap.get(stop.locationId) || plan.warehouse;
          if (wh?.latitude != null && wh?.longitude != null) {
            lat = Number(wh.latitude);
            lng = Number(wh.longitude);
          }
        } else {
          const loc = locMap.get(stop.locationId);
          if (loc?.latitude != null && loc?.longitude != null) {
            lat = Number(loc.latitude);
            lng = Number(loc.longitude);
          }
        }
      }

      // Strict coordinate boundary validation (-90..90, -180..180, not NaN)
      const isValid =
        lat !== null &&
        lng !== null &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        !(lat === 0 && lng === 0);

      if (isValid) {
        const isDepot = stop.type === 'warehouse';
        const isReturn = isDepot && stop.sequence > 1;
        plotted.push({
          stop,
          lat: lat as number,
          lng: lng as number,
          isDepot,
          isReturn,
          associatedOrders: ordersByLocation.get(stop.locationId) || []
        });
      } else {
        missing.push(stop);
      }
    });

    // Determine initial center
    let center: [number, number] = [40.7128, -74.0060];
    if (plotted.length > 0) {
      center = [plotted[0].lat, plotted[0].lng];
    } else if (plan.warehouse?.latitude && plan.warehouse?.longitude) {
      center = [Number(plan.warehouse.latitude), Number(plan.warehouse.longitude)];
    }

    return { plottedStops: plotted, missingStops: missing, defaultCenter: center };
  }, [plan, allLocations, allWarehouses]);

  // 2. Generate polyline positions in exact Phase 10 visiting sequence
  const polylinePositions = useMemo(() => {
    return plottedStops.map(s => [s.lat, s.lng] as [number, number]);
  }, [plottedStops]);

  // 3. Calculate bounding box for auto-fitting
  const bounds = useMemo(() => {
    if (polylinePositions.length === 0) return null;
    return L.latLngBounds(polylinePositions.map(p => L.latLng(p[0], p[1])));
  }, [polylinePositions]);

  // If plan has no route generated yet
  if (!plan.route_stops || plan.route_stops.length === 0) {
    return (
      <div className={`p-6 rounded-xl border border-brand-border bg-brand-surface/60 text-center ${className}`}>
        <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-3 text-brand-dark">
          <Compass className="w-6 h-6 text-brand-primary" />
        </div>
        <h4 className="text-sm font-bold text-brand-text mb-1">No Route Available For Mapping</h4>
        <p className="text-xs text-brand-text-secondary max-w-md mx-auto">
          Generate an optimized route in Phase 10 above using <strong>Branch & Bound</strong> or <strong>Greedy Nearest Neighbor</strong> to display stops and visiting order on this map.
        </p>
      </div>
    );
  }

  const mapContainerHeight = isExpanded ? '600px' : height;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Route Map Header & Summary Card */}
      <div className="bg-brand-surface/80 p-3.5 rounded-xl border border-brand-border/80 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary flex-shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-brand-text font-mono">
                {plan.plan_number}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-soft text-brand-dark flex items-center gap-1">
                {plan.route_algorithm === 'BRANCH_AND_BOUND' ? (
                  <>
                    <Layers className="w-3 h-3 text-emerald-700" />
                    Branch & Bound (Exact Tour)
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 text-amber-700" />
                    Greedy Heuristic
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] text-brand-text-secondary mt-0.5">
              Visual sequence of <strong>{plan.route_stops.length} stops</strong> ({plottedStops.length} mapped)
            </p>
          </div>
        </div>

        {/* Total Matrix Distance Badge */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-brand-text-secondary block">
              DAA Matrix Distance
            </span>
            <span className="text-base font-extrabold text-brand-primary font-mono">
              {plan.route_distance ?? 'N/A'} <span className="text-xs font-semibold">km</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse Map' : 'Expand Map'}
            className="p-2 rounded-lg border border-brand-border bg-white text-brand-text hover:bg-brand-surface transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Missing Coordinates Warning Banner */}
      {missingStops.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Missing Coordinates Notice:</span> The following {missingStops.length} stop(s) do not have valid latitude/longitude coordinates configured and are omitted from map visualization:
            <ul className="list-disc list-inside mt-1 font-medium text-[11px] text-amber-800">
              {missingStops.map(s => (
                <li key={s.sequence}>
                  Stop #{s.sequence}: {s.name} ({s.type === 'warehouse' ? 'Warehouse Depot' : 'Delivery Stop'})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative rounded-xl overflow-hidden border border-brand-border shadow-xs isolate bg-stone-100">
        <div style={{ height: mapContainerHeight, width: '100%' }}>
          <MapContainer
            center={defaultCenter}
            zoom={11}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            {/* OpenStreetMap Standard Tiles */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Auto-Fit Bounds Controller */}
            <MapController bounds={bounds} defaultCenter={defaultCenter} />

            {/* Visual Route Polyline connecting stops in exact Phase 10 order */}
            {polylinePositions.length > 1 && (
              <Polyline
                positions={polylinePositions}
                pathOptions={{
                  color: '#154734',
                  weight: 3.5,
                  opacity: 0.85,
                  dashArray: '6, 8',
                  lineJoin: 'round'
                }}
              />
            )}

            {/* Numbered Stops and Depot Markers */}
            {plottedStops.map((item, idx) => {
              const isWarehouse = item.isDepot;
              const isReturn = item.isReturn;
              const icon = isWarehouse
                ? createWarehouseIcon('WH', isReturn)
                : createDeliveryStopIcon(item.stop.sequence);

              return (
                <Marker
                  key={`${item.stop.locationId}-${item.stop.sequence}-${idx}`}
                  position={[item.lat, item.lng]}
                  icon={icon}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-1 min-w-[200px] text-xs font-sans">
                      {/* Stop Sequence Header */}
                      <div className="flex items-center justify-between border-b border-stone-200 pb-1.5 mb-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isWarehouse
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {isWarehouse
                            ? isReturn
                              ? `Stop #${item.stop.sequence} (Return Depot)`
                              : `Stop #${item.stop.sequence} (Origin Depot)`
                            : `Stop #${item.stop.sequence} (Delivery)`}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {item.lat.toFixed(4)}°, {item.lng.toFixed(4)}°
                        </span>
                      </div>

                      {/* Location Name & Address */}
                      <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1">
                        {isWarehouse ? (
                          <WarehouseIcon className="w-3.5 h-3.5 text-emerald-800" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        {item.stop.name}
                      </h4>
                      {item.stop.address && (
                        <p className="text-stone-600 text-[11px] mt-0.5">{item.stop.address}</p>
                      )}

                      {/* Associated Orders */}
                      {!isWarehouse && (
                        <div className="mt-2 pt-1.5 border-t border-stone-100 bg-stone-50 p-1.5 rounded">
                          <span className="text-[10px] font-bold text-stone-700 block mb-0.5">
                            Customer Orders ({item.associatedOrders.length || item.stop.ordersCount || 1}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {item.associatedOrders.length > 0 ? (
                              item.associatedOrders.map((ordNum, oIdx) => (
                                <span
                                  key={oIdx}
                                  className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-[10px] font-mono text-stone-800"
                                >
                                  {ordNum}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-stone-500">
                                {item.stop.ordersCount ?? 1} consolidated order(s)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* On-Map Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs p-2.5 rounded-lg border border-brand-border/70 shadow-sm text-[11px] z-[500] space-y-1.5 pointer-events-auto">
          <div className="flex items-center gap-2 font-semibold text-brand-text">
            <span className="w-3.5 h-3.5 rounded-full bg-[#154734] border border-white flex items-center justify-center text-[8px] text-white font-bold">
              WH
            </span>
            <span>Depot Warehouse</span>
          </div>
          <div className="flex items-center gap-2 font-semibold text-brand-text">
            <span className="w-3.5 h-3.5 rounded-full bg-[#d97706] border border-white flex items-center justify-center text-[8px] text-white font-bold">
              1
            </span>
            <span>Delivery Stop (Visiting Order)</span>
          </div>
          <div className="flex items-center gap-2 text-brand-text-secondary text-[10px] pt-1 border-t border-brand-border/40">
            <span className="w-4 h-0.5 border-b-2 border-dashed border-[#154734]"></span>
            <span>Phase 10 Sequence Connection</span>
          </div>
        </div>
      </div>

      {/* Algorithmic & Road Distance Disclaimer */}
      <div className="text-[11px] text-brand-text-secondary bg-brand-surface/60 p-2.5 rounded-lg border border-brand-border/60 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-brand-primary flex-shrink-0 mt-0.5" />
        <span>
          <strong>Route Specification:</strong> Markers and connection line reflect the exact visiting sequence saved by Phase 10. The line provides a visual sequence between stops and does not represent real-time driving turn-by-turn directions. Total distance (<strong>{plan.route_distance ?? 0} km</strong>) is retrieved directly from the configured DAA distance matrix.
        </span>
      </div>
    </div>
  );
};
