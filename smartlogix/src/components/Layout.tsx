import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Box, Warehouse, ShoppingCart, 
  MapPin, Truck, Route, Map, BarChart3, Settings, Search, Bell, UserCircle, Menu, X
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, to, onClick }: { icon: any, label: string, to: string, onClick?: () => void }) => (
  <NavLink 
    to={to} 
    onClick={onClick}
    className={({ isActive }) => 
      `flex items-center gap-3 px-4 py-3 mx-4 rounded-lg transition-colors duration-200 ${
        isActive ? 'bg-brand-active text-white' : 'text-brand-soft hover:bg-brand-primary/50 text-brand-sage'
      }`
    }
  >
    <Icon className="w-5 h-5 flex-shrink-0" />
    <span className="font-medium text-sm">{label}</span>
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
          className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-brand-sidebar flex flex-col h-full shadow-xl z-30 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between lg:justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-active rounded flex items-center justify-center">
              <Warehouse className="text-white w-5 h-5" />
            </div>
            <span className="text-white font-bold text-xl tracking-wide">SmartLogix</span>
          </div>
          <button className="lg:hidden text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
          <SidebarItem onClick={handleNavClick} to="/" icon={LayoutDashboard} label="Dashboard" />
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
        
        <div className="p-4 mt-auto">
          <SidebarItem onClick={handleNavClick} to="/settings" icon={Settings} label="Settings" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-brand-card border-b border-brand-border flex items-center justify-between px-4 sm:px-8 flex-shrink-0 z-10 gap-4">
          <div className="flex items-center gap-4 flex-1">
            <button className="lg:hidden text-brand-text-secondary hover:text-brand-text" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-secondary" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-brand-surface border border-brand-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-brand-text"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
            <button className="sm:hidden relative text-brand-text-secondary hover:text-brand-text transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="relative text-brand-text-secondary hover:text-brand-text transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-brand-card"></span>
            </button>
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden md:block">
                <div className="text-sm font-semibold text-brand-text group-hover:text-brand-primary transition-colors">Administrator</div>
                <div className="text-xs text-brand-text-secondary">Admin</div>
              </div>
              <UserCircle className="w-8 h-8 text-brand-primary" />
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
