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
  Building2
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

export const Reports: React.FC = () => {
  const [plans, setPlans] = useState<DeliveryPlan[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PLANNED' | 'CANCELLED'>('ALL');

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

  // Metrics computation
  const metrics = useMemo(() => {
    const totalPlans = plans.length;
    const activePlans = plans.filter(p => p.status === 'PLANNED').length;
    const cancelledPlans = plans.filter(p => p.status === 'CANCELLED').length;

    const plansWithRoute = plans.filter(p => p.route_distance != null);
    const totalRoutedDistance = plansWithRoute.reduce((sum, p) => sum + (Number(p.route_distance) || 0), 0);
    const avgRouteDistance = plansWithRoute.length > 0 ? (totalRoutedDistance / plansWithRoute.length).toFixed(1) : '0';

    const branchAndBoundCount = plans.filter(p => p.route_algorithm === 'BRANCH_AND_BOUND').length;
    const greedyCount = plans.filter(p => p.route_algorithm === 'GREEDY_NEAREST_NEIGHBOR').length;

    const assignedVehicles = plans.filter(p => p.status === 'PLANNED' && p.vehicle_id).length;
    const fleetUtilization = vehicles.length > 0 ? Math.round((assignedVehicles / vehicles.length) * 100) : 0;

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
    const processingOrders = orders.filter(o => o.status === 'PROCESSING').length;

    return {
      totalPlans,
      activePlans,
      cancelledPlans,
      totalRoutedDistance: totalRoutedDistance.toFixed(1),
      avgRouteDistance,
      branchAndBoundCount,
      greedyCount,
      assignedVehicles,
      fleetUtilization,
      totalOrders,
      deliveredOrders,
      pendingOrders,
      processingOrders
    };
  }, [plans, orders, vehicles]);

  // Chart: Algorithm breakdown
  const algorithmData = useMemo(() => [
    { name: 'Branch & Bound (Exact)', value: metrics.branchAndBoundCount, color: '#047857' },
    { name: 'Greedy Heuristic', value: metrics.greedyCount, color: '#d97706' },
    { name: 'Unrouted Plans', value: metrics.totalPlans - (metrics.branchAndBoundCount + metrics.greedyCount), color: '#9ca3af' }
  ], [metrics]);

  // Chart: Delivery Plans by Warehouse
  const warehousePlanData = useMemo(() => {
    const map = new Map<string, number>();
    warehouses.forEach(w => map.set(w.name, 0));
    plans.forEach(p => {
      const name = p.warehouse?.name || 'Unknown';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({
      name: name.length > 14 ? `${name.substring(0, 14)}...` : name,
      plans: count
    }));
  }, [plans, warehouses]);

  const filteredPlans = useMemo(() => {
    if (statusFilter === 'ALL') return plans;
    return plans.filter(p => p.status === statusFilter);
  }, [plans, statusFilter]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-brand-text-secondary font-medium">Compiling operational metrics & reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Operational Analytics & Route Reports"
        description="Comprehensive audit of delivery plans, DAA optimization algorithms, transport fleet utilization, and order execution."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
            </Button>
            <Link to="/planning">
              <Button variant="primary" className="flex items-center gap-1.5 text-xs font-semibold">
                <Route className="w-3.5 h-3.5" />
                <span>Go to Delivery Planning</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass" className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
              Active Plans
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shadow-xs">
              <Route className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-brand-text">{metrics.activePlans}</span>
            <span className="text-xs text-brand-text-secondary">of {metrics.totalPlans} total</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium block mt-1">
            {metrics.cancelledPlans} cancelled / archived
          </span>
        </Card>

        <Card variant="glass" className="p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
              Total Route Distance
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-brand-text">{metrics.totalRoutedDistance}</span>
            <span className="text-xs font-semibold text-brand-text-secondary">km</span>
          </div>
          <span className="text-[11px] text-brand-text-secondary block mt-1">
            Avg {metrics.avgRouteDistance} km per optimized plan
          </span>
        </Card>

        <Card variant="glass" className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
              Fleet Assignment
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 shadow-xs">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-brand-text">{metrics.fleetUtilization}%</span>
            <span className="text-xs text-brand-text-secondary">utilized</span>
          </div>
          <span className="text-[11px] text-brand-text-secondary block mt-1">
            {metrics.assignedVehicles} of {vehicles.length} vehicles on route
          </span>
        </Card>

        <Card variant="glass" className="p-5 border-l-4 border-l-brand-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
              DAA Algorithms
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-brand-text">
              {metrics.branchAndBoundCount + metrics.greedyCount}
            </span>
            <span className="text-xs text-brand-text-secondary">routes solved</span>
          </div>
          <span className="text-[11px] text-brand-text-secondary block mt-1">
            {metrics.branchAndBoundCount} B&B (exact) • {metrics.greedyCount} Greedy
          </span>
        </Card>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Algorithm Usage Chart */}
        <Card variant="glass" className="p-5 space-y-4">
          <div className="border-b border-brand-border/60 pb-3">
            <h3 className="text-sm font-bold text-brand-text flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-primary" />
              Optimization Algorithm Distribution
            </h3>
            <p className="text-[11px] text-brand-text-secondary">
              Breakdown of solver engines applied across saved plans
            </p>
          </div>

          <div className="h-56 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={algorithmData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {algorithmData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-brand-text">{metrics.totalPlans}</span>
              <p className="text-[10px] text-brand-text-secondary">Plans</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-brand-border/40">
            {algorithmData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-brand-text font-medium">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-brand-text">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Warehouse Activity Bar Chart */}
        <Card variant="glass" className="p-5 lg:col-span-2 space-y-4">
          <div className="border-b border-brand-border/60 pb-3">
            <h3 className="text-sm font-bold text-brand-text flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-primary" />
              Delivery Plans per Warehouse Depot
            </h3>
            <p className="text-[11px] text-brand-text-secondary">
              Distribution of outbound logistics plans originating from hub facilities
            </p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehousePlanData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E6DF" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#66716B', fontSize: 11 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#66716B', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E6DF' }} />
                <Bar dataKey="plans" fill="#154734" radius={[4, 4, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Detailed Plans Audit Table */}
      <Card variant="dense" className="p-6 space-y-4 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-4">
          <div>
            <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
              <Route className="w-5 h-5 text-brand-primary" />
              Delivery Plans Audit Log
            </h3>
            <p className="text-xs text-brand-text-secondary mt-0.5">
              Historical ledger of plan generation, vehicle allocation, and DAA tour metrics
            </p>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand-text-secondary">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white/85 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
            >
              <option value="ALL">All Statuses ({plans.length})</option>
              <option value="PLANNED">Planned ({metrics.activePlans})</option>
              <option value="CANCELLED">Cancelled ({metrics.cancelledPlans})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-brand-border/70">
          {filteredPlans.length === 0 ? (
            <div className="text-center py-10 text-brand-text-secondary text-sm">
              No delivery plans match the selected criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-brand-surface/70 border-b border-brand-border/80 text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Plan #</th>
                  <th className="py-3 px-3">Origin Warehouse</th>
                  <th className="py-3 px-3">Assigned Vehicle</th>
                  <th className="py-3 px-3 text-center">Orders</th>
                  <th className="py-3 px-3">Algorithm</th>
                  <th className="py-3 px-3 text-right">Distance</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 bg-white/70">
                {filteredPlans.map(plan => {
                  const orderCount = plan.delivery_plan_orders?.length || 0;
                  return (
                    <tr key={plan.id} className="hover:bg-brand-surface/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-brand-text">
                        {plan.plan_number}
                      </td>
                      <td className="py-3 px-3 font-semibold text-brand-text">
                        {plan.warehouse?.name || 'Warehouse Depot'}
                      </td>
                      <td className="py-3 px-3">
                        {plan.vehicle ? (
                          <div>
                            <span className="font-semibold text-brand-text block">{plan.vehicle.name}</span>
                            <span className="text-[10px] text-brand-text-secondary font-mono">{plan.vehicle.registration_number}</span>
                          </div>
                        ) : (
                          <span className="text-amber-700 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {orderCount}
                      </td>
                      <td className="py-3 px-3">
                        {plan.route_algorithm ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-brand-text">
                            {plan.route_algorithm === 'BRANCH_AND_BOUND' ? (
                              <>
                                <Layers className="w-3 h-3 text-emerald-700" />
                                Branch & Bound
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3 text-amber-700" />
                                Greedy Heuristic
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="text-brand-text-secondary italic">Pending routing</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                        {plan.route_distance != null ? `${plan.route_distance} km` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={plan.status === 'PLANNED' ? 'success' : 'default'}>
                          {plan.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to="/planning"
                          className="inline-flex items-center gap-1 text-brand-primary hover:text-brand-active font-semibold"
                        >
                          View <ArrowRight className="w-3 h-3" />
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
    </div>
  );
};
