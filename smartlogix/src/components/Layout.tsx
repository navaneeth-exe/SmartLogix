import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Box, Warehouse, ShoppingCart, 
  MapPin, Truck, Route, Map, BarChart3, Settings, Search, Bell, UserCircle, Menu, X, Compass
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, to, onClick }: { icon: any, label: string, to: string, onClick?: () => void }) => (
  <NavLink 
    to={to} 
    onClick={onClick}
    className={({ isActive }) => 
      `flex items-center gap-3 px-4 py-2.5 mx-3 rounded-xl transition-all duration-200 group relative ${
        isActive 
          ? 'bg-gradient-to-r from-brand-active to-emerald-700 text-white font-semibold shadow-soft-sm border-l-2 border-brand-lime' 
          : 'text-brand-soft/85 hover:text-white hover:bg-white/10'
      }`
    }
  >
    <Icon className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110" />
    <span className="text-xs font-medium tracking-wide">{label}</span>
  </NavLink>
);

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when route changes on mobile
  const handleNavClick = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen bg-brand-bg font-sans overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 glass-sidebar flex flex-col h-full z-30 transition-transform duration-300 ease-in-out border-r border-emerald-900/30 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 flex items-center justify-between lg:justify-start gap-3 border-b border-emerald-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-active/90 border border-emerald-500/30 rounded-xl flex items-center justify-center shadow-soft-sm">
              <Warehouse className="text-white w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold text-lg tracking-tight">SmartLogix</span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-lime shadow-lime-glow animate-pulse"></span>
              </div>
              <p className="text-[10px] text-emerald-300/80 font-mono tracking-wider uppercase">Logistics Cloud</p>
            </div>
          </div>
          <button className="lg:hidden text-white/80 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-3 space-y-1 custom-scrollbar">
          <SidebarItem onClick={handleNavClick} to="/" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem onClick={handleNavClick} to="/map" icon={Compass} label="Logistics Map" />
          <SidebarItem onClick={handleNavClick} to="/products" icon={Package} label="Products" />
          <SidebarItem onClick={handleNavClick} to="/inventory" icon={Box} label="Inventory" />
          <SidebarItem onClick={handleNavClick} to="/warehouses" icon={Warehouse} label="Warehouses" />
          <SidebarItem onClick={handleNavClick} to="/orders" icon={ShoppingCart} label="Orders" />
          <SidebarItem onClick={handleNavClick} to="/locations" icon={MapPin} label="Delivery Locations" />
          <SidebarItem onClick={handleNavClick} to="/vehicles" icon={Truck} label="Vehicles" />
          <SidebarItem onClick={handleNavClick} to="/planning" icon={Route} label="Delivery Planning" />
          <SidebarItem onClick={handleNavClick} to="/distance-matrix" icon={Map} label="Distance Matrix" />
          <SidebarItem onClick={handleNavClick} to="/reports" icon={BarChart3} label="Reports" />
        </div>
        
        <div className="p-3 mt-auto border-t border-emerald-900/40">
          <SidebarItem onClick={handleNavClick} to="/settings" icon={Settings} label="Settings" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 glass-header flex items-center justify-between px-4 sm:px-8 flex-shrink-0 z-10 gap-4">
          <div className="flex items-center gap-4 flex-1">
            <button className="lg:hidden text-brand-text-secondary hover:text-brand-text" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-brand-text-secondary" />
              <input 
                type="text" 
                placeholder="Search orders, warehouses, fleet, routes..." 
                className="w-full bg-brand-surface/90 border border-brand-border/80 rounded-xl pl-10 pr-4 py-1.5 text-xs font-medium focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary text-brand-text shadow-soft-inset transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <button className="sm:hidden relative p-2 rounded-xl text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface transition-all">
              <Search className="w-5 h-5" />
            </button>
            <button className="relative p-2 rounded-xl text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/80 border border-transparent hover:border-brand-border/70 transition-all shadow-soft-sm">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
            </button>
            <div className="flex items-center gap-3 py-1 px-2.5 rounded-xl border border-brand-border/50 bg-white/60 shadow-soft-sm hover:border-brand-border transition-all cursor-pointer group">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-brand-text group-hover:text-brand-primary transition-colors">Operations Team</div>
                <div className="text-[10px] text-brand-text-secondary font-mono">Dispatcher</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-brand-soft border border-brand-primary/30 flex items-center justify-center text-brand-primary shadow-soft-sm">
                <UserCircle className="w-6 h-6" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-brand-bg relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
