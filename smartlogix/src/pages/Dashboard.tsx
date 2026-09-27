import { Package, Box, Warehouse, ShoppingCart, Truck, CheckCircle, Route, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const orderStatusData = [
  { name: 'Pending', value: 15, color: '#f59e0b' },
  { name: 'Confirmed', value: 25, color: '#3b82f6' },
  { name: 'In Transit', value: 20, color: '#8b5cf6' },
  { name: 'Delivered', value: 40, color: '#22c55e' },
];

const inventoryData = [
  { name: 'North Hub', quantity: 4000 },
  { name: 'South Depot', quantity: 3000 },
  { name: 'East Storage', quantity: 2000 },
  { name: 'West Annex', quantity: 2780 },
];

const recentOrders = [
  { id: 'ORD-001', customer: 'Acme Corp', status: 'Delivered', items: 12, weight: '120 kg' },
  { id: 'ORD-002', customer: 'Stark Ind', status: 'In Transit', items: 5, weight: '45 kg' },
  { id: 'ORD-003', customer: 'Wayne Ent', status: 'Pending', items: 24, weight: '240 kg' },
  { id: 'ORD-004', customer: 'Globex', status: 'Confirmed', items: 8, weight: '65 kg' },
];

const StatCard = ({ title, value, icon: Icon, trend, delayClass }: any) => (
  <Card className={`flex items-center gap-4 animate-fade-in-up ${delayClass}`}>
    <div className="w-12 h-12 rounded-lg bg-brand-soft flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105">
      <Icon className="w-6 h-6 text-brand-primary" />
    </div>
    <div>
      <p className="text-sm text-brand-text-secondary font-medium">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-brand-text">{value}</h3>
        {trend && <span className="text-xs font-medium text-green-600">{trend}</span>}
      </div>
    </div>
  </Card>
);

const getStatusVariant = (status: string) => {
  switch(status) {
    case 'Delivered': return 'success';
    case 'In Transit': return 'info';
    case 'Confirmed': return 'default';
    case 'Pending': return 'warning';
    default: return 'default';
  }
};

export const Dashboard = () => {
  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* Welcome Section */}
      <Card noPadding className="relative overflow-hidden min-h-[260px] flex items-center animate-fade-in border-none shadow-md">
        <div className="relative z-10 w-full md:w-3/5 p-8 md:p-10 bg-gradient-to-r from-brand-card via-brand-card to-transparent">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-text mb-3">Welcome back, Administrator</h1>
          <p className="text-brand-text-secondary mb-8 max-w-md leading-relaxed text-sm sm:text-base">
            Here's what's happening with your inventory and deliveries today. System is operating normally and all warehouses are online.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" className="shadow-sm">Create Order</Button>
            <Button variant="outline">Plan Delivery</Button>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Products" value="2,451" icon={Package} trend="+12%" delayClass="stagger-1" />
        <StatCard title="Total Inventory" value="14,290" icon={Box} trend="+5%" delayClass="stagger-1" />
        <StatCard title="Warehouses" value="4" icon={Warehouse} delayClass="stagger-1" />
        <StatCard title="Total Orders" value="842" icon={ShoppingCart} trend="+18%" delayClass="stagger-2" />
        <StatCard title="In Transit" value="34" icon={Truck} delayClass="stagger-2" />
        <StatCard title="Completed" value="790" icon={CheckCircle} delayClass="stagger-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Order Status */}
        <Card className="lg:col-span-1 animate-fade-in-up stagger-3">
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E6DF', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-2xl font-bold text-brand-text">100</span>
              <p className="text-xs text-brand-text-secondary">Orders</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-4 mt-2">
            {orderStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-brand-text-secondary truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Inventory by Warehouse */}
        <Card className="lg:col-span-2 animate-fade-in-up stagger-3">
          <CardHeader>
            <CardTitle>Inventory by Warehouse</CardTitle>
          </CardHeader>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
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
            <button className="text-sm text-brand-primary font-medium hover:text-brand-active flex items-center gap-1 group">
              View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </CardHeader>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="pb-3 text-sm font-medium text-brand-text-secondary">Order ID</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-secondary">Customer</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-secondary">Items</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-secondary">Weight</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-brand-border/50 hover:bg-brand-surface/50 transition-colors">
                    <td className="py-4 text-sm font-medium text-brand-text">{order.id}</td>
                    <td className="py-4 text-sm text-brand-text-secondary">{order.customer}</td>
                    <td className="py-4 text-sm text-brand-text-secondary">{order.items}</td>
                    <td className="py-4 text-sm text-brand-text-secondary">{order.weight}</td>
                    <td className="py-4">
                      <Badge variant={getStatusVariant(order.status) as any}>{order.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-fade-in-up stagger-4 relative overflow-hidden">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <div className="space-y-3 relative z-10">
            {[
              { label: 'Create New Order', icon: ShoppingCart },
              { label: 'Plan New Delivery', icon: Route },
              { label: 'Add Product', icon: Package },
              { label: 'Add Warehouse', icon: Warehouse },
            ].map((action, i) => (
              <button key={i} className="w-full flex items-center justify-between p-3 sm:p-4 rounded-lg border border-brand-border hover:bg-white hover:shadow-sm hover:border-brand-primary/30 transition-all group bg-brand-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-surface rounded-md group-hover:bg-brand-soft group-hover:text-brand-primary transition-colors">
                    <action.icon className="w-5 h-5 text-brand-text-secondary group-hover:text-brand-primary" />
                  </div>
                  <span className="font-medium text-brand-text text-sm sm:text-base">{action.label}</span>
                </div>
              </button>
            ))}
          </div>
          
          <div className="absolute -bottom-6 -right-6 w-32 opacity-30 pointer-events-none grayscale sepia mix-blend-multiply">
            <img src="/images/smartlogix/package-cluster.jpg" alt="Decoration" className="w-full h-full object-contain" />
          </div>
        </Card>
      </div>
    </div>
  );
};
