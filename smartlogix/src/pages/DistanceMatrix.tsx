import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { 
  Warehouse, 
  DeliveryLocation, 
  MatrixLocation, 
  AlgorithmResult,
  DistanceSource
} from '../types/database.types';
import { 
  validateTSPMatrix, 
  solveBranchAndBoundTSP, 
  solveGreedyNearestNeighbor 
} from '../algorithms/tsp';
import { 
  solveFloydWarshall, 
  type FloydWarshallResult 
} from '../algorithms/floydWarshall';
import { 
  solveKruskalMST, 
  type KruskalResult 
} from '../algorithms/kruskal';
import { MstNetworkMap } from '../components/MstNetworkMap';
import { 
  Warehouse as WarehouseIcon, MapPin, Save, Play, 
  CheckCircle2, AlertCircle, ArrowRight, Clock, 
  Cpu, Zap, SlidersHorizontal, RefreshCw, Info, Layers,
  Check, X, Car, Network, Route, Eye, EyeOff, GitBranch, Map as MapIcon
} from 'lucide-react';

const MAX_BB_LOCATIONS = 10;

export const DistanceMatrix: React.FC = () => {
  // DB Data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Configuration State
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [isSymmetric, setIsSymmetric] = useState(true);

  // Distance Matrix State: 2D array [i][j] (values in km)
  const [matrix, setMatrix] = useState<number[][]>([]);

  // Road Distance Metadata
  const [distanceSource, setDistanceSource] = useState<DistanceSource>('MANUAL_SIMULATION');
  const [routingProfile, setRoutingProfile] = useState<string>('driving-car');
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [generatingRoad, setGeneratingRoad] = useState(false);
  const [unreachablePairs, setUnreachablePairs] = useState<{ origin: string; destination: string }[]>([]);

  // UI & Execution State
  const [saving, setSaving] = useState(false);
  const [runningAlgo, setRunningAlgo] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bbResult, setBbResult] = useState<AlgorithmResult | null>(null);
  const [greedyResult, setGreedyResult] = useState<AlgorithmResult | null>(null);

  // Floyd-Warshall State
  const [runningFW, setRunningFW] = useState(false);
  const [fwResult, setFwResult] = useState<FloydWarshallResult | null>(null);
  const [fwSourceId, setFwSourceId] = useState<string>('');
  const [fwTargetId, setFwTargetId] = useState<string>('');
  const [showFwMatrix, setShowFwMatrix] = useState(false);

  // Kruskal MST State
  const [runningKruskal, setRunningKruskal] = useState(false);
  const [kruskalResult, setKruskalResult] = useState<KruskalResult | null>(null);
  const [showMstMap, setShowMstMap] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [whs, locs] = await Promise.all([
        api.warehouses.list(),
        api.locations.getActive()
      ]);
      setWarehouses(whs);
      setDeliveryLocations(locs);

      if (whs.length > 0) {
        setSelectedWarehouseId(whs[0].id);
      }
      if (locs.length > 0) {
        // Pre-select first 4 delivery locations by default for an optimal demonstration
        setSelectedLocationIds(locs.slice(0, 4).map(l => l.id));
      }
    } catch (err: unknown) {
      console.error('Error loading initial data:', err);
      setStatusMessage({ type: 'error', text: 'Failed to load warehouses and delivery locations from database.' });
    } finally {
      setLoading(false);
    }
  };

  // Build the unified list of selected locations: Node 0 is always the warehouse depot
  const activeLocations: MatrixLocation[] = useMemo(() => {
    const list: MatrixLocation[] = [];
    const wh = warehouses.find(w => w.id === selectedWarehouseId);
    if (wh) {
      list.push({
        id: wh.id,
        name: wh.name,
        type: 'warehouse',
        address: wh.address,
        latitude: wh.latitude,
        longitude: wh.longitude
      });
    }
    selectedLocationIds.forEach(id => {
      const loc = deliveryLocations.find(l => l.id === id);
      if (loc) {
        list.push({
          id: loc.id,
          name: loc.name,
          type: 'delivery_location',
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude
        });
      }
    });
    return list;
  }, [warehouses, selectedWarehouseId, deliveryLocations, selectedLocationIds]);

  // Reinitialize or load the matrix when active locations change
  useEffect(() => {
    const n = activeLocations.length;
    if (n === 0) {
      setMatrix([]);
      return;
    }

    let isMounted = true;

    // Check if existing distances for these locations are already stored in database
    api.distances.list().then(savedDistances => {
      if (!isMounted) return;

      const distMap = new Map<string, { dist: number; source?: DistanceSource; profile?: string; genAt?: string }>();
      savedDistances.forEach(d => {
        distMap.set(`${d.origin_id}->${d.destination_id}`, {
          dist: Number(d.distance),
          source: d.distance_source,
          profile: d.routing_profile,
          genAt: d.generated_at
        });
      });

      let allFoundInDb = true;
      let hasRoadDistances = false;
      let latestGen: string | null = null;
      let activeProfile = 'driving-car';

      const next: number[][] = [];
      for (let i = 0; i < n; i++) {
        next[i] = [];
        for (let j = 0; j < n; j++) {
          if (i === j) {
            next[i][j] = 0;
          } else {
            const entry = distMap.get(`${activeLocations[i].id}->${activeLocations[j].id}`);
            if (entry && !isNaN(entry.dist)) {
              next[i][j] = entry.dist;
              if (entry.source === 'ORS_ROAD') {
                hasRoadDistances = true;
                if (entry.genAt) latestGen = entry.genAt;
                if (entry.profile) activeProfile = entry.profile;
              }
            } else {
              allFoundInDb = false;
              // Deterministic fallback simulation distance in km
              const charSum = (activeLocations[i].name.charCodeAt(0) + activeLocations[j].name.charCodeAt(0)) % 35;
              next[i][j] = 12 + charSum;
            }
          }
        }
      }

      setMatrix(next);
      if (allFoundInDb && hasRoadDistances) {
        setDistanceSource('ORS_ROAD');
        setIsSymmetric(false);
        setRoutingProfile(activeProfile);
        setLastGeneratedAt(latestGen);
      }
    }).catch(err => {
      console.warn('Failed to load saved distances:', err);
    });

    // Clear previous results on location set modification
    setBbResult(null);
    setGreedyResult(null);

    return () => {
      isMounted = false;
    };
  }, [activeLocations]);

  // Generate Real Road Distance Matrix using OpenRouteService
  const handleGenerateRoadDistances = async () => {
    if (activeLocations.length < 2) {
      setStatusMessage({ type: 'error', text: 'Select at least 1 warehouse and 1 delivery destination.' });
      return;
    }

    // Check for missing coordinates
    const missingCoords = activeLocations.filter(l => l.latitude == null || l.longitude == null);
    if (missingCoords.length > 0) {
      setStatusMessage({
        type: 'error',
        text: `Cannot generate road distances: Missing map coordinates for ${missingCoords.map(l => `"${l.name}"`).join(', ')}. Please assign coordinates on the map.`
      });
      return;
    }

    try {
      setGeneratingRoad(true);
      setStatusMessage(null);
      setUnreachablePairs([]);

      const locPayload = activeLocations.map(l => ({
        id: l.id,
        name: l.name,
        latitude: Number(l.latitude),
        longitude: Number(l.longitude)
      }));

      const res = await api.distances.generateRoadMatrix(locPayload, 'driving-car');

      // Update matrix with real road distances in km
      setMatrix(res.matrix_km);
      setDistanceSource('ORS_ROAD');
      setRoutingProfile(res.profile || 'driving-car');
      setLastGeneratedAt(res.generated_at);
      setIsSymmetric(false); // ORS driving-car road distances are directional (asymmetric)

      if (res.unreachable_pairs && res.unreachable_pairs.length > 0) {
        setUnreachablePairs(res.unreachable_pairs);
        setStatusMessage({
          type: 'error',
          text: `Warning: ${res.unreachable_pairs.length} route pairs unreachable by road (e.g. ${res.unreachable_pairs[0].origin} ↔ ${res.unreachable_pairs[0].destination}).`
        });
      } else {
        // Automatically persist the generated road matrix to database with meter precision
        const n = activeLocations.length;
        const entries: {
          origin_id: string;
          destination_id: string;
          distance: number;
          distance_meters: number;
          distance_source: DistanceSource;
          routing_profile: string;
          duration_seconds: number | null;
          generated_at: string;
        }[] = [];

        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i !== j) {
              const km = res.matrix_km[i][j];
              const meters = res.distances_meters[i]?.[j] ?? Math.round(km * 1000);
              const durationSec = res.durations_seconds[i]?.[j] ?? null;
              if (!isNaN(km)) {
                entries.push({
                  origin_id: activeLocations[i].id,
                  destination_id: activeLocations[j].id,
                  distance: km,
                  distance_meters: meters,
                  distance_source: 'ORS_ROAD',
                  routing_profile: res.profile || 'driving-car',
                  duration_seconds: durationSec,
                  generated_at: res.generated_at
                });
              }
            }
          }
        }

        await api.distances.saveBatch(entries);
        setStatusMessage({
          type: 'success',
          text: `Real road distance matrix successfully generated via OpenRouteService (${res.profile}) and saved (${entries.length} directional legs).`
        });
      }
    } catch (err: unknown) {
      console.error('Road matrix generation error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to generate road distance matrix.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setGeneratingRoad(false);
    }
  };

  // Handle cell edit with symmetric support
  const handleCellChange = (i: number, j: number, val: string) => {
    const num = parseFloat(val);
    const validVal = isNaN(num) ? 0 : Math.max(0, Number(num.toFixed(1)));

    // Modifying cells manually transitions to simulation mode
    setDistanceSource('MANUAL_SIMULATION');

    setMatrix(prev => {
      const next = prev.map(row => [...row]);
      next[i][j] = validVal;
      if (isSymmetric && i !== j) {
        next[j][i] = validVal;
      }
      return next;
    });
  };

  // Pre-fill realistic simulation distances for convenience
  const handlePrefillSimulation = () => {
    const n = activeLocations.length;
    const next: number[][] = [];
    for (let i = 0; i < n; i++) {
      next[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          next[i][j] = 0;
        } else if (isSymmetric && j < i) {
          next[i][j] = next[j][i];
        } else {
          // Semi-random simulation distance between 8 km and 48 km
          const base = 10 + ((i * 7 + j * 13) % 36);
          next[i][j] = base;
        }
      }
    }
    setMatrix(next);
    setDistanceSource('MANUAL_SIMULATION');
    setStatusMessage({ type: 'success', text: 'Switched to Simulation Distance Mode. Values are manually editable.' });
  };

  // Validate matrix
  const validation = useMemo(() => {
    return validateTSPMatrix(activeLocations, matrix);
  }, [activeLocations, matrix]);

  // Persist matrix to Supabase
  const handleSaveToDatabase = async () => {
    if (!validation.valid) {
      setStatusMessage({ type: 'error', text: 'Cannot save: Please resolve matrix validation errors first.' });
      return;
    }

    try {
      setSaving(true);
      const entries: {
        origin_id: string;
        destination_id: string;
        distance: number;
        distance_meters: number;
        distance_source: DistanceSource;
        routing_profile: string;
        generated_at?: string;
      }[] = [];
      const n = activeLocations.length;

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            entries.push({
              origin_id: activeLocations[i].id,
              destination_id: activeLocations[j].id,
              distance: matrix[i][j],
              distance_meters: Math.round(matrix[i][j] * 1000),
              distance_source: distanceSource,
              routing_profile: routingProfile,
              generated_at: lastGeneratedAt || new Date().toISOString()
            });
          }
        }
      }

      await api.distances.saveBatch(entries);
      setStatusMessage({ 
        type: 'success', 
        text: `Successfully saved ${entries.length} pairwise distances (${distanceSource === 'ORS_ROAD' ? 'OpenRouteService Road' : 'Simulation'}) to database.` 
      });
    } catch (err: unknown) {
      console.error('Save error:', err);
      setStatusMessage({ type: 'error', text: 'Failed to persist distances to database.' });
    } finally {
      setSaving(false);
    }
  };

  // Run Algorithms
  const runAlgorithms = (mode: 'both' | 'bb' | 'greedy') => {
    if (!validation.valid) {
      setStatusMessage({ type: 'error', text: 'Validation failed. Fix matrix issues before running algorithms.' });
      return;
    }

    setRunningAlgo(true);
    setStatusMessage(null);

    // Brief timeout allows React to render loading states
    setTimeout(() => {
      try {
        const input = {
          locations: activeLocations,
          matrix,
          maxLocationsLimit: MAX_BB_LOCATIONS
        };

        if (mode === 'bb' || mode === 'both') {
          const resBB = solveBranchAndBoundTSP(input);
          setBbResult(resBB);
        }

        if (mode === 'greedy' || mode === 'both') {
          const resGreedy = solveGreedyNearestNeighbor(input);
          setGreedyResult(resGreedy);
        }
      } catch (err: unknown) {
        console.error('Algorithm execution error:', err);
        setStatusMessage({ type: 'error', text: 'An unexpected error occurred during algorithm execution.' });
      } finally {
        setRunningAlgo(false);
      }
    }, 50);
  };

  // Run Floyd-Warshall All-Pairs Shortest Path
  const runFloydWarshall = () => {
    if (activeLocations.length < 2) {
      setStatusMessage({ type: 'error', text: 'Select at least 2 locations before running Floyd-Warshall.' });
      return;
    }

    setRunningFW(true);
    setStatusMessage(null);

    setTimeout(() => {
      try {
        const nodes = activeLocations.map(loc => ({
          id: loc.id,
          name: loc.name,
          type: loc.type
        }));

        const edges = [];
        const n = activeLocations.length;
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i !== j && matrix[i]?.[j] !== undefined && matrix[i][j] >= 0 && matrix[i][j] !== Infinity) {
              edges.push({
                from: activeLocations[i].id,
                to: activeLocations[j].id,
                weight: matrix[i][j]
              });
            }
          }
        }

        const res = solveFloydWarshall({
          nodes,
          edges,
          isUndirected: isSymmetric
        });

        setFwResult(res);
        if (!fwSourceId && nodes.length > 0) {
          setFwSourceId(nodes[0].id);
        }
        if (!fwTargetId && nodes.length > 1) {
          setFwTargetId(nodes[1].id);
        }

        setStatusMessage({
          type: 'success',
          text: `Floyd-Warshall all-pairs shortest paths computed across ${n} vertices in ${res.executionTimeMs} ms.`
        });
      } catch (err: unknown) {
        console.error('Floyd-Warshall execution error:', err);
        setStatusMessage({ type: 'error', text: 'An unexpected error occurred during Floyd-Warshall execution.' });
      } finally {
        setRunningFW(false);
      }
    }, 40);
  };

  // Synchronize Floyd-Warshall inspector source and target with active locations
  useEffect(() => {
    if (activeLocations.length > 0) {
      if (!fwSourceId || !activeLocations.some(l => l.id === fwSourceId)) {
        setFwSourceId(activeLocations[0].id);
      }
      if (!fwTargetId || !activeLocations.some(l => l.id === fwTargetId)) {
        setFwTargetId(activeLocations.length > 1 ? activeLocations[1].id : activeLocations[0].id);
      }
    }
  }, [activeLocations, fwSourceId, fwTargetId]);

  const fwPathInfo = useMemo(() => {
    if (!fwResult || !fwSourceId || !fwTargetId) return null;
    return fwResult.getPath(fwSourceId, fwTargetId);
  }, [fwResult, fwSourceId, fwTargetId]);

  const directPairDistance = useMemo(() => {
    if (!fwResult || !fwSourceId || !fwTargetId) return null;
    const u = fwResult.nodeIndexMap[fwSourceId];
    const v = fwResult.nodeIndexMap[fwTargetId];
    if (u === undefined || v === undefined) return null;
    if (u === v) return 0;
    const val = matrix[u]?.[v];
    return val !== undefined && val !== Infinity ? val : null;
  }, [fwResult, fwSourceId, fwTargetId, matrix]);

  // Run Kruskal's Minimum Spanning Tree
  const runKruskal = () => {
    if (activeLocations.length < 2) {
      setStatusMessage({ type: 'error', text: 'Select at least 2 locations before running Kruskal MST.' });
      return;
    }

    setRunningKruskal(true);
    setStatusMessage(null);

    setTimeout(() => {
      try {
        const nodes = activeLocations.map(loc => ({
          id: loc.id,
          name: loc.name,
          type: loc.type,
          latitude: loc.latitude,
          longitude: loc.longitude
        }));

        const edges = [];
        const n = activeLocations.length;
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i !== j && matrix[i]?.[j] !== undefined && matrix[i][j] >= 0 && matrix[i][j] !== Infinity) {
              edges.push({
                from: activeLocations[i].id,
                to: activeLocations[j].id,
                weight: matrix[i][j]
              });
            }
          }
        }

        const res = solveKruskalMST({ nodes, edges });
        setKruskalResult(res);

        setStatusMessage({
          type: 'success',
          text: `Kruskal's algorithm computed ${res.isConnected ? 'Minimum Spanning Tree' : 'Minimum Spanning Forest'} (${res.selectedEdgeCount} edges, ${res.totalCost} km) in ${res.executionTimeMs} ms.`
        });
      } catch (err: unknown) {
        console.error('Kruskal execution error:', err);
        setStatusMessage({ type: 'error', text: 'An unexpected error occurred during Kruskal algorithm execution.' });
      } finally {
        setRunningKruskal(false);
      }
    }, 40);
  };

  const toggleLocationSelection = (id: string) => {
    setSelectedLocationIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllLocations = () => {
    setSelectedLocationIds(deliveryLocations.map(l => l.id));
  };

  const handleClearLocations = () => {
    setSelectedLocationIds([]);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-brand-text-secondary font-medium">Loading logistics network & distance data...</p>
        </div>
      </div>
    );
  }

  const isLocationLimitExceeded = activeLocations.length > MAX_BB_LOCATIONS;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Distance Matrix & DAA Algorithms"
        description="Calculate real road distances via OpenRouteService or maintain simulation distances (km) for DAA TSP optimization."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleGenerateRoadDistances}
              disabled={generatingRoad || activeLocations.length < 2}
              className="bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-2 shadow-sm font-semibold text-xs py-2 px-3.5 transition-all"
            >
              <Car className="w-4 h-4" />
              <span>{generatingRoad ? 'Calling ORS Matrix...' : 'Generate Road Distances (ORS)'}</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePrefillSimulation}
              className="flex items-center gap-2 border-brand-border/80 text-brand-dark bg-white/90 hover:bg-brand-surface shadow-xs text-xs py-2 px-3"
            >
              <RefreshCw className="w-4 h-4 text-brand-primary" />
              <span>Pre-fill Simulation</span>
            </Button>
            <Button 
              onClick={handleSaveToDatabase} 
              disabled={saving || !validation.valid}
              className="bg-brand-primary hover:bg-brand-active text-white flex items-center gap-2 shadow-sm text-xs py-2 px-3"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Matrix'}</span>
            </Button>
          </div>
        }
      />

      {/* Status Messages */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50/90 backdrop-blur-xs border-emerald-200 text-emerald-900' 
            : 'bg-rose-50/90 backdrop-blur-xs border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-3">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-brand-text-secondary hover:text-brand-text p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Distance Source & Profile Banner */}
      <div className={`rounded-2xl p-4 sm:p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
        distanceSource === 'ORS_ROAD'
          ? 'bg-emerald-50/90 backdrop-blur-xs border-emerald-300/80 text-emerald-950'
          : 'bg-amber-50/90 backdrop-blur-xs border-amber-200/80 text-amber-950'
      }`}>
        <div className="flex items-start sm:items-center gap-3">
          {distanceSource === 'ORS_ROAD' ? (
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <Car className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
              <Info className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm">
                Distance Source: {distanceSource === 'ORS_ROAD' ? 'Real Road Network (OpenRouteService)' : 'Manual Simulation Matrix'}
              </span>
              <Badge variant={distanceSource === 'ORS_ROAD' ? 'success' : 'default'} className="text-[10px]">
                Profile: {routingProfile}
              </Badge>
              <Badge variant="default" className="text-[10px]">
                {isSymmetric ? 'Symmetric (A↔B)' : 'Directional Asymmetric (A→B ≠ B→A)'}
              </Badge>
              {unreachablePairs.length > 0 && (
                <Badge variant="warning" className="text-[10px]">
                  {unreachablePairs.length} unreachable pair(s) detected
                </Badge>
              )}
            </div>
            <p className="text-xs text-stone-600 mt-1">
              {distanceSource === 'ORS_ROAD'
                ? `Directional road network metrics calculated from physical coordinates. Displayed in kilometres (km); stored with internal meter precision.`
                : `Simulated transit distances in kilometres (km) for deterministic algorithm benchmarking.`}
              {lastGeneratedAt && (
                <span className="ml-1 font-mono text-[11px] text-brand-primary">
                  (Last Generated: {new Date(lastGeneratedAt).toLocaleTimeString()})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <span className="text-[11px] font-mono font-bold px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-xs border border-brand-border/80 shadow-xs text-brand-text">
            Unit: Kilometres (km)
          </span>
        </div>
      </div>

      {/* Grid: 1. Location Selection & 2. Matrix Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Warehouse & Location Selection */}
        <Card variant="dense" className="p-6 space-y-6">
          <div className="border-b border-brand-border/60 pb-4">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <WarehouseIcon className="w-5 h-5 text-brand-primary" />
              1. Starting Depot (Warehouse)
            </h2>
            <p className="text-xs text-brand-text-secondary mt-1">
              Fixed start and return depot (Node 0) for the TSP tour.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary mb-2">
              Select Warehouse
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full bg-white/90 backdrop-blur-xs border border-brand-border/80 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/40 shadow-xs"
            >
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code}) {wh.address ? `— ${wh.address}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="border-b border-brand-border/60 pb-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-primary" />
                2. Delivery Stops
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 bg-brand-soft text-brand-dark rounded-full">
                {selectedLocationIds.length} stops
              </span>
            </div>
            <p className="text-xs text-brand-text-secondary mt-1">
              Intermediate destinations that must be visited exactly once.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSelectAllLocations}
              className="text-brand-primary font-semibold hover:underline"
            >
              Select All ({deliveryLocations.length})
            </button>
            <button
              type="button"
              onClick={handleClearLocations}
              className="text-brand-text-secondary hover:text-rose-600 font-semibold hover:underline"
            >
              Clear Stops
            </button>
          </div>

          {/* Location Checklist */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {deliveryLocations.map(loc => {
              const isChecked = selectedLocationIds.includes(loc.id);
              return (
                <div
                  key={loc.id}
                  onClick={() => toggleLocationSelection(loc.id)}
                  className={`p-3 rounded-lg border text-sm cursor-pointer transition-all flex items-center justify-between ${
                    isChecked 
                      ? 'bg-brand-soft/40 border-brand-primary/60 text-brand-dark font-medium shadow-xs' 
                      : 'bg-brand-surface/60 border-brand-border/60 text-brand-text-secondary hover:bg-brand-surface'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      isChecked ? 'bg-brand-primary border-brand-primary text-white' : 'border-brand-border bg-white'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold truncate text-brand-text">{loc.name}</p>
                      {loc.address && <p className="text-xs text-brand-text-secondary truncate">{loc.address}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Location limit indicator */}
          <div className={`p-3 rounded-lg text-xs leading-relaxed ${
            isLocationLimitExceeded 
              ? 'bg-rose-50 border border-rose-200 text-rose-800' 
              : 'bg-brand-surface border border-brand-border/60 text-brand-text-secondary'
          }`}>
            <span className="font-semibold text-brand-text">Active Tour Size: </span>
            {activeLocations.length} locations (1 Depot + {selectedLocationIds.length} Stops).
            {isLocationLimitExceeded ? (
              <p className="mt-1 font-semibold text-rose-700">
                Warning: Exceeds safe limit of {MAX_BB_LOCATIONS} locations for Branch & Bound search. Run Nearest-Neighbor or reduce stop count.
              </p>
            ) : (
              <p className="mt-0.5">Suitable for instantaneous Branch & Bound state-space exploration.</p>
            )}
          </div>
        </Card>

        {/* Right Column (2 cols wide): Configurable Matrix Table */}
        <Card variant="dense" className="lg:col-span-2 p-6 flex flex-col justify-between overflow-hidden">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border/60 pb-4">
              <div>
                <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-brand-primary" />
                  Pairwise Distance Matrix (km)
                </h2>
                <p className="text-xs text-brand-text-secondary mt-1">
                  Rows = Origin locations; Columns = Destination locations. Edit any cell to update graph edge weights.
                </p>
              </div>

              {/* Symmetric Toggle */}
              <div className="flex items-center gap-3 bg-brand-surface/70 backdrop-blur-xs px-3 py-2 rounded-xl border border-brand-border/80 shadow-xs">
                <span className="text-xs font-semibold text-brand-text">Symmetric Distances:</span>
                <button
                  type="button"
                  onClick={() => setIsSymmetric(!isSymmetric)}
                  className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isSymmetric ? 'bg-brand-primary' : 'bg-brand-border'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      isSymmetric ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs text-brand-text-secondary">
                  {isSymmetric ? 'A↔B identical' : 'Directed A→B'}
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            {activeLocations.length < 2 ? (
              <div className="p-12 text-center text-brand-text-secondary border-2 border-dashed border-brand-border/80 rounded-xl bg-brand-surface/20">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-semibold text-brand-text">At least 2 locations required</p>
                <p className="text-xs mt-1">Select a starting warehouse and at least one delivery stop on the left.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-brand-border/70">
                <table className="min-w-full divide-y divide-brand-border/70 text-xs">
                  <thead className="bg-brand-surface/70 border-b border-brand-border/80 text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 text-left font-bold sticky left-0 bg-brand-surface/90 backdrop-blur-xs z-10 border-r border-brand-border/80">
                        From \ To
                      </th>
                      {activeLocations.map((loc, j) => (
                        <th key={loc.id} className="py-2.5 px-2 text-center font-semibold min-w-[90px] max-w-[120px]">
                          <div className="truncate" title={loc.name}>
                            {j === 0 ? `[Depot] ${loc.name.split(' ')[0]}` : loc.name.split(' ')[0]}
                          </div>
                          <span className="text-[10px] text-brand-text-secondary block font-normal">Node {j}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border bg-white">
                    {activeLocations.map((origin, i) => (
                      <tr key={origin.id} className="hover:bg-brand-surface/40 transition-colors">
                        <td className="py-2 px-3 font-semibold text-brand-text sticky left-0 bg-white z-10 border-r border-brand-border whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {i === 0 ? (
                              <WarehouseIcon className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            )}
                            <span className="truncate max-w-[140px]" title={origin.name}>
                              {i === 0 ? `[Depot] ${origin.name}` : origin.name}
                            </span>
                          </div>
                        </td>
                        {activeLocations.map((dest, j) => {
                          const isDiagonal = i === j;
                          const cellVal = matrix[i]?.[j] ?? 0;
                          return (
                            <td key={dest.id} className="p-1 text-center">
                              {isDiagonal ? (
                                <span className="inline-block py-1.5 px-2 bg-brand-surface text-brand-text-secondary font-mono text-xs rounded border border-brand-border/60">
                                  0 km
                                </span>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={cellVal}
                                    onChange={(e) => handleCellChange(i, j, e.target.value)}
                                    className={`w-full py-1.5 px-1.5 text-center font-mono text-xs font-semibold rounded border transition-colors focus:outline-none focus:ring-1 focus:ring-brand-primary ${
                                      cellVal <= 0 
                                        ? 'border-rose-400 bg-rose-50 text-rose-900' 
                                        : 'border-brand-border bg-white hover:border-brand-primary/50 text-brand-text'
                                    }`}
                                  />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Validation Report Bar */}
          <div className="mt-6 pt-4 border-t border-brand-border flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {validation.valid ? (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Matrix Validated: Ready for TSP Algorithms</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Validation Warning: {validation.errors[0]}</span>
                </div>
              )}
            </div>

            <div className="text-xs text-brand-text-secondary">
              Total Edges: <span className="font-semibold text-brand-text">{activeLocations.length * (activeLocations.length - 1)}</span> pairwise values
            </div>
          </div>
        </Card>
      </div>

      {/* Algorithm Execution Bar */}
      <Card className="p-6 bg-gradient-to-r from-brand-sidebar via-brand-dark to-brand-primary text-white shadow-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-lg font-bold flex items-center justify-center md:justify-start gap-2">
              <Cpu className="w-5 h-5 text-brand-soft" />
              DAA Tour Optimization Engines
            </h3>
            <p className="text-xs text-brand-sage max-w-xl">
              Execute Branch and Bound with admissible lower bound pruning alongside the Greedy Nearest-Neighbor heuristic to compare execution efficiency and tour optimality.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => runAlgorithms('greedy')}
              disabled={runningAlgo || !validation.valid}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-2 text-xs font-semibold px-4 py-2.5"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Run Greedy Heuristic (O(n²))</span>
            </Button>

            <Button
              onClick={() => runAlgorithms('bb')}
              disabled={runningAlgo || !validation.valid || isLocationLimitExceeded}
              className="bg-white/15 hover:bg-white/25 text-white border border-white/30 flex items-center gap-2 text-xs font-semibold px-4 py-2.5"
            >
              <Layers className="w-4 h-4 text-emerald-300" />
              <span>Run Branch & Bound (Optimal)</span>
            </Button>

            <Button
              onClick={() => runAlgorithms('both')}
              disabled={runningAlgo || !validation.valid || isLocationLimitExceeded}
              className="bg-white hover:bg-brand-surface text-brand-dark font-bold shadow-md flex items-center gap-2 text-xs px-5 py-2.5 transition-transform active:scale-95"
            >
              <Play className="w-4 h-4 text-brand-primary fill-brand-primary" />
              <span>{runningAlgo ? 'Optimizing...' : 'Run Both & Benchmark'}</span>
            </Button>

            <Button
              onClick={runFloydWarshall}
              disabled={runningFW || activeLocations.length < 2}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md flex items-center gap-2 text-xs px-4 py-2.5 transition-transform active:scale-95 border border-emerald-400/40"
            >
              <Network className="w-4 h-4 text-emerald-100" />
              <span>{runningFW ? 'Solving O(V³)...' : 'Run Floyd-Warshall (All-Pairs O(V³))'}</span>
            </Button>

            <Button
              onClick={runKruskal}
              disabled={runningKruskal || activeLocations.length < 2}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md flex items-center gap-2 text-xs px-4 py-2.5 transition-transform active:scale-95 border border-indigo-400/40"
            >
              <GitBranch className="w-4 h-4 text-indigo-100" />
              <span>{runningKruskal ? 'Computing MST...' : "Run Kruskal's MST (O(E log E))"}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Results Section */}
      {(bbResult || greedyResult) && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
            <div>
              <h2 className="text-xl font-bold text-brand-text">DAA Algorithm Results & Verification</h2>
              <p className="text-xs text-brand-text-secondary mt-0.5">
                Comparison of optimal state-space tour search versus greedy nearest-neighbor heuristic.
              </p>
            </div>
            <Badge variant="default" className="bg-brand-surface text-brand-text-secondary border border-brand-border">
              Observed Single-Run Metrics
            </Badge>
          </div>

          {/* Results Side-by-Side Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Branch and Bound Card */}
            <Card variant="glass" className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-text text-base">Branch & Bound (Exact TSP)</h3>
                    <p className="text-xs text-brand-text-secondary">State-space search with lower-bound pruning</p>
                  </div>
                </div>
                {bbResult?.isOptimal && (
                  <Badge variant="success" className="bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Guaranteed Optimal
                  </Badge>
                )}
              </div>

              {bbResult ? (
                bbResult.error ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                    {bbResult.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Distance & Time stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-brand-surface rounded-lg border border-brand-border/60">
                        <span className="text-[11px] text-brand-text-secondary uppercase font-semibold">Total Tour</span>
                        <p className="text-xl font-extrabold text-brand-text font-mono mt-0.5">
                          {bbResult.totalDistance} <span className="text-xs font-normal">km</span>
                        </p>
                      </div>

                      <div className="p-3 bg-brand-surface rounded-lg border border-brand-border/60">
                        <span className="text-[11px] text-brand-text-secondary uppercase font-semibold">Observed Time</span>
                        <p className="text-xl font-extrabold text-brand-text font-mono mt-0.5 flex items-center gap-1">
                          <Clock className="w-4 h-4 text-brand-primary" />
                          {bbResult.executionTimeMs} <span className="text-xs font-normal">ms</span>
                        </p>
                      </div>

                      <div className="p-3 bg-brand-surface rounded-lg border border-brand-border/60 col-span-2 sm:col-span-1">
                        <span className="text-[11px] text-brand-text-secondary uppercase font-semibold">Pruned Branches</span>
                        <p className="text-xl font-extrabold text-emerald-700 font-mono mt-0.5">
                          {bbResult.nodesPruned ?? 0}
                        </p>
                      </div>
                    </div>

                    {/* Complete Visit Order Route */}
                    <div>
                      <span className="text-xs font-semibold text-brand-text block mb-2">
                        Complete Visit Order ({bbResult.tourLocations.length} steps):
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 bg-brand-surface/70 p-3 rounded-xl border border-brand-border/60">
                        {bbResult.tourLocations.map((loc, idx) => (
                          <React.Fragment key={idx}>
                            <span className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
                              loc.type === 'warehouse'
                                ? 'bg-brand-primary text-white font-semibold'
                                : 'bg-white text-brand-text border border-brand-border shadow-2xs'
                            }`}>
                              {loc.type === 'warehouse' ? (
                                <WarehouseIcon className="w-3 h-3 text-white" />
                              ) : (
                                <MapPin className="w-3 h-3 text-amber-600" />
                              )}
                              <span>{loc.name}</span>
                            </span>
                            {idx < bbResult.tourLocations.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-brand-text-secondary/70 flex-shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-brand-text-secondary bg-brand-soft/30 p-2.5 rounded-lg border border-brand-border/40 space-y-1">
                      <p><strong>Complexity:</strong> Worst-case exponential $O(n!)$; state branches pruned using admissible lower bound: <em>current_cost + min_outgoing_unvisited</em>.</p>
                      <p><strong>Nodes explored:</strong> {bbResult.nodesExplored} states.</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-8 text-center text-brand-text-secondary border border-dashed border-brand-border rounded-lg text-xs">
                  Run Branch & Bound to inspect the optimal tour.
                </div>
              )}
            </Card>

            {/* Greedy Nearest-Neighbor Card */}
            <Card variant="glass" className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-text text-base">Greedy Nearest-Neighbor</h3>
                    <p className="text-xs text-brand-text-secondary">Iterative locally optimal choice heuristic</p>
                  </div>
                </div>
                <Badge variant="warning" className="bg-amber-50 text-amber-800 border border-amber-300">
                  Polynomial Heuristic
                </Badge>
              </div>

              {greedyResult ? (
                greedyResult.error ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                    {greedyResult.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Distance & Time stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-brand-surface rounded-lg border border-brand-border/60">
                        <span className="text-[11px] text-brand-text-secondary uppercase font-semibold">Total Tour</span>
                        <p className="text-xl font-extrabold text-brand-text font-mono mt-0.5">
                          {greedyResult.totalDistance} <span className="text-xs font-normal">km</span>
                        </p>
                      </div>

                      <div className="p-3 bg-brand-surface rounded-lg border border-brand-border/60">
                        <span className="text-[11px] text-brand-text-secondary uppercase font-semibold">Observed Time</span>
                        <p className="text-xl font-extrabold text-brand-text font-mono mt-0.5 flex items-center gap-1">
                          <Clock className="w-4 h-4 text-amber-600" />
                          {greedyResult.executionTimeMs} <span className="text-xs font-normal">ms</span>
                        </p>
                      </div>
                    </div>

                    {/* Complete Visit Order Route */}
                    <div>
                      <span className="text-xs font-semibold text-brand-text block mb-2">
                        Complete Visit Order ({greedyResult.tourLocations.length} steps):
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 bg-brand-surface/70 p-3 rounded-xl border border-brand-border/60">
                        {greedyResult.tourLocations.map((loc, idx) => (
                          <React.Fragment key={idx}>
                            <span className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
                              loc.type === 'warehouse'
                                ? 'bg-amber-700 text-white font-semibold'
                                : 'bg-white text-brand-text border border-brand-border shadow-2xs'
                            }`}>
                              {loc.type === 'warehouse' ? (
                                <WarehouseIcon className="w-3 h-3 text-white" />
                              ) : (
                                <MapPin className="w-3 h-3 text-amber-600" />
                              )}
                              <span>{loc.name}</span>
                            </span>
                            {idx < greedyResult.tourLocations.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-brand-text-secondary/70 flex-shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-brand-text-secondary bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/50 space-y-1">
                      <p><strong>Complexity:</strong> Deterministic $O(n^2)$ polynomial time; greedy choice at each stop.</p>
                      <p><strong>Heuristic disclaimer:</strong> Locally optimal decisions can lead to an inferior global tour.</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-8 text-center text-brand-text-secondary border border-dashed border-brand-border rounded-lg text-xs">
                  Run Greedy Nearest-Neighbor to inspect heuristic baseline.
                </div>
              )}
            </Card>
          </div>

          {/* Comparative Benchmark Summary Table */}
          {bbResult && greedyResult && bbResult.hasTour && greedyResult.hasTour && (
            <Card variant="glass" className="p-6 space-y-4">
              <h3 className="font-bold text-base text-brand-text flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brand-primary" />
                Algorithm Performance Comparison
              </h3>

              {(() => {
                const diffKm = Number((greedyResult.totalDistance - bbResult.totalDistance).toFixed(2));
                const pctGap = bbResult.totalDistance > 0 
                  ? Number(((diffKm / bbResult.totalDistance) * 100).toFixed(1))
                  : 0;
                
                return (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-brand-border text-xs">
                      <thead className="bg-brand-surface text-brand-text font-bold">
                        <tr>
                          <th className="py-2.5 px-4 text-left">Metric</th>
                          <th className="py-2.5 px-4 text-center">Branch & Bound (Exact)</th>
                          <th className="py-2.5 px-4 text-center">Greedy Nearest Neighbor</th>
                          <th className="py-2.5 px-4 text-right">Variance / Optimality Gap</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border bg-white text-brand-text">
                        <tr>
                          <td className="py-3 px-4 font-semibold">Total Tour Distance</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-emerald-800">
                            {bbResult.totalDistance} km
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-amber-800">
                            {greedyResult.totalDistance} km
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {diffKm > 0 ? (
                              <span className="text-emerald-700">
                                B&B is {diffKm} km shorter ({pctGap}% savings)
                              </span>
                            ) : diffKm === 0 ? (
                              <span className="text-brand-text-secondary">Identical tours (0 km gap)</span>
                            ) : (
                              <span className="text-rose-700">{Math.abs(diffKm)} km difference</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-semibold">Observed Runtime</td>
                          <td className="py-3 px-4 text-center font-mono">{bbResult.executionTimeMs} ms</td>
                          <td className="py-3 px-4 text-center font-mono">{greedyResult.executionTimeMs} ms</td>
                          <td className="py-3 px-4 text-right text-brand-text-secondary">
                            Greedy: polynomial $O(n^2)$ vs B&B: bounded search
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-semibold">Optimality Guarantee</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Proven Optimal
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-amber-700 font-medium">
                            Approximation Heuristic
                          </td>
                          <td className="py-3 px-4 text-right text-brand-text-secondary">
                            B&B explores state tree; Greedy makes myopic choices
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </Card>
          )}
        </div>
      )}

      {/* Floyd-Warshall All-Pairs Shortest Path Section */}
      {fwResult && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
            <div>
              <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
                <Network className="w-5 h-5 text-emerald-700" />
                <span>Floyd-Warshall All-Pairs Shortest Path Analysis</span>
              </h2>
              <p className="text-xs text-brand-text-secondary mt-0.5">
                Exact all-pairs shortest paths computed via dynamic programming recurrence: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]).
              </p>
            </div>
            <Badge variant="default" className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-xs">
              DAA: O(V³) Time • O(V²) Space
            </Badge>
          </div>

          {/* DAA Telemetry Card */}
          <Card variant="glass" className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-white rounded-lg border border-brand-border space-y-1">
                <span className="text-[11px] font-semibold text-brand-text-secondary block">Algorithm & Paradigm</span>
                <span className="text-sm font-bold text-brand-text flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  Floyd-Warshall DP
                </span>
                <span className="text-[10px] text-brand-text-secondary block font-mono">Dynamic Programming</span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-brand-border space-y-1">
                <span className="text-[11px] font-semibold text-brand-text-secondary block">Graph Topology</span>
                <span className="text-sm font-bold text-brand-text flex items-center gap-1.5 font-mono">
                  <MapPin className="w-4 h-4 text-brand-primary" />
                  {fwResult.nodes.length} Vertices • {activeLocations.length * (activeLocations.length - 1)} Edges
                </span>
                <span className="text-[10px] text-brand-text-secondary block font-mono">Road distance network</span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-brand-border space-y-1">
                <span className="text-[11px] font-semibold text-brand-text-secondary block">Solver Runtime</span>
                <span className="text-sm font-bold text-emerald-800 flex items-center gap-1.5 font-mono">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  {fwResult.executionTimeMs} ms
                </span>
                <span className="text-[10px] text-brand-text-secondary block font-mono">O(V³) execution</span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-brand-border space-y-1">
                <span className="text-[11px] font-semibold text-brand-text-secondary block">Reachable Pairs</span>
                <span className="text-sm font-bold text-brand-text flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {fwResult.reachablePairsCount} / {fwResult.totalPossiblePairs}
                </span>
                <span className="text-[10px] text-brand-text-secondary block font-mono">
                  {fwResult.hasNegativeCycle ? 'Negative cycle detected!' : 'Non-negative road graph'}
                </span>
              </div>
            </div>
          </Card>

          {/* Interactive Pairwise Path Reconstruction & Distance Inspector */}
          <Card variant="glass" className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-4">
              <div>
                <h3 className="font-bold text-brand-text text-base flex items-center gap-2">
                  <Route className="w-5 h-5 text-brand-primary" />
                  Pairwise Shortest-Path & Hop Reconstruction Inspector
                </h3>
                <p className="text-xs text-brand-text-secondary mt-0.5">
                  Query the reconstructed sequence of vertex hops and compare direct road distance against the Floyd-Warshall shortest path.
                </p>
              </div>

              {/* Node Selectors */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-brand-text">Origin (A):</span>
                  <select
                    value={fwSourceId}
                    onChange={(e) => setFwSourceId(e.target.value)}
                    className="text-xs font-medium rounded-lg border border-brand-border bg-white px-2.5 py-1.5 text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    {activeLocations.map((loc, idx) => (
                      <option key={loc.id} value={loc.id}>
                        [{idx}] {loc.name} {loc.type === 'warehouse' ? '(Depot)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-brand-text">Target (B):</span>
                  <select
                    value={fwTargetId}
                    onChange={(e) => setFwTargetId(e.target.value)}
                    className="text-xs font-medium rounded-lg border border-brand-border bg-white px-2.5 py-1.5 text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    {activeLocations.map((loc, idx) => (
                      <option key={loc.id} value={loc.id}>
                        [{idx}] {loc.name} {loc.type === 'warehouse' ? '(Depot)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Path Inspection Result */}
            {fwPathInfo && (
              <div className="space-y-4">
                {!fwPathInfo.hasPath ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-rose-800 text-xs font-medium">
                    <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold">No Route / Disconnected Pair:</span> No directed path exists in the current network from the selected origin to destination. Distance is infinite (∞).
                    </div>
                  </div>
                ) : fwSourceId === fwTargetId ? (
                  <div className="p-4 bg-brand-surface border border-brand-border rounded-lg flex items-center gap-3 text-brand-text text-xs">
                    <Info className="w-5 h-5 text-brand-primary flex-shrink-0" />
                    <div>
                      <span className="font-bold">Identity Route (Source = Destination):</span> Distance is <span className="font-mono font-bold">0.00 km</span>. No intermediate traversal is required.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Distance Comparison Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-white rounded-lg border border-brand-border space-y-1">
                        <span className="text-[11px] font-semibold text-brand-text-secondary block">
                          DIRECT ROAD DISTANCE
                        </span>
                        <div className="text-xl font-mono font-extrabold text-brand-text">
                          {directPairDistance !== null ? `${directPairDistance} km` : 'No direct link'}
                        </div>
                        <span className="text-[10px] text-brand-text-secondary">
                          Single edge directly from A to B
                        </span>
                      </div>

                      <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-200 space-y-1">
                        <span className="text-[11px] font-semibold text-emerald-800 block">
                          FLOYD-WARSHALL SHORTEST PATH
                        </span>
                        <div className="text-xl font-mono font-extrabold text-emerald-800">
                          {fwPathInfo.distance} km
                        </div>
                        <span className="text-[10px] text-emerald-700">
                          Globally optimal path across all graph vertices
                        </span>
                      </div>

                      <div className="p-4 bg-white rounded-lg border border-brand-border space-y-1">
                        <span className="text-[11px] font-semibold text-brand-text-secondary block">
                          PATH TRAVERSAL HOPS
                        </span>
                        <div className="text-xl font-mono font-extrabold text-brand-primary">
                          {fwPathInfo.hopCount} {fwPathInfo.hopCount === 1 ? 'hop' : 'hops'}
                        </div>
                        <span className="text-[10px] text-brand-text-secondary">
                          {fwPathInfo.pathNames.length} nodes traversed
                        </span>
                      </div>
                    </div>

                    {/* DAA Optimization Insight Banner */}
                    {directPairDistance !== null && fwPathInfo.distance < directPairDistance && (
                      <div className="p-3.5 bg-emerald-100/70 border border-emerald-300 rounded-lg text-xs text-emerald-900 flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                        <div>
                          <span className="font-bold">DAA Intermediate Detour Optimization:</span> Floyd-Warshall identified an indirect route via intermediate nodes that is <span className="font-mono font-bold">{(directPairDistance - fwPathInfo.distance).toFixed(2)} km shorter</span> than the direct road connection!
                        </div>
                      </div>
                    )}

                    {directPairDistance !== null && fwPathInfo.distance === directPairDistance && (
                      <div className="p-3 bg-brand-surface/60 border border-brand-border rounded-lg text-xs text-brand-text-secondary flex items-center gap-2">
                        <Info className="w-4 h-4 text-brand-primary flex-shrink-0" />
                        <span>The direct single-hop edge is already the global shortest path in the network.</span>
                      </div>
                    )}

                    {/* Reconstructed Path Sequence */}
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-brand-text block">
                        Reconstructed Hop Sequence (Predecessor Chain):
                      </span>
                      <div className="flex flex-wrap items-center gap-2 p-3 bg-brand-surface/50 border border-brand-border rounded-lg">
                        {fwPathInfo.pathNames.map((nodeName, idx) => (
                          <React.Fragment key={idx}>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border ${
                              idx === 0 
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                                : idx === fwPathInfo.pathNames.length - 1
                                ? 'bg-brand-primary text-white border-brand-primary'
                                : 'bg-white text-brand-text border-brand-border'
                            }`}>
                              <span className="font-mono text-[10px] opacity-70">[{idx}]</span>
                              <span>{nodeName}</span>
                            </div>
                            {idx < fwPathInfo.pathNames.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-brand-text-secondary flex-shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Toggle Full Matrix View */}
            <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between">
              <span className="text-xs text-brand-text-secondary">
                View complete calculated D^(V) matrix for all {fwResult.nodes.length}×{fwResult.nodes.length} vertex pairs
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFwMatrix(prev => !prev)}
                className="text-xs flex items-center gap-1.5"
              >
                {showFwMatrix ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showFwMatrix ? 'Hide All-Pairs Shortest Matrix' : 'View All-Pairs Shortest Matrix'}</span>
              </Button>
            </div>

            {/* Collapsible All-Pairs Shortest-Distance Matrix Table */}
            {showFwMatrix && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-text">
                    Floyd-Warshall All-Pairs Shortest Distance Matrix (D_ij) in km
                  </span>
                  <div className="flex items-center gap-3 text-[11px] text-brand-text-secondary">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300 inline-block" />
                      Multi-hop shorter than direct
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-brand-surface border border-brand-border inline-block" />
                      Diagonal (0 km)
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-brand-border rounded-lg max-h-96">
                  <table className="min-w-full divide-y divide-brand-border text-xs">
                    <thead className="bg-brand-surface sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3 text-left font-bold text-brand-text bg-brand-surface">
                          Origin \ Dest
                        </th>
                        {fwResult.nodes.map((n, j) => (
                          <th key={n.id} className="py-2 px-3 text-center font-bold text-brand-text truncate max-w-[120px]" title={n.name}>
                            [{j}] {n.name.length > 12 ? `${n.name.slice(0, 12)}...` : n.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border bg-white text-brand-text">
                      {fwResult.nodes.map((rowNode, i) => (
                        <tr key={rowNode.id} className="hover:bg-brand-surface/40 transition-colors">
                          <td className="py-2 px-3 font-semibold text-brand-text bg-brand-surface/20 whitespace-nowrap">
                            [{i}] {rowNode.name}
                          </td>
                          {fwResult.nodes.map((colNode, j) => {
                            const shortestDist = fwResult.distances[i][j];
                            const directDist = matrix[i]?.[j];
                            const isMultiHopShorter = i !== j && directDist !== undefined && directDist !== Infinity && shortestDist < directDist;
                            const isDiagonal = i === j;
                            const isUnreachable = shortestDist === Infinity;

                            return (
                              <td
                                key={colNode.id}
                                className={`py-2 px-3 text-center font-mono text-xs ${
                                  isDiagonal
                                    ? 'bg-brand-surface/50 text-brand-text-secondary font-semibold'
                                    : isMultiHopShorter
                                    ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                                    : isUnreachable
                                    ? 'text-rose-600 font-semibold'
                                    : 'text-brand-text'
                                }`}
                              >
                                {isDiagonal ? (
                                  '0 km'
                                ) : isUnreachable ? (
                                  '∞'
                                ) : (
                                  <div>
                                    <span>{shortestDist} km</span>
                                    {isMultiHopShorter && (
                                      <span className="block text-[9px] text-emerald-700 font-sans font-medium">
                                        (save {(directDist - shortestDist).toFixed(1)} km)
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Kruskal Minimum Spanning Tree Section */}
      {kruskalResult && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
            <div>
              <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-700" />
                <span>Kruskal's Minimum Spanning Tree (Logistics Backbone Network)</span>
              </h2>
              <p className="text-xs text-brand-text-secondary mt-0.5">
                Greedy minimum-cost network construction with Disjoint Set (Union-Find) cycle detection.
              </p>
            </div>
            <Badge variant="default" className="bg-indigo-50 text-indigo-800 border border-indigo-300 font-mono text-xs">
              DAA: O(E log E) Time • O(V + E) Space
            </Badge>
          </div>

          {/* DAA Telemetry Card */}
          <Card variant="glass" className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-white rounded-lg border border-brand-border space-y-1">
                <span className="text-[11px] font-semibold text-brand-text-secondary block">Algorithm & Paradigm</span>
                <span className="text-sm font-bold text-brand-text flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  Kruskal (Greedy)
                </span>
                <span className="text-[10px] text-brand-text-secondary block font-mono">Cycle Detection: Union-Find</span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-brand-border space-y-1">
                <span className="text-[11px] font-semibold text-brand-text-secondary block">Network Scale</span>
                <span className="text-sm font-bold text-brand-text flex items-center gap-1.5 font-mono">
                  <MapPin className="w-4 h-4 text-brand-primary" />
                  {kruskalResult.vertexCount} Vertices • {kruskalResult.inputEdgeCount} Undirected Edges
                </span>
                <span className="text-[10px] text-brand-text-secondary block font-mono">Consolidated road graph</span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-brand-border space-y-1">
                <span className="text-[11px] font-semibold text-brand-text-secondary block">Backbone Total Distance</span>
                <span className="text-sm font-bold text-indigo-800 flex items-center gap-1.5 font-mono">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  {kruskalResult.totalCost} km
                </span>
                <span className="text-[10px] text-brand-text-secondary block font-mono">
                  {kruskalResult.selectedEdgeCount} selected of {kruskalResult.inputEdgeCount} edges
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-brand-border space-y-1">
                <span className="text-[11px] font-semibold text-brand-text-secondary block">Topology Status</span>
                <span className={`text-sm font-bold flex items-center gap-1.5 font-mono ${kruskalResult.isConnected ? 'text-emerald-700' : 'text-amber-700'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  {kruskalResult.isConnected ? 'Connected MST' : `Spanning Forest (${kruskalResult.componentCount} Trees)`}
                </span>
                <span className="text-[10px] text-brand-text-secondary block font-mono">
                  {kruskalResult.rejectedEdgesCount} cycle edges pruned
                </span>
              </div>
            </div>
          </Card>

          {/* Map Visualization & Selected Edges Ledger */}
          <Card variant="glass" className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-4">
              <div>
                <h3 className="font-bold text-brand-text text-base flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-indigo-600" />
                  Logistics Network Backbone Infrastructure
                </h3>
                <p className="text-xs text-brand-text-secondary mt-0.5">
                  Visualizes the optimal minimum-cost acyclic network connecting warehouse depots and delivery clusters.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMstMap(prev => !prev)}
                className="text-xs flex items-center gap-1.5"
              >
                {showMstMap ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showMstMap ? 'Hide Map View' : 'Show Map View'}</span>
              </Button>
            </div>

            {/* Leaflet Map Preview */}
            {showMstMap && (
              <MstNetworkMap
                nodes={activeLocations.map(loc => ({
                  id: loc.id,
                  name: loc.name,
                  type: loc.type,
                  latitude: loc.latitude,
                  longitude: loc.longitude
                }))}
                mstEdges={kruskalResult.mstEdges}
                height="360px"
              />
            )}

            {/* Selected Edges Ledger Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-text">
                  Selected Minimum Spanning Tree Edges ({kruskalResult.mstEdges.length} Edges)
                </span>
                <span className="text-[11px] text-brand-text-secondary font-mono">
                  Total Backbone Distance: <strong className="text-indigo-800 font-bold">{kruskalResult.totalCost} km</strong>
                </span>
              </div>

              <div className="overflow-x-auto border border-brand-border rounded-lg max-h-72">
                <table className="min-w-full divide-y divide-brand-border text-xs">
                  <thead className="bg-brand-surface sticky top-0 z-10 font-bold text-brand-text">
                    <tr>
                      <th className="py-2.5 px-3 text-center">Edge #</th>
                      <th className="py-2.5 px-4 text-left">Origin Node (u)</th>
                      <th className="py-2.5 px-4 text-left">Destination Node (v)</th>
                      <th className="py-2.5 px-4 text-right">Edge Distance (km)</th>
                      <th className="py-2.5 px-4 text-right">Cumulative Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border bg-white text-brand-text">
                    {(() => {
                      let cumulative = 0;
                      return kruskalResult.mstEdges.map((edge, idx) => {
                        cumulative += edge.weight;
                        return (
                          <tr key={`kruskal-edge-${edge.from}-${edge.to}-${idx}`} className="hover:bg-brand-surface/40 transition-colors">
                            <td className="py-2 px-3 text-center font-mono font-bold text-indigo-700 bg-indigo-50/40">
                              #{idx + 1}
                            </td>
                            <td className="py-2 px-4 font-semibold text-brand-text">
                              {edge.fromName}
                            </td>
                            <td className="py-2 px-4 font-semibold text-brand-text">
                              {edge.toName}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-bold text-emerald-800">
                              {edge.weight} km
                            </td>
                            <td className="py-2 px-4 text-right font-mono text-brand-text-secondary">
                              {cumulative.toFixed(2)} km
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-brand-surface/50 border border-brand-border rounded-lg text-[11px] text-brand-text-secondary flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-primary flex-shrink-0" />
                <span>
                  <strong>Architectural Clarification:</strong> Kruskal's algorithm identifies the minimal physical infrastructure required to connect all points. It is not an order-fulfillment sequence or delivery route (which is solved by TSP).
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
