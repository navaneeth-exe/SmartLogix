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
  AlgorithmResult 
} from '../types/database.types';
import { 
  validateTSPMatrix, 
  solveBranchAndBoundTSP, 
  solveGreedyNearestNeighbor 
} from '../algorithms/tsp';
import { 
  Warehouse as WarehouseIcon, MapPin, Save, Play, 
  CheckCircle2, AlertCircle, ArrowRight, Clock, 
  Cpu, Zap, SlidersHorizontal, RefreshCw, Info, Layers,
  Check, X
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

  // Distance Matrix State: 2D array [i][j]
  const [matrix, setMatrix] = useState<number[][]>([]);

  // UI & Execution State
  const [saving, setSaving] = useState(false);
  const [runningAlgo, setRunningAlgo] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bbResult, setBbResult] = useState<AlgorithmResult | null>(null);
  const [greedyResult, setGreedyResult] = useState<AlgorithmResult | null>(null);

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
        address: wh.address
      });
    }
    selectedLocationIds.forEach(id => {
      const loc = deliveryLocations.find(l => l.id === id);
      if (loc) {
        list.push({
          id: loc.id,
          name: loc.name,
          type: 'delivery_location',
          address: loc.address
        });
      }
    });
    return list;
  }, [warehouses, selectedWarehouseId, deliveryLocations, selectedLocationIds]);

  // Reinitialize or resize the matrix when active locations change
  useEffect(() => {
    const n = activeLocations.length;
    if (n === 0) {
      setMatrix([]);
      return;
    }

    setMatrix(prev => {
      const next: number[][] = [];
      for (let i = 0; i < n; i++) {
        next[i] = [];
        for (let j = 0; j < n; j++) {
          if (i === j) {
            next[i][j] = 0;
          } else if (prev[i] && prev[i][j] !== undefined) {
            next[i][j] = prev[i][j];
          } else {
            // Generate a deterministic default simulation distance in km
            const charSum = (activeLocations[i].name.charCodeAt(0) + activeLocations[j].name.charCodeAt(0)) % 35;
            const seedDist = 12 + charSum;
            next[i][j] = seedDist;
          }
        }
      }
      return next;
    });

    // Clear previous results on location set modification
    setBbResult(null);
    setGreedyResult(null);
  }, [activeLocations]);

  // Handle cell edit with symmetric support
  const handleCellChange = (i: number, j: number, val: string) => {
    const num = parseFloat(val);
    const validVal = isNaN(num) ? 0 : Math.max(0, Number(num.toFixed(1)));

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
    setStatusMessage({ type: 'success', text: 'Populated simulation distances (km). All values are editable.' });
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
      const entries: { origin_id: string; destination_id: string; distance: number }[] = [];
      const n = activeLocations.length;

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            entries.push({
              origin_id: activeLocations[i].id,
              destination_id: activeLocations[j].id,
              distance: matrix[i][j]
            });
          }
        }
      }

      await api.distances.saveBatch(entries);
      setStatusMessage({ type: 'success', text: `Successfully saved ${entries.length} pairwise distances to Supabase.` });
    } catch (err: unknown) {
      console.error('Save error:', err);
      setStatusMessage({ type: 'error', text: 'Failed to persist distances to Supabase database.' });
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
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Distance Matrix & DAA Algorithms"
        description="Manage simulation road distances (km) and benchmark Travelling Salesman Problem (TSP) solvers."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handlePrefillSimulation}
              className="flex items-center gap-2 border-brand-border text-brand-dark bg-white hover:bg-brand-surface shadow-sm"
            >
              <RefreshCw className="w-4 h-4 text-brand-primary" />
              <span>Pre-fill Distances</span>
            </Button>
            <Button 
              onClick={handleSaveToDatabase} 
              disabled={saving || !validation.valid}
              className="bg-brand-primary hover:bg-brand-active text-white flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Matrix'}</span>
            </Button>
          </div>
        }
      />

      {/* Status Messages */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
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

      {/* Simulation Notice Banner */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900">
        <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-amber-950">Simulation Distance Model Note</p>
          <p className="text-amber-800 leading-relaxed">
            Distances in this matrix represent simulated transit distances in <strong>kilometres (km)</strong>. 
            They are maintained independently from GPS map coordinates, guaranteeing deterministic, customizable algorithm benchmarking for academic DAA demonstrations.
          </p>
        </div>
      </div>

      {/* Grid: 1. Location Selection & 2. Matrix Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Warehouse & Location Selection */}
        <Card className="p-6 bg-white border border-brand-border/80 shadow-sm space-y-6">
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
              className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2.5 text-sm font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
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
        <Card className="lg:col-span-2 p-6 bg-white border border-brand-border/80 shadow-sm flex flex-col justify-between">
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
              <div className="flex items-center gap-3 bg-brand-surface px-3 py-2 rounded-lg border border-brand-border">
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
              <div className="p-12 text-center text-brand-text-secondary border-2 border-dashed border-brand-border rounded-xl">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-semibold text-brand-text">At least 2 locations required</p>
                <p className="text-xs mt-1">Select a starting warehouse and at least one delivery stop on the left.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-brand-border rounded-xl">
                <table className="min-w-full divide-y divide-brand-border text-xs">
                  <thead className="bg-brand-surface text-brand-text-secondary">
                    <tr>
                      <th className="py-2.5 px-3 text-left font-bold sticky left-0 bg-brand-surface z-10 border-r border-brand-border">
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
            <Card className="p-6 bg-white border border-brand-border/80 shadow-sm space-y-5">
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
            <Card className="p-6 bg-white border border-brand-border/80 shadow-sm space-y-5">
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
            <Card className="p-6 bg-white border border-brand-border/80 shadow-sm space-y-4">
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
    </div>
  );
};
