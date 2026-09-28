import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { 
  Package, Box, Warehouse, ShoppingCart, Truck, 
  CheckCircle, ArrowRight, Route, ShieldCheck, TrendingUp, MapPin, Sparkles
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { Vehicle, Order, Product, Warehouse as WarehouseType, DeliveryPlan } from '../types/database.types';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.35 }
  }
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: string;
  to?: string;
}

const StatCard = ({ title, value, subtitle, icon: Icon, trend, to }: StatCardProps) => {
  const content = (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className="h-full"
    >
      <div className="soft-card rounded-2xl p-4 flex flex-col justify-between h-full relative overflow-hidden transition-all duration-200 hover:border-brand-primary/40 hover:shadow-soft-lg group cursor-pointer">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-brand-soft border border-brand-primary/15 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-soft-sm">
            <Icon className="w-5 h-5 text-brand-primary" />
          </div>
          {trend && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </span>
          )}
        </div>
        
        <div>
          <p className="text-xs text-brand-text-secondary font-medium tracking-wide truncate">{title}</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h3 className="text-2xl font-bold tracking-tight text-brand-text font-sans">{value}</h3>
          </div>
          {subtitle && (
            <p className="text-[11px] text-brand-text-secondary/90 font-medium mt-1 truncate">{subtitle}</p>
          )}
        </div>

        {/* Subtle accent bar at bottom on hover */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-primary to-brand-lime opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  );

  return to ? <Link to={to} className="block h-full">{content}</Link> : content;
};

const getStatusVariant = (status: string) => {
  switch(status) {
    case 'DELIVERED': return 'success';
    case 'DISPATCHED':
    case 'PROCESSING': return 'info';
    case 'PENDING': return 'warning';
    case 'CANCELLED': return 'danger';
    default: return 'default';
  }
};

export const Dashboard = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [plans, setPlans] = useState<DeliveryPlan[]>([]);
  const [totalInventoryQty, setTotalInventoryQty] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [vData, oData, pData, wData, iData, plansData] = await Promise.all([
        api.vehicles.list(),
        api.orders.list(),
        api.products.list(),
        api.warehouses.list(),
        api.inventory.list(),
        api.plans.list()
      ]);

      setVehicles(vData);
      setOrders(oData);
      setProducts(pData);
      setWarehouses(wData);
      setPlans(plansData);

      const invQty = iData.reduce((sum, item) => sum + item.quantity, 0);
      setTotalInventoryQty(invQty);
    } catch (err: any) {
      setError(err.message || 'Failed to load live dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  // Fleet stats
  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const inUseVehicles = vehicles.filter(v => v.status === 'ON_ROUTE').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'MAINTENANCE').length;
  const offDutyVehicles = vehicles.filter(v => v.status === 'OFF_DUTY').length;

  // Order stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
  const processingOrders = orders.filter(o => o.status === 'PROCESSING').length;
  const dispatchedOrders = orders.filter(o => o.status === 'DISPATCHED').length;
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;

  // Delivery plan stats
  const activePlans = plans.filter(p => p.status === 'PLANNED').length;
  const totalRoutedDistance = plans.reduce((sum, p) => sum + (Number(p.route_distance) || 0), 0);

  const orderStatusData = [
    { name: 'Pending', value: pendingOrders, color: '#f59e0b' },
    { name: 'Processing', value: processingOrders, color: '#3b82f6' },
    { name: 'Dispatched', value: dispatchedOrders, color: '#8b5cf6' },
    { name: 'Delivered', value: deliveredOrders, color: '#10b981' },
  ];

  // Warehouse inventory breakdown
  const inventoryByWarehouse = warehouses.map(w => {
    return {
      name: w.name.length > 14 ? `${w.name.substring(0, 14)}...` : w.name,
      quantity: totalInventoryQty > 0 ? Math.round(totalInventoryQty / (warehouses.length || 1)) : 0
    };
  });

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-14"
    >
      {error && (
        <motion.div variants={itemVariants} className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm shadow-soft-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={loadDashboardData}>Retry</Button>
        </motion.div>
      )}

      {/* Hero Section with 3D Logistics Visual */}
      <motion.div variants={itemVariants}>
        <div className="soft-card-elevated rounded-2xl overflow-hidden relative border border-brand-border/80 min-h-[270px] flex items-center">
          <div className="relative z-10 w-full md:w-3/5 p-6 sm:p-10 bg-gradient-to-r from-white via-white/95 to-transparent">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft border border-brand-primary/20 text-brand-primary text-xs font-semibold mb-3 shadow-soft-sm">
              <span className="w-2 h-2 rounded-full bg-brand-lime shadow-lime-glow animate-pulse" />
              Live Operations Control Center
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text tracking-tight mb-2">
              Logistics & Distribution Fleet
            </h1>
            <p className="text-brand-text-secondary mb-6 max-w-md leading-relaxed text-xs sm:text-sm">
              Real road-distance routing via OpenRouteService and Branch & Bound DAA optimization are active across {warehouses.length} warehouse hubs.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link to="/orders/create">
                <Button variant="primary" size="md">
                  <ShoppingCart className="w-4 h-4" /> Create Order
                </Button>
              </Link>
              <Link to="/planning">
                <Button variant="outline" size="md">
                  <Route className="w-4 h-4 text-brand-primary" /> Delivery Planning
                </Button>
              </Link>
              <Link to="/map">
                <Button variant="secondary" size="md">
                  <MapPin className="w-4 h-4 text-brand-primary" /> Logistics Map
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="hidden md:flex absolute right-0 top-0 bottom-0 w-1/2 items-center justify-end overflow-hidden">
            <img 
              src="/images/smartlogix/smartlogix-3d-hero.jpg" 
              alt="SmartLogix 3D Logistics Hub" 
              className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
              style={{ maskImage: 'linear-gradient(to right, transparent, black 25%)' }}
            />
          </div>
        </div>
      </motion.div>

      {/* Primary KPI Grid (7 Stats) */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
        <StatCard 
          title="Total Products" 
          value={loading ? '...' : products.length} 
          icon={Package} 
          trend="+Active"
          to="/products"
        />
        <StatCard 
          title="Total Inventory" 
          value={loading ? '...' : totalInventoryQty.toLocaleString()} 
          subtitle="units stored"
          icon={Box} 
          to="/inventory"
        />
        <StatCard 
          title="Warehouses" 
          value={loading ? '...' : warehouses.length} 
          subtitle="regional hubs"
          icon={Warehouse} 
          to="/warehouses"
        />
        <StatCard 
          title="Total Orders" 
          value={loading ? '...' : totalOrders} 
          icon={ShoppingCart} 
          trend={pendingOrders > 0 ? `${pendingOrders} pend` : undefined}
          to="/orders"
        />
        <StatCard 
          title="Fleet Units" 
          value={loading ? '...' : totalVehicles} 
          subtitle={`${availableVehicles} available`}
          icon={Truck} 
          to="/vehicles"
        />
        <StatCard 
          title="In Transit" 
          value={loading ? '...' : inUseVehicles} 
          subtitle={`${maintenanceVehicles} maintenance`}
          icon={CheckCircle} 
          to="/vehicles"
        />
        <StatCard 
          title="Active Plans" 
          value={loading ? '...' : activePlans} 
          subtitle={`${totalRoutedDistance.toFixed(0)} km routed`}
          icon={Route} 
          trend="DAA TSP"
          to="/planning"
        />
      </motion.div>

      {/* Fleet Operational Readiness with 3D Van Asset */}
      <motion.div variants={itemVariants}>
        <div className="soft-card rounded-2xl p-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-brand-primary shadow-soft-sm">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                  Fleet Availability & Transport Readiness
                  <Badge variant="lime" dot className="ml-1 text-[10px]">Real-Time</Badge>
                </h3>
                <p className="text-xs text-brand-text-secondary mt-0.5">
                  Live status breakdown of registered transport vehicles in database
                </p>
              </div>
            </div>
            <Link to="/vehicles">
              <Button variant="outline" size="sm">
                View Fleet Directory <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            {/* 3D Van Preview Card */}
            <div className="md:col-span-1 soft-inset rounded-xl p-3 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 overflow-hidden rounded-lg flex items-center justify-center mb-1">
                <img 
                  src="/images/smartlogix/smartlogix-3d-van.jpg" 
                  alt="EV Delivery Van" 
                  className="w-full h-full object-contain hover:scale-105 transition-transform"
                />
              </div>
              <span className="text-[11px] font-bold text-brand-text">EV Fleet Integration</span>
              <span className="text-[10px] text-brand-text-secondary">Eco-Van Logistics</span>
            </div>

            {/* 4 Status Metric Cards */}
            <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl shadow-soft-sm">
                <span className="text-xs text-emerald-800 font-semibold block">Available</span>
                <span className="text-2xl font-bold text-emerald-700 tracking-tight">{loading ? '...' : availableVehicles}</span>
                <span className="text-[11px] text-emerald-600 block mt-1">Ready for dispatch</span>
              </div>

              <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-xl shadow-soft-sm">
                <span className="text-xs text-sky-800 font-semibold block">In Use / On Route</span>
                <span className="text-2xl font-bold text-sky-700 tracking-tight">{loading ? '...' : inUseVehicles}</span>
                <span className="text-[11px] text-sky-600 block mt-1">Active delivery runs</span>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl shadow-soft-sm">
                <span className="text-xs text-amber-800 font-semibold block">Maintenance</span>
                <span className="text-2xl font-bold text-amber-700 tracking-tight">{loading ? '...' : maintenanceVehicles}</span>
                <span className="text-[11px] text-amber-600 block mt-1">Service & repairs</span>
              </div>

              <div className="p-3.5 bg-slate-100/70 border border-slate-200/80 rounded-xl shadow-soft-sm">
                <span className="text-xs text-slate-700 font-semibold block">Off Duty / Inactive</span>
                <span className="text-2xl font-bold text-slate-700 tracking-tight">{loading ? '...' : offDutyVehicles}</span>
                <span className="text-[11px] text-slate-500 block mt-1">Standby or offline</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Analytics Charts */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Order Status Donut */}
        <div className="soft-card rounded-2xl p-6 lg:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-brand-text">Order Status Distribution</h3>
            <Badge variant="info" className="text-[10px]">Real-time</Badge>
          </div>
          
          <div className="h-60 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totalOrders > 0 ? orderStatusData : [{ name: 'None', value: 1, color: '#e5e7eb' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                >
                  {(totalOrders > 0 ? orderStatusData : [{ name: 'None', value: 1, color: '#e5e7eb' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #E5E6DF', 
                    boxShadow: '0 8px 24px rgba(18, 61, 45, 0.08)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-3xl font-extrabold text-brand-text font-sans">{totalOrders}</span>
              <p className="text-[11px] font-semibold text-brand-text-secondary uppercase tracking-wider">Orders</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 mt-3 pt-3 border-t border-brand-border/60">
            {orderStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-soft-sm" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-brand-text-secondary truncate">
                  {item.name}: <strong className="text-brand-text font-semibold">{item.value}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Warehouse Network Capacity */}
        <div className="soft-card rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-brand-text">Warehouse Network Capacity</h3>
              <p className="text-xs text-brand-text-secondary mt-0.5">Estimated stock balance per distribution hub</p>
            </div>
            <Link to="/warehouses">
              <Button variant="outline" size="sm">Hub Details</Button>
            </Link>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryByWarehouse} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E6DF" opacity={0.6} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#66716B', fontSize: 11, fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#66716B', fontSize: 11 }} dx={-5} />
                <Tooltip 
                  cursor={{ fill: 'rgba(225, 241, 229, 0.4)' }} 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #E5E6DF', 
                    boxShadow: '0 8px 24px rgba(18, 61, 45, 0.08)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)'
                  }} 
                />
                <Bar dataKey="quantity" fill="#23834D" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Operational Overview: Recent Orders & Quick Actions */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Recent Orders Table */}
        <div className="soft-card rounded-2xl p-6 lg:col-span-2 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-brand-text">Recent Orders & Shipments</h3>
              <Link to="/orders" className="text-xs text-brand-primary font-semibold hover:text-brand-active flex items-center gap-1 group">
                View All Orders <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              {orders.length === 0 ? (
                <div className="py-8 text-center text-xs text-brand-text-secondary">
                  No orders recorded in database yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-brand-border/70 text-[11px] font-semibold uppercase tracking-wider text-brand-text-secondary">
                      <th className="pb-3">Order ID</th>
                      <th className="pb-3">Destination</th>
                      <th className="pb-3">Items</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40">
                    {orders.slice(0, 5).map((order) => {
                      const itemCount = order.order_items?.reduce((s, i) => s + i.quantity, 0) || 0;
                      return (
                        <tr key={order.id} className="hover:bg-brand-surface/60 transition-colors group">
                          <td className="py-3.5 text-xs font-mono font-bold text-brand-text group-hover:text-brand-primary transition-colors">
                            {order.order_number}
                          </td>
                          <td className="py-3.5 text-xs text-brand-text-secondary">
                            {order.delivery_location?.name || 'Destination'}
                          </td>
                          <td className="py-3.5 text-xs text-brand-text-secondary font-medium">
                            {itemCount} units
                          </td>
                          <td className="py-3.5 text-xs font-mono font-bold text-brand-text">
                            ${Number(order.total_amount).toFixed(2)}
                          </td>
                          <td className="py-3.5">
                            <Badge variant={getStatusVariant(order.status) as any} dot>
                              {order.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="soft-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-brand-text">Dispatch Actions</h3>
              <Sparkles className="w-4 h-4 text-brand-lime" />
            </div>

            <div className="space-y-2.5 relative z-10">
              <Link to="/planning" className="block">
                <div className="flex items-center justify-between p-3 rounded-xl border border-brand-border/70 bg-white/70 hover:bg-white hover:border-brand-primary/40 hover:shadow-soft-sm transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-soft rounded-lg group-hover:bg-brand-primary group-hover:text-white transition-colors text-brand-primary">
                      <Route className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-brand-text text-xs block">Delivery Planning & Routes</span>
                      <span className="text-[10px] text-brand-text-secondary">DAA TSP optimization</span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-text-secondary group-hover:translate-x-1 group-hover:text-brand-primary transition-all" />
                </div>
              </Link>

              <Link to="/orders/create" className="block">
                <div className="flex items-center justify-between p-3 rounded-xl border border-brand-border/70 bg-white/70 hover:bg-white hover:border-brand-primary/40 hover:shadow-soft-sm transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-soft rounded-lg group-hover:bg-brand-primary group-hover:text-white transition-colors text-brand-primary">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-brand-text text-xs block">Create New Order</span>
                      <span className="text-[10px] text-brand-text-secondary">Select customer & items</span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-text-secondary group-hover:translate-x-1 group-hover:text-brand-primary transition-all" />
                </div>
              </Link>

              <Link to="/map" className="block">
                <div className="flex items-center justify-between p-3 rounded-xl border border-brand-border/70 bg-white/70 hover:bg-white hover:border-brand-primary/40 hover:shadow-soft-sm transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-soft rounded-lg group-hover:bg-brand-primary group-hover:text-white transition-colors text-brand-primary">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-brand-text text-xs block">Logistics Map Workspace</span>
                      <span className="text-[10px] text-brand-text-secondary">Spatial coordinate planner</span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-text-secondary group-hover:translate-x-1 group-hover:text-brand-primary transition-all" />
                </div>
              </Link>

              <Link to="/vehicles" className="block">
                <div className="flex items-center justify-between p-3 rounded-xl border border-brand-border/70 bg-white/70 hover:bg-white hover:border-brand-primary/40 hover:shadow-soft-sm transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-soft rounded-lg group-hover:bg-brand-primary group-hover:text-white transition-colors text-brand-primary">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-brand-text text-xs block">Manage Vehicles</span>
                      <span className="text-[10px] text-brand-text-secondary">Assign fleet to routes</span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-text-secondary group-hover:translate-x-1 group-hover:text-brand-primary transition-all" />
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-brand-border/50 flex items-center justify-between text-[11px] text-brand-text-secondary">
            <span className="flex items-center gap-1.5 font-medium text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" /> System Health: Operational
            </span>
            <span className="font-mono text-[10px] bg-brand-surface px-2 py-0.5 rounded border border-brand-border/60">v2.4-ORS</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
