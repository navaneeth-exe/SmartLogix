import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { 
  Warehouse, 
  Order, 
  DeliveryPlan, 
  DeliveryPlanStatus,
  Vehicle,
  RouteOptimizationAlgorithm,
  RouteStop,
  MatrixLocation,
  DeliveryLocation,
  DistanceSource
} from '../types/database.types';
import { RouteMap } from '../components/RouteMap';
import { 
  validateTSPMatrix, 
  solveBranchAndBoundTSP, 
  solveGreedyNearestNeighbor 
} from '../algorithms/tsp';
import { 
  Route, Plus, Search, Filter, Eye, XCircle, CheckCircle2, 
  AlertCircle, Warehouse as WarehouseIcon, MapPin, 
  Calendar, Package, Check, X, Truck, ArrowRightLeft, Trash2,
  Compass, Layers, Zap, Clock, ArrowRight, Map as MapIcon, Car,
  SlidersHorizontal, RotateCcw
} from 'lucide-react';

export const Planning: React.FC = () => {
  // State
  const [plans, setPlans] = useState<DeliveryPlan[]>([]);
  const [eligibleOrders, setEligibleOrders] = useState<Order[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Road Distances & Optimization State
  const [generatingRoadDistances, setGeneratingRoadDistances] = useState(false);
  const [routeDistanceSource, setRouteDistanceSource] = useState<DistanceSource | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DeliveryPlanStatus>('ALL');

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DeliveryPlan | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isVehicleSelectorOpen, setIsVehicleSelectorOpen] = useState(false);
  const [selectedAssignVehicleId, setSelectedAssignVehicleId] = useState<string>('');

  // Route Optimization State
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<RouteOptimizationAlgorithm>('BRANCH_AND_BOUND');
  const [optimizingRoute, setOptimizingRoute] = useState(false);

  // Create Plan Form State
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderPriorityFilter, setOrderPriorityFilter] = useState<string>('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Alert Messages
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, ordersData, warehousesData, vehiclesData, locationsData] = await Promise.all([
        api.plans.list(),
        api.plans.getEligibleOrders(),
        api.warehouses.list(),
        api.plans.getAvailableVehicles(),
        api.locations.list()
      ]);
      setPlans(plansData);
      setEligibleOrders(ordersData);
      setWarehouses(warehousesData);
      setAvailableVehicles(vehiclesData);
      setDeliveryLocations(locationsData);

      if (warehousesData.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(warehousesData[0].id);
      }
    } catch (err: unknown) {
      console.error('Error loading delivery planning data:', err);
      setStatusMessage({ type: 'error', text: 'Failed to load delivery plans, orders, and vehicles.' });
    } finally {
      setLoading(false);
    }
  };

  // Open Creation Modal
  const openCreateModal = () => {
    setSelectedOrderIds([]);
    setOrderSearchQuery('');
    setOrderPriorityFilter('ALL');
    setStatusMessage(null);
    setIsCreateModalOpen(true);
  };

  // Handle Order Selection in Creation Modal
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAllFilteredOrders = (filtered: Order[]) => {
    const newIds = new Set(selectedOrderIds);
    filtered.forEach(o => newIds.add(o.id));
    setSelectedOrderIds(Array.from(newIds));
  };

  const handleClearSelectedOrders = () => {
    setSelectedOrderIds([]);
  };

  // Filtered Eligible Orders in Creation Modal
  const filteredEligibleOrders = useMemo(() => {
    return eligibleOrders.filter(order => {
      const matchesSearch = 
        order.order_number.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        (order.delivery_location?.name && order.delivery_location.name.toLowerCase().includes(orderSearchQuery.toLowerCase())) ||
        (order.delivery_location?.address && order.delivery_location.address.toLowerCase().includes(orderSearchQuery.toLowerCase()));

      const matchesPriority = orderPriorityFilter === 'ALL' || order.priority === orderPriorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [eligibleOrders, orderSearchQuery, orderPriorityFilter]);

  // Selected Orders Review in Creation Modal
  const selectedOrdersReview = useMemo(() => {
    return eligibleOrders.filter(o => selectedOrderIds.includes(o.id));
  }, [eligibleOrders, selectedOrderIds]);

  // Distinct Delivery Locations for the selected orders
  const selectedLocationsReview = useMemo(() => {
    const map = new Map<string, { id: string; name: string; address?: string | null; count: number }>();
    selectedOrdersReview.forEach(order => {
      if (order.delivery_location) {
        const existing = map.get(order.delivery_location.id);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(order.delivery_location.id, {
            id: order.delivery_location.id,
            name: order.delivery_location.name,
            address: order.delivery_location.address,
            count: 1
          });
        }
      }
    });
    return Array.from(map.values());
  }, [selectedOrdersReview]);

  const selectedTotalValue = useMemo(() => {
    return selectedOrdersReview.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [selectedOrdersReview]);

  // Handle Create Plan Submission
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouseId) {
      setStatusMessage({ type: 'error', text: 'Please select a starting warehouse.' });
      return;
    }
    if (selectedOrderIds.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one customer order.' });
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage(null);
      await api.plans.create({
        warehouse_id: selectedWarehouseId,
        order_ids: selectedOrderIds
      });

      setStatusMessage({ type: 'success', text: `Successfully generated new delivery plan with ${selectedOrderIds.length} customer orders!` });
      setIsCreateModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      console.error('Plan creation error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create delivery plan.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Details Modal
  const openPlanDetails = async (plan: DeliveryPlan) => {
    setSelectedPlan(plan);
    setModalMessage(null);
    setIsVehicleSelectorOpen(false);
    setSelectedAssignVehicleId('');
    setSelectedAlgorithm('BRANCH_AND_BOUND');
    setIsDetailModalOpen(true);
    
    // Refresh available vehicles
    try {
      const avVehicles = await api.plans.getAvailableVehicles();
      setAvailableVehicles(avVehicles);
    } catch (e) {
      console.error('Error fetching available vehicles:', e);
    }
  };

  // Calculate Capacity Requirements for Selected Plan
  const planRequirements = useMemo(() => {
    if (!selectedPlan) return { weightKg: 0, units: 0 };
    let weightKg = 0;
    let units = 0;

    selectedPlan.delivery_plan_orders?.forEach(dpo => {
      dpo.order?.order_items?.forEach(item => {
        const qty = Number(item.quantity) || 0;
        const unitWeight = Number(item.product?.weight_kg) || 10;
        units += qty;
        weightKg += qty * unitWeight;
      });
    });

    return {
      weightKg: Number(weightKg.toFixed(1)),
      units
    };
  }, [selectedPlan]);

  // Handle Vehicle Assignment
  const handleAssignVehicle = async (vehicleId: string) => {
    if (!selectedPlan) return;
    try {
      setActionLoading(true);
      setModalMessage(null);
      await api.plans.assignVehicle(selectedPlan.id, vehicleId);
      
      setModalMessage({ type: 'success', text: 'Vehicle successfully assigned to delivery plan!' });
      setIsVehicleSelectorOpen(false);
      setSelectedAssignVehicleId('');

      // Refresh plan data
      const updatedPlan = await api.plans.getById(selectedPlan.id);
      setSelectedPlan(updatedPlan);
      await loadData();
    } catch (err: unknown) {
      console.error('Vehicle assignment error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to assign vehicle.';
      setModalMessage({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Vehicle Removal
  const handleRemoveVehicle = async () => {
    if (!selectedPlan) return;
    if (!window.confirm('Remove assigned vehicle from this delivery plan? The vehicle will be returned to AVAILABLE status.')) {
      return;
    }

    try {
      setActionLoading(true);
      setModalMessage(null);
      await api.plans.removeVehicle(selectedPlan.id);
      
      setModalMessage({ type: 'success', text: 'Vehicle unassigned from plan and marked AVAILABLE.' });
      
      // Refresh plan data
      const updatedPlan = await api.plans.getById(selectedPlan.id);
      setSelectedPlan(updatedPlan);
      await loadData();
    } catch (err: unknown) {
      console.error('Vehicle removal error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to remove vehicle.';
      setModalMessage({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // Generate / Optimize Route for Plan
  const handleGenerateRoute = async () => {
    if (!selectedPlan || !selectedPlan.warehouse) return;
    setOptimizingRoute(true);
    setModalMessage(null);

    try {
      // 1. Resolve distinct delivery locations from the plan's orders
      const locsMap = new Map<string, { id: string; name: string; address?: string | null; latitude?: number | null; longitude?: number | null; ordersCount: number }>();
      selectedPlan.delivery_plan_orders?.forEach(dpo => {
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
              latitude: loc.latitude,
              longitude: loc.longitude,
              ordersCount: 1
            });
          }
        }
      });

      const uniqueStops = Array.from(locsMap.values());
      if (uniqueStops.length === 0) {
        throw new Error('This delivery plan has no delivery locations to route.');
      }

      // Build locations array: Node 0 = warehouse depot, Nodes 1..k = unique delivery stops
      const locations: MatrixLocation[] = [
        {
          id: selectedPlan.warehouse.id,
          name: selectedPlan.warehouse.name,
          type: 'warehouse',
          address: selectedPlan.warehouse.address,
          latitude: selectedPlan.warehouse.latitude,
          longitude: selectedPlan.warehouse.longitude
        },
        ...uniqueStops.map(s => ({
          id: s.id,
          name: s.name,
          type: 'delivery_location' as const,
          address: s.address,
          latitude: s.latitude,
          longitude: s.longitude
        }))
      ];

      const n = locations.length;

      // Check safe limit for Branch and Bound exact solver
      if (selectedAlgorithm === 'BRANCH_AND_BOUND' && n > 10) {
        throw new Error(`Plan contains ${n} locations, which exceeds the safe limit of 10 for Branch & Bound exact search. Please select the Greedy Nearest-Neighbor heuristic.`);
      }

      // 2. Fetch configured distance matrix from Supabase location_distances table
      const savedDistances = await api.distances.list();
      const distanceLookup = new Map<string, { dist: number; source?: DistanceSource }>();
      savedDistances.forEach(d => {
        distanceLookup.set(`${d.origin_id}->${d.destination_id}`, {
          dist: Number(d.distance),
          source: d.distance_source
        });
      });

      // 3. Assemble 2D distance matrix & track distance source
      const matrix: number[][] = [];
      const missingPairs: string[] = [];
      let allPairsRoad = true;

      for (let i = 0; i < n; i++) {
        matrix[i] = [];
        for (let j = 0; j < n; j++) {
          if (i === j) {
            matrix[i][j] = 0;
          } else {
            const key = `${locations[i].id}->${locations[j].id}`;
            const reverseKey = `${locations[j].id}->${locations[i].id}`;
            const entry = distanceLookup.get(key) ?? distanceLookup.get(reverseKey);

            if (!entry || isNaN(entry.dist) || entry.dist < 0) {
              missingPairs.push(`"${locations[i].name}" ↔ "${locations[j].name}"`);
              matrix[i][j] = NaN;
            } else {
              matrix[i][j] = entry.dist;
              if (entry.source !== 'ORS_ROAD') {
                allPairsRoad = false;
              }
            }
          }
        }
      }

      // Handle missing matrix entries gracefully
      if (missingPairs.length > 0) {
        const sample = missingPairs.slice(0, 3).join(', ');
        throw new Error(`Missing road distances between ${sample}. Click "Generate Road Distances (ORS)" above to calculate real road matrix, or configure them on the Distance Matrix page.`);
      }

      // 4. Validate Matrix
      const matrixValidation = validateTSPMatrix(locations, matrix);
      if (!matrixValidation.valid) {
        throw new Error(`Distance matrix validation failed: ${matrixValidation.errors[0]}`);
      }

      // 5. Execute chosen algorithm
      const input = { locations, matrix, maxLocationsLimit: 10 };
      const result = selectedAlgorithm === 'BRANCH_AND_BOUND'
        ? solveBranchAndBoundTSP(input)
        : solveGreedyNearestNeighbor(input);

      if (!result.hasTour || result.error) {
        throw new Error(result.error || 'Failed to complete closed tour.');
      }

      // 6. Map tour indices to RouteStop array
      const routeStops: RouteStop[] = result.tourIndices.map((locIdx, seq) => {
        const loc = locations[locIdx];
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

      // 7. Persist route against plan in database
      await api.plans.saveRoute(
        selectedPlan.id,
        selectedAlgorithm,
        routeStops,
        result.totalDistance,
        result.executionTimeMs
      );

      const detectedSource: DistanceSource = allPairsRoad ? 'ORS_ROAD' : 'MANUAL_SIMULATION';
      setRouteDistanceSource(detectedSource);

      setModalMessage({
        type: 'success',
        text: `Optimized route generated with ${result.algorithmName}! Tour distance: ${result.totalDistance} km (${result.executionTimeMs} ms) using ${detectedSource === 'ORS_ROAD' ? 'OpenRouteService Road Network (driving-car)' : 'Simulation Distance Matrix'}.`
      });

      // Refresh plan details
      const updatedPlan = await api.plans.getById(selectedPlan.id);
      setSelectedPlan(updatedPlan);
      await loadData();
    } catch (err: unknown) {
      console.error('Route optimization error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to generate optimized route.';
      setModalMessage({ type: 'error', text: msg });
    } finally {
      setOptimizingRoute(false);
    }
  };

  // Generate real road distance matrix for the selected plan via ORS
  const handleGeneratePlanRoadDistances = async () => {
    if (!selectedPlan || !selectedPlan.warehouse) return;
    setModalMessage(null);

    try {
      setGeneratingRoadDistances(true);

      const locsMap = new Map<string, { id: string; name: string; latitude?: number | null; longitude?: number | null }>();
      selectedPlan.delivery_plan_orders?.forEach(dpo => {
        const loc = dpo.order?.delivery_location;
        if (loc) {
          locsMap.set(loc.id, {
            id: loc.id,
            name: loc.name,
            latitude: loc.latitude,
            longitude: loc.longitude
          });
        }
      });

      const uniqueStops = Array.from(locsMap.values());
      if (uniqueStops.length === 0) {
        throw new Error('This delivery plan has no delivery destinations assigned.');
      }

      const allLocs = [
        {
          id: selectedPlan.warehouse.id,
          name: selectedPlan.warehouse.name,
          latitude: Number(selectedPlan.warehouse.latitude),
          longitude: Number(selectedPlan.warehouse.longitude)
        },
        ...uniqueStops.map(s => ({
          id: s.id,
          name: s.name,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude)
        }))
      ];

      const missingCoords = allLocs.filter(l => isNaN(l.latitude) || isNaN(l.longitude) || l.latitude == null || l.longitude == null);
      if (missingCoords.length > 0) {
        throw new Error(`Missing coordinates for ${missingCoords.map(l => `"${l.name}"`).join(', ')}. Please set their location pins on the map first.`);
      }

      const res = await api.distances.generateRoadMatrix(allLocs, 'driving-car');

      const n = allLocs.length;
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
            const duration = res.durations_seconds[i]?.[j] ?? null;
            if (!isNaN(km)) {
              entries.push({
                origin_id: allLocs[i].id,
                destination_id: allLocs[j].id,
                distance: km,
                distance_meters: meters,
                distance_source: 'ORS_ROAD',
                routing_profile: res.profile || 'driving-car',
                duration_seconds: duration,
                generated_at: res.generated_at
              });
            }
          }
        }
      }

      await api.distances.saveBatch(entries);
      setRouteDistanceSource('ORS_ROAD');
      setModalMessage({
        type: 'success',
        text: `OpenRouteService road distance matrix successfully calculated & saved (${allLocs.length} locations, ${entries.length} directional legs).`
      });
    } catch (err: unknown) {
      console.error('Road matrix generation error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to generate road distance matrix.';
      setModalMessage({ type: 'error', text: msg });
    } finally {
      setGeneratingRoadDistances(false);
    }
  };

  // Cancel Delivery Plan
  const handleCancelPlan = async (planId: string) => {
    if (!window.confirm('Are you sure you want to cancel this delivery plan? Historical records will be preserved, assigned vehicles returned to AVAILABLE, and orders released back to the planning pool.')) {
      return;
    }

    try {
      setActionLoading(true);
      await api.plans.cancel(planId);
      setStatusMessage({ type: 'success', text: 'Delivery plan has been cancelled, vehicle released, and orders returned to eligible pool.' });
      
      // Update local state
      if (selectedPlan && selectedPlan.id === planId) {
        setSelectedPlan({ ...selectedPlan, status: 'CANCELLED', vehicle: null });
      }
      await loadData();
    } catch (err: unknown) {
      console.error('Plan cancellation error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to cancel delivery plan.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Plans List
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchesSearch = 
        p.plan_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.warehouse?.name && p.warehouse.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.vehicle?.name && p.vehicle.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.vehicle?.registration_number && p.vehicle.registration_number.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [plans, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter(p => p.status === 'PLANNED').length;
    const cancelled = plans.filter(p => p.status === 'CANCELLED').length;
    const assignedPlans = plans.filter(p => p.status === 'PLANNED' && p.vehicle_id).length;
    return { total, active, cancelled, assignedPlans };
  }, [plans]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-brand-text-secondary font-medium">Loading delivery plans, vehicles, and orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Delivery Planning & Route Optimization"
        description="Consolidate customer orders, allocate transport units, and generate optimal visiting routes using DAA algorithm engines."
        actions={
          <div className="flex items-center gap-3">
            <Link to="/map">
              <Button variant="outline" className="flex items-center gap-1.5 text-xs font-semibold">
                <Compass className="w-4 h-4 text-brand-primary" />
                <span>Open in Map Workspace</span>
              </Button>
            </Link>
            <Button 
              onClick={openCreateModal}
              className="bg-brand-primary hover:bg-brand-active text-white flex items-center gap-2 shadow-sm font-semibold px-4 py-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Delivery Plan</span>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass" className="p-5 flex items-center justify-between border-l-4 border-l-brand-primary">
          <div>
            <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">Total Plans</span>
            <p className="text-2xl font-bold text-brand-text font-mono mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-soft/70 flex items-center justify-center text-brand-primary">
            <Route className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">Active Planned</span>
            <p className="text-2xl font-bold text-emerald-700 font-mono mt-1">{stats.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center justify-between border-l-4 border-l-brand-primary">
          <div>
            <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">Vehicles Assigned</span>
            <p className="text-2xl font-bold text-brand-primary font-mono mt-1">{stats.assignedPlans}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center text-brand-primary">
            <Truck className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">Available Fleet</span>
            <p className="text-2xl font-bold text-amber-700 font-mono mt-1">{availableVehicles.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Package className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Main Delivery Plans Section */}
      <Card variant="dense" className="p-6 space-y-6 overflow-hidden">
        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-secondary" />
            <input
              type="text"
              placeholder="Search plan number, warehouse, or vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/90 backdrop-blur-xs border border-brand-border/80 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 text-brand-text shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-text-secondary" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | DeliveryPlanStatus)}
              className="bg-white/90 backdrop-blur-xs border border-brand-border/80 rounded-xl px-3 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/40 shadow-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="PLANNED">Planned (Active)</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {(searchQuery || statusFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="text-brand-text-secondary hover:text-brand-dark flex items-center gap-1.5 text-xs py-2 px-3"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>

        {/* Plans Table */}
        {filteredPlans.length === 0 ? (
          <div className="p-12 text-center text-brand-text-secondary border-2 border-dashed border-brand-border rounded-xl">
            <Route className="w-10 h-10 text-brand-primary/50 mx-auto mb-3" />
            <h3 className="font-bold text-brand-text text-base">No Delivery Plans Found</h3>
            <p className="text-xs text-brand-text-secondary mt-1">
              {searchQuery || statusFilter !== 'ALL' 
                ? 'Try adjusting your search query or filter selection.'
                : 'Create your first delivery plan by selecting a warehouse and eligible customer orders.'}
            </p>
            {plans.length === 0 && (
              <Button onClick={openCreateModal} className="mt-4 bg-brand-primary text-white text-xs">
                Create First Plan
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-brand-border/70">
            <table className="min-w-full divide-y divide-brand-border/70 text-xs">
              <thead className="bg-brand-surface/70 border-b border-brand-border/80 text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-left">Plan Number</th>
                  <th className="py-3 px-4 text-left">Starting Warehouse</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4 text-left">Assigned Vehicle</th>
                  <th className="py-3 px-4 text-left">Optimized Route</th>
                  <th className="py-3 px-4 text-right">Total Value</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-left">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/70 bg-white/70 text-brand-text">
                {filteredPlans.map(plan => {
                  const ordersList = plan.delivery_plan_orders?.map(dpo => dpo.order).filter(Boolean) || [];
                  const orderCount = ordersList.length;
                  const totalValue = ordersList.reduce((sum, o) => sum + (Number(o?.total_amount) || 0), 0);
                  
                  return (
                    <tr key={plan.id} className="hover:bg-brand-surface/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-text">
                        <div className="flex items-center gap-1.5">
                          <Route className="w-3.5 h-3.5 text-brand-primary" />
                          <span>{plan.plan_number}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <WarehouseIcon className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                          <span className="font-semibold text-brand-text truncate max-w-[150px]">
                            {plan.warehouse?.name || 'Warehouse Depot'}
                          </span>
                        </div>
                        {plan.warehouse?.code && (
                          <span className="text-[10px] text-brand-text-secondary pl-5">
                            Code: {plan.warehouse.code}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-mono font-bold bg-brand-soft text-brand-dark">
                          {orderCount}
                        </span>
                      </td>

                      {/* Assigned Vehicle Column */}
                      <td className="py-3.5 px-4">
                        {plan.vehicle ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-brand-text">
                              <Truck className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{plan.vehicle.name}</span>
                            </div>
                            <div className="text-[10px] text-brand-text-secondary pl-5 font-mono">
                              {plan.vehicle.registration_number} • {plan.vehicle.capacity} {plan.vehicle.capacity_unit}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Optimized Route Column */}
                      <td className="py-3.5 px-4">
                        {plan.route_distance ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-bold font-mono text-emerald-800">
                              <Compass className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{plan.route_distance} km</span>
                            </div>
                            <span className="text-[10px] text-brand-text-secondary block truncate max-w-[140px]">
                              {plan.route_algorithm === 'BRANCH_AND_BOUND' ? 'Branch & Bound' : 'Greedy Heuristic'} • {plan.route_stops?.length || 0} stops
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-brand-text-secondary italic">
                            Not generated
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-brand-text">
                        ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Badge 
                          variant={plan.status === 'PLANNED' ? 'success' : 'default'}
                          className={plan.status === 'PLANNED' 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                          }
                        >
                          {plan.status}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-brand-text-secondary whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(plan.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openPlanDetails(plan)}
                            className="p-1.5 text-brand-text-secondary hover:text-brand-primary hover:bg-brand-surface rounded transition-colors"
                            title="View Plan Details & Route"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {plan.route_distance != null && (
                            <button
                              onClick={() => openPlanDetails(plan)}
                              className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                              title="View Route Map"
                            >
                              <MapIcon className="w-4 h-4" />
                            </button>
                          )}
                          {plan.status === 'PLANNED' && (
                            <button
                              onClick={() => handleCancelPlan(plan.id)}
                              className="p-1.5 text-brand-text-secondary hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Cancel Delivery Plan"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE PLAN MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/35 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="glass-modal rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-brand-border/60 flex items-center justify-between bg-brand-surface/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Route className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-text">Create New Delivery Plan</h2>
                  <p className="text-xs text-brand-text-secondary">
                    Select a distribution warehouse and group eligible orders into an atomic delivery plan.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-brand-surface/80 hover:bg-brand-surface border border-brand-border/60 flex items-center justify-center text-brand-text-secondary hover:text-brand-text transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreatePlan} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 1. Warehouse Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
                  1. Starting Warehouse Depot
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-sm font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                  required
                >
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code}) {wh.address ? `— ${wh.address}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-brand-text-secondary">
                  Designates the primary origin depot from which delivery stops are fulfilled.
                </p>
              </div>

              {/* 2. Order Selection */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
                      2. Select Customer Orders ({selectedOrderIds.length} Selected)
                    </label>
                    <p className="text-[11px] text-brand-text-secondary">
                      Showing orders currently eligible for assignment (not cancelled, delivered, or in another active plan).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleSelectAllFilteredOrders(filteredEligibleOrders)}
                      className="text-brand-primary font-semibold hover:underline"
                    >
                      Select All Filtered ({filteredEligibleOrders.length})
                    </button>
                    <span className="text-brand-border">|</span>
                    <button
                      type="button"
                      onClick={handleClearSelectedOrders}
                      className="text-brand-text-secondary hover:text-rose-600 font-semibold hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Search & Priority Filter within Modal */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-secondary" />
                    <input
                      type="text"
                      placeholder="Filter by order number or location name..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>
                  <select
                    value={orderPriorityFilter}
                    onChange={(e) => setOrderPriorityFilter(e.target.value)}
                    className="bg-brand-surface border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                {/* Orders Checklist */}
                {filteredEligibleOrders.length === 0 ? (
                  <div className="p-8 text-center text-brand-text-secondary border border-dashed border-brand-border rounded-xl text-xs">
                    No eligible orders found matching your criteria.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {filteredEligibleOrders.map(order => {
                      const isSelected = selectedOrderIds.includes(order.id);
                      return (
                        <div
                          key={order.id}
                          onClick={() => toggleOrderSelection(order.id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between ${
                            isSelected
                              ? 'bg-brand-soft/40 border-brand-primary/60 text-brand-dark shadow-xs'
                              : 'bg-white border-brand-border/70 hover:bg-brand-surface/60 text-brand-text-secondary'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
                              isSelected ? 'bg-brand-primary border-brand-primary text-white' : 'border-brand-border bg-white'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="space-y-1 truncate">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-brand-text">{order.order_number}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                  order.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                                  order.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {order.priority}
                                </span>
                              </div>
                              <p className="text-[11px] font-medium text-brand-text flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                <span className="truncate">{order.delivery_location?.name || 'Unknown Location'}</span>
                              </p>
                              <p className="text-[10px] text-brand-text-secondary">
                                Items: {order.order_items?.length || 0} lines • Total: ${Number(order.total_amount || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Plan Preview & Summary */}
              {selectedOrderIds.length > 0 && (
                <div className="bg-brand-surface rounded-xl p-4 border border-brand-border space-y-3">
                  <span className="text-xs font-bold text-brand-text block uppercase tracking-wider">
                    3. Plan Review & Delivery Stops Summary
                  </span>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 bg-white rounded-lg border border-brand-border/60">
                      <span className="text-[10px] text-brand-text-secondary uppercase font-semibold">Orders</span>
                      <p className="text-lg font-bold text-brand-text font-mono">{selectedOrderIds.length}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-brand-border/60">
                      <span className="text-[10px] text-brand-text-secondary uppercase font-semibold">Unique Stops</span>
                      <p className="text-lg font-bold text-amber-700 font-mono">{selectedLocationsReview.length}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-brand-border/60">
                      <span className="text-[10px] text-brand-text-secondary uppercase font-semibold">Total Value</span>
                      <p className="text-lg font-bold text-emerald-700 font-mono">
                        ${selectedTotalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Delivery Stops Pills */}
                  <div>
                    <span className="text-[11px] font-semibold text-brand-text-secondary block mb-1">
                      Destinations to be served:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLocationsReview.map(loc => (
                        <span key={loc.id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-brand-border text-xs text-brand-text font-medium">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          <span>{loc.name}</span>
                          <span className="px-1 bg-brand-soft rounded text-[10px] font-bold text-brand-dark">
                            {loc.count}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="border-brand-border text-brand-text"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || selectedOrderIds.length === 0 || !selectedWarehouseId}
                  className="bg-brand-primary hover:bg-brand-active text-white font-bold px-6 shadow-sm"
                >
                  {submitting ? 'Creating Plan...' : `Create Delivery Plan (${selectedOrderIds.length} Orders)`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLAN DETAILS, VEHICLE & ROUTE MODAL */}
      {isDetailModalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-black/35 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="glass-modal rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-brand-border/60 flex items-center justify-between bg-brand-surface/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Route className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-brand-text font-mono">{selectedPlan.plan_number}</h2>
                    <Badge 
                      variant={selectedPlan.status === 'PLANNED' ? 'success' : 'default'}
                      className={selectedPlan.status === 'PLANNED' 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                        : 'bg-gray-100 text-gray-700 border-gray-300'
                      }
                    >
                      {selectedPlan.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-brand-text-secondary">
                    Created on {new Date(selectedPlan.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-brand-surface/80 hover:bg-brand-surface border border-brand-border/60 flex items-center justify-center text-brand-text-secondary hover:text-brand-text transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Modal Alert Message */}
              {modalMessage && (
                <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  modalMessage.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center gap-2">
                    {modalMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    )}
                    <span className="font-medium">{modalMessage.text}</span>
                  </div>
                  <button onClick={() => setModalMessage(null)} className="p-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Origin Warehouse & Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-brand-surface rounded-xl border border-brand-border space-y-1">
                  <span className="text-xs font-bold text-brand-text-secondary uppercase">Starting Warehouse</span>
                  <div className="flex items-center gap-2 font-semibold text-brand-text pt-1">
                    <WarehouseIcon className="w-4 h-4 text-brand-primary flex-shrink-0" />
                    <span>{selectedPlan.warehouse?.name}</span>
                  </div>
                  {selectedPlan.warehouse?.address && (
                    <p className="text-xs text-brand-text-secondary pl-6">{selectedPlan.warehouse.address}</p>
                  )}
                </div>

                <div className="p-4 bg-brand-surface rounded-xl border border-brand-border flex items-center justify-around text-center">
                  <div>
                    <span className="text-[10px] text-brand-text-secondary uppercase font-semibold">Orders Count</span>
                    <p className="text-2xl font-bold text-brand-text font-mono">
                      {selectedPlan.delivery_plan_orders?.length || 0}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-brand-border"></div>
                  <div>
                    <span className="text-[10px] text-brand-text-secondary uppercase font-semibold">Total Order Value</span>
                    <p className="text-2xl font-bold text-emerald-700 font-mono">
                      ${(() => {
                        const total = (selectedPlan.delivery_plan_orders || []).reduce((acc, dpo) => {
                          return acc + (Number(dpo.order?.total_amount) || 0);
                        }, 0);
                        return total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 1: VEHICLE ASSIGNMENT & CAPACITY VERIFICATION */}
              <Card className="p-5 border border-brand-border shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-brand-text flex items-center gap-2">
                      <Truck className="w-4 h-4 text-brand-primary" />
                      Assigned Transport Unit & Capacity
                    </h3>
                    <p className="text-[11px] text-brand-text-secondary">
                      Plan required payload: <span className="font-bold text-brand-text font-mono">{planRequirements.weightKg} kg</span> ({planRequirements.units} units total).
                    </p>
                  </div>

                  {selectedPlan.status === 'PLANNED' && selectedPlan.vehicle && !isVehicleSelectorOpen && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsVehicleSelectorOpen(true)}
                        className="text-xs border-brand-border text-brand-text py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Change</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRemoveVehicle}
                        disabled={actionLoading}
                        className="text-xs border-rose-200 text-rose-600 hover:bg-rose-50 py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* If Vehicle is Assigned */}
                {selectedPlan.vehicle ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-brand-surface/70 rounded-xl border border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-brand-text">{selectedPlan.vehicle.name}</span>
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-white border border-brand-border text-brand-dark">
                            {selectedPlan.vehicle.registration_number}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-soft text-brand-dark">
                            {selectedPlan.vehicle.vehicle_type}
                          </span>
                        </div>
                        <p className="text-xs text-brand-text-secondary">
                          Rated Capacity: <span className="font-semibold text-brand-text font-mono">{selectedPlan.vehicle.capacity} {selectedPlan.vehicle.capacity_unit}</span>
                        </p>
                      </div>

                      {/* Capacity Utilization Meter */}
                      <div className="sm:text-right space-y-1.5 min-w-[200px]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-brand-text-secondary font-medium">Payload Utilization:</span>
                          <span className="font-bold font-mono text-brand-text">
                            {selectedPlan.vehicle.capacity_unit === 'kg' ? (
                              `${((planRequirements.weightKg / Number(selectedPlan.vehicle.capacity)) * 100).toFixed(1)}%`
                            ) : (
                              `${((planRequirements.units / Number(selectedPlan.vehicle.capacity)) * 100).toFixed(1)}%`
                            )}
                          </span>
                        </div>
                        <div className="w-full bg-brand-border/60 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              (planRequirements.weightKg / Number(selectedPlan.vehicle.capacity)) > 1 
                                ? 'bg-rose-500' 
                                : 'bg-brand-primary'
                            }`}
                            style={{ 
                              width: `${Math.min(100, Math.max(5, (planRequirements.weightKg / Number(selectedPlan.vehicle.capacity)) * 100))}%` 
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-brand-text-secondary block">
                          {planRequirements.weightKg} kg loaded of {selectedPlan.vehicle.capacity} kg limit
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* If Unassigned */
                  <div className="space-y-3">
                    <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span className="text-xs text-amber-900 font-medium">
                          No transport vehicle assigned. Required capacity: <strong>{planRequirements.weightKg} kg</strong>.
                        </span>
                      </div>

                      {selectedPlan.status === 'PLANNED' && !isVehicleSelectorOpen && (
                        <Button
                          onClick={() => setIsVehicleSelectorOpen(true)}
                          className="bg-brand-primary text-white text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5 shadow-xs"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Assign Vehicle</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* VEHICLE SELECTOR DRAWER / ACCORDION */}
                {isVehicleSelectorOpen && selectedPlan.status === 'PLANNED' && (
                  <div className="p-4 bg-brand-surface rounded-xl border border-brand-border space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-text uppercase tracking-wider">
                        Select an Available Vehicle
                      </span>
                      <button 
                        onClick={() => setIsVehicleSelectorOpen(false)}
                        className="text-xs text-brand-text-secondary hover:text-brand-text"
                      >
                        Cancel
                      </button>
                    </div>

                    {availableVehicles.length === 0 ? (
                      <div className="p-4 text-center text-xs text-brand-text-secondary border border-dashed border-brand-border rounded-lg">
                        No vehicles are currently in AVAILABLE status. Check fleet management.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {availableVehicles.map(veh => {
                          const isWeightUnit = veh.capacity_unit === 'kg';
                          const required = isWeightUnit ? planRequirements.weightKg : planRequirements.units;
                          const hasCapacity = Number(veh.capacity) >= required;
                          const isSelected = selectedAssignVehicleId === veh.id;

                          return (
                            <div
                              key={veh.id}
                              onClick={() => hasCapacity && setSelectedAssignVehicleId(veh.id)}
                              className={`p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                                !hasCapacity
                                  ? 'bg-rose-50/50 border-rose-200 opacity-60 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-brand-soft border-brand-primary cursor-pointer shadow-xs'
                                    : 'bg-white border-brand-border hover:bg-brand-surface cursor-pointer'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <Truck className="w-3.5 h-3.5 text-brand-primary" />
                                  <span className="font-bold text-brand-text">{veh.name}</span>
                                  <span className="font-mono text-[10px] text-brand-text-secondary font-semibold">
                                    {veh.registration_number}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-brand-surface border border-brand-border text-brand-text">
                                    {veh.vehicle_type}
                                  </span>
                                </div>
                                <p className="text-[11px] text-brand-text-secondary pl-5.5">
                                  Capacity: <span className="font-bold text-brand-text font-mono">{veh.capacity} {veh.capacity_unit}</span>
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {!hasCapacity ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                    <XCircle className="w-3 h-3" /> Insufficient ({veh.capacity} &lt; {required} {veh.capacity_unit})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3" /> Capacity OK
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsVehicleSelectorOpen(false)}
                        className="text-xs border-brand-border"
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={actionLoading || !selectedAssignVehicleId}
                        onClick={() => handleAssignVehicle(selectedAssignVehicleId)}
                        className="bg-brand-primary hover:bg-brand-active text-white text-xs font-bold px-4 py-2"
                      >
                        {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              {/* SECTION 2: ROUTE OPTIMIZATION (PHASE 10) */}
              <Card className="p-5 border border-brand-border shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-brand-text flex items-center gap-2">
                      <Compass className="w-4 h-4 text-brand-primary" />
                      DAA Route Optimization & Stop Sequencing
                    </h3>
                    <p className="text-[11px] text-brand-text-secondary">
                      Computes the optimal sequence of stops starting and returning to the depot warehouse using distance matrix weights.
                    </p>
                  </div>

                  {selectedPlan.status === 'PLANNED' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGeneratePlanRoadDistances}
                        disabled={generatingRoadDistances}
                        className="border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold py-1.5 px-2.5 flex items-center gap-1.5 shadow-xs"
                        title="Calculate real road distance matrix via OpenRouteService driving-car profile"
                      >
                        <Car className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{generatingRoadDistances ? 'Calculating Road Matrix...' : 'Road Distances (ORS)'}</span>
                      </Button>

                      {/* Algorithm Picker */}
                      <select
                        value={selectedAlgorithm}
                        onChange={(e) => setSelectedAlgorithm(e.target.value as RouteOptimizationAlgorithm)}
                        className="bg-brand-surface border border-brand-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      >
                        <option value="BRANCH_AND_BOUND">Branch & Bound (Exact Optimal)</option>
                        <option value="GREEDY_NEAREST_NEIGHBOR">Greedy Nearest Neighbor (Heuristic)</option>
                      </select>

                      <Button
                        onClick={handleGenerateRoute}
                        disabled={optimizingRoute}
                        className="bg-brand-primary hover:bg-brand-active text-white text-xs font-bold py-1.5 px-3 flex items-center gap-1.5 shadow-xs"
                      >
                        {selectedAlgorithm === 'BRANCH_AND_BOUND' ? (
                          <Layers className="w-3.5 h-3.5" />
                        ) : (
                          <Zap className="w-3.5 h-3.5" />
                        )}
                        <span>{optimizingRoute ? 'Optimizing...' : selectedPlan.route_distance ? 'Regenerate Route' : 'Generate Route'}</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* If Route is Generated */}
                {selectedPlan.route_stops && selectedPlan.route_stops.length > 0 ? (
                  <div className="space-y-4">
                    {/* Route Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-brand-surface rounded-xl border border-brand-border/60">
                        <span className="text-[10px] text-brand-text-secondary uppercase font-semibold">Total Tour Distance</span>
                        <p className="text-xl font-extrabold text-emerald-800 font-mono mt-0.5">
                          {selectedPlan.route_distance} <span className="text-xs font-normal">km</span>
                        </p>
                      </div>

                      <div className="p-3 bg-brand-surface rounded-xl border border-brand-border/60">
                        <span className="text-[10px] text-brand-text-secondary uppercase font-semibold">Algorithm Engine</span>
                        <p className="text-sm font-bold text-brand-text mt-1 flex items-center gap-1">
                          {selectedPlan.route_algorithm === 'BRANCH_AND_BOUND' ? (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5" /> Branch & Bound
                            </span>
                          ) : (
                            <span className="text-amber-700 flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5" /> Greedy Heuristic
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="p-3 bg-brand-surface rounded-xl border border-brand-border/60">
                        <span className="text-[10px] text-brand-text-secondary uppercase font-semibold">Distance Source</span>
                        <p className="text-xs font-bold text-brand-text mt-1 flex items-center gap-1 truncate">
                          {routeDistanceSource === 'ORS_ROAD' ? (
                            <span className="text-emerald-700 flex items-center gap-1 truncate" title="OpenRouteService Real Road Network (driving-car)">
                              <Car className="w-3.5 h-3.5 flex-shrink-0" /> ORS Road Network
                            </span>
                          ) : (
                            <span className="text-amber-800 flex items-center gap-1 truncate" title="Distance Matrix (Manual / Simulation Mode)">
                              <SlidersHorizontal className="w-3.5 h-3.5 flex-shrink-0" /> Simulation Matrix
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="p-3 bg-brand-surface rounded-xl border border-brand-border/60">
                        <span className="text-[10px] text-brand-text-secondary uppercase font-semibold">Observed Runtime</span>
                        <p className="text-xl font-extrabold text-brand-text font-mono mt-0.5 flex items-center gap-1">
                          <Clock className="w-4 h-4 text-brand-primary" />
                          {selectedPlan.route_execution_time_ms ?? 0} <span className="text-xs font-normal">ms</span>
                        </p>
                      </div>
                    </div>

                    {/* Sequential Stop Breadcrumb Trail */}
                    <div>
                      <span className="text-xs font-bold text-brand-text block mb-2">
                        Visiting Sequence ({selectedPlan.route_stops.length} steps):
                      </span>
                      <div className="p-3 bg-brand-surface/70 rounded-xl border border-brand-border flex flex-wrap items-center gap-1.5">
                        {selectedPlan.route_stops.map((stop, idx) => (
                          <React.Fragment key={idx}>
                            <div className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                              stop.type === 'warehouse'
                                ? 'bg-brand-primary text-white font-semibold'
                                : 'bg-white text-brand-text border border-brand-border shadow-2xs'
                            }`}>
                              <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-mono">
                                {stop.sequence}
                              </span>
                              {stop.type === 'warehouse' ? (
                                <WarehouseIcon className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                              )}
                              <span>{stop.name}</span>
                              {stop.ordersCount && stop.ordersCount > 0 && (
                                <span className="px-1 bg-brand-soft rounded text-[10px] font-bold text-brand-dark">
                                  {stop.ordersCount} ord
                                </span>
                              )}
                            </div>
                            {selectedPlan.route_stops && idx < selectedPlan.route_stops.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-brand-text-secondary/70 flex-shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-brand-text-secondary bg-brand-surface/50 p-2.5 rounded-lg border border-brand-border/40">
                      <strong>Methodology:</strong> Round-trip tour visits each delivery location once (consolidating shared customer orders) and returns to starting warehouse. Route is optimized using DAA algorithms on the distance matrix (metric: {routeDistanceSource === 'ORS_ROAD' ? 'OpenRouteService real road network' : 'configured simulation matrix'}).
                    </div>
                  </div>
                ) : (
                  /* No Route Generated Yet */
                  <div className="p-4 bg-brand-surface/60 rounded-xl border border-brand-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Compass className="w-4 h-4 text-brand-primary flex-shrink-0" />
                      <span className="text-xs text-brand-text-secondary">
                        No visiting route generated yet. Choose an algorithm above and click <strong>Generate Route</strong>.
                      </span>
                    </div>

                    {selectedPlan.status === 'PLANNED' && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGeneratePlanRoadDistances}
                          disabled={generatingRoadDistances}
                          className="border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold py-1.5 px-2.5 flex items-center gap-1.5"
                        >
                          <Car className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{generatingRoadDistances ? 'Calculating...' : 'Road Distances (ORS)'}</span>
                        </Button>
                        <Button
                          onClick={handleGenerateRoute}
                          disabled={optimizingRoute}
                          className="bg-brand-primary text-white text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5 shadow-xs"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>{optimizingRoute ? 'Optimizing...' : 'Generate Route'}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* SECTION 3: MAP ROUTE VISUALIZATION (PHASE 11) */}
              <Card className="p-5 border border-brand-border shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-brand-text flex items-center gap-2">
                      <MapIcon className="w-4 h-4 text-brand-primary" />
                      Delivery Route Map Visualization
                    </h3>
                    <p className="text-[11px] text-brand-text-secondary">
                      Numbered stop markers and sequential path rendered via OpenStreetMap and React Leaflet.
                    </p>
                  </div>
                </div>

                <RouteMap
                  plan={selectedPlan}
                  allWarehouses={warehouses}
                  allLocations={deliveryLocations}
                  height="420px"
                />
              </Card>

              {/* Delivery Locations Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  Associated Delivery Stops
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const locsMap = new Map<string, { name: string; address?: string | null; count: number }>();
                    selectedPlan.delivery_plan_orders?.forEach(dpo => {
                      const loc = dpo.order?.delivery_location;
                      if (loc) {
                        const existing = locsMap.get(loc.id);
                        if (existing) existing.count += 1;
                        else locsMap.set(loc.id, { name: loc.name, address: loc.address, count: 1 });
                      }
                    });

                    return Array.from(locsMap.values()).map((loc, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-brand-border bg-white text-xs flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-600" />
                        <div>
                          <span className="font-semibold text-brand-text">{loc.name}</span>
                          <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-brand-soft text-[10px] font-bold text-brand-dark">
                            {loc.count} {loc.count === 1 ? 'order' : 'orders'}
                          </span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Orders Included Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-brand-primary" />
                  Assigned Customer Orders ({selectedPlan.delivery_plan_orders?.length || 0})
                </h3>

                <div className="border border-brand-border rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-brand-border text-xs">
                    <thead className="bg-brand-surface text-brand-text font-bold">
                      <tr>
                        <th className="py-2 px-3 text-left">Order #</th>
                        <th className="py-2 px-3 text-left">Delivery Location</th>
                        <th className="py-2 px-3 text-center">Priority</th>
                        <th className="py-2 px-3 text-center">Payload Weight</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border bg-white">
                      {selectedPlan.delivery_plan_orders?.map((dpo, idx) => {
                        const orderWeight = (dpo.order?.order_items || []).reduce((acc, oi) => {
                          const qty = Number(oi.quantity) || 0;
                          const w = Number(oi.product?.weight_kg) || 10;
                          return acc + (qty * w);
                        }, 0);

                        return (
                          <tr key={idx} className="hover:bg-brand-surface/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-brand-text">
                              {dpo.order?.order_number || 'N/A'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-brand-text">
                                {dpo.order?.delivery_location?.name || 'Unassigned'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                dpo.order?.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                                dpo.order?.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {dpo.order?.priority || 'MEDIUM'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold text-brand-text">
                              {orderWeight} kg
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-text">
                              ${Number(dpo.order?.total_amount || 0).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-brand-border flex items-center justify-between bg-brand-surface/40">
              {selectedPlan.status === 'PLANNED' ? (
                <Button
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => handleCancelPlan(selectedPlan.id)}
                  className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{actionLoading ? 'Cancelling...' : 'Cancel Delivery Plan'}</span>
                </Button>
              ) : (
                <div className="text-xs text-brand-text-secondary italic">
                  Plan is cancelled. Associated orders & vehicles released.
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-xs text-brand-text"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
