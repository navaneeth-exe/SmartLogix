import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Box, Warehouse, ShoppingCart, 
  MapPin, Truck, Route, Map, BarChart3, Settings, Search, 
  Bell, UserCircle, Menu, X, Compass, ChevronLeft, ChevronRight,
  LogOut
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ScenicBackground } from './ScenicBackground';

interface SidebarItemProps {
  icon: any;
  label: string;
  to: string;
  isCollapsed: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, to, isCollapsed, onClick }: SidebarItemProps) => (
  <NavLink 
    to={to} 
    onClick={onClick}
    title={isCollapsed ? label : undefined}
    aria-label={label}
    className={({ isActive }) => 
      `flex items-center rounded-xl transition-all duration-200 group relative ${
        isCollapsed
          ? `w-11 h-11 mx-auto justify-center ${
              isActive 
                ? 'bg-gradient-to-r from-brand-active to-emerald-700 text-white shadow-soft-sm ring-2 ring-brand-lime/60' 
                : 'text-brand-soft/80 hover:text-white hover:bg-white/10'
            }`
          : `gap-3 px-4 py-2.5 mx-3 ${
              isActive 
                ? 'bg-gradient-to-r from-brand-active to-emerald-700 text-white font-semibold shadow-soft-sm border-l-2 border-brand-lime' 
                : 'text-brand-soft/85 hover:text-white hover:bg-white/10'
            }`
      }`
    }
  >
    <Icon className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110" />
    
    {!isCollapsed && (
      <span className="text-xs font-medium tracking-wide truncate">{label}</span>
    )}

    {/* Floating tooltip for collapsed rail */}
    {isCollapsed && (
      <span 
        role="tooltip"
        className="fixed ml-14 px-2.5 py-1 bg-brand-dark border border-emerald-700/60 text-white text-[11px] font-semibold rounded-lg shadow-glass whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
      >
        {label}
      </span>
    )}
  </NavLink>
);

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smartlogix_sidebar_collapsed');
      if (saved !== null) return saved === 'true';
      // Default to collapsed on tablet screens (768px - 1024px)
      return window.innerWidth < 1200 && window.innerWidth >= 768;
    }
    return false;
  });

  // Handle escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Close mobile drawer on route change
  const handleNavClick = () => setSidebarOpen(false);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('smartlogix_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer (Always expanded w-64 when open) */}
      <aside 
        aria-label="Mobile Navigation"
        role="dialog"
        aria-modal="true"
        className={`fixed inset-y-0 left-0 w-64 glass-sidebar flex flex-col h-full z-40 transition-transform duration-300 ease-in-out border-r border-emerald-900/40 lg:hidden ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex items-center justify-between border-b border-emerald-900/40">
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
          <button 
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10" 
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 space-y-1 custom-scrollbar">
          <SidebarItem onClick={handleNavClick} to="/" icon={LayoutDashboard} label="Dashboard" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/map" icon={Compass} label="Logistics Map" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/products" icon={Package} label="Products" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/inventory" icon={Box} label="Inventory" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/warehouses" icon={Warehouse} label="Warehouses" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/orders" icon={ShoppingCart} label="Orders" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/locations" icon={MapPin} label="Delivery Locations" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/vehicles" icon={Truck} label="Vehicles" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/planning" icon={Route} label="Delivery Planning" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/distance-matrix" icon={Map} label="Distance Matrix" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/reports" icon={BarChart3} label="Reports" isCollapsed={false} />
        </nav>

        <div className="p-3 border-t border-emerald-900/40 space-y-1">
          <SidebarItem onClick={handleNavClick} to="/settings" icon={Settings} label="Settings" isCollapsed={false} />
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 mx-0 rounded-xl text-brand-soft/75 hover:text-rose-300 hover:bg-rose-950/20 transition-all text-xs font-medium"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Desktop & Tablet Collapsible Sidebar */}
      <aside 
        aria-label="Sidebar Navigation"
        className={`hidden lg:flex flex-col h-full z-20 glass-sidebar border-r border-emerald-900/30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header & Toggle */}
        <div className={`p-4.5 border-b border-emerald-900/40 flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-brand-active/90 border border-emerald-500/30 rounded-xl flex items-center justify-center shadow-soft-sm flex-shrink-0">
              <Warehouse className="text-white w-5 h-5" />
            </div>
            
            {!isCollapsed && (
              <div className="min-w-0 truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-bold text-lg tracking-tight">SmartLogix</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-lime shadow-lime-glow animate-pulse flex-shrink-0"></span>
                </div>
                <p className="text-[10px] text-emerald-300/80 font-mono tracking-wider uppercase truncate">Logistics Cloud</p>
              </div>
            )}
          </div>

          {/* Collapse / Expand Toggle Button */}
          <button 
            onClick={toggleCollapse}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-emerald-300/70 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Item Links */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-1.5 custom-scrollbar">
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" isCollapsed={isCollapsed} />
          <SidebarItem to="/map" icon={Compass} label="Logistics Map" isCollapsed={isCollapsed} />
          <SidebarItem to="/products" icon={Package} label="Products" isCollapsed={isCollapsed} />
          <SidebarItem to="/inventory" icon={Box} label="Inventory" isCollapsed={isCollapsed} />
          <SidebarItem to="/warehouses" icon={Warehouse} label="Warehouses" isCollapsed={isCollapsed} />
          <SidebarItem to="/orders" icon={ShoppingCart} label="Orders" isCollapsed={isCollapsed} />
          <SidebarItem to="/locations" icon={MapPin} label="Delivery Locations" isCollapsed={isCollapsed} />
          <SidebarItem to="/vehicles" icon={Truck} label="Vehicles" isCollapsed={isCollapsed} />
          <SidebarItem to="/planning" icon={Route} label="Delivery Planning" isCollapsed={isCollapsed} />
          <SidebarItem to="/distance-matrix" icon={Map} label="Distance Matrix" isCollapsed={isCollapsed} />
          <SidebarItem to="/reports" icon={BarChart3} label="Reports" isCollapsed={isCollapsed} />
        </nav>

        {/* Footer Settings & Sign Out */}
        <div className="p-3 border-t border-emerald-900/40 space-y-1 mt-auto">
          <SidebarItem to="/settings" icon={Settings} label="Settings" isCollapsed={isCollapsed} />
          
          <button
            onClick={handleSignOut}
            title={isCollapsed ? 'Sign Out' : undefined}
            aria-label="Sign Out"
            className={`flex items-center rounded-xl transition-all text-xs font-medium text-brand-soft/75 hover:text-rose-300 hover:bg-rose-950/20 group relative ${
              isCollapsed 
                ? 'w-11 h-11 mx-auto justify-center' 
                : 'w-full gap-3 px-4 py-2.5 mx-0'
            }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
            
            {isCollapsed && (
              <span 
                role="tooltip"
                className="fixed ml-14 px-2.5 py-1 bg-brand-dark border border-emerald-700/60 text-white text-[11px] font-semibold rounded-lg shadow-glass whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
              >
                Sign Out
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area — dynamically adapts width */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Layered Scenic 3D Logistics Landscape Background */}
        <ScenicBackground />

        {/* Top Navbar */}
        <header className="h-16 glass-header flex items-center justify-between px-4 sm:px-8 flex-shrink-0 z-10 gap-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-1">
            {/* Mobile menu trigger */}
            <button 
              className="lg:hidden p-2 rounded-xl text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface transition-colors" 
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop quick collapse toggle button in header as alternative */}
            <button
              onClick={toggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:inline-flex p-1.5 rounded-lg text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/80 transition-colors border border-brand-border/60 shadow-soft-xs"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Search Bar */}
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
            
            <button 
              className="relative p-2 rounded-xl text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/80 border border-transparent hover:border-brand-border/70 transition-all shadow-soft-sm"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
            </button>

            {/* User Profile Card */}
            <div className="flex items-center gap-2.5 py-1 px-2.5 rounded-xl border border-brand-border/50 bg-white/60 shadow-soft-sm hover:border-brand-border transition-all cursor-pointer group">
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

        {/* Page Content Viewport */}
        <div className="flex-1 overflow-auto relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
