import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { DeliveryPlan, Order, Vehicle, Warehouse } from '../types/database.types';
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
  Clock,
  ShoppingCart,
  BarChart3,
  PieChart as PieIcon
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
  Cell 
} from 'recharts';
import { motion, type Variants } from 'framer-motion';

export const Reports: React.FC = () => {
  const [plans, setPlans] = useState<DeliveryPlan[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Interactive filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PLANNED' | 'CANCELLED'>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      const [plansData, ordersData, vehiclesData, warehousesData] = await Promise.all([
        api.plans.list(),
        api.orders.list(),
        api.vehicles.list(),
        api.warehouses.list()
      ]);
      setPlans(plansData);
      setOrders(ordersData);
      setVehicles(vehiclesData);
      setWarehouses(warehousesData);
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReportsData();
  };

  // CSV Export
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

  // Metrics computation from real application records
  const metrics = useMemo(() => {
    const totalPlans = plans.length;
    const activePlans = plans.filter(p => p.status === 'PLANNED').length;
    const cancelledPlans = plans.filter(p => p.status === 'CANCELLED').length;
    const planFulfillmentRate = totalPlans > 0 ? Math.round((activePlans / totalPlans) * 100) : 0;

    const plansWithRoute = plans.filter(p => p.route_distance != null);
    const totalRoutedDistance = plansWithRoute.reduce((sum, p) => sum + (Number(p.route_distance) || 0), 0);
    const avgRouteDistance = plansWithRoute.length > 0 ? (totalRoutedDistance / plansWithRoute.length).toFixed(1) : '0';

    const branchAndBoundCount = plans.filter(p => p.route_algorithm === 'BRANCH_AND_BOUND').length;
    const greedyCount = plans.filter(p => p.route_algorithm === 'GREEDY_NEAREST_NEIGHBOR').length;
    const totalSolvedTours = branchAndBoundCount + greedyCount;

    const assignedVehicles = plans.filter(p => p.status === 'PLANNED' && p.vehicle_id).length;
    const fleetUtilization = vehicles.length > 0 ? Math.round((assignedVehicles / vehicles.length) * 100) : 0;

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
    const processingOrders = orders.filter(o => o.status === 'PROCESSING').length;
    const orderFulfillmentRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

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
      totalSolvedTours,
      assignedVehicles,
      fleetUtilization,
      totalOrders,
      deliveredOrders,
      pendingOrders,
      processingOrders,
      orderFulfillmentRate
    };
  }, [plans, orders, vehicles]);

  // Chart 1: Algorithm breakdown for Donut
  const algorithmData = useMemo(() => {
    const unroutedCount = Math.max(0, metrics.totalPlans - (metrics.branchAndBoundCount + metrics.greedyCount));
    const items = [
      { name: 'Branch & Bound (Exact)', value: metrics.branchAndBoundCount, color: '#154734' },
      { name: 'Greedy Nearest-Neighbor', value: metrics.greedyCount, color: '#d97706' },
      { name: 'Pending Route Solver', value: unroutedCount, color: '#94a3b8' }
    ];
    return items.filter(i => i.value > 0);
  }, [metrics]);

  // Chart 2: Delivery Plans by Warehouse Hub
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

  // Filtered table rows
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

  // Container motion animation
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-brand-border/80 shadow-soft-md">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="text-sm font-bold text-brand-text">Compiling Operational Analytics</p>
            <p className="text-xs text-brand-text-secondary mt-1">Aggregating plans, vehicle telemetry, and DAA solver statistics...</p>
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
          title="Operational Analytics & Logistics Reports"
          description="High-fidelity metrics across DAA algorithm solvers, warehouse hub dispatch throughput, vehicle fleet allocation, and delivery order fulfillment."
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
              <Link to="/planning">
                <Button variant="primary" className="flex items-center gap-1.5 text-xs font-semibold shadow-xs py-2 px-3.5">
                  <Route className="w-3.5 h-3.5" />
                  <span>Delivery Planning</span>
                </Button>
              </Link>
            </div>
          }
        />
      </motion.div>

      {/* Primary KPI Grid (4 High-Level Operational Metrics) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Plans */}
        <Card variant="glass" className="p-5 border-l-4 border-l-emerald-600 hover:shadow-soft-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
                Active Plans
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
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
                Total Route Distance
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

        {/* KPI 3: Fleet Utilization */}
        <Card variant="glass" className="p-5 border-l-4 border-l-amber-500 hover:shadow-soft-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
                Fleet Assignment
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
              <span className="text-stone-500">{vehicles.length} total units</span>
            </div>
          </div>
        </Card>

        {/* KPI 4: DAA Algorithms Solved */}
        <Card variant="glass" className="p-5 border-l-4 border-l-purple-600 hover:shadow-soft-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
                DAA Solvers Applied
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-brand-text">{metrics.totalSolvedTours}</span>
              <span className="text-xs text-brand-text-secondary font-medium">tours calculated</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-brand-border/50 flex items-center justify-between text-[11px] text-brand-text-secondary">
            <span className="flex items-center gap-1 font-medium text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              {metrics.branchAndBoundCount} B&B (Exact)
            </span>
            <span className="flex items-center gap-1 font-medium text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {metrics.greedyCount} Greedy
            </span>
          </div>
        </Card>
      </motion.div>

      {/* Secondary Quick Pulse Strip: Orders & Network Hubs */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/70 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-brand-border/80 shadow-xs">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider block">Delivered Orders</span>
            <span className="text-sm font-extrabold text-brand-text font-mono">{metrics.deliveredOrders} / {metrics.totalOrders}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2 border-l border-brand-border/60">
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider block">Processing Orders</span>
            <span className="text-sm font-extrabold text-brand-text font-mono">{metrics.processingOrders} active</span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2 border-l border-brand-border/60">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider block">Pending Queue</span>
            <span className="text-sm font-extrabold text-brand-text font-mono">{metrics.pendingOrders} awaiting</span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2 border-l border-brand-border/60">
          <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider block">Depot Warehouses</span>
            <span className="text-sm font-extrabold text-brand-text font-mono">{warehouses.length} active hubs</span>
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
                  DAA Solver Distribution
                </h3>
                <p className="text-[11px] text-brand-text-secondary mt-0.5">
                  Algorithm usage across all saved delivery tours
                </p>
              </div>
              <Badge variant="default" className="text-[10px]">
                {metrics.totalPlans} Plans
              </Badge>
            </div>

            <div className="h-56 relative flex items-center justify-center my-2">
              {algorithmData.length === 0 ? (
                <div className="text-center text-xs text-brand-text-secondary">
                  No delivery plans recorded yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={algorithmData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {algorithmData.map((entry, index) => (
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
              {algorithmData.length > 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <span className="text-2xl font-extrabold font-mono text-brand-text">{metrics.totalPlans}</span>
                  <p className="text-[10px] font-semibold text-brand-text-secondary uppercase tracking-wider">Plans</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-brand-border/60">
            {algorithmData.map((item, idx) => {
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

        {/* Chart 2: Warehouse Dispatch Volume Bar Chart */}
        <Card variant="glass" className="p-6 lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-brand-text flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-primary" />
                  Delivery Plans per Warehouse Depot Hub
                </h3>
                <p className="text-[11px] text-brand-text-secondary mt-0.5">
                  Distribution of dispatch schedules originating from mapped warehouse nodes
                </p>
              </div>
              <span className="text-xs text-brand-text-secondary font-mono">
                {warehouses.length} Active Hubs
              </span>
            </div>

            <div className="h-60 mt-3">
              {warehousePlanData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-brand-text-secondary">
                  No warehouse dispatch records available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={warehousePlanData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
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
                      formatter={(val: any) => [`${val} plans`, 'Dispatched Plans']}
                      labelFormatter={(lbl: any, payload: any) => payload?.[0]?.payload?.fullName || lbl}
                    />
                    <Bar 
                      dataKey="plans" 
                      fill="#154734" 
                      radius={[6, 6, 0, 0]} 
                      barSize={32} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-text-secondary">
            <span>Real Road-Distance routing metrics via OpenRouteService</span>
            <span className="font-semibold text-brand-primary">Depot Origin Node (TSP Start)</span>
          </div>
        </Card>
      </motion.div>

      {/* Main Delivery Plans Audit Log Section */}
      <motion.div variants={itemVariants}>
        <Card variant="dense" className="p-6 space-y-5 overflow-hidden">
          {/* Header & Integrated Filters Toolbar */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-4">
              <div>
                <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                  <Route className="w-5 h-5 text-brand-primary" />
                  Delivery Plans Audit Ledger
                </h3>
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
                    <th className="py-3 px-3 text-right">Action</th>
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

                        {/* Action Link to Planning */}
                        <td className="py-3.5 px-3 text-right">
                          <Link
                            to="/planning"
                            className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-active hover:underline"
                            title="Inspect in Delivery Planning"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
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
    </motion.div>
  );
};
