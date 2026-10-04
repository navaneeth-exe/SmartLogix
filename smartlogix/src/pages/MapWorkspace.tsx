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
  Info,
  Network,
  GitBranch,
  Boxes,
  ArrowRight,
  Cpu,
  Activity,
  Share2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import type { 
  Warehouse, 
  DeliveryLocation, 
  DeliveryPlan, 
  RouteStop, 
  LocationDistance,
  RouteOptimizationAlgorithm,
  MatrixLocation,
  Inventory
} from '../types/database.types';
import { 
  validateTSPMatrix, 
  solveBranchAndBoundTSP, 
  solveGreedyNearestNeighbor 
} from '../algorithms/tsp';
import { solveDijkstra } from '../algorithms/dijkstra';
import { solveFloydWarshall } from '../algorithms/floydWarshall';
import { solveKruskalMST } from '../algorithms/kruskal';
import { solveRestockBinPacking } from '../algorithms/binPacking';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';

export type MapIntelligenceMode = 'tsp' | 'dijkstra' | 'floyd' | 'kruskal' | 'bin_packing';

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

const createDijkstraMarkerIcon = (role: 'source' | 'target' | 'hop', label: string) => {
  const bg = role === 'source' ? '#154734' : role === 'target' ? '#d97706' : '#0284c7';
  const shadowColor = role === 'source' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(2, 132, 199, 0.7)';
  return L.divIcon({
    className: 'custom-dijkstra-marker',
    html: `
      <div style="
        background: ${bg};
        color: #ffffff;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid #ffffff;
        box-shadow: 0 0 14px ${shadowColor};
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-weight: 800;
        font-size: 10px;
        cursor: pointer;
      ">
        ${label}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const createCapacityWarehouseIcon = (utilizationPct: number, isSelected: boolean = false) => {
  const ringColor = utilizationPct > 90 ? '#f43f5e' : utilizationPct > 75 ? '#f59e0b' : '#10b981';
  return L.divIcon({
    className: 'custom-capacity-wh-marker',
    html: `
      <div style="
        position: relative;
        background: #154734;
        color: #ffffff;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid ${ringColor};
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-weight: 800;
        font-size: 11px;
        cursor: pointer;
        transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
        transition: transform 0.2s ease;
      ">
        WH
        <span style="
          position: absolute;
          bottom: -8px;
          background: ${ringColor};
          color: #ffffff;
          font-size: 8px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 6px;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        ">
          ${utilizationPct}%
        </span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
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
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);

  // --- DAA Map Intelligence Layer State ---
  const [intelligenceMode, setIntelligenceMode] = useState<MapIntelligenceMode>('tsp');
  const [dijkstraSourceId, setDijkstraSourceId] = useState<string>('');
  const [dijkstraDestId, setDijkstraDestId] = useState<string>('');
  const [fwOriginId, setFwOriginId] = useState<string>('');
  const [fwDestId, setFwDestId] = useState<string>('');
  const [showLegend, setShowLegend] = useState(true);
  const [restockSimulationQty, setRestockSimulationQty] = useState(250);

  // --- Map Controls ---
  const [showWarehouses, setShowWarehouses] = useState(true);
  const [showLocations, setShowLocations] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);
  const [targetFlyCoords, setTargetFlyCoords] = useState<[number, number] | null>(null);

  // --- Drawer / Context State ---
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'locations' | 'add' | 'intelligence'>('plans');
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
      const [whData, locData, plansData, distData, invData] = await Promise.all([
        api.warehouses.list(),
        api.locations.list(),
        api.plans.list(),
        api.distances.list(),
        api.inventory.list()
      ]);
      setWarehouses(whData);
      setLocations(locData);
      setPlans(plansData);
      setDistances(distData);
      setInventory(invData);

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

  // Synchronize initial DAA parameters with loaded data
  useEffect(() => {
    if (warehouses.length > 0) {
      if (!dijkstraSourceId || !warehouses.some(w => w.id === dijkstraSourceId)) {
        setDijkstraSourceId(warehouses[0].id);
      }
      if (!fwOriginId || !warehouses.some(w => w.id === fwOriginId)) {
        setFwOriginId(warehouses[0].id);
      }
    }
    if (locations.length > 0) {
      if (!dijkstraDestId || !locations.some(l => l.id === dijkstraDestId)) {
        setDijkstraDestId(locations[0].id);
      }
      if (!fwDestId) {
        setFwDestId(locations.length > 1 ? locations[1].id : locations[0].id);
      }
    }
  }, [warehouses, locations, dijkstraSourceId, dijkstraDestId, fwOriginId, fwDestId]);

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
        const latText = updatedWh.latitude != null ? updatedWh.latitude.toFixed(4) : '';
        const lngText = updatedWh.longitude != null ? updatedWh.longitude.toFixed(4) : '';
        setFeedback({ 
          type: 'success', 
          text: `Warehouse "${updatedWh.name}" coordinates saved (${latText}°, ${lngText}°).` 
        });
      } else if (selectedLocation) {
        const updatedLoc = await api.locations.update(selectedLocation.id, {
          latitude: editedCoords.lat,
          longitude: editedCoords.lng
        });
        setSelectedLocation(updatedLoc);
        setLocations(prev => prev.map(l => l.id === updatedLoc.id ? updatedLoc : l));
        const locLatText = updatedLoc.latitude != null ? updatedLoc.latitude.toFixed(4) : '';
        const locLngText = updatedLoc.longitude != null ? updatedLoc.longitude.toFixed(4) : '';
        setFeedback({ 
          type: 'success', 
          text: `Location "${updatedLoc.name}" coordinates saved (${locLatText}°, ${locLngText}°).` 
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

  // --- DAA GRAPH & ALGORITHM COMPUTATIONS (MEMOIZED FOR MAP INTELLIGENCE) ---

  // Unified Graph Nodes & Coordinate Lookup
  const graphNodes = useMemo(() => {
    const list: { id: string; name: string; type: 'warehouse' | 'delivery_location'; latitude?: number | null; longitude?: number | null }[] = [];
    warehouses.forEach(w => list.push({ id: w.id, name: w.name, type: 'warehouse', latitude: w.latitude, longitude: w.longitude }));
    locations.forEach(l => list.push({ id: l.id, name: l.name, type: 'delivery_location', latitude: l.latitude, longitude: l.longitude }));
    return list;
  }, [warehouses, locations]);

  const nodeCoordMap = useMemo(() => {
    const map = new Map<string, [number, number]>();
    warehouses.forEach(w => {
      if (w.latitude != null && w.longitude != null && !isNaN(Number(w.latitude)) && !isNaN(Number(w.longitude))) {
        map.set(w.id, [Number(w.latitude), Number(w.longitude)]);
      }
    });
    locations.forEach(l => {
      if (l.latitude != null && l.longitude != null && !isNaN(Number(l.latitude)) && !isNaN(Number(l.longitude))) {
        map.set(l.id, [Number(l.latitude), Number(l.longitude)]);
      }
    });
    return map;
  }, [warehouses, locations]);

  const nodeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    warehouses.forEach(w => map.set(w.id, w.name));
    locations.forEach(l => map.set(l.id, l.name));
    return map;
  }, [warehouses, locations]);

  const graphEdges = useMemo(() => {
    return distances
      .filter(d => d.origin_id && d.destination_id && d.origin_id !== d.destination_id && d.distance > 0 && d.distance !== Infinity)
      .map(d => ({ from: d.origin_id, to: d.destination_id, weight: d.distance }));
  }, [distances]);

  // Dijkstra Shortest Path Computation
  const dijkstraResult = useMemo(() => {
    if (!dijkstraSourceId || !dijkstraDestId || graphNodes.length === 0 || graphEdges.length === 0) {
      return null;
    }
    try {
      return solveDijkstra(
        { nodes: graphNodes, edges: graphEdges, isUndirected: true },
        dijkstraSourceId,
        dijkstraDestId
      );
    } catch (err) {
      console.warn('Dijkstra computation error:', err);
      return null;
    }
  }, [graphNodes, graphEdges, dijkstraSourceId, dijkstraDestId]);

  const dijkstraPolylineCoords = useMemo(() => {
    if (!dijkstraResult || !dijkstraResult.hasPath) return [];
    return dijkstraResult.path
      .map((id: string) => nodeCoordMap.get(id))
      .filter((coord: [number, number] | undefined): coord is [number, number] => coord !== undefined);
  }, [dijkstraResult, nodeCoordMap]);

  // Floyd-Warshall All-Pairs Path Computation
  const fwResult = useMemo(() => {
    if (graphNodes.length === 0 || graphEdges.length === 0) return null;
    try {
      return solveFloydWarshall({ nodes: graphNodes, edges: graphEdges, isUndirected: true });
    } catch (err) {
      console.warn('Floyd-Warshall computation error:', err);
      return null;
    }
  }, [graphNodes, graphEdges]);

  const fwPathInfo = useMemo(() => {
    if (!fwResult || !fwOriginId || !fwDestId) return null;
    return fwResult.getPath(fwOriginId, fwDestId);
  }, [fwResult, fwOriginId, fwDestId]);

  const fwPolylineCoords = useMemo(() => {
    if (!fwPathInfo || !fwPathInfo.hasPath) return [];
    return fwPathInfo.pathIds
      .map((id: string) => nodeCoordMap.get(id))
      .filter((coord: [number, number] | undefined): coord is [number, number] => coord !== undefined);
  }, [fwPathInfo, nodeCoordMap]);

  // Kruskal Minimum Spanning Tree Computation
  const kruskalResult = useMemo(() => {
    if (graphNodes.length === 0 || graphEdges.length === 0) return null;
    try {
      return solveKruskalMST({ nodes: graphNodes, edges: graphEdges });
    } catch (err) {
      console.warn('Kruskal computation error:', err);
      return null;
    }
  }, [graphNodes, graphEdges]);

  const kruskalPlottedEdges = useMemo(() => {
    if (!kruskalResult) return [];
    return kruskalResult.mstEdges.map(e => {
      const fromCoord = nodeCoordMap.get(e.from);
      const toCoord = nodeCoordMap.get(e.to);
      return {
        edge: e,
        hasCoords: !!(fromCoord && toCoord),
        positions: (fromCoord && toCoord ? [fromCoord, toCoord] : []) as [number, number][]
      };
    }).filter(e => e.hasCoords);
  }, [kruskalResult, nodeCoordMap]);

  // Warehouse Capacity & Stock Utilization Metrics
  const warehouseCapacityMetrics = useMemo(() => {
    const stockMap = new Map<string, number>();
    inventory.forEach(item => {
      stockMap.set(item.warehouse_id, (stockMap.get(item.warehouse_id) || 0) + item.quantity);
    });

    return warehouses.map(w => {
      const occupied = stockMap.get(w.id) || 0;
      const capacity = w.storage_capacity && w.storage_capacity > 0 ? w.storage_capacity : 10000;
      const available = Math.max(0, capacity - occupied);
      const utilizationPct = Math.min(100, Math.round((occupied / capacity) * 100));
      return {
        warehouse: w,
        occupied,
        capacity,
        available,
        utilizationPct
      };
    });
  }, [warehouses, inventory]);

  // Bin Packing FFD Restock Simulation
  const restockBinPackingSimulation = useMemo(() => {
    if (warehouses.length === 0) return null;
    const restockWarehouses = warehouseCapacityMetrics.map(wh => ({
      warehouse: wh.warehouse,
      currentStock: wh.occupied,
      storageCapacity: wh.capacity,
      availableCapacity: wh.available
    }));
    return solveRestockBinPacking({
      productId: 'simulated-batch',
      totalQuantity: restockSimulationQty,
      warehouses: restockWarehouses
    });
  }, [warehouseCapacityMetrics, restockSimulationQty, warehouses]);

  // Dynamic Map Bounds matching active intelligence mode
  const activeModeBounds = useMemo(() => {
    if (intelligenceMode === 'tsp') {
      return routeBounds;
    }
    if (intelligenceMode === 'dijkstra') {
      if (dijkstraPolylineCoords.length < 2) return null;
      return L.latLngBounds(dijkstraPolylineCoords.map((c: [number, number]) => L.latLng(c[0], c[1])));
    }
    if (intelligenceMode === 'floyd') {
      if (fwPolylineCoords.length < 2) return null;
      return L.latLngBounds(fwPolylineCoords.map((c: [number, number]) => L.latLng(c[0], c[1])));
    }
    if (intelligenceMode === 'kruskal') {
      const coords: [number, number][] = [];
      kruskalPlottedEdges.forEach(e => {
        coords.push(e.positions[0], e.positions[1]);
      });
      if (coords.length < 2) return null;
      return L.latLngBounds(coords.map((c: [number, number]) => L.latLng(c[0], c[1])));
    }
    if (intelligenceMode === 'bin_packing') {
      const whCoords = warehouses
        .filter(w => w.latitude != null && w.longitude != null)
        .map(w => [Number(w.latitude!), Number(w.longitude!)] as [number, number]);
      if (whCoords.length === 0) return null;
      return L.latLngBounds(whCoords.map((c: [number, number]) => L.latLng(c[0], c[1])));
    }
    return null;
  }, [intelligenceMode, routeBounds, dijkstraPolylineCoords, fwPolylineCoords, kruskalPlottedEdges, warehouses]);

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
          <MapViewController targetCoords={targetFlyCoords} bounds={activeModeBounds || routeBounds} />

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

          {/* 4. DAA MAP INTELLIGENCE LAYERS */}

          {/* 4A. TSP DELIVERY TOUR */}
          {intelligenceMode === 'tsp' && showRoute && routePolylineCoords.length > 1 && (
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

          {intelligenceMode === 'tsp' && showRoute && activeRouteStops.map((stop, idx) => {
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

          {/* 4B. DIJKSTRA SHORTEST PATH */}
          {intelligenceMode === 'dijkstra' && dijkstraPolylineCoords.length > 1 && (
            <Polyline
              positions={dijkstraPolylineCoords}
              pathOptions={{
                color: '#0284c7',
                weight: 5,
                opacity: 0.9,
                lineJoin: 'round'
              }}
            />
          )}

          {intelligenceMode === 'dijkstra' && dijkstraResult?.hasPath && dijkstraResult.path.map((nodeId: string, idx: number) => {
            const coord = nodeCoordMap.get(nodeId);
            if (!coord) return null;
            const isSource = idx === 0;
            const isTarget = idx === dijkstraResult.path.length - 1;
            const node = graphNodes.find(n => n.id === nodeId);
            const label = isSource ? 'SRC' : isTarget ? 'TGT' : `${idx}`;

            return (
              <Marker
                key={`dijkstra-node-${nodeId}-${idx}`}
                position={coord}
                icon={createDijkstraMarkerIcon(isSource ? 'source' : isTarget ? 'target' : 'hop', label)}
              >
                <Popup>
                  <div className="p-1 text-xs">
                    <span className="font-bold text-sky-800">
                      {isSource ? 'Dijkstra Source Hub' : isTarget ? 'Dijkstra Target Destination' : `Intermediate Hop #${idx}`}
                    </span>
                    <h4 className="font-bold text-stone-900">{node?.name}</h4>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* 4C. FLOYD-WARSHALL PAIRWISE SHORTEST PATH */}
          {intelligenceMode === 'floyd' && fwPolylineCoords.length > 1 && (
            <Polyline
              positions={fwPolylineCoords}
              pathOptions={{
                color: '#7c3aed',
                weight: 5,
                opacity: 0.9,
                lineJoin: 'round'
              }}
            />
          )}

          {/* 4D. KRUSKAL LOGISTICS BACKBONE (MST) */}
          {intelligenceMode === 'kruskal' && kruskalPlottedEdges.map(({ edge, positions }, idx) => (
            <Polyline
              key={`mst-kruskal-edge-${edge.from}-${edge.to}-${idx}`}
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
                    Direct Road Distance: <span className="font-bold text-brand-dark">{edge.weight} km</span>
                  </div>
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* 4E. WAREHOUSE CAPACITY RINGS (BIN PACKING) */}
          {intelligenceMode === 'bin_packing' && warehouseCapacityMetrics.map(item => {
            const w = item.warehouse;
            if (w.latitude == null || w.longitude == null) return null;
            return (
              <Marker
                key={`cap-wh-${w.id}`}
                position={[Number(w.latitude), Number(w.longitude)]}
                icon={createCapacityWarehouseIcon(item.utilizationPct)}
              >
                <Popup>
                  <div className="p-2 min-w-[200px] text-xs font-sans space-y-1.5">
                    <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                      <span className="font-bold text-brand-primary">{w.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.utilizationPct > 90 ? 'bg-rose-100 text-rose-800' : item.utilizationPct > 75 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.utilizationPct}% Cap
                      </span>
                    </div>
                    <div className="space-y-0.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-stone-500">Storage Capacity:</span>
                        <span className="font-mono font-bold">{item.capacity} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Occupied Stock:</span>
                        <span className="font-mono font-bold text-stone-900">{item.occupied} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Available Space:</span>
                        <span className="font-mono font-bold text-emerald-700">{item.available} units</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        </MapContainer>

        {/* TOP-CENTER DAA MAP INTELLIGENCE MODE SELECTOR */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-white/95 backdrop-blur-md rounded-2xl p-1.5 border border-brand-border/90 shadow-soft-lg flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setIntelligenceMode('tsp')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              intelligenceMode === 'tsp'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TSP Tour</span>
          </button>

          <button
            type="button"
            onClick={() => setIntelligenceMode('dijkstra')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              intelligenceMode === 'dijkstra'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dijkstra Shortest</span>
          </button>

          <button
            type="button"
            onClick={() => setIntelligenceMode('floyd')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              intelligenceMode === 'floyd'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Floyd-Warshall</span>
          </button>

          <button
            type="button"
            onClick={() => setIntelligenceMode('kruskal')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              intelligenceMode === 'kruskal'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kruskal MST</span>
          </button>

          <button
            type="button"
            onClick={() => setIntelligenceMode('bin_packing')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              intelligenceMode === 'bin_packing'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Capacity & Stock</span>
          </button>
        </div>

        {/* MAP OVERLAY: CATEGORY CONTROLS & DAA LEGEND */}
        <div className="absolute top-4 left-4 z-[500] glass-floating rounded-2xl p-3.5 border border-brand-border/90 shadow-soft-lg text-xs space-y-2.5 max-w-xs">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-1.5">
            <span className="font-bold text-brand-text flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brand-primary" />
              Map Intelligence Layer
            </span>
            <button
              onClick={() => setShowLegend(prev => !prev)}
              className="text-[10px] text-brand-text-secondary hover:text-brand-text flex items-center gap-0.5"
            >
              {showLegend ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {showLegend && (
            <>
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
                  <span>Active Tour / DAA Layer</span>
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

              {/* DAA Color Legend */}
              <div className="pt-2 border-t border-brand-border/60 space-y-1 text-[10px]">
                <span className="font-bold text-brand-text block mb-1">Color Coding Legend:</span>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-[#154734] rounded inline-block" />
                  <span className="text-brand-text-secondary">TSP Delivery Tour (Dashed)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-[#0284c7] rounded inline-block" />
                  <span className="text-brand-text-secondary">Dijkstra Shortest Path</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-[#7c3aed] rounded inline-block" />
                  <span className="text-brand-text-secondary">Floyd-Warshall Path</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-[#059669] rounded inline-block" />
                  <span className="text-brand-text-secondary">Kruskal MST Backbone</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* MAP OVERLAY: DYNAMIC DAA TELEMETRY BANNER */}
        <div className="absolute bottom-4 left-4 z-[500] glass-floating rounded-2xl p-3.5 border border-brand-border/90 shadow-soft-lg text-xs flex items-center gap-4">
          {intelligenceMode === 'tsp' && (
            selectedPlan && selectedPlan.route_distance ? (
              <>
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
              </>
            ) : (
              <span className="text-brand-text-secondary italic">Select a delivery plan in the sidebar to visualize TSP tour.</span>
            )
          )}

          {intelligenceMode === 'dijkstra' && (
            dijkstraResult ? (
              <>
                <div>
                  <span className="text-[10px] text-sky-800 font-bold uppercase block">
                    Dijkstra Shortest Path
                  </span>
                  <span className="font-extrabold text-base text-sky-900 font-mono">
                    {dijkstraResult.hasPath ? `${dijkstraResult.distance} km` : 'Unreachable'}
                  </span>
                </div>
                <div className="border-l border-brand-border/70 pl-3 text-[11px]">
                  <span className="text-brand-text font-bold block">
                    {dijkstraResult.path.length - 1} hops ({dijkstraResult.executionTimeMs} ms)
                  </span>
                  <span className="text-[10px] text-brand-text-secondary">Complexity: O((V+E) log V)</span>
                </div>
              </>
            ) : (
              <span className="text-brand-text-secondary italic">Configuring Dijkstra shortest-path query...</span>
            )
          )}

          {intelligenceMode === 'floyd' && (
            fwPathInfo ? (
              <>
                <div>
                  <span className="text-[10px] text-purple-800 font-bold uppercase block">
                    Floyd-Warshall Path
                  </span>
                  <span className="font-extrabold text-base text-purple-900 font-mono">
                    {fwPathInfo.hasPath ? `${fwPathInfo.distance} km` : 'No Route'}
                  </span>
                </div>
                <div className="border-l border-brand-border/70 pl-3 text-[11px]">
                  <span className="text-brand-text font-bold block">
                    {fwPathInfo.hopCount} hops ({fwResult?.executionTimeMs} ms)
                  </span>
                  <span className="text-[10px] text-brand-text-secondary">Dynamic Programming O(V³)</span>
                </div>
              </>
            ) : (
              <span className="text-brand-text-secondary italic">Configuring Floyd-Warshall path query...</span>
            )
          )}

          {intelligenceMode === 'kruskal' && (
            kruskalResult ? (
              <>
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">
                    Kruskal MST Backbone
                  </span>
                  <span className="font-extrabold text-base text-emerald-900 font-mono">
                    {kruskalResult.totalCost} km
                  </span>
                </div>
                <div className="border-l border-brand-border/70 pl-3 text-[11px]">
                  <span className="text-brand-text font-bold block">
                    {kruskalResult.selectedEdgeCount} edges ({kruskalResult.isConnected ? 'Connected Tree' : 'Forest'})
                  </span>
                  <span className="text-[10px] text-brand-text-secondary">Union-Find O(E log E)</span>
                </div>
              </>
            ) : (
              <span className="text-brand-text-secondary italic">Building Kruskal minimum spanning tree...</span>
            )
          )}

          {intelligenceMode === 'bin_packing' && (
            <>
              <div>
                <span className="text-[10px] text-amber-800 font-bold uppercase block">
                  Warehouse Storage Capacity
                </span>
                <span className="font-extrabold text-base text-amber-900 font-mono">
                  {warehouseCapacityMetrics.reduce((s, m) => s + m.occupied, 0)} / {warehouseCapacityMetrics.reduce((s, m) => s + m.capacity, 0)}
                </span>
              </div>
              <div className="border-l border-brand-border/70 pl-3 text-[11px]">
                <span className="text-brand-text font-bold block">
                  {warehouseCapacityMetrics.length} Active Storage Hubs
                </span>
                <span className="text-[10px] text-brand-text-secondary">First-Fit Decreasing (FFD)</span>
              </div>
            </>
          )}
        </div>

        {/* TOGGLE DRAWER BUTTON (WHEN CLOSED) */}
        {!drawerOpen && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="absolute top-4 right-4 z-[500] bg-brand-primary text-white p-2.5 rounded-xl shadow-soft-md hover:bg-brand-active tactile-button transition-all flex items-center gap-2 text-xs font-bold"
          >
            <Route className="w-4 h-4" />
            <span>Open Logistics Workspace</span>
          </button>
        )}
      </div>

      {/* --- CONTEXTUAL SIDE DRAWER / PANEL --- */}
      {drawerOpen && (
        <aside className="w-full sm:w-[420px] h-full surface-dense border-l border-brand-border/90 shadow-2xl flex flex-col z-20 transition-all flex-shrink-0">
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

            <button
              onClick={() => { setActiveTab('intelligence'); }}
              className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'intelligence' 
                  ? 'border-brand-primary text-brand-primary bg-brand-soft/20' 
                  : 'border-transparent text-brand-text-secondary hover:text-brand-text'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-brand-primary" />
              <span>DAA Intelligence</span>
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

            {/* TAB 4: MAP INTELLIGENCE LAYER */}
            {activeTab === 'intelligence' && (
              <div className="space-y-4">
                {/* Mode Selector within Drawer */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-brand-primary" />
                    DAA Intelligence Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setIntelligenceMode('tsp')}
                      className={`p-2 rounded-lg border text-left font-semibold transition-all ${
                        intelligenceMode === 'tsp'
                          ? 'border-brand-primary bg-brand-soft/20 text-brand-primary font-bold'
                          : 'border-brand-border bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-brand-primary" />
                        <span>TSP Tour</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-normal block mt-0.5">Route Plan & Stops</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIntelligenceMode('dijkstra')}
                      className={`p-2 rounded-lg border text-left font-semibold transition-all ${
                        intelligenceMode === 'dijkstra'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-brand-border bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Dijkstra</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-normal block mt-0.5">Single-Source Path</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIntelligenceMode('floyd')}
                      className={`p-2 rounded-lg border text-left font-semibold transition-all ${
                        intelligenceMode === 'floyd'
                          ? 'border-sky-600 bg-sky-50 text-sky-900 font-bold'
                          : 'border-brand-border bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Route className="w-3.5 h-3.5 text-sky-600" />
                        <span>Floyd-Warshall</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-normal block mt-0.5">All-Pairs Query</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIntelligenceMode('kruskal')}
                      className={`p-2 rounded-lg border text-left font-semibold transition-all ${
                        intelligenceMode === 'kruskal'
                          ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                          : 'border-brand-border bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Share2 className="w-3.5 h-3.5 text-amber-700" />
                        <span>Kruskal MST</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-normal block mt-0.5">Logistics Backbone</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIntelligenceMode('bin_packing')}
                    className={`w-full p-2 mt-1 rounded-lg border text-left font-semibold transition-all ${
                      intelligenceMode === 'bin_packing'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold'
                        : 'border-brand-border bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Boxes className="w-3.5 h-3.5 text-purple-700" />
                        <span>Bin Packing / Capacity Allocation</span>
                      </div>
                      <Badge variant="purple" className="text-[10px]">FFD Restock</Badge>
                    </div>
                    <span className="text-[10px] text-stone-500 font-normal block mt-0.5">Warehouse capacity utilization & packing solver</span>
                  </button>
                </div>

                {/* MODE 1: TSP INFO */}
                {intelligenceMode === 'tsp' && (
                  <Card className="p-3.5 border-brand-primary/40 bg-brand-soft/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-brand-primary" />
                        TSP Tour Visualization
                      </span>
                      <Badge variant="sage" className="text-[10px]">Frozen DAA</Badge>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      Computes the optimal delivery tour departing the warehouse depot, servicing each customer stop, and returning to the depot using Branch & Bound (exact) or Greedy Nearest Neighbor heuristic.
                    </p>
                    {selectedPlan ? (
                      <div className="p-2.5 rounded-lg bg-white border border-brand-border space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-stone-500">Active Plan:</span>
                          <span className="font-mono font-bold text-brand-text">{selectedPlan.plan_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Stops:</span>
                          <span className="font-semibold text-brand-text">{activeRouteStops.length} stops</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Total Distance:</span>
                          <span className="font-mono font-bold text-emerald-800">{selectedPlan.route_distance ? `${selectedPlan.route_distance} km` : 'Pending solve'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">No Delivery Plan Active</p>
                          <p className="text-[11px] mt-0.5 text-amber-800">
                            Switch to the "Route Plans" tab to select a delivery plan or generate an optimized tour.
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* MODE 2: DIJKSTRA SHORTEST PATH */}
                {intelligenceMode === 'dijkstra' && (
                  <div className="space-y-3">
                    <Card className="p-3.5 border-emerald-300 bg-emerald-50/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-emerald-700" />
                          Dijkstra Shortest Path
                        </span>
                        <Badge variant="success" className="text-[10px]">O((V+E) log V)</Badge>
                      </div>

                      {/* Source Hub */}
                      <div>
                        <label className="text-[11px] font-bold text-emerald-900 block mb-1">
                          Source Origin Hub / Node:
                        </label>
                        <select
                          value={dijkstraSourceId}
                          onChange={e => setDijkstraSourceId(e.target.value)}
                          className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs text-brand-text"
                        >
                          <option value="">-- Choose Origin --</option>
                          <optgroup label="Warehouses">
                            {warehouses.map(w => (
                              <option key={w.id} value={w.id}>
                                🏬 {w.name} ({w.code})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Delivery Destinations">
                            {locations.map(loc => (
                              <option key={loc.id} value={loc.id}>
                                📍 {loc.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Destination */}
                      <div>
                        <label className="text-[11px] font-bold text-emerald-900 block mb-1">
                          Target Destination:
                        </label>
                        <select
                          value={dijkstraDestId}
                          onChange={e => setDijkstraDestId(e.target.value)}
                          className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs text-brand-text"
                        >
                          <option value="">-- Choose Destination --</option>
                          <optgroup label="Delivery Destinations">
                            {locations.map(loc => (
                              <option key={loc.id} value={loc.id}>
                                📍 {loc.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Warehouses">
                            {warehouses.map(w => (
                              <option key={w.id} value={w.id}>
                                🏬 {w.name} ({w.code})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </Card>

                    {/* Dijkstra Telemetry Result */}
                    {dijkstraResult && (
                      <Card className="p-3.5 border-brand-border bg-white space-y-2.5">
                        <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                          <span className="text-xs font-bold text-brand-text">Path Telemetry</span>
                          {dijkstraResult.hasPath ? (
                            <Badge variant="success" className="text-[10px]">Reachable</Badge>
                          ) : (
                            <Badge variant="danger" className="text-[10px]">Disconnected</Badge>
                          )}
                        </div>

                        {dijkstraResult.hasPath ? (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-stone-500">Shortest Distance:</span>
                              <span className="font-mono font-bold text-emerald-800 text-sm">
                                {dijkstraResult.distance.toFixed(1)} km
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-500">Total Hops:</span>
                              <span className="font-semibold text-brand-text">
                                {dijkstraResult.path.length - 1} hops ({dijkstraResult.path.length} nodes)
                              </span>
                            </div>

                            {/* Node Trail */}
                            <div className="pt-2 border-t border-brand-border/50">
                              <span className="text-[11px] font-bold text-stone-600 block mb-1">
                                Dijkstra Waypoint Sequence:
                              </span>
                              <div className="space-y-1">
                                {dijkstraResult.path.map((nodeId: string, idx: number) => {
                                  const name = nodeNameMap.get(nodeId) || nodeId;
                                  const isLast = idx === dijkstraResult.path.length - 1;
                                  return (
                                    <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center text-[9px] font-bold shrink-0">
                                        {idx + 1}
                                      </span>
                                      <span className="font-medium text-brand-text truncate">{name}</span>
                                      {!isLast && <ArrowRight className="w-3 h-3 text-stone-400 shrink-0 ml-auto" />}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-rose-800 py-1">
                            No valid path exists between this origin and destination in the network distance matrix.
                          </p>
                        )}
                      </Card>
                    )}
                  </div>
                )}

                {/* MODE 3: FLOYD-WARSHALL ALL-PAIRS PATH */}
                {intelligenceMode === 'floyd' && (
                  <div className="space-y-3">
                    <Card className="p-3.5 border-sky-300 bg-sky-50/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                          <Route className="w-3.5 h-3.5 text-sky-600" />
                          Floyd-Warshall Path Query
                        </span>
                        <Badge variant="purple" className="text-[10px]">O(V³) Dynamic</Badge>
                      </div>

                      <p className="text-[11px] text-sky-900 leading-relaxed">
                        Evaluates all-pairs shortest paths via dynamic programming. Select an origin and destination to trace the reconstructed path and distance.
                      </p>

                      {/* Origin */}
                      <div>
                        <label className="text-[11px] font-bold text-sky-950 block mb-1">
                          Query Origin:
                        </label>
                        <select
                          value={fwOriginId}
                          onChange={e => setFwOriginId(e.target.value)}
                          className="w-full bg-white border border-sky-300 rounded-lg px-2.5 py-1.5 text-xs text-brand-text"
                        >
                          <option value="">-- Choose Origin --</option>
                          {graphNodes.map(node => (
                            <option key={node.id} value={node.id}>
                              {node.type === 'warehouse' ? '🏬' : '📍'} {node.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Destination */}
                      <div>
                        <label className="text-[11px] font-bold text-sky-950 block mb-1">
                          Query Destination:
                        </label>
                        <select
                          value={fwDestId}
                          onChange={e => setFwDestId(e.target.value)}
                          className="w-full bg-white border border-sky-300 rounded-lg px-2.5 py-1.5 text-xs text-brand-text"
                        >
                          <option value="">-- Choose Destination --</option>
                          {graphNodes.map(node => (
                            <option key={node.id} value={node.id}>
                              {node.type === 'warehouse' ? '🏬' : '📍'} {node.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Card>

                    {/* Floyd Path Output */}
                    {fwPathInfo && (
                      <Card className="p-3.5 border-brand-border bg-white space-y-2.5">
                        <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                          <span className="text-xs font-bold text-brand-text">Reconstructed Path</span>
                          {fwPathInfo.hasPath ? (
                            <Badge variant="success" className="text-[10px]">Connected</Badge>
                          ) : (
                            <Badge variant="danger" className="text-[10px]">Unreachable</Badge>
                          )}
                        </div>

                        {fwPathInfo.hasPath ? (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-stone-500">Shortest Distance:</span>
                              <span className="font-mono font-bold text-sky-800 text-sm">
                                {fwPathInfo.distance.toFixed(1)} km
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-500">Hops:</span>
                              <span className="font-semibold text-brand-text">
                                {fwPathInfo.hopCount} hops ({fwPathInfo.pathIds.length} nodes)
                              </span>
                            </div>

                            <div className="pt-2 border-t border-brand-border/50">
                              <span className="text-[11px] font-bold text-stone-600 block mb-1">
                                Reconstructed Nodes:
                              </span>
                              <div className="space-y-1">
                                {fwPathInfo.pathIds.map((nodeId: string, idx: number) => {
                                  const name = nodeNameMap.get(nodeId) || nodeId;
                                  const isLast = idx === fwPathInfo.pathIds.length - 1;
                                  return (
                                    <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                      <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-900 flex items-center justify-center text-[9px] font-bold shrink-0">
                                        {idx + 1}
                                      </span>
                                      <span className="font-medium text-brand-text truncate">{name}</span>
                                      {!isLast && <ArrowRight className="w-3 h-3 text-stone-400 shrink-0 ml-auto" />}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-rose-800 py-1">
                            Nodes are disconnected according to all-pairs distance matrices.
                          </p>
                        )}
                      </Card>
                    )}
                  </div>
                )}

                {/* MODE 4: KRUSKAL MST LOGISTICS BACKBONE */}
                {intelligenceMode === 'kruskal' && (
                  <div className="space-y-3">
                    <Card className="p-3.5 border-amber-300 bg-amber-50/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <Share2 className="w-3.5 h-3.5 text-amber-700" />
                          Kruskal Spanning Tree
                        </span>
                        <Badge variant="warning" className="text-[10px]">Union-Find</Badge>
                      </div>

                      <p className="text-[11px] text-amber-900 leading-relaxed">
                        Computes the minimum-cost network backbone connecting all hubs and delivery nodes without cycles using greedy edge sorting and Disjoint-Set union-find.
                      </p>

                      {kruskalResult && (
                        <div className="p-2.5 rounded-lg bg-white border border-amber-200/80 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-stone-500">MST Status:</span>
                            <span className={`font-bold ${kruskalResult.isConnected ? 'text-emerald-800' : 'text-amber-800'}`}>
                              {kruskalResult.isConnected ? 'Connected Spanning Tree' : 'Spanning Forest'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-500">Total Backbone Cost:</span>
                            <span className="font-mono font-bold text-amber-900 text-sm">
                              {kruskalResult.totalCost.toFixed(1)} km
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-500">Backbone Edges:</span>
                            <span className="font-semibold text-brand-text">
                              {kruskalResult.mstEdges.length} edges (out of {graphEdges.length})
                            </span>
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Kruskal Edge List */}
                    {kruskalResult && kruskalResult.mstEdges.length > 0 && (
                      <Card className="p-3 border-brand-border bg-white space-y-2">
                        <span className="text-[11px] font-bold text-brand-text block">
                          Spanning Backbone Connections ({kruskalResult.mstEdges.length}):
                        </span>
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {kruskalResult.mstEdges.map((edge, idx) => {
                            const uName = nodeNameMap.get(edge.from) || edge.fromName || edge.from;
                            const vName = nodeNameMap.get(edge.to) || edge.toName || edge.to;
                            return (
                              <div
                                key={idx}
                                className="p-1.5 rounded bg-brand-surface border border-brand-border/60 text-[11px] flex items-center justify-between"
                              >
                                <div className="truncate flex-1 pr-2">
                                  <span className="font-semibold text-brand-text">{uName}</span>
                                  <span className="text-stone-400 mx-1">↔</span>
                                  <span className="font-semibold text-brand-text">{vName}</span>
                                </div>
                                <span className="font-mono font-bold text-amber-900 shrink-0">
                                  {edge.weight.toFixed(1)} km
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {/* MODE 5: BIN PACKING / WAREHOUSE ALLOCATION */}
                {intelligenceMode === 'bin_packing' && (
                  <div className="space-y-3">
                    <Card className="p-3.5 border-purple-300 bg-purple-50/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5 text-purple-700" />
                          Warehouse Capacity & Allocation
                        </span>
                        <Badge variant="purple" className="text-[10px]">FFD Bin Packing</Badge>
                      </div>

                      <p className="text-[11px] text-purple-900 leading-relaxed">
                        Visualizes live warehouse storage capacity metrics and simulates First-Fit Decreasing restock allocation across all regional hubs.
                      </p>

                      {/* Simulation input */}
                      <div className="p-2.5 rounded-lg bg-white border border-purple-200 space-y-2">
                        <label className="text-[11px] font-bold text-purple-950 block">
                          Simulate Restock Batch Allocation (Units):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="10"
                            max="5000"
                            step="50"
                            value={restockSimulationQty}
                            onChange={e => setRestockSimulationQty(Math.max(10, parseInt(e.target.value) || 100))}
                            className="w-24 bg-brand-surface border border-purple-300 rounded px-2 py-1 text-xs font-mono font-bold text-purple-900"
                          />
                          <span className="text-[11px] text-stone-500">units to allocate via FFD</span>
                        </div>
                      </div>

                      {/* FFD Simulation Results */}
                      {restockBinPackingSimulation && (
                        <div className="p-2.5 rounded-lg bg-white border border-purple-200 space-y-1.5 text-xs">
                          <div className="flex justify-between font-semibold">
                            <span className="text-stone-600">Total Allocated:</span>
                            <span className="font-mono text-purple-900">
                              {restockBinPackingSimulation.totalAllocated} / {restockBinPackingSimulation.totalRequested} units
                            </span>
                          </div>
                          {restockBinPackingSimulation.unallocatedQuantity > 0 && (
                            <div className="flex justify-between text-rose-700 font-semibold">
                              <span>Overflow / Unassigned:</span>
                              <span className="font-mono">{restockBinPackingSimulation.unallocatedQuantity} units</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[11px] text-stone-500">
                            <span>Hubs Utilized:</span>
                            <span>{restockBinPackingSimulation.warehousesUtilized} of {restockBinPackingSimulation.warehousesEvaluated} hubs</span>
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Live Warehouse Capacity Breakdown */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-brand-text block">
                        Hub Capacities & Allocation Status:
                      </span>
                      {warehouseCapacityMetrics.map(item => {
                        const wh = item.warehouse;
                        return (
                          <Card key={wh.id} className="p-3 border-brand-border bg-white space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <WarehouseIcon className="w-3.5 h-3.5 text-purple-700" />
                                <span className="font-bold text-xs text-brand-text">{wh.name}</span>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded">
                                {item.utilizationPct}% Full
                              </span>
                            </div>

                            {/* Capacity bar */}
                            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden border border-stone-200">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  item.utilizationPct > 90
                                    ? 'bg-rose-500'
                                    : item.utilizationPct > 70
                                    ? 'bg-amber-500'
                                    : 'bg-purple-600'
                                }`}
                                style={{ width: `${Math.min(100, item.utilizationPct)}%` }}
                              />
                            </div>

                            <div className="flex justify-between text-[11px] text-stone-600 pt-0.5">
                              <span>Used: <strong>{item.occupied}</strong></span>
                              <span>Available: <strong className="text-emerald-700">{item.available}</strong></span>
                              <span>Total: <strong>{item.capacity} units</strong></span>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </aside>
      )}
    </div>
  );
};
