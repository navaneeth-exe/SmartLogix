import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  useMap, 
  useMapEvents 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Warehouse as WarehouseIcon, 
  Route, 
  Search, 
  Plus, 
  X, 
  Layers, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  Save, 
  Compass, 
  Move,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import type { 
  Warehouse, 
  DeliveryLocation, 
  DeliveryPlan, 
  RouteStop, 
  LocationDistance,
  RouteOptimizationAlgorithm,
  MatrixLocation
} from '../types/database.types';
import { 
  validateTSPMatrix, 
  solveBranchAndBoundTSP, 
  solveGreedyNearestNeighbor 
} from '../algorithms/tsp';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';

// --- Custom Leaflet DivIcons ---

const createWarehouseIcon = (isSelected: boolean = false, isDraggable: boolean = false) => {
  return L.divIcon({
    className: 'custom-wh-marker',
    html: `
      <div style="
        background: #154734;
        color: #ffffff;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: ${isSelected ? '3px solid #f59e0b' : '2.5px solid #ffffff'};
        box-shadow: ${isSelected ? '0 0 15px rgba(245, 158, 11, 0.7)' : '0 4px 10px rgba(0,0,0,0.3)'};
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-weight: 800;
        font-size: 11px;
        cursor: ${isDraggable ? 'move' : 'pointer'};
        transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
        transition: transform 0.2s ease;
      ">
        WH
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
};

const createLocationIcon = (isActive: boolean = true, isSelected: boolean = false, isDraggable: boolean = false) => {
  const bg = isActive ? '#0284c7' : '#9ca3af';
  return L.divIcon({
    className: 'custom-loc-marker',
    html: `
      <div style="
        background: ${bg};
        color: #ffffff;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: ${isSelected ? '3px solid #f59e0b' : '2px solid #ffffff'};
        box-shadow: ${isSelected ? '0 0 12px rgba(245, 158, 11, 0.7)' : '0 3px 8px rgba(0,0,0,0.25)'};
        cursor: ${isDraggable ? 'move' : 'pointer'};
        transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
        transition: transform 0.2s ease;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -15],
  });
};

const createRouteStopIcon = (seq: number, isWarehouse: boolean = false, isSelected: boolean = false) => {
  const bg = isWarehouse ? '#154734' : '#d97706';
  return L.divIcon({
    className: 'custom-stop-marker',
    html: `
      <div style="
        background: ${bg};
        color: #ffffff;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: ${isSelected ? '3px solid #3b82f6' : '2px solid #ffffff'};
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-weight: 800;
        font-size: 11px;
        cursor: pointer;
        transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
        transition: transform 0.2s ease;
      ">
        ${isWarehouse ? 'WH' : seq}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
};

const createDraftIcon = (type: 'warehouse' | 'delivery_location') => {
  const bg = type === 'warehouse' ? '#154734' : '#0284c7';
  return L.divIcon({
    className: 'custom-draft-marker',
    html: `
      <div style="
        background: ${bg};
        color: #ffffff;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px dashed #ffffff;
        box-shadow: 0 0 15px rgba(2, 132, 199, 0.8);
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-weight: 800;
        font-size: 11px;
        cursor: move;
        animation: pulse 1.5s infinite;
      ">
        NEW
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
};

// --- Map Subcomponents ---

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function MapViewController({ 
  targetCoords, 
  bounds 
}: { 
  targetCoords: [number, number] | null; 
  bounds: L.LatLngBounds | null;
}) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, 14, { duration: 1.2 });
    } else if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, targetCoords, bounds]);

  return null;
}

export const MapWorkspace: React.FC = () => {
  // --- Data State ---
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [plans, setPlans] = useState<DeliveryPlan[]>([]);
  const [distances, setDistances] = useState<LocationDistance[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Map Controls ---
  const [showWarehouses, setShowWarehouses] = useState(true);
  const [showLocations, setShowLocations] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);
  const [targetFlyCoords, setTargetFlyCoords] = useState<[number, number] | null>(null);

  // --- Drawer / Context State ---
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'locations' | 'add'>('plans');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Entities
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<DeliveryLocation | null>(null);
  const [selectedStopSeq, setSelectedStopSeq] = useState<number | null>(null);

  // Editing existing location coordinates
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [editedCoords, setEditedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Adding new location
  const [newLocationCoords, setNewLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newLocationType, setNewLocationType] = useState<'warehouse' | 'delivery_location'>('delivery_location');
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationCode, setNewLocationCode] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  // Route Optimization in Map
  const [optimizingRoute, setOptimizingRoute] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<RouteOptimizationAlgorithm>('BRANCH_AND_BOUND');

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [whData, locData, plansData, distData] = await Promise.all([
        api.warehouses.list(),
        api.locations.list(),
        api.plans.list(),
        api.distances.list()
      ]);
      setWarehouses(whData);
      setLocations(locData);
      setPlans(plansData);
      setDistances(distData);

      // Default select first planned plan if available
      const active = plansData.find(p => p.status === 'PLANNED' && p.route_distance);
      if (active) {
        setSelectedPlanId(active.id);
      } else if (plansData.length > 0) {
        setSelectedPlanId(plansData[0].id);
      }
    } catch (err) {
      console.error('Failed to load map workspace data:', err);
      setFeedback({ type: 'error', text: 'Failed to load logistics network data.' });
    } finally {
      setLoading(false);
    }
  };

  // Selected Plan Object
  const selectedPlan = useMemo(() => {
    return plans.find(p => p.id === selectedPlanId) || null;
  }, [plans, selectedPlanId]);

  // Handle map click to place new location draft pin
  const handleMapClick = (lat: number, lng: number) => {
    // If not actively editing existing location, trigger add location
    if (!isEditingPosition) {
      setNewLocationCoords({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) });
      setSelectedWarehouse(null);
      setSelectedLocation(null);
      setSelectedStopSeq(null);
      setActiveTab('add');
      setDrawerOpen(true);
      setFeedback({
        type: 'success',
        text: `Point selected at ${lat.toFixed(4)}°, ${lng.toFixed(4)}°. Choose type and enter details below.`
      });
    }
  };

  // Save New Location
  const handleSaveNewLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationCoords) return;
    if (!newLocationName.trim()) {
      setFeedback({ type: 'error', text: 'Location name is required.' });
      return;
    }

    try {
      setSavingLocation(true);
      if (newLocationType === 'warehouse') {
        if (!newLocationCode.trim()) {
          setFeedback({ type: 'error', text: 'Warehouse code is required (e.g. WH-04).' });
          return;
        }
        await api.warehouses.create({
          name: newLocationName.trim(),
          code: newLocationCode.trim().toUpperCase(),
          address: newLocationAddress.trim() || undefined,
          latitude: newLocationCoords.lat,
          longitude: newLocationCoords.lng
        });
        setFeedback({ type: 'success', text: `Warehouse "${newLocationName}" added successfully!` });
      } else {
        await api.locations.create({
          name: newLocationName.trim(),
          address: newLocationAddress.trim() || undefined,
          latitude: newLocationCoords.lat,
          longitude: newLocationCoords.lng
        });
        setFeedback({ type: 'success', text: `Delivery location "${newLocationName}" added successfully!` });
      }

      // Reset form & reload
      setNewLocationCoords(null);
      setNewLocationName('');
      setNewLocationCode('');
      setNewLocationAddress('');
      setActiveTab('locations');
      await loadAllData();
    } catch (err: unknown) {
      console.error('Save location error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create location.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setSavingLocation(false);
    }
  };

  // Save Adjusted Location Coordinates
  const handleSaveEditedPosition = async () => {
    if (!editedCoords) return;

    try {
      if (selectedWarehouse) {
        const updatedWh = await api.warehouses.update(selectedWarehouse.id, {
          latitude: editedCoords.lat,
          longitude: editedCoords.lng
        });
        setSelectedWarehouse(updatedWh);
        setWarehouses(prev => prev.map(w => w.id === updatedWh.id ? updatedWh : w));
        setFeedback({ 
          type: 'success', 
          text: `Warehouse "${updatedWh.name}" coordinates saved (${updatedWh.latitude.toFixed(4)}°, ${updatedWh.longitude.toFixed(4)}°).` 
        });
      } else if (selectedLocation) {
        const updatedLoc = await api.locations.update(selectedLocation.id, {
          latitude: editedCoords.lat,
          longitude: editedCoords.lng
        });
        setSelectedLocation(updatedLoc);
        setLocations(prev => prev.map(l => l.id === updatedLoc.id ? updatedLoc : l));
        setFeedback({ 
          type: 'success', 
          text: `Location "${updatedLoc.name}" coordinates saved (${updatedLoc.latitude.toFixed(4)}°, ${updatedLoc.longitude.toFixed(4)}°).` 
        });
      }
      setIsEditingPosition(false);
      setEditedCoords(null);
    } catch (err: unknown) {
      console.error('Update coordinates error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update coordinates.';
      setFeedback({ type: 'error', text: msg });
    }
  };

  // Toggle Delivery Location Active Status
  const handleToggleLocationActive = async (loc: DeliveryLocation) => {
    try {
      await api.locations.toggleActive(loc.id, !loc.is_active);
      setFeedback({ 
        type: 'success', 
        text: `Location "${loc.name}" ${!loc.is_active ? 'activated' : 'deactivated'}.` 
      });
      await loadAllData();
      if (selectedLocation && selectedLocation.id === loc.id) {
        setSelectedLocation({ ...loc, is_active: !loc.is_active });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change status.';
      setFeedback({ type: 'error', text: msg });
    }
  };

  // Generate / Regenerate Route on the Map
  const handleGenerateRoute = async () => {
    if (!selectedPlan) return;
    setFeedback(null);

    try {
      setOptimizingRoute(true);

      // Fetch fresh plan details
      const planDetail = await api.plans.getById(selectedPlan.id);
      if (!planDetail.warehouse) {
        throw new Error('Plan warehouse record not found.');
      }

      // Group distinct delivery locations
      const locsMap = new Map<string, { id: string; name: string; address?: string | null; ordersCount: number }>();
      planDetail.delivery_plan_orders?.forEach(dpo => {
        const loc = dpo.order?.delivery_location;
        if (loc) {
          const existing = locsMap.get(loc.id);
          if (existing) {
            existing.ordersCount += 1;
          } else {
            locsMap.set(loc.id, {
              id: loc.id,
              name: loc.name,
              address: loc.address,
              ordersCount: 1
            });
          }
        }
      });

      const uniqueStops = Array.from(locsMap.values());
      if (uniqueStops.length === 0) {
        throw new Error('This plan has no assigned delivery orders.');
      }

      // Build locations array: Node 0 = warehouse, Nodes 1..k = unique stops
      const matrixLocs: MatrixLocation[] = [
        {
          id: planDetail.warehouse.id,
          name: planDetail.warehouse.name,
          type: 'warehouse',
          address: planDetail.warehouse.address,
          latitude: planDetail.warehouse.latitude,
          longitude: planDetail.warehouse.longitude
        },
        ...uniqueStops.map(s => {
          const fullLoc = locations.find(l => l.id === s.id);
          return {
            id: s.id,
            name: s.name,
            type: 'delivery_location' as const,
            address: s.address,
            latitude: fullLoc?.latitude,
            longitude: fullLoc?.longitude
          };
        })
      ];

      const n = matrixLocs.length;
      if (selectedAlgorithm === 'BRANCH_AND_BOUND' && n > 10) {
        throw new Error(`Plan contains ${n} locations (limit 10 for Branch & Bound). Please use Greedy solver.`);
      }

      // Build Distance Matrix from configured table
      const distLookup = new Map<string, number>();
      distances.forEach(d => {
        distLookup.set(`${d.origin_id}->${d.destination_id}`, Number(d.distance));
      });

      const matrix: number[][] = [];
      const missing: string[] = [];

      for (let i = 0; i < n; i++) {
        matrix[i] = [];
        for (let j = 0; j < n; j++) {
          if (i === j) {
            matrix[i][j] = 0;
          } else {
            const key = `${matrixLocs[i].id}->${matrixLocs[j].id}`;
            const revKey = `${matrixLocs[j].id}->${matrixLocs[i].id}`;
            const dist = distLookup.get(key) ?? distLookup.get(revKey);
            if (dist === undefined || isNaN(dist) || dist < 0) {
              missing.push(`"${matrixLocs[i].name}" ↔ "${matrixLocs[j].name}"`);
              matrix[i][j] = NaN;
            } else {
              matrix[i][j] = dist;
            }
          }
        }
      }

      if (missing.length > 0) {
        throw new Error(`Missing configured distances between ${missing.slice(0, 2).join(', ')}.`);
      }

      const validation = validateTSPMatrix(matrixLocs, matrix);
      if (!validation.valid) {
        throw new Error(validation.errors[0]);
      }

      const input = { locations: matrixLocs, matrix, maxLocationsLimit: 10 };
      const result = selectedAlgorithm === 'BRANCH_AND_BOUND'
        ? solveBranchAndBoundTSP(input)
        : solveGreedyNearestNeighbor(input);

      if (!result.hasTour || result.error) {
        throw new Error(result.error || 'Failed to complete route tour.');
      }

      // Map to RouteStops
      const routeStops: RouteStop[] = result.tourIndices.map((locIdx, seq) => {
        const loc = matrixLocs[locIdx];
        const stopMeta = uniqueStops.find(s => s.id === loc.id);
        return {
          sequence: seq + 1,
          locationId: loc.id,
          name: loc.name,
          type: loc.type,
          address: loc.address,
          ordersCount: stopMeta?.ordersCount,
          latitude: loc.latitude,
          longitude: loc.longitude
        };
      });

      // Save Route
      await api.plans.saveRoute(
        selectedPlan.id,
        selectedAlgorithm,
        routeStops,
        result.totalDistance,
        result.executionTimeMs
      );

      setFeedback({
        type: 'success',
        text: `Route optimized (${result.algorithmName}): ${result.totalDistance} km (${result.executionTimeMs} ms).`
      });

      await loadAllData();
    } catch (err: unknown) {
      console.error('Route optimization error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to optimize route.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setOptimizingRoute(false);
    }
  };

  // --- Derived Route Stops with Coordinates for Map ---
  const activeRouteStops = useMemo(() => {
    if (!selectedPlan?.route_stops) return [];

    const whMap = new Map<string, Warehouse>();
    warehouses.forEach(w => whMap.set(w.id, w));

    const locMap = new Map<string, DeliveryLocation>();
    locations.forEach(l => locMap.set(l.id, l));

    return selectedPlan.route_stops.map(stop => {
      let lat = stop.latitude;
      let lng = stop.longitude;

      if (lat == null || lng == null) {
        if (stop.type === 'warehouse') {
          const wh = whMap.get(stop.locationId);
          lat = wh?.latitude;
          lng = wh?.longitude;
        } else {
          const loc = locMap.get(stop.locationId);
          lat = loc?.latitude;
          lng = loc?.longitude;
        }
      }

      const isValid = lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng));
      return {
        ...stop,
        lat: isValid ? Number(lat) : null,
        lng: isValid ? Number(lng) : null
      };
    });
  }, [selectedPlan, warehouses, locations]);

  // Polyline coordinates for active route
  const routePolylineCoords = useMemo(() => {
    return activeRouteStops
      .filter((s): s is typeof s & { lat: number; lng: number } => s.lat != null && s.lng != null)
      .map(s => [s.lat, s.lng] as [number, number]);
  }, [activeRouteStops]);

  // Overall bounds for active route
  const routeBounds = useMemo(() => {
    if (routePolylineCoords.length === 0) return null;
    return L.latLngBounds(routePolylineCoords.map(c => L.latLng(c[0], c[1])));
  }, [routePolylineCoords]);

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const whMatches = warehouses
      .filter(w => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q))
      .map(w => ({ type: 'warehouse' as const, item: w }));
    const locMatches = locations
      .filter(l => l.name.toLowerCase().includes(q) || (l.address && l.address.toLowerCase().includes(q)))
      .map(l => ({ type: 'location' as const, item: l }));
    return [...whMatches, ...locMatches];
  }, [searchQuery, warehouses, locations]);

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center bg-brand-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-brand-text-secondary font-medium">Loading interactive logistics map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex overflow-hidden font-sans bg-brand-bg">
      {/* MAP VIEW CONTAINER */}
      <div className="flex-1 relative h-full">
        <MapContainer
          center={[40.7128, -74.0060]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
        >
          {/* OpenStreetMap Base Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Click Handler to add new location */}
          <MapClickHandler onClick={handleMapClick} />

          {/* View Controller */}
          <MapViewController targetCoords={targetFlyCoords} bounds={routeBounds} />

          {/* 1. WAREHOUSES MARKERS */}
          {showWarehouses && warehouses.map(wh => {
            if (wh.latitude == null || wh.longitude == null) return null;
            const isSelected = selectedWarehouse?.id === wh.id;
            const isEditingThis = isEditingPosition && isSelected;
            const pos: [number, number] = isEditingThis && editedCoords
              ? [editedCoords.lat, editedCoords.lng]
              : [Number(wh.latitude), Number(wh.longitude)];

            return (
              <Marker
                key={isEditingThis ? `wh-${wh.id}-editing` : `wh-${wh.id}-${wh.latitude}-${wh.longitude}`}
                position={pos}
                icon={createWarehouseIcon(isSelected, isEditingThis)}
                draggable={isEditingThis}
                eventHandlers={{
                  click: () => {
                    if (isEditingPosition && isSelected) return;
                    setSelectedWarehouse(wh);
                    setSelectedLocation(null);
                    setSelectedStopSeq(null);
                    setIsEditingPosition(false);
                    setEditedCoords(null);
                    setDrawerOpen(true);
                  },
                  drag: (e) => {
                    const marker = e.target;
                    const p = marker.getLatLng();
                    setEditedCoords({ lat: parseFloat(p.lat.toFixed(6)), lng: parseFloat(p.lng.toFixed(6)) });
                  },
                  dragend: (e) => {
                    const marker = e.target;
                    const p = marker.getLatLng();
                    setEditedCoords({ lat: parseFloat(p.lat.toFixed(6)), lng: parseFloat(p.lng.toFixed(6)) });
                  }
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[180px] text-xs font-sans">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                      Warehouse Hub
                    </span>
                    <h4 className="font-bold text-stone-900 mt-1">{wh.name}</h4>
                    <p className="text-stone-600 text-[11px] font-mono">Code: {wh.code}</p>
                    {wh.address && <p className="text-stone-500 text-[11px] mt-0.5">{wh.address}</p>}
                    <p className="text-stone-400 text-[10px] mt-1 font-mono">
                      {Number(wh.latitude).toFixed(4)}°, {Number(wh.longitude).toFixed(4)}°
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* 2. DELIVERY LOCATIONS MARKERS */}
          {showLocations && locations.map(loc => {
            if (loc.latitude == null || loc.longitude == null) return null;
            if (activeOnly && !loc.is_active) return null;
            const isSelected = selectedLocation?.id === loc.id;
            const isEditingThis = isEditingPosition && isSelected;
            const pos: [number, number] = isEditingThis && editedCoords
              ? [editedCoords.lat, editedCoords.lng]
              : [Number(loc.latitude), Number(loc.longitude)];

            return (
              <Marker
                key={isEditingThis ? `loc-${loc.id}-editing` : `loc-${loc.id}-${loc.latitude}-${loc.longitude}`}
                position={pos}
                icon={createLocationIcon(loc.is_active, isSelected, isEditingThis)}
                draggable={isEditingThis}
                eventHandlers={{
                  click: () => {
                    if (isEditingPosition && isSelected) return;
                    setSelectedLocation(loc);
                    setSelectedWarehouse(null);
                    setSelectedStopSeq(null);
                    setIsEditingPosition(false);
                    setEditedCoords(null);
                    setDrawerOpen(true);
                  },
                  drag: (e) => {
                    const marker = e.target;
                    const p = marker.getLatLng();
                    setEditedCoords({ lat: parseFloat(p.lat.toFixed(6)), lng: parseFloat(p.lng.toFixed(6)) });
                  },
                  dragend: (e) => {
                    const marker = e.target;
                    const p = marker.getLatLng();
                    setEditedCoords({ lat: parseFloat(p.lat.toFixed(6)), lng: parseFloat(p.lng.toFixed(6)) });
                  }
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[180px] text-xs font-sans">
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 font-bold text-[10px]">
                        Delivery Destination
                      </span>
                      <span className={`text-[10px] font-bold ${loc.is_active ? 'text-emerald-700' : 'text-stone-400'}`}>
                        {loc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h4 className="font-bold text-stone-900 mt-1">{loc.name}</h4>
                    {loc.address && <p className="text-stone-600 text-[11px] mt-0.5">{loc.address}</p>}
                    <p className="text-stone-400 text-[10px] mt-1 font-mono">
                      {Number(loc.latitude).toFixed(4)}°, {Number(loc.longitude).toFixed(4)}°
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* 3. DRAFT NEW LOCATION MARKER (WHEN CLICKING MAP) */}
          {newLocationCoords && (
            <Marker
              position={[newLocationCoords.lat, newLocationCoords.lng]}
              icon={createDraftIcon(newLocationType)}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const p = marker.getLatLng();
                  setNewLocationCoords({ lat: parseFloat(p.lat.toFixed(6)), lng: parseFloat(p.lng.toFixed(6)) });
                }
              }}
            >
              <Popup autoPan={false}>
                <div className="p-1 text-xs">
                  <span className="font-bold text-blue-600">Draft Location Pin</span>
                  <p className="text-[11px] text-stone-600">Drag to adjust coordinates or use side panel to save.</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* 4. ACTIVE ROUTE POLYLINE & NUMBERED STOPS */}
          {showRoute && routePolylineCoords.length > 1 && (
            <Polyline
              positions={routePolylineCoords}
              pathOptions={{
                color: '#154734',
                weight: 4,
                opacity: 0.85,
                dashArray: '6, 8',
                lineJoin: 'round'
              }}
            />
          )}

          {showRoute && activeRouteStops.map((stop, idx) => {
            if (stop.lat == null || stop.lng == null) return null;
            const isWarehouse = stop.type === 'warehouse';
            const isSelected = selectedStopSeq === stop.sequence;

            return (
              <Marker
                key={`stop-${stop.sequence}-${idx}`}
                position={[stop.lat, stop.lng]}
                icon={createRouteStopIcon(stop.sequence, isWarehouse, isSelected)}
                eventHandlers={{
                  click: () => {
                    setSelectedStopSeq(stop.sequence);
                    setDrawerOpen(true);
                  }
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[200px] text-xs font-sans">
                    <div className="flex items-center justify-between pb-1 mb-1 border-b border-stone-200">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isWarehouse ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                      }`}>
                        Stop #{stop.sequence} ({isWarehouse ? 'Warehouse Depot' : 'Delivery'})
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {stop.lat.toFixed(4)}°, {stop.lng.toFixed(4)}°
                      </span>
                    </div>
                    <h4 className="font-bold text-stone-900 text-sm">{stop.name}</h4>
                    {stop.address && <p className="text-stone-600 text-[11px]">{stop.address}</p>}
                    {!isWarehouse && stop.ordersCount && (
                      <p className="mt-1 text-[11px] font-semibold text-amber-800">
                        {stop.ordersCount} Customer Order(s) assigned
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* MAP OVERLAY: CATEGORY CONTROLS & LEGEND */}
        <div className="absolute top-4 left-4 z-[500] bg-white/95 backdrop-blur-md rounded-xl p-3 border border-brand-border/80 shadow-md text-xs space-y-2 max-w-xs">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-1.5">
            <span className="font-bold text-brand-text flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brand-primary" />
              Layer Visibility
            </span>
            <span className="text-[10px] text-brand-text-secondary">Click map to add</span>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-brand-text">
              <input
                type="checkbox"
                checked={showWarehouses}
                onChange={e => setShowWarehouses(e.target.checked)}
                className="rounded text-brand-primary focus:ring-brand-primary w-3.5 h-3.5"
              />
              <span className="w-3.5 h-3.5 rounded-full bg-[#154734] border border-white flex items-center justify-center text-[8px] text-white font-bold">
                WH
              </span>
              <span>Warehouses ({warehouses.length})</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-brand-text">
              <input
                type="checkbox"
                checked={showLocations}
                onChange={e => setShowLocations(e.target.checked)}
                className="rounded text-brand-primary focus:ring-brand-primary w-3.5 h-3.5"
              />
              <span className="w-3.5 h-3.5 rounded-full bg-[#0284c7] border border-white flex items-center justify-center text-white">
                <MapPin className="w-2.5 h-2.5" />
              </span>
              <span>Delivery Destinations ({locations.length})</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-brand-text">
              <input
                type="checkbox"
                checked={showRoute}
                onChange={e => setShowRoute(e.target.checked)}
                className="rounded text-brand-primary focus:ring-brand-primary w-3.5 h-3.5"
              />
              <span className="w-3.5 h-3.5 rounded-full bg-[#d97706] border border-white flex items-center justify-center text-[8px] text-white font-bold">
                #
              </span>
              <span>Optimized Route Sequence</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-brand-text-secondary pt-1 border-t border-brand-border/40 text-[11px]">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={e => setActiveOnly(e.target.checked)}
                className="rounded text-brand-primary focus:ring-brand-primary w-3.5 h-3.5"
              />
              <span>Active Locations Only</span>
            </label>
          </div>
        </div>

        {/* MAP OVERLAY: ROUTE SUMMARY BANNER */}
        {selectedPlan && selectedPlan.route_distance && (
          <div className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur-md rounded-xl p-3 border border-brand-border/80 shadow-md text-xs flex items-center gap-4">
            <div>
              <span className="text-[10px] text-brand-text-secondary font-bold uppercase block">
                Plan {selectedPlan.plan_number} Tour
              </span>
              <span className="font-extrabold text-base text-brand-primary font-mono">
                {selectedPlan.route_distance} km
              </span>
            </div>
            <div className="border-l border-brand-border/70 pl-3">
              <span className="text-[10px] text-brand-text-secondary font-medium block">
                {selectedPlan.route_algorithm === 'BRANCH_AND_BOUND' ? 'Branch & Bound (Exact)' : 'Greedy Heuristic'}
              </span>
              <span className="text-[11px] font-bold text-brand-text">
                {activeRouteStops.length} stops in tour
              </span>
            </div>
          </div>
        )}

        {/* TOGGLE DRAWER BUTTON (WHEN CLOSED) */}
        {!drawerOpen && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="absolute top-4 right-4 z-[500] bg-brand-primary text-white p-2.5 rounded-xl shadow-lg hover:bg-brand-active transition-all flex items-center gap-2 text-xs font-bold"
          >
            <Route className="w-4 h-4" />
            <span>Open Logistics Workspace</span>
          </button>
        )}
      </div>

      {/* --- CONTEXTUAL SIDE DRAWER / PANEL --- */}
      {drawerOpen && (
        <aside className="w-full sm:w-[420px] h-full bg-brand-card border-l border-brand-border shadow-2xl flex flex-col z-20 transition-all flex-shrink-0">
          {/* Drawer Header */}
          <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-surface/40">
            <div>
              <h2 className="text-sm font-bold text-brand-text flex items-center gap-2">
                <Compass className="w-4 h-4 text-brand-primary" />
                Map Logistics Workspace
              </h2>
              <p className="text-[11px] text-brand-text-secondary">
                Unified location and route dispatch center
              </p>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1 rounded-lg text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface"
              title="Collapse Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-brand-border bg-white text-xs font-bold">
            <button
              onClick={() => { setActiveTab('plans'); setSelectedLocation(null); setSelectedWarehouse(null); }}
              className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'plans' 
                  ? 'border-brand-primary text-brand-primary bg-brand-soft/20' 
                  : 'border-transparent text-brand-text-secondary hover:text-brand-text'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Delivery Plans</span>
            </button>

            <button
              onClick={() => { setActiveTab('locations'); }}
              className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'locations' 
                  ? 'border-brand-primary text-brand-primary bg-brand-soft/20' 
                  : 'border-transparent text-brand-text-secondary hover:text-brand-text'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Locations</span>
            </button>

            <button
              onClick={() => { setActiveTab('add'); }}
              className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'add' 
                  ? 'border-brand-primary text-brand-primary bg-brand-soft/20' 
                  : 'border-transparent text-brand-text-secondary hover:text-brand-text'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Pin</span>
            </button>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div className={`m-3 p-2.5 rounded-lg text-xs font-medium flex items-center justify-between ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
            
            {/* TAB 1: DELIVERY PLANNING ON THE MAP */}
            {activeTab === 'plans' && (
              <div className="space-y-4">
                {/* Plan Selector */}
                <div>
                  <label className="text-xs font-bold text-brand-text block mb-1">
                    Select Delivery Plan to Map:
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={e => {
                      setSelectedPlanId(e.target.value);
                      setSelectedStopSeq(null);
                    }}
                    className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="">-- Choose a Delivery Plan --</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.plan_number} ({p.status}) — {p.warehouse?.name || 'Warehouse'}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPlan ? (
                  <div className="space-y-4">
                    {/* Plan Summary Card */}
                    <Card className="p-3.5 border border-brand-border space-y-2.5">
                      <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                        <span className="font-mono font-bold text-brand-text text-sm">
                          {selectedPlan.plan_number}
                        </span>
                        <Badge variant={selectedPlan.status === 'PLANNED' ? 'success' : 'default'}>
                          {selectedPlan.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-brand-text-secondary block">Depot Warehouse:</span>
                          <span className="font-semibold text-brand-text truncate block">
                            {selectedPlan.warehouse?.name || 'Unknown'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-brand-text-secondary block">Assigned Transport:</span>
                          {selectedPlan.vehicle ? (
                            <span className="font-semibold text-brand-text truncate block flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-brand-primary" />
                              {selectedPlan.vehicle.name} ({selectedPlan.vehicle.capacity} {selectedPlan.vehicle.capacity_unit})
                            </span>
                          ) : (
                            <span className="text-amber-700 italic">No vehicle assigned</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[11px] text-brand-text-secondary border-t border-brand-border/40">
                        <span>Orders: <strong>{selectedPlan.delivery_plan_orders?.length || 0}</strong></span>
                        <span>Stops: <strong>{activeRouteStops.length}</strong></span>
                        <span>Distance: <strong className="text-emerald-800 font-mono">{selectedPlan.route_distance ? `${selectedPlan.route_distance} km` : '—'}</strong></span>
                      </div>
                    </Card>

                    {/* DAA Route Optimization Action */}
                    {selectedPlan.status === 'PLANNED' && (
                      <Card className="p-3.5 border border-brand-border space-y-3 bg-brand-surface/30">
                        <span className="text-xs font-bold text-brand-text block flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-brand-primary" />
                          Optimize Tour on Map
                        </span>

                        <div className="flex items-center gap-2">
                          <select
                            value={selectedAlgorithm}
                            onChange={e => setSelectedAlgorithm(e.target.value as any)}
                            className="flex-1 bg-white border border-brand-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-text"
                          >
                            <option value="BRANCH_AND_BOUND">Branch & Bound (Exact)</option>
                            <option value="GREEDY_NEAREST_NEIGHBOR">Greedy Heuristic</option>
                          </select>

                          <Button
                            variant="primary"
                            onClick={handleGenerateRoute}
                            disabled={optimizingRoute}
                            className="text-xs font-bold py-1.5 px-3 flex items-center gap-1"
                          >
                            {selectedAlgorithm === 'BRANCH_AND_BOUND' ? (
                              <Layers className="w-3 h-3" />
                            ) : (
                              <Zap className="w-3 h-3" />
                            )}
                            <span>{optimizingRoute ? 'Solving...' : selectedPlan.route_distance ? 'Regenerate' : 'Generate'}</span>
                          </Button>
                        </div>
                      </Card>
                    )}

                    {/* Numbered Stops Trail */}
                    {activeRouteStops.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-brand-text block">
                          Tour Stops ({activeRouteStops.length} sequence steps):
                        </span>
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                          {activeRouteStops.map((stop) => {
                            const isSelected = selectedStopSeq === stop.sequence;
                            return (
                              <div
                                key={stop.sequence}
                                onClick={() => {
                                  setSelectedStopSeq(stop.sequence);
                                  if (stop.lat && stop.lng) {
                                    setTargetFlyCoords([stop.lat, stop.lng]);
                                  }
                                }}
                                className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-brand-soft/60 border-brand-primary text-brand-dark shadow-xs font-semibold'
                                    : 'bg-white border-brand-border/70 hover:bg-brand-surface/60 text-brand-text'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    stop.type === 'warehouse' ? 'bg-[#154734] text-white' : 'bg-[#d97706] text-white'
                                  }`}>
                                    {stop.type === 'warehouse' ? 'WH' : stop.sequence}
                                  </span>
                                  <span className="truncate">{stop.name}</span>
                                </div>

                                {stop.lat && stop.lng ? (
                                  <span className="text-[10px] text-brand-text-secondary font-mono">
                                    {stop.lat.toFixed(2)}°, {stop.lng.toFixed(2)}°
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-700 italic">No Coords</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Selected Stop Details */}
                    {selectedStopSeq !== null && (() => {
                      const stop = activeRouteStops.find(s => s.sequence === selectedStopSeq);
                      if (!stop) return null;
                      return (
                        <Card className="p-3.5 border-brand-primary/50 bg-brand-soft/10 space-y-2">
                          <div className="flex items-center justify-between border-b border-brand-border/40 pb-1.5">
                            <span className="font-bold text-xs text-brand-text">
                              Stop #{stop.sequence} Inspection
                            </span>
                            <span className="text-[10px] uppercase font-bold text-brand-primary">
                              {stop.type === 'warehouse' ? 'Depot Hub' : 'Delivery Destination'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-brand-text">{stop.name}</p>
                          {stop.address && <p className="text-[11px] text-stone-600">{stop.address}</p>}
                          {stop.ordersCount && stop.ordersCount > 0 && (
                            <p className="text-[11px] text-brand-primary font-semibold">
                              Assigned Customer Orders: {stop.ordersCount}
                            </p>
                          )}
                        </Card>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-brand-text-secondary text-center py-6">
                    Choose a delivery plan above to render its route and stops on the map.
                  </p>
                )}
              </div>
            )}

            {/* TAB 2: LOCATIONS DIRECTORY & EDITING */}
            {activeTab === 'locations' && (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-brand-text-secondary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search locations or warehouses..."
                    className="w-full pl-8 pr-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                {/* Selected Warehouse / Location Inspector */}
                {(selectedWarehouse || selectedLocation) && (
                  <Card className="p-3.5 border-brand-primary/60 bg-white space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                      <span className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                        {selectedWarehouse ? <WarehouseIcon className="w-3.5 h-3.5 text-emerald-800" /> : <MapPin className="w-3.5 h-3.5 text-sky-600" />}
                        {selectedWarehouse ? 'Warehouse Details' : 'Destination Details'}
                      </span>
                      <button
                        onClick={() => { setSelectedWarehouse(null); setSelectedLocation(null); setIsEditingPosition(false); }}
                        className="text-stone-400 hover:text-stone-600 text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-brand-text">
                        {selectedWarehouse?.name || selectedLocation?.name}
                      </h4>
                      {selectedWarehouse && (
                        <span className="text-[11px] font-mono text-brand-text-secondary block">
                          Code: {selectedWarehouse.code}
                        </span>
                      )}
                      {(selectedWarehouse?.address || selectedLocation?.address) && (
                        <p className="text-xs text-brand-text-secondary mt-0.5">
                          {selectedWarehouse?.address || selectedLocation?.address}
                        </p>
                      )}
                    </div>

                    {/* Coordinates Adjustment */}
                    <div className="p-2.5 rounded-lg bg-brand-surface/60 border border-brand-border space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-brand-text font-bold">
                          {isEditingPosition && editedCoords ? (
                            `${editedCoords.lat.toFixed(4)}°, ${editedCoords.lng.toFixed(4)}° (Adjusted)`
                          ) : (
                            `${(selectedWarehouse?.latitude || selectedLocation?.latitude || 0).toFixed(4)}°, ${(selectedWarehouse?.longitude || selectedLocation?.longitude || 0).toFixed(4)}°`
                          )}
                        </span>
                        {isEditingPosition ? (
                          <Badge variant="warning" className="text-[10px]">Dragging Enabled</Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">Saved</Badge>
                        )}
                      </div>

                      {isEditingPosition ? (
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSaveEditedPosition}
                            className="flex-1 text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save New Position</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setIsEditingPosition(false); setEditedCoords(null); }}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingPosition(true);
                            const lat = selectedWarehouse?.latitude || selectedLocation?.latitude || 40.7128;
                            const lng = selectedWarehouse?.longitude || selectedLocation?.longitude || -74.0060;
                            setEditedCoords({ lat: Number(lat), lng: Number(lng) });
                            setFeedback({ type: 'success', text: 'Drag the marker on the map to adjust coordinates, then click Save.' });
                          }}
                          className="w-full text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Move className="w-3 h-3" />
                          <span>Adjust Pin Position on Map</span>
                        </Button>
                      )}
                    </div>

                    {/* Deactivate / Activate action for Delivery Location */}
                    {selectedLocation && (
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-brand-text-secondary">Status:</span>
                        <button
                          type="button"
                          onClick={() => handleToggleLocationActive(selectedLocation)}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                            selectedLocation.is_active
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {selectedLocation.is_active ? 'Deactivate Location' : 'Activate Location'}
                        </button>
                      </div>
                    )}
                  </Card>
                )}

                {/* Directory List or Search Results */}
                {searchQuery.trim() ? (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    <span className="text-[10px] uppercase font-bold text-brand-text-secondary block">
                      Search Results ({searchResults.length})
                    </span>
                    {searchResults.length === 0 ? (
                      <p className="text-xs text-stone-400 py-3 text-center">No locations match query.</p>
                    ) : (
                      searchResults.map((res, idx) => {
                        const isWh = res.type === 'warehouse';
                        const item = res.item;
                        return (
                          <div
                            key={`search-${idx}`}
                            onClick={() => {
                              if (isWh) {
                                setSelectedWarehouse(item as Warehouse);
                                setSelectedLocation(null);
                              } else {
                                setSelectedLocation(item as DeliveryLocation);
                                setSelectedWarehouse(null);
                              }
                              setIsEditingPosition(false);
                              if (item.latitude && item.longitude) {
                                setTargetFlyCoords([Number(item.latitude), Number(item.longitude)]);
                              }
                            }}
                            className="p-2 rounded-lg border border-brand-border/70 bg-white hover:bg-brand-surface/60 text-xs cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isWh ? (
                                <span className="w-4 h-4 rounded-full bg-[#154734] text-white flex items-center justify-center text-[8px] font-bold">WH</span>
                              ) : (
                                <MapPin className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                              )}
                              <span className="font-semibold text-brand-text truncate">{item.name}</span>
                            </div>
                            <span className="text-[10px] text-brand-text-secondary">
                              {isWh ? (item as Warehouse).code : ((item as DeliveryLocation).is_active ? 'Active' : 'Inactive')}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  <span className="text-[10px] uppercase font-bold text-brand-text-secondary block">
                    Warehouses ({warehouses.length})
                  </span>
                  {warehouses.map(w => (
                    <div
                      key={`wh-list-${w.id}`}
                      onClick={() => {
                        setSelectedWarehouse(w);
                        setSelectedLocation(null);
                        setIsEditingPosition(false);
                        if (w.latitude && w.longitude) {
                          setTargetFlyCoords([Number(w.latitude), Number(w.longitude)]);
                        }
                      }}
                      className="p-2 rounded-lg border border-brand-border/70 bg-white hover:bg-brand-surface/60 text-xs cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-4 h-4 rounded-full bg-[#154734] text-white flex items-center justify-center text-[8px] font-bold">
                          WH
                        </span>
                        <span className="font-semibold text-brand-text truncate">{w.name}</span>
                      </div>
                      <span className="text-[10px] text-brand-text-secondary font-mono">{w.code}</span>
                    </div>
                  ))}

                  <span className="text-[10px] uppercase font-bold text-brand-text-secondary block pt-2">
                    Delivery Locations ({locations.length})
                  </span>
                  {locations.map(l => (
                    <div
                      key={`loc-list-${l.id}`}
                      onClick={() => {
                        setSelectedLocation(l);
                        setSelectedWarehouse(null);
                        setIsEditingPosition(false);
                        if (l.latitude && l.longitude) {
                          setTargetFlyCoords([Number(l.latitude), Number(l.longitude)]);
                        }
                      }}
                      className="p-2 rounded-lg border border-brand-border/70 bg-white hover:bg-brand-surface/60 text-xs cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${l.is_active ? 'text-sky-600' : 'text-stone-400'}`} />
                        <span className={`font-semibold truncate ${l.is_active ? 'text-brand-text' : 'text-stone-400'}`}>{l.name}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${l.is_active ? 'text-emerald-700' : 'text-stone-400'}`}>
                        {l.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}

            {/* TAB 3: CLICK TO ADD NEW LOCATION */}
            {activeTab === 'add' && (
              <form onSubmit={handleSaveNewLocation} className="space-y-4">
                <div className="p-3 bg-brand-surface/60 rounded-xl border border-brand-border text-xs text-brand-text-secondary space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-brand-text">
                    <Info className="w-3.5 h-3.5 text-brand-primary" />
                    Interactive Point Capture
                  </div>
                  <p>
                    Click anywhere on the map or drag the <strong>NEW</strong> marker to capture coordinates directly.
                  </p>
                </div>

                {newLocationCoords ? (
                  <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-xs font-mono flex items-center justify-between">
                    <span>Coordinates Captured:</span>
                    <span className="font-bold">{newLocationCoords.lat.toFixed(4)}°, {newLocationCoords.lng.toFixed(4)}°</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    No map point selected yet. Click the map to drop a new pin!
                  </div>
                )}

                {/* Location Type */}
                <div>
                  <label className="text-xs font-bold text-brand-text block mb-1">Location Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewLocationType('delivery_location')}
                      className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        newLocationType === 'delivery_location'
                          ? 'border-sky-500 bg-sky-50 text-sky-900'
                          : 'border-brand-border bg-white text-brand-text-secondary'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-sky-600" />
                      <span>Delivery Stop</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewLocationType('warehouse')}
                      className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        newLocationType === 'warehouse'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                          : 'border-brand-border bg-white text-brand-text-secondary'
                      }`}
                    >
                      <WarehouseIcon className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Warehouse Hub</span>
                    </button>
                  </div>
                </div>

                {/* Location Name */}
                <div>
                  <label className="text-xs font-bold text-brand-text block mb-1">
                    {newLocationType === 'warehouse' ? 'Warehouse Depot Name' : 'Destination / Facility Name'} *
                  </label>
                  <Input
                    value={newLocationName}
                    onChange={e => setNewLocationName(e.target.value)}
                    placeholder="e.g. Apex Industrial Center"
                    className="text-xs"
                    required
                  />
                </div>

                {/* Warehouse Code (if warehouse) */}
                {newLocationType === 'warehouse' && (
                  <div>
                    <label className="text-xs font-bold text-brand-text block mb-1">Warehouse Code *</label>
                    <Input
                      value={newLocationCode}
                      onChange={e => setNewLocationCode(e.target.value)}
                      placeholder="e.g. WH-04"
                      className="text-xs font-mono"
                      required
                    />
                  </div>
                )}

                {/* Street Address */}
                <div>
                  <label className="text-xs font-bold text-brand-text block mb-1">Physical Address (Optional)</label>
                  <Input
                    value={newLocationAddress}
                    onChange={e => setNewLocationAddress(e.target.value)}
                    placeholder="Street, City, State"
                    className="text-xs"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingLocation || !newLocationCoords}
                    className="flex-1 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingLocation ? 'Saving Location...' : 'Save to Network'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setNewLocationCoords(null);
                      setNewLocationName('');
                      setActiveTab('locations');
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

          </div>
        </aside>
      )}
    </div>
  );
};
