import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { 
  DeliveryPlan, 
  Order, 
  Vehicle, 
  Warehouse, 
  Inventory, 
  DeliveryLocation, 
  LocationDistance,
  Product 
} from '../types/database.types';
import { 
  Route, 
  Truck, 
  Compass, 
  Layers, 
  Zap, 
  ArrowRight,
  RefreshCw,
  Building2,
  Search,
  Filter,
  RotateCcw,
  Download,
  CheckCircle2,
  ShoppingCart,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Boxes,
  Network,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Package,
  MapPin
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { motion, type Variants } from 'framer-motion';

export type ReportTab = 'overview' | 'daa' | 'ledger';

export interface DAAAlgorithmSpec {
  id: string;
  name: string;
  category: string;
  paradigm: string;
  problemSolved: string;
  timeComplexity: string;
  spaceComplexity: string;
  optimality: string;
  systemLocation: string;
  systemRoute: string;
  inputData: string;
  outputProduced: string;
  operationalValue: string;
  badgeVariant: 'lime' | 'purple' | 'danger' | 'success' | 'warning' | 'info' | 'sage' | 'default';
}

export const DAA_ALGORITHM_CATALOG: DAAAlgorithmSpec[] = [
  {
    id: 'tsp-bb',
    name: 'Branch & Bound TSP',
    category: 'Vehicle Tour Optimization',
    paradigm: 'Backtracking / State-Space Search with Lower Bound Pruning',
    problemSolved: 'Computes the exact globally optimal delivery tour minimizing total road travel distance for dispatch vehicles departing a warehouse depot and returning to base.',
    timeComplexity: 'Worst-case O(2ⁿ · n²) / Exponential with reduced cost bounding; exact for n ≤ 12 stops',
    spaceComplexity: 'O(n²) state tree',
    optimality: 'Exact Globally Optimal',
    systemLocation: 'src/algorithms/tsp.ts',
    systemRoute: '/planning',
    inputData: 'n × n road distance matrix from location_distances table',
    outputProduced: 'Optimal stop permutation sequence, total tour kilometers, execution time',
    operationalValue: 'Directly lowers fleet transit fuel consumption and driver delivery duration on dense urban runs.',
    badgeVariant: 'success'
  },
  {
    id: 'tsp-greedy',
    name: 'Greedy Nearest Neighbor TSP',
    category: 'Vehicle Tour Heuristic',
    paradigm: 'Greedy Construction Heuristic',
    problemSolved: 'Rapidly constructs a feasible delivery tour by iteratively dispatching to the closest unvisited delivery node.',
    timeComplexity: 'O(n²) time',
    spaceComplexity: 'O(n) visited tracking',
    optimality: 'Polynomial Heuristic Approximation',
    systemLocation: 'src/algorithms/tsp.ts',
    systemRoute: '/planning',
    inputData: 'Matrix distances, depot origin, unvisited candidate destinations',
    outputProduced: 'Feasible delivery tour ordering, approximate route kilometers',
    operationalValue: 'Provides instant sub-millisecond route generation without combinatorial latency on large stop batches.',
    badgeVariant: 'warning'
  },
  {
    id: 'bin-packing',
    name: 'First-Fit Decreasing (FFD) Bin Packing',
    category: 'Inventory Restock Allocation',
    paradigm: 'Greedy Approximation Heuristic',
    problemSolved: 'Allocates inbound batch replenishment inventory across variable-capacity regional warehouse hubs without exceeding available storage capacity.',
    timeComplexity: 'O(m log m) where m is candidate warehouse count (sorting bins by available capacity descending)',
    spaceComplexity: 'O(m) allocation breakdown',
    optimality: 'Approximation Heuristic (bounds within 11/9 · OPT + 6/9)',
    systemLocation: 'src/algorithms/binPacking.ts',
    systemRoute: '/inventory',
    inputData: 'Restock batch volume, warehouse currentStock and storage_capacity records',
    outputProduced: 'Per-warehouse allocation breakdown, remaining room, unallocated overflow diagnostic',
    operationalValue: 'Prevents hub saturation, maximizes storage utilization, and avoids split inventory deadlocks.',
    badgeVariant: 'purple'
  },
  {
    id: 'dijkstra',
    name: "Dijkstra's Algorithm",
    category: 'Single-Source Shortest Path',
    paradigm: 'Greedy Vertex Relaxation',
    problemSolved: 'Evaluates all active regional warehouses with sufficient product stock and determines the closest hub to the customer delivery destination.',
    timeComplexity: 'O((V + E) log V) with min-priority extraction / O(V²) on network adjacency graph',
    spaceComplexity: 'O(V + E) adjacency map and predecessor tracking',
    optimality: 'Exact Shortest Path (non-negative edge weights)',
    systemLocation: 'src/algorithms/dijkstra.ts',
    systemRoute: '/orders/create',
    inputData: 'Road distances from location_distances, candidate stock-ready warehouses, destination node',
    outputProduced: 'Minimum road distance (km), hop count, waypoint sequence, reachable flag',
    operationalValue: 'Automates customer order fulfillment dispatch, routing from the closest eligible facility.',
    badgeVariant: 'info'
  },
  {
    id: 'floyd-warshall',
    name: 'Floyd-Warshall Algorithm',
    category: 'All-Pairs Shortest Path',
    paradigm: 'Dynamic Programming',
    problemSolved: 'Computes all-pairs shortest paths across the complete logistics graph, identifying shortcut transit corridors and multi-hop paths.',
    timeComplexity: 'O(V³) via triple-nested dynamic programming vertex relaxation',
    spaceComplexity: 'O(V²) distance matrix and predecessor reconstruction matrix',
    optimality: 'Exact All-Pairs Optimal',
    systemLocation: 'src/algorithms/floydWarshall.ts',
    systemRoute: '/distance-matrix',
    inputData: 'Complete network vertex set (warehouses + delivery locations) and location_distances',
    outputProduced: 'V × V shortest path distance matrix, intermediate hop path reconstructor, negative cycle check',
    operationalValue: 'Identifies non-obvious multi-hub transit shortcuts and isolated/disconnected network facilities.',
    badgeVariant: 'sage'
  },
  {
    id: 'kruskal',
    name: "Kruskal's Minimum Spanning Tree (MST)",
    category: 'Network Backbone Optimization',
    paradigm: 'Greedy Edge Selection with Cycle Detection',
    problemSolved: 'Determines the minimum-cost connected network backbone connecting all warehouse hubs and delivery destinations without cycles.',
    timeComplexity: 'O(E log E) dominated by candidate edge sorting (plus O(E · α(V)) Union-Find operations)',
    spaceComplexity: 'O(V + E) edge structures and disjoint-set tracking',
    optimality: 'Exact Minimum Spanning Tree / Forest',
    systemLocation: 'src/algorithms/kruskal.ts',
    systemRoute: '/distance-matrix',
    inputData: 'Undirected road distance edges between all mapped logistics locations',
    outputProduced: 'Subset of |V| - 1 backbone edges, total network trunkline distance (km), forest component count',
    operationalValue: 'Establishes foundational inter-facility logistics trunkline routing with minimal infrastructure distance.',
    badgeVariant: 'default'
  },
  {
    id: 'union-find',
    name: 'Union-Find / Disjoint-Set Data Structure',
    category: 'Connectivity & Cycle Detection',
    paradigm: 'Disjoint-Set with Path Compression & Union by Rank',
    problemSolved: 'Enables near-constant-time cycle detection during Kruskal edge selection and partitions network nodes into connected components.',
    timeComplexity: 'O(α(V)) amortized per operation where α is inverse Ackermann function (α(V) ≤ 4)',
    spaceComplexity: 'O(V) parent and rank arrays',
    optimality: 'Theoretically Optimal Disjoint-Set operations',
    systemLocation: 'src/algorithms/unionFind.ts',
    systemRoute: '/distance-matrix',
    inputData: 'Network vertex identifiers, candidate edge connections',
    outputProduced: 'find(), union(), connected(), and getComponentGroups() disjoint set operations',
    operationalValue: 'Empowers Kruskal MST solver with instant cycle pruning and resilient disconnected forest detection.',
    badgeVariant: 'lime'
  }
];

export const Reports: React.FC = () => {
  // --- Live Application Records State ---
  const [plans, setPlans] = useState<DeliveryPlan[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [distances, setDistances] = useState<LocationDistance[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Navigation & Interactive filters
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PLANNED' | 'CANCELLED'>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');

  const loadReportsData = async () => {
    try {
      setLoading(true);
      const [
        plansData, 
        ordersData, 
        vehiclesData, 
        warehousesData, 
        inventoryData, 
        locationsData, 
        distancesData, 
        productsData
      ] = await Promise.all([
        api.plans.list(),
        api.orders.list(),
        api.vehicles.list(),
        api.warehouses.list(),
        api.inventory.list(),
        api.locations.list(),
        api.distances.list(),
        api.products.list()
      ]);
      setPlans(plansData || []);
      setOrders(ordersData || []);
      setVehicles(vehiclesData || []);
      setWarehouses(warehousesData || []);
      setInventory(inventoryData || []);
      setLocations(locationsData || []);
      setDistances(distancesData || []);
      setProducts(productsData || []);
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadReportsData();
  };

  // CSV Export for Plans Audit Ledger
  const handleExportCSV = () => {
    if (plans.length === 0) return;
    const headers = ['Plan Number', 'Status', 'Warehouse', 'Vehicle', 'Orders Count', 'Algorithm', 'Route Distance (km)', 'Created Date'];
    const rows = plans.map(p => [
      p.plan_number,
      p.status,
      p.warehouse?.name || 'Warehouse Depot',
      p.vehicle?.name ? `${p.vehicle.name} (${p.vehicle.registration_number})` : 'Unassigned',
      p.delivery_plan_orders?.length || 0,
      p.route_algorithm || 'None',
      p.route_distance || '',
      p.created_at ? new Date(p.created_at).toLocaleDateString() : ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `smartlogix-plans-audit-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Computed Operational & Telemetry Metrics ---
  const metrics = useMemo(() => {
    // 1. Delivery Plans & Routing
    const totalPlans = plans.length;
    const activePlans = plans.filter(p => p.status === 'PLANNED').length;
    const cancelledPlans = plans.filter(p => p.status === 'CANCELLED').length;
    const planFulfillmentRate = totalPlans > 0 ? Math.round((activePlans / totalPlans) * 100) : 0;

    const plansWithRoute = plans.filter(p => p.route_distance != null);
    const totalRoutedDistance = plansWithRoute.reduce((sum, p) => sum + (Number(p.route_distance) || 0), 0);
    const avgRouteDistance = plansWithRoute.length > 0 ? (totalRoutedDistance / plansWithRoute.length).toFixed(1) : '0';

    // Persisted TSP Algorithm distribution
    const branchAndBoundPlans = plans.filter(p => p.route_algorithm === 'BRANCH_AND_BOUND');
    const greedyPlans = plans.filter(p => p.route_algorithm === 'GREEDY_NEAREST_NEIGHBOR');
    const branchAndBoundCount = branchAndBoundPlans.length;
    const greedyCount = greedyPlans.length;
    const unroutedPlansCount = Math.max(0, totalPlans - (branchAndBoundCount + greedyCount));
    const totalSolvedTours = branchAndBoundCount + greedyCount;

    const bbTotalDistance = branchAndBoundPlans.reduce((s, p) => s + (Number(p.route_distance) || 0), 0);
    const greedyTotalDistance = greedyPlans.reduce((s, p) => s + (Number(p.route_distance) || 0), 0);

    // 2. Fleet Utilization
    const assignedVehicles = plans.filter(p => p.status === 'PLANNED' && p.vehicle_id).length;
    const fleetUtilization = vehicles.length > 0 ? Math.round((assignedVehicles / vehicles.length) * 100) : 0;

    // 3. Orders Fulfillment
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;
    const processingOrders = orders.filter(o => o.status === 'PROCESSING').length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
    const dispatchedOrders = orders.filter(o => o.status === 'DISPATCHED').length;
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
    const orderFulfillmentRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

    // 4. Warehouse Capacities & Stock (Bin Packing Foundation)
    const stockByWarehouse = new Map<string, number>();
    inventory.forEach(item => {
      stockByWarehouse.set(item.warehouse_id, (stockByWarehouse.get(item.warehouse_id) || 0) + item.quantity);
    });

    const warehouseBreakdown = warehouses.map(w => {
      const occupied = stockByWarehouse.get(w.id) || 0;
      const capacity = w.storage_capacity && w.storage_capacity > 0 ? w.storage_capacity : 10000;
      const available = Math.max(0, capacity - occupied);
      const utilization = Math.min(100, Math.round((occupied / capacity) * 100));

      return {
        warehouse: w,
        occupied,
        capacity,
        available,
        utilization
      };
    });

    const totalCapacity = warehouseBreakdown.reduce((sum, item) => sum + item.capacity, 0);
    const totalOccupiedStock = warehouseBreakdown.reduce((sum, item) => sum + item.occupied, 0);
    const networkCapacityUtilization = totalCapacity > 0 ? Math.round((totalOccupiedStock / totalCapacity) * 100) : 0;
    const totalAvailableStorage = Math.max(0, totalCapacity - totalOccupiedStock);

    // 5. Inventory & Catalog Metrics
    const totalInventoryUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockItemsCount = inventory.filter(item => item.quantity <= item.reorder_level).length;

    // 6. Logistics Network Graph (DAA Graph Foundation)
    const vertexCount = warehouses.length + locations.length;
    const validEdges = distances.filter(d => d.distance > 0 && d.distance !== Infinity && d.origin_id !== d.destination_id);
    const edgeCount = validEdges.length;
    const totalGraphRoadKm = validEdges.reduce((sum, d) => sum + Number(d.distance), 0);
    const avgEdgeDistance = edgeCount > 0 ? (totalGraphRoadKm / edgeCount).toFixed(1) : '0';
    const minEdgeDistance = validEdges.length > 0 ? Math.min(...validEdges.map(d => Number(d.distance))).toFixed(1) : '0';
    const maxEdgeDistance = validEdges.length > 0 ? Math.max(...validEdges.map(d => Number(d.distance))).toFixed(1) : '0';

    return {
      totalPlans,
      activePlans,
      cancelledPlans,
      planFulfillmentRate,
      plansWithRouteCount: plansWithRoute.length,
      totalRoutedDistance: totalRoutedDistance.toFixed(1),
      avgRouteDistance,
      branchAndBoundCount,
      greedyCount,
      unroutedPlansCount,
      totalSolvedTours,
      bbTotalDistance: bbTotalDistance.toFixed(1),
      greedyTotalDistance: greedyTotalDistance.toFixed(1),
      assignedVehicles,
      fleetUtilization,
      totalOrders,
      deliveredOrders,
      processingOrders,
      pendingOrders,
      dispatchedOrders,
      cancelledOrders,
      orderFulfillmentRate,
      warehouseBreakdown,
      totalCapacity,
      totalOccupiedStock,
      networkCapacityUtilization,
      totalAvailableStorage,
      totalInventoryUnits,
      lowStockItemsCount,
      totalProducts: products.length,
      vertexCount,
      edgeCount,
      totalGraphRoadKm: totalGraphRoadKm.toFixed(1),
      avgEdgeDistance,
      minEdgeDistance,
      maxEdgeDistance
    };
  }, [plans, orders, vehicles, warehouses, inventory, locations, distances, products]);

  // --- Chart 1: DAA Solver Distribution Donut ---
  const algorithmChartData = useMemo(() => {
    const items = [
      { name: 'Branch & Bound (Exact)', value: metrics.branchAndBoundCount, color: '#154734' },
      { name: 'Greedy Nearest-Neighbor', value: metrics.greedyCount, color: '#d97706' },
      { name: 'Pending Route Solver', value: metrics.unroutedPlansCount, color: '#94a3b8' }
    ];
    return items.filter(i => i.value > 0);
  }, [metrics]);

  // --- Chart 2: Warehouse Storage Capacity vs Stock ---
  const warehouseCapacityChartData = useMemo(() => {
    return metrics.warehouseBreakdown.map(wb => ({
      name: wb.warehouse.name.length > 14 ? `${wb.warehouse.name.substring(0, 14)}...` : wb.warehouse.name,
      fullName: wb.warehouse.name,
      Occupied: wb.occupied,
      Available: wb.available,
      Capacity: wb.capacity,
      Utilization: `${wb.utilization}%`
    }));
  }, [metrics.warehouseBreakdown]);

  // --- Chart 3: Order Status Funnel ---
  const orderStatusChartData = useMemo(() => {
    return [
      { name: 'Delivered', value: metrics.deliveredOrders, color: '#059669' },
      { name: 'Processing', value: metrics.processingOrders, color: '#0284c7' },
      { name: 'Pending', value: metrics.pendingOrders, color: '#d97706' },
      { name: 'Dispatched', value: metrics.dispatchedOrders, color: '#7c3aed' },
      { name: 'Cancelled', value: metrics.cancelledOrders, color: '#dc2626' }
    ].filter(item => item.value > 0);
  }, [metrics]);

  // --- Chart 4: Delivery Plans by Warehouse Depot ---
  const warehousePlanData = useMemo(() => {
    const map = new Map<string, number>();
    warehouses.forEach(w => map.set(w.name, 0));
    plans.forEach(p => {
      const name = p.warehouse?.name || 'Central Depot';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({
      name: name.length > 15 ? `${name.substring(0, 15)}...` : name,
      fullName: name,
      plans: count
    }));
  }, [plans, warehouses]);

  // Filtered Delivery Plans Ledger
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchesWarehouse = warehouseFilter === 'ALL' || p.warehouse_id === warehouseFilter;
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        p.plan_number.toLowerCase().includes(q) ||
        (p.warehouse?.name && p.warehouse.name.toLowerCase().includes(q)) ||
        (p.vehicle?.name && p.vehicle.name.toLowerCase().includes(q)) ||
        (p.vehicle?.registration_number && p.vehicle.registration_number.toLowerCase().includes(q))
      );

      return matchesStatus && matchesWarehouse && matchesSearch;
    });
  }, [plans, statusFilter, warehouseFilter, searchQuery]);

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'ALL' || warehouseFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setWarehouseFilter('ALL');
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.06 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 bg-white/80 backdrop-blur-md p-8 rounded-2xl border border-brand-border/80 shadow-soft-md">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="text-sm font-bold text-brand-text">Aggregating Operational Telemetry</p>
            <p className="text-xs text-brand-text-secondary mt-1">
              Synchronizing delivery plans, warehouse capacity, graph distances, and DAA solver analytics...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <PageHeader
          title="Operational Reports & DAA Telemetry"
          description="Integrated intelligence layer combining live supply-chain operational metrics with Design & Analysis of Algorithms (DAA) telemetry across vehicle routing, warehouse capacity, and network optimization."
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={plans.length === 0}
                className="flex items-center gap-1.5 text-xs font-semibold bg-white/90 hover:bg-brand-surface shadow-xs py-2 px-3"
              >
                <Download className="w-3.5 h-3.5 text-brand-primary" />
                <span>Export CSV</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs font-semibold bg-white/90 hover:bg-brand-surface shadow-xs py-2 px-3"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-primary' : 'text-brand-text-secondary'}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
              <Link to="/map">
                <Button variant="primary" className="flex items-center gap-1.5 text-xs font-semibold shadow-xs py-2 px-3.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Logistics Map</span>
                </Button>
              </Link>
            </div>
          }
        />
      </motion.div>

      {/* Segmented View Mode Navigation Tabs */}
      <motion.div variants={itemVariants} className="flex border-b border-brand-border/80 gap-2 sm:gap-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-brand-primary text-brand-primary bg-brand-soft/20 rounded-t-lg'
              : 'border-transparent text-brand-text-secondary hover:text-brand-text hover:bg-stone-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Operational Overview</span>
          <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-full font-mono">
            Live
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('daa')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'daa'
              ? 'border-purple-600 text-purple-900 bg-purple-50/50 rounded-t-lg'
              : 'border-transparent text-brand-text-secondary hover:text-brand-text hover:bg-stone-50'
          }`}
        >
          <Cpu className="w-4 h-4 text-purple-700" />
          <span>DAA Algorithms & Telemetry</span>
          <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full font-bold">
            7 Solvers
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'border-emerald-600 text-emerald-900 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-brand-text-secondary hover:text-brand-text hover:bg-stone-50'
          }`}
        >
          <Route className="w-4 h-4 text-emerald-700" />
          <span>Delivery Audit Ledger</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-mono">
            {plans.length}
          </span>
        </button>
      </motion.div>

      {/* ========================================================================= */}
      {/* TAB 1: OPERATIONAL OVERVIEW                                               */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Primary KPI Grid (4 High-Level Operational Metrics) */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Active Plans */}
            <Card variant="glass" className="p-5 border-l-4 border-l-emerald-600 hover:shadow-soft-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary flex items-center gap-1.5">
                    <span>Active Plans</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-mono px-1 rounded">LIVE</span>
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs">
                    <Route className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono text-brand-text">{metrics.activePlans}</span>
                  <span className="text-xs text-brand-text-secondary font-medium">of {metrics.totalPlans} total</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-brand-border/50">
                <div className="w-full bg-brand-border/60 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${metrics.planFulfillmentRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-brand-text-secondary mt-1.5">
                  <span>{metrics.planFulfillmentRate}% active rate</span>
                  <span className="text-stone-500">{metrics.cancelledPlans} cancelled</span>
                </div>
              </div>
            </Card>

            {/* KPI 2: Total Route Distance */}
            <Card variant="glass" className="p-5 border-l-4 border-l-brand-primary hover:shadow-soft-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary flex items-center gap-1.5">
                    <span>Total Route Distance</span>
                    <span className="text-[9px] bg-brand-soft text-brand-dark font-mono px-1 rounded">TSP</span>
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-brand-soft/80 text-brand-primary flex items-center justify-center shadow-xs">
                    <Compass className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono text-brand-text">{metrics.totalRoutedDistance}</span>
                  <span className="text-xs font-bold text-brand-text-secondary">km</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-brand-border/50 flex items-center justify-between text-[11px] text-brand-text-secondary">
                <span>Avg <strong>{metrics.avgRouteDistance} km</strong> / plan</span>
                <span className="text-emerald-700 font-semibold">{metrics.plansWithRouteCount} routed tours</span>
              </div>
            </Card>

            {/* KPI 3: Storage Capacity Utilization */}
            <Card variant="glass" className="p-5 border-l-4 border-l-purple-600 hover:shadow-soft-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary flex items-center gap-1.5">
                    <span>Network Storage Utilization</span>
                    <span className="text-[9px] bg-purple-100 text-purple-800 font-mono px-1 rounded">FFD</span>
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shadow-xs">
                    <Boxes className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono text-brand-text">{metrics.networkCapacityUtilization}%</span>
                  <span className="text-xs text-brand-text-secondary font-medium">capacity full</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-brand-border/50">
                <div className="w-full bg-brand-border/60 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-purple-600 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, metrics.networkCapacityUtilization)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-brand-text-secondary mt-1.5">
                  <span>{metrics.totalOccupiedStock} / {metrics.totalCapacity} units</span>
                  <span className="text-emerald-700 font-medium">{metrics.totalAvailableStorage} free</span>
                </div>
              </div>
            </Card>

            {/* KPI 4: Fleet Utilization */}
            <Card variant="glass" className="p-5 border-l-4 border-l-amber-500 hover:shadow-soft-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary flex items-center gap-1.5">
                    <span>Fleet Assignment</span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-mono px-1 rounded">LIVE</span>
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-xs">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono text-brand-text">{metrics.fleetUtilization}%</span>
                  <span className="text-xs text-brand-text-secondary font-medium">utilized</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-brand-border/50">
                <div className="w-full bg-brand-border/60 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, metrics.fleetUtilization)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-brand-text-secondary mt-1.5">
                  <span>{metrics.assignedVehicles} on active route</span>
                  <span className="text-stone-500">{vehicles.length} total fleet</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Quick Pulse Strip: Orders, SKUs, and Network Hubs */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/70 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-brand-border/80 shadow-xs">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider block">Delivered Orders</span>
                <span className="text-sm font-extrabold text-brand-text font-mono">
                  {metrics.deliveredOrders} <span className="text-xs text-stone-500">/ {metrics.totalOrders} ({metrics.orderFulfillmentRate}%)</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 border-l border-brand-border/60">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider block">Total Inventory Stock</span>
                <span className="text-sm font-extrabold text-brand-text font-mono">
                  {metrics.totalInventoryUnits} <span className="text-xs text-stone-500">units</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 border-l border-brand-border/60">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider block">Low Stock Alerts</span>
                <span className={`text-sm font-extrabold font-mono ${metrics.lowStockItemsCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {metrics.lowStockItemsCount} <span className="text-xs text-stone-500">SKUs below limit</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 border-l border-brand-border/60">
              <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center flex-shrink-0">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider block">Logistics Graph Nodes</span>
                <span className="text-sm font-extrabold text-brand-text font-mono">
                  {metrics.vertexCount} <span className="text-xs text-stone-500">({metrics.edgeCount} road edges)</span>
                </span>
              </div>
            </div>
          </motion.div>

          {/* Visual Analytics Row: 2 Recharts Panels */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: DAA Algorithm Breakdown */}
            <Card variant="glass" className="p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-brand-text flex items-center gap-2">
                      <PieIcon className="w-4 h-4 text-brand-primary" />
                      TSP Solver Distribution
                    </h3>
                    <p className="text-[11px] text-brand-text-secondary mt-0.5">
                      Persisted routing algorithms across saved delivery plans
                    </p>
                  </div>
                  <Badge variant="default" className="text-[10px]">
                    {metrics.totalPlans} Plans
                  </Badge>
                </div>

                <div className="h-56 relative flex items-center justify-center my-2">
                  {algorithmChartData.length === 0 ? (
                    <div className="text-center text-xs text-brand-text-secondary">
                      No delivery plans recorded yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={algorithmChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={78}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {algorithmChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: '1px solid #E5E6DF', 
                            boxShadow: '0 8px 24px rgba(18, 61, 45, 0.08)',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(8px)',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#154734'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  {algorithmChartData.length > 0 && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <span className="text-2xl font-extrabold font-mono text-brand-text">{metrics.totalPlans}</span>
                      <p className="text-[10px] font-semibold text-brand-text-secondary uppercase tracking-wider">Plans</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-brand-border/60">
                {algorithmChartData.map((item, idx) => {
                  const pct = metrics.totalPlans > 0 ? Math.round((item.value / metrics.totalPlans) * 100) : 0;
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-brand-text font-medium truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                        <span className="font-bold text-brand-text">{item.value}</span>
                        <span className="text-[10px] text-brand-text-secondary">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Chart 2: Warehouse Storage Capacity Stacked Bar Chart */}
            <Card variant="glass" className="p-6 lg:col-span-2 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-brand-text flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-purple-700" />
                      Warehouse Storage Occupancy & Remaining Capacity
                    </h3>
                    <p className="text-[11px] text-brand-text-secondary mt-0.5">
                      Live unit stock vs available space across active regional depots (FFD Bin Packing foundation)
                    </p>
                  </div>
                  <span className="text-xs text-brand-text-secondary font-mono">
                    {metrics.networkCapacityUtilization}% Network Utilization
                  </span>
                </div>

                <div className="h-60 mt-3">
                  {warehouseCapacityChartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-brand-text-secondary">
                      No warehouse records available.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={warehouseCapacityChartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E6DF" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#66716B', fontSize: 11, fontWeight: 500 }} 
                        />
                        <YAxis 
                          allowDecimals={false} 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#66716B', fontSize: 11 }} 
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: '1px solid #E5E6DF', 
                            boxShadow: '0 8px 24px rgba(18, 61, 45, 0.08)',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(8px)',
                            fontSize: '12px',
                            color: '#154734'
                          }} 
                          formatter={(val: any, name: any) => [`${val} units`, name]}
                          labelFormatter={(lbl: any, payload: any) => payload?.[0]?.payload?.fullName || lbl}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Bar dataKey="Occupied" fill="#7c3aed" stackId="a" radius={[0, 0, 0, 0]} barSize={32} />
                        <Bar dataKey="Available" fill="#10b981" stackId="a" radius={[6, 6, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-text-secondary">
                <span>Total Network Storage: <strong>{metrics.totalCapacity} units</strong></span>
                <span className="font-semibold text-purple-700">FFD Bins sorted by Available Capacity</span>
              </div>
            </Card>
          </motion.div>

          {/* Secondary Charts Row: Orders Breakdown & Hub Dispatch */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 3: Order Status Breakdown */}
            <Card variant="glass" className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-brand-text flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-brand-primary" />
                    Customer Orders Status Distribution
                  </h3>
                  <p className="text-[11px] text-brand-text-secondary mt-0.5">
                    Fulfillment progress across customer orders in the system
                  </p>
                </div>
                <Badge variant="success" className="text-[10px]">
                  {metrics.orderFulfillmentRate}% Delivered
                </Badge>
              </div>

              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orderStatusChartData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E6DF" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: '#66716B', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#154734', fontSize: 11, fontWeight: 600 }} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: '1px solid #E5E6DF', 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        fontSize: '12px'
                      }} 
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                      {orderStatusChartData.map((entry, index) => (
                        <Cell key={`order-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 4: Delivery Plans Dispatched per Hub */}
            <Card variant="glass" className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-brand-text flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-800" />
                    Delivery Plans per Origin Depot
                  </h3>
                  <p className="text-[11px] text-brand-text-secondary mt-0.5">
                    Dispatch workload originating from each regional warehouse hub
                  </p>
                </div>
                <span className="text-xs text-brand-text-secondary font-mono">
                  {warehouses.length} Active Hubs
                </span>
              </div>

              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={warehousePlanData} margin={{ top: 10, right: 20, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E6DF" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#66716B', fontSize: 11 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#66716B', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: '1px solid #E5E6DF', 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        fontSize: '12px'
                      }} 
                      formatter={(val: any) => [`${val} plans`, 'Dispatched']}
                    />
                    <Bar dataKey="plans" fill="#154734" radius={[6, 6, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DAA ALGORITHMS & TELEMETRY                                         */}
      {/* ========================================================================= */}
      {activeTab === 'daa' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Top DAA Intelligence Banner */}
          <motion.div variants={itemVariants}>
            <Card variant="glass" className="p-6 border-l-4 border-l-purple-600 bg-gradient-to-r from-purple-50/40 via-white to-brand-surface/40">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2">
                    <Badge variant="purple" className="text-[10px] font-bold">
                      DAA Architecture Spec
                    </Badge>
                    <span className="text-[11px] text-brand-text-secondary font-mono">
                      Pure Algorithmic Layer • Zero External Dependency
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-brand-text">
                    Unified Design & Analysis of Algorithms (DAA) Intelligence Engine
                  </h3>
                  <p className="text-xs text-brand-text-secondary leading-relaxed">
                    SmartLogix implements 7 distinct, verified algorithm components covering combinatorial vehicle routing, dynamic network optimization, and greedy capacity approximation. Each algorithm operates directly over persistent Postgres graph topologies and road-distance matrices.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-3 bg-white/90 p-2.5 rounded-xl border border-brand-border/80 shadow-xs text-center">
                    <div className="px-2">
                      <span className="text-[10px] text-brand-text-secondary uppercase font-bold block">Solvers</span>
                      <span className="text-xl font-extrabold text-purple-900 font-mono">7</span>
                    </div>
                    <div className="px-2 border-l border-brand-border/60">
                      <span className="text-[10px] text-brand-text-secondary uppercase font-bold block">Graph Nodes |V|</span>
                      <span className="text-xl font-extrabold text-emerald-800 font-mono">{metrics.vertexCount}</span>
                    </div>
                    <div className="px-2 border-l border-brand-border/60">
                      <span className="text-[10px] text-brand-text-secondary uppercase font-bold block">Road Edges |E|</span>
                      <span className="text-xl font-extrabold text-sky-800 font-mono">{metrics.edgeCount}</span>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-72 h-40 rounded-xl overflow-hidden soft-inset p-1.5 flex-shrink-0 shadow-soft-sm bg-white/70">
                  <img 
                    src="/images/smartlogix/supply-analytics-intelligence.jpg" 
                    alt="DAA telemetry and logistics intelligence analytics dashboard" 
                    loading="lazy"
                    className="w-full h-full object-cover rounded-lg hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Logistics Network Graph Foundation Card */}
          <motion.div variants={itemVariants}>
            <Card variant="dense" className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-brand-primary" />
                  <h4 className="text-sm font-bold text-brand-text">
                    Physical Logistics Graph Foundation
                  </h4>
                  <span className="text-[9px] bg-stone-100 text-stone-600 font-mono px-1 rounded">
                    location_distances
                  </span>
                </div>
                <Badge variant="sage" className="text-[10px]">
                  Real Road Geometry
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-xl bg-brand-surface border border-brand-border/70 space-y-1">
                  <span className="text-[10px] font-bold text-brand-text-secondary uppercase block">Warehouses (Depots)</span>
                  <span className="text-base font-extrabold text-brand-text font-mono">{warehouses.length}</span>
                  <span className="text-[10px] text-brand-text-secondary block">Origins / Hubs</span>
                </div>

                <div className="p-3 rounded-xl bg-brand-surface border border-brand-border/70 space-y-1">
                  <span className="text-[10px] font-bold text-brand-text-secondary uppercase block">Delivery Stops</span>
                  <span className="text-base font-extrabold text-brand-text font-mono">{locations.length}</span>
                  <span className="text-[10px] text-brand-text-secondary block">Destinations</span>
                </div>

                <div className="p-3 rounded-xl bg-brand-surface border border-brand-border/70 space-y-1">
                  <span className="text-[10px] font-bold text-brand-text-secondary uppercase block">Directed Edges</span>
                  <span className="text-base font-extrabold text-sky-800 font-mono">{metrics.edgeCount}</span>
                  <span className="text-[10px] text-brand-text-secondary block">Matrix entries</span>
                </div>

                <div className="p-3 rounded-xl bg-brand-surface border border-brand-border/70 space-y-1">
                  <span className="text-[10px] font-bold text-brand-text-secondary uppercase block">Network Road Dist</span>
                  <span className="text-base font-extrabold text-emerald-800 font-mono">{metrics.totalGraphRoadKm} km</span>
                  <span className="text-[10px] text-brand-text-secondary block">Total kilometers</span>
                </div>

                <div className="p-3 rounded-xl bg-brand-surface border border-brand-border/70 space-y-1">
                  <span className="text-[10px] font-bold text-brand-text-secondary uppercase block">Average Distance</span>
                  <span className="text-base font-extrabold text-brand-primary font-mono">{metrics.avgEdgeDistance} km</span>
                  <span className="text-[10px] text-brand-text-secondary block">Per road edge</span>
                </div>

                <div className="p-3 rounded-xl bg-brand-surface border border-brand-border/70 space-y-1">
                  <span className="text-[10px] font-bold text-brand-text-secondary uppercase block">Distance Range</span>
                  <span className="text-base font-extrabold text-amber-800 font-mono">{metrics.minEdgeDistance} – {metrics.maxEdgeDistance}</span>
                  <span className="text-[10px] text-brand-text-secondary block">Min / Max km</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Detailed 7-Algorithm Specification Matrix */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-brand-text flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-700" />
                  Algorithm Catalog & Mathematical Complexity Matrix
                </h4>
                <p className="text-xs text-brand-text-secondary mt-0.5">
                  Factual specification of all 7 algorithmic solvers verified in the SmartLogix core
                </p>
              </div>
              <span className="text-[10px] text-brand-text-secondary font-mono bg-stone-100 px-2 py-0.5 rounded">
                7 Implemented Solvers
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DAA_ALGORITHM_CATALOG.map((algo) => (
                <Card key={algo.id} variant="glass" className="p-5 space-y-3 border-t-4 border-t-purple-600 hover:shadow-soft-md transition-all flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2 border-b border-brand-border/60 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-sm text-brand-text">{algo.name}</h5>
                          <Badge variant={algo.badgeVariant} className="text-[9px] font-bold">
                            {algo.optimality}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-purple-900 font-semibold block mt-0.5">
                          {algo.category}
                        </span>
                      </div>
                      <Link
                        to={algo.systemRoute}
                        className="text-stone-400 hover:text-brand-primary p-1 rounded-md hover:bg-stone-100 transition-colors"
                        title={`Open in ${algo.systemRoute}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <p className="text-xs text-brand-text-secondary leading-relaxed">
                      {algo.problemSolved}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 rounded bg-brand-surface border border-brand-border/60 space-y-0.5">
                        <span className="text-brand-text-secondary text-[10px] font-bold block uppercase">Time Complexity:</span>
                        <span className="font-mono font-bold text-purple-950 block">{algo.timeComplexity}</span>
                      </div>
                      <div className="p-2 rounded bg-brand-surface border border-brand-border/60 space-y-0.5">
                        <span className="text-brand-text-secondary text-[10px] font-bold block uppercase">Space Complexity:</span>
                        <span className="font-mono font-bold text-emerald-950 block">{algo.spaceComplexity}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] pt-1">
                      <div>
                        <span className="font-semibold text-brand-text">Algorithm Paradigm: </span>
                        <span className="text-brand-text-secondary">{algo.paradigm}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-brand-text">Input Structure: </span>
                        <span className="text-brand-text-secondary font-mono">{algo.inputData}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-brand-text">Source Implementation: </span>
                        <span className="text-brand-primary font-mono text-[10px]">{algo.systemLocation}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-brand-border/50 text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                    <span>{algo.operationalValue}</span>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* DAA Problem vs Solution Comparison Table */}
          <motion.div variants={itemVariants}>
            <Card variant="dense" className="p-6 space-y-4">
              <div className="border-b border-brand-border/60 pb-3">
                <h4 className="text-sm font-bold text-brand-text flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-primary" />
                  Supply Chain Logistics Problem Mapping Matrix
                </h4>
                <p className="text-xs text-brand-text-secondary mt-0.5">
                  Factual comparison of logistics operational challenges paired with their optimal DAA algorithm solution
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-brand-border/70">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-brand-surface/80 border-b border-brand-border/80 text-[11px] font-bold text-brand-text-secondary uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Logistics Operational Challenge</th>
                      <th className="py-2.5 px-3">Primary Algorithm</th>
                      <th className="py-2.5 px-3">Computational Paradigm</th>
                      <th className="py-2.5 px-3">Optimality Class</th>
                      <th className="py-2.5 px-3">System Module</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/60 bg-white/80">
                    <tr className="hover:bg-brand-surface/40">
                      <td className="py-3 px-3 font-semibold text-brand-text">
                        Exact Delivery Route Tour (≤ 12 stops)
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-brand-primary">
                        Branch & Bound TSP
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        Backtracking & State-Space Bounding
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="success" className="text-[9px]">Exact Optimal</Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-500">
                        Delivery Planning (/planning)
                      </td>
                    </tr>
                    <tr className="hover:bg-brand-surface/40">
                      <td className="py-3 px-3 font-semibold text-brand-text">
                        Fast Sub-Second Tour Approximation
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-amber-800">
                        Greedy Nearest Neighbor
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        Greedy Stepwise Selection
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="warning" className="text-[9px]">Heuristic O(n²)</Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-500">
                        Delivery Planning (/planning)
                      </td>
                    </tr>
                    <tr className="hover:bg-brand-surface/40">
                      <td className="py-3 px-3 font-semibold text-brand-text">
                        Inbound Restock Batch Allocation
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-purple-900">
                        First-Fit Decreasing (FFD)
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        Greedy Approximation
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="purple" className="text-[9px]">Approximation</Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-500">
                        Warehouse Restock (/inventory)
                      </td>
                    </tr>
                    <tr className="hover:bg-brand-surface/40">
                      <td className="py-3 px-3 font-semibold text-brand-text">
                        Customer Order Fulfillment Depot Selection
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-sky-800">
                        Dijkstra Shortest Path
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        Greedy Edge Relaxation
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="info" className="text-[9px]">Exact Optimal</Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-500">
                        Order Creation (/orders/create)
                      </td>
                    </tr>
                    <tr className="hover:bg-brand-surface/40">
                      <td className="py-3 px-3 font-semibold text-brand-text">
                        Global All-Pairs Distance & Shortcut Query
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-purple-900">
                        Floyd-Warshall
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        Dynamic Programming O(V³)
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="sage" className="text-[9px]">Exact All-Pairs</Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-500">
                        Distance Matrix (/distance-matrix)
                      </td>
                    </tr>
                    <tr className="hover:bg-brand-surface/40">
                      <td className="py-3 px-3 font-semibold text-brand-text">
                        Logistics Infrastructure Backbone Minimization
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                        Kruskal Spanning Tree
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        Greedy Edge Selection
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="default" className="text-[9px]">Exact MST</Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-500">
                        Distance Matrix (/distance-matrix)
                      </td>
                    </tr>
                    <tr className="hover:bg-brand-surface/40">
                      <td className="py-3 px-3 font-semibold text-brand-text">
                        Acyclic Component & Cycle Validation
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-lime-900">
                        Union-Find (Disjoint-Set)
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        Path Compression + Rank Union
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="lime" className="text-[9px]">O(α(V)) Amortized</Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-500">
                        Kruskal Engine (/distance-matrix)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>

          {/* Persisted TSP Performance Audit (Real Delivery Plans Data) */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card variant="glass" className="p-5 space-y-3 border-l-4 border-l-brand-primary">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                <span className="font-bold text-sm text-brand-text flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-800" />
                  Branch & Bound (Exact TSP) Runs
                </span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.5 rounded font-bold">
                  PERSISTED PLANS
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-brand-text-secondary text-[11px] block">Delivery Plans Solved:</span>
                  <span className="text-xl font-bold font-mono text-brand-text">{metrics.branchAndBoundCount}</span>
                </div>
                <div>
                  <span className="text-brand-text-secondary text-[11px] block">Total Kilometers Routed:</span>
                  <span className="text-xl font-bold font-mono text-emerald-800">{metrics.bbTotalDistance} km</span>
                </div>
              </div>
              <p className="text-[11px] text-brand-text-secondary pt-1 border-t border-brand-border/40">
                Guarantees mathematical global minimum tour distance by systematically bounding unvisited stop permutations.
              </p>
            </Card>

            <Card variant="glass" className="p-5 space-y-3 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                <span className="font-bold text-sm text-brand-text flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-700" />
                  Greedy Nearest Neighbor Runs
                </span>
                <span className="text-[9px] bg-amber-100 text-amber-800 font-mono px-1.5 py-0.5 rounded font-bold">
                  PERSISTED PLANS
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-brand-text-secondary text-[11px] block">Delivery Plans Solved:</span>
                  <span className="text-xl font-bold font-mono text-brand-text">{metrics.greedyCount}</span>
                </div>
                <div>
                  <span className="text-brand-text-secondary text-[11px] block">Total Kilometers Routed:</span>
                  <span className="text-xl font-bold font-mono text-amber-800">{metrics.greedyTotalDistance} km</span>
                </div>
              </div>
              <p className="text-[11px] text-brand-text-secondary pt-1 border-t border-brand-border/40">
                Executes in quadratic polynomial time O(n²), making it suitable for immediate operational tour generation.
              </p>
            </Card>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DELIVERY AUDIT LEDGER                                              */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <motion.div variants={itemVariants}>
          <Card variant="dense" className="p-6 space-y-5 overflow-hidden">
            {/* Header & Integrated Filters Toolbar */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                      <Route className="w-5 h-5 text-brand-primary" />
                      Delivery Plans Audit Ledger
                    </h3>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.5 rounded font-bold">
                      LIVE DATABASE
                    </span>
                  </div>
                  <p className="text-xs text-brand-text-secondary mt-0.5">
                    Complete historical record of dispatch plans, assigned transport fleet, and DAA tour calculations
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-brand-text-secondary font-medium">
                    Showing <strong>{filteredPlans.length}</strong> of {plans.length} plans
                  </span>
                </div>
              </div>

              {/* Filter Controls Row */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-brand-surface/50 p-3 rounded-xl border border-brand-border/70">
                {/* Search input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search plan number, warehouse, or vehicle..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/90 backdrop-blur-xs border border-brand-border/90 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/40 text-brand-text shadow-xs"
                  />
                </div>

                {/* Status Filter Dropdown */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-brand-text-secondary" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-white/90 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/40 shadow-xs"
                    >
                      <option value="ALL">All Statuses ({plans.length})</option>
                      <option value="PLANNED">Planned ({metrics.activePlans})</option>
                      <option value="CANCELLED">Cancelled ({metrics.cancelledPlans})</option>
                    </select>
                  </div>

                  {/* Warehouse Filter Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-brand-text-secondary" />
                    <select
                      value={warehouseFilter}
                      onChange={(e) => setWarehouseFilter(e.target.value)}
                      className="bg-white/90 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/40 shadow-xs max-w-[180px] truncate"
                    >
                      <option value="ALL">All Warehouses</option>
                      {warehouses.map(wh => (
                        <option key={wh.id} value={wh.id}>
                          {wh.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reset Filters Button */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="text-brand-text-secondary hover:text-brand-dark flex items-center gap-1 text-xs py-2 px-2.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Responsive Table Container */}
            <div className="overflow-x-auto rounded-xl border border-brand-border/70">
              {filteredPlans.length === 0 ? (
                <div className="p-12 text-center text-brand-text-secondary">
                  <Route className="w-10 h-10 text-brand-primary/40 mx-auto mb-3" />
                  <h4 className="font-bold text-brand-text text-sm">No Delivery Plans Match Your Search</h4>
                  <p className="text-xs text-brand-text-secondary mt-1">
                    {hasActiveFilters 
                      ? 'Try clearing or relaxing your active search and filter constraints.'
                      : 'No delivery plans have been created in the system yet.'}
                  </p>
                  {hasActiveFilters && (
                    <Button onClick={resetFilters} variant="outline" size="sm" className="mt-3 text-xs">
                      Clear Active Filters
                    </Button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-brand-surface/75 border-b border-brand-border/80 text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5">Plan Number</th>
                      <th className="py-3 px-3">Origin Warehouse Hub</th>
                      <th className="py-3 px-3">Assigned Vehicle</th>
                      <th className="py-3 px-3 text-center">Orders</th>
                      <th className="py-3 px-3">Routing Engine</th>
                      <th className="py-3 px-3 text-right">Tour Distance</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/60 bg-white/70">
                    {filteredPlans.map(plan => {
                      const orderCount = plan.delivery_plan_orders?.length || 0;
                      return (
                        <tr key={plan.id} className="hover:bg-brand-surface/40 transition-colors">
                          {/* Plan Number */}
                          <td className="py-3.5 px-3.5 font-mono font-bold text-brand-text">
                            <div className="flex items-center gap-1.5">
                              <Route className="w-3.5 h-3.5 text-brand-primary" />
                              <span>{plan.plan_number}</span>
                            </div>
                          </td>

                          {/* Origin Warehouse */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                              <span className="font-semibold text-brand-text truncate max-w-[160px]">
                                {plan.warehouse?.name || 'Warehouse Depot'}
                              </span>
                            </div>
                            {plan.warehouse?.code && (
                              <span className="text-[10px] text-brand-text-secondary pl-5 block">
                                Code: {plan.warehouse.code}
                              </span>
                            )}
                          </td>

                          {/* Assigned Vehicle */}
                          <td className="py-3.5 px-3">
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

                          {/* Orders count */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-full font-mono font-bold bg-brand-soft text-brand-dark">
                              {orderCount}
                            </span>
                          </td>

                          {/* Algorithm */}
                          <td className="py-3.5 px-3">
                            {plan.route_algorithm ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-brand-text">
                                {plan.route_algorithm === 'BRANCH_AND_BOUND' ? (
                                  <>
                                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Branch & Bound (Exact)</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3.5 h-3.5 text-amber-700" />
                                    <span>Greedy Heuristic</span>
                                  </>
                                )}
                              </span>
                            ) : (
                              <span className="text-brand-text-secondary italic">Pending solver</span>
                            )}
                          </td>

                          {/* Tour Distance */}
                          <td className="py-3.5 px-3 text-right">
                            {plan.route_distance != null ? (
                              <span className="font-mono font-extrabold text-emerald-800">
                                {plan.route_distance} km
                              </span>
                            ) : (
                              <span className="text-brand-text-secondary">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 text-center">
                            <Badge variant={plan.status === 'PLANNED' ? 'success' : 'default'}>
                              {plan.status}
                            </Badge>
                          </td>

                          {/* Action Links */}
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to="/planning"
                                className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-active hover:underline"
                                title="Inspect in Delivery Planning"
                              >
                                <span>Plan</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                              <Link
                                to="/map"
                                className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline"
                                title="Visualize on Map"
                              >
                                <span>Map</span>
                                <MapPin className="w-3 h-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};
