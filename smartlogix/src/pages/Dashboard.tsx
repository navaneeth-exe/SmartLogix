import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, Box, Warehouse, ShoppingCart, Truck, 
  CheckCircle, ArrowRight, Route 
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { Vehicle, Order, Product, Warehouse as WarehouseType, DeliveryPlan } from '../types/database.types';

const StatCard = ({ title, value, subtitle, icon: Icon, trend, delayClass, to }: any) => {
  const content = (
    <Card className={`flex items-center gap-4 animate-fade-in-up ${delayClass} transition-all hover:border-brand-primary/40`}>
      <div className="w-12 h-12 rounded-lg bg-brand-soft flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105">
        <Icon className="w-6 h-6 text-brand-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-brand-text-secondary font-medium truncate">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-brand-text">{value}</h3>
          {trend && <span className="text-xs font-medium text-emerald-600">{trend}</span>}
        </div>
        {subtitle && <p className="text-xs text-brand-text-secondary mt-0.5">{subtitle}</p>}
      </div>
    </Card>
  );

  return to ? <Link to={to} className="block">{content}</Link> : content;
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
    { name: 'Delivered', value: deliveredOrders, color: '#22c55e' },
  ];

  // Warehouse inventory breakdown
  const inventoryByWarehouse = warehouses.map(w => {
    return {
      name: w.name.length > 15 ? `${w.name.substring(0, 15)}...` : w.name,
      quantity: totalInventoryQty > 0 ? Math.round(totalInventoryQty / (warehouses.length || 1)) : 0
    };
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Welcome Section */}
      <Card noPadding className="relative overflow-hidden min-h-[260px] flex items-center animate-fade-in border-none shadow-md">
        <div className="relative z-10 w-full md:w-3/5 p-8 md:p-10 bg-gradient-to-r from-brand-card via-brand-card to-transparent">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-text mb-3">Welcome back, Administrator</h1>
          <p className="text-brand-text-secondary mb-8 max-w-md leading-relaxed text-sm sm:text-base">
            Here's what's happening with your inventory, orders, and delivery fleet today. All systems operational.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/orders/create">
              <Button variant="primary" className="shadow-sm">Create Order</Button>
            </Link>
            <Link to="/planning">
              <Button variant="outline">Delivery Planning</Button>
            </Link>
            <Link to="/vehicles">
              <Button variant="outline">Manage Fleet</Button>
            </Link>
          </div>
        </div>
        
        <div className="hidden md:flex absolute right-0 top-0 bottom-0 w-3/5 items-center justify-end">
          <img 
            src="/images/smartlogix/warehouse-hero.jpg" 
            alt="Logistics Warehouse" 
            className="w-full h-full object-cover mix-blend-multiply opacity-90 transition-transform duration-1000 hover:scale-105"
            style={{ maskImage: 'linear-gradient(to right, transparent, black 40%)' }}
          />
        </div>
      </Card>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard 
          title="Total Products" 
          value={loading ? '...' : products.length} 
          icon={Package} 
          delayClass="stagger-1" 
          to="/products"
        />
        <StatCard 
          title="Total Inventory" 
          value={loading ? '...' : totalInventoryQty.toLocaleString()} 
          subtitle="units in network"
          icon={Box} 
          delayClass="stagger-1" 
          to="/inventory"
        />
        <StatCard 
          title="Warehouses" 
          value={loading ? '...' : warehouses.length} 
          icon={Warehouse} 
          delayClass="stagger-1" 
          to="/warehouses"
        />
        <StatCard 
          title="Total Orders" 
          value={loading ? '...' : totalOrders} 
          icon={ShoppingCart} 
          delayClass="stagger-2" 
          to="/orders"
        />
        <StatCard 
          title="Fleet Units" 
          value={loading ? '...' : totalVehicles} 
          subtitle={`${availableVehicles} available`}
          icon={Truck} 
          delayClass="stagger-2" 
          to="/vehicles"
        />
        <StatCard 
          title="In Transit / Use" 
          value={loading ? '...' : inUseVehicles} 
          subtitle={`${maintenanceVehicles} in maintenance`}
          icon={CheckCircle} 
          delayClass="stagger-2" 
          to="/vehicles"
        />
        <StatCard 
          title="Active Plans" 
          value={loading ? '...' : activePlans} 
          subtitle={`${totalRoutedDistance.toFixed(0)} km routed`}
          icon={Route} 
          delayClass="stagger-2" 
          to="/planning"
        />
      </div>

      {/* Fleet Availability Bar (Phase 6 Vehicle Management Integration) */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
              <Truck className="w-5 h-5 text-brand-primary" />
              Fleet Availability & Operational Readiness
            </h3>
            <p className="text-xs text-brand-text-secondary mt-0.5">
              Live status breakdown of all registered transport vehicles in database
            </p>
          </div>
          <Link to="/vehicles">
            <Button variant="outline" size="sm">
              View Fleet Directory <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg">
            <span className="text-xs text-emerald-800 font-semibold block">Available</span>
            <span className="text-2xl font-bold text-emerald-700">{loading ? '...' : availableVehicles}</span>
            <span className="text-[11px] text-emerald-600 block mt-0.5">Ready for dispatch</span>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-lg">
            <span className="text-xs text-blue-800 font-semibold block">In Use / On Route</span>
            <span className="text-2xl font-bold text-blue-700">{loading ? '...' : inUseVehicles}</span>
            <span className="text-[11px] text-blue-600 block mt-0.5">Active delivery runs</span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg">
            <span className="text-xs text-amber-800 font-semibold block">Maintenance</span>
            <span className="text-2xl font-bold text-amber-700">{loading ? '...' : maintenanceVehicles}</span>
            <span className="text-[11px] text-amber-600 block mt-0.5">Service & repairs</span>
          </div>

          <div className="p-3 bg-slate-100/70 border border-slate-200/80 rounded-lg">
            <span className="text-xs text-slate-700 font-semibold block">Off Duty / Inactive</span>
            <span className="text-2xl font-bold text-slate-700">{loading ? '...' : offDutyVehicles}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Standby or offline</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Order Status */}
        <Card className="lg:col-span-1 animate-fade-in-up stagger-3">
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totalOrders > 0 ? orderStatusData : [{ name: 'None', value: 1, color: '#e5e7eb' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {(totalOrders > 0 ? orderStatusData : [{ name: 'None', value: 1, color: '#e5e7eb' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E6DF', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-2xl font-bold text-brand-text">{totalOrders}</span>
              <p className="text-xs text-brand-text-secondary">Orders</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-2">
            {orderStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                <span className="text-xs text-brand-text-secondary truncate">{item.name}: <strong className="text-brand-text">{item.value}</strong></span>
              </div>
            ))}
          </div>
        </Card>

        {/* Inventory by Warehouse */}
        <Card className="lg:col-span-2 animate-fade-in-up stagger-3">
          <CardHeader>
            <CardTitle>Warehouse Network Capacity</CardTitle>
          </CardHeader>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryByWarehouse} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E6DF" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#66716B', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#66716B', fontSize: 12 }} dx={-10} />
                <Tooltip cursor={{fill: '#F8F6F0'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="quantity" fill="#23834D" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 animate-fade-in-up stagger-4 overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <Link to="/orders" className="text-sm text-brand-primary font-medium hover:text-brand-active flex items-center gap-1 group">
              View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardHeader>
          <div className="overflow-x-auto -mx-6 px-6">
            {orders.length === 0 ? (
              <p className="text-sm text-brand-text-secondary py-6 text-center">No orders placed yet.</p>
            ) : (
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="pb-3 text-sm font-medium text-brand-text-secondary">Order ID</th>
                    <th className="pb-3 text-sm font-medium text-brand-text-secondary">Destination</th>
                    <th className="pb-3 text-sm font-medium text-brand-text-secondary">Items</th>
                    <th className="pb-3 text-sm font-medium text-brand-text-secondary">Total Amount</th>
                    <th className="pb-3 text-sm font-medium text-brand-text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((order) => {
                    const itemCount = order.order_items?.reduce((s, i) => s + i.quantity, 0) || 0;
                    return (
                      <tr key={order.id} className="border-b border-brand-border/50 hover:bg-brand-surface/50 transition-colors">
                        <td className="py-4 text-sm font-mono font-medium text-brand-text">{order.order_number}</td>
                        <td className="py-4 text-sm text-brand-text-secondary">{order.delivery_location?.name || 'Destination'}</td>
                        <td className="py-4 text-sm text-brand-text-secondary">{itemCount} units</td>
                        <td className="py-4 text-sm font-mono font-semibold text-brand-text">${Number(order.total_amount).toFixed(2)}</td>
                        <td className="py-4">
                          <Badge variant={getStatusVariant(order.status) as any}>{order.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-fade-in-up stagger-4 relative overflow-hidden">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <div className="space-y-3 relative z-10">
            <Link to="/planning" className="block w-full">
              <div className="w-full flex items-center justify-between p-3 sm:p-4 rounded-lg border border-brand-border hover:bg-white hover:shadow-sm hover:border-brand-primary/30 transition-all group bg-brand-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-surface rounded-md group-hover:bg-brand-soft group-hover:text-brand-primary transition-colors">
                    <Route className="w-5 h-5 text-brand-text-secondary group-hover:text-brand-primary" />
                  </div>
                  <span className="font-medium text-brand-text text-sm sm:text-base">Delivery Planning & Routes</span>
                </div>
                <ArrowRight className="w-4 h-4 text-brand-text-secondary group-hover:translate-x-1 group-hover:text-brand-primary transition-all" />
              </div>
            </Link>

            <Link to="/orders/create" className="block w-full">
              <div className="w-full flex items-center justify-between p-3 sm:p-4 rounded-lg border border-brand-border hover:bg-white hover:shadow-sm hover:border-brand-primary/30 transition-all group bg-brand-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-surface rounded-md group-hover:bg-brand-soft group-hover:text-brand-primary transition-colors">
                    <ShoppingCart className="w-5 h-5 text-brand-text-secondary group-hover:text-brand-primary" />
                  </div>
                  <span className="font-medium text-brand-text text-sm sm:text-base">Create New Order</span>
                </div>
                <ArrowRight className="w-4 h-4 text-brand-text-secondary group-hover:translate-x-1 group-hover:text-brand-primary transition-all" />
              </div>
            </Link>

            <Link to="/vehicles" className="block w-full">
              <div className="w-full flex items-center justify-between p-3 sm:p-4 rounded-lg border border-brand-border hover:bg-white hover:shadow-sm hover:border-brand-primary/30 transition-all group bg-brand-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-surface rounded-md group-hover:bg-brand-soft group-hover:text-brand-primary transition-colors">
                    <Truck className="w-5 h-5 text-brand-text-secondary group-hover:text-brand-primary" />
                  </div>
                  <span className="font-medium text-brand-text text-sm sm:text-base">Manage Vehicles</span>
                </div>
                <ArrowRight className="w-4 h-4 text-brand-text-secondary group-hover:translate-x-1 group-hover:text-brand-primary transition-all" />
              </div>
            </Link>

            <Link to="/products" className="block w-full">
              <div className="w-full flex items-center justify-between p-3 sm:p-4 rounded-lg border border-brand-border hover:bg-white hover:shadow-sm hover:border-brand-primary/30 transition-all group bg-brand-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-surface rounded-md group-hover:bg-brand-soft group-hover:text-brand-primary transition-colors">
                    <Package className="w-5 h-5 text-brand-text-secondary group-hover:text-brand-primary" />
                  </div>
                  <span className="font-medium text-brand-text text-sm sm:text-base">Add Product</span>
                </div>
                <ArrowRight className="w-4 h-4 text-brand-text-secondary group-hover:translate-x-1 group-hover:text-brand-primary transition-all" />
              </div>
            </Link>

            <Link to="/warehouses" className="block w-full">
              <div className="w-full flex items-center justify-between p-3 sm:p-4 rounded-lg border border-brand-border hover:bg-white hover:shadow-sm hover:border-brand-primary/30 transition-all group bg-brand-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-surface rounded-md group-hover:bg-brand-soft group-hover:text-brand-primary transition-colors">
                    <Warehouse className="w-5 h-5 text-brand-text-secondary group-hover:text-brand-primary" />
                  </div>
                  <span className="font-medium text-brand-text text-sm sm:text-base">Add Warehouse</span>
                </div>
                <ArrowRight className="w-4 h-4 text-brand-text-secondary group-hover:translate-x-1 group-hover:text-brand-primary transition-all" />
              </div>
            </Link>
          </div>
          
          <div className="absolute -bottom-6 -right-6 w-32 opacity-30 pointer-events-none grayscale sepia mix-blend-multiply">
            <img src="/images/smartlogix/package-cluster.jpg" alt="Decoration" className="w-full h-full object-contain" />
          </div>
        </Card>
      </div>
    </div>
  );
};
