import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { 
  LayoutGrid, Package, Box, Warehouse, ShoppingCart, 
  MapPin, Truck, Route, Map, BarChart2, Settings, Search, 
  Bell, UserCircle, Menu, X, Compass, ChevronLeft, ChevronRight
} from 'lucide-react';
import { ScenicBackground } from './ScenicBackground';

interface SidebarItemProps {
  icon: any;
  label: string;
  to: string;
  isCollapsed: boolean;
  badge?: string;
  showChevronOnActive?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  to, 
  isCollapsed, 
  badge, 
  showChevronOnActive = true,
  onClick 
}: SidebarItemProps) => (
  <NavLink 
    to={to} 
    onClick={onClick}
    title={isCollapsed ? label : undefined}
    aria-label={label}
    className={({ isActive }) => 
      `flex items-center transition-all duration-200 group relative ${
        isCollapsed
          ? `w-10 h-10 mx-auto justify-center rounded-xl ${
              isActive 
                ? 'bg-gradient-to-br from-[#123827]/95 to-[#1a4f38]/90 text-white backdrop-blur-md border border-emerald-500/50 ring-1 ring-lime-400/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_2px_6px_0_rgba(19,59,45,0.18),0_8px_16px_-4px_rgba(19,59,45,0.22)]' 
                : to === '/settings'
                  ? 'text-[#183325] bg-white/40 backdrop-blur-xs hover:bg-white/80 hover:text-[#0c1e16] border border-white/60 hover:border-[#D5DFD7]/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_1px_3px_0_rgba(19,59,45,0.04)]'
                  : 'text-[#1b4332] hover:bg-white/80 hover:text-[#0c1e16] border border-transparent hover:border-[#D5DFD7]/80 hover:shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(19,59,45,0.04)]'
            }`
          : `gap-3 px-3 py-2 mx-2.5 rounded-xl ${
              isActive 
                ? 'bg-gradient-to-r from-[#123827]/95 via-[#164531]/95 to-[#1c543c]/90 text-white font-semibold backdrop-blur-md border border-emerald-500/40 ring-1 ring-lime-400/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_4px_0_rgba(19,59,45,0.12),0_6px_16px_-3px_rgba(19,59,45,0.2)]' 
                : to === '/settings'
                  ? 'text-[#183325] bg-white/40 backdrop-blur-xs hover:bg-white/75 hover:text-[#0c1e16] border border-white/60 hover:border-[#D5DFD7]/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_1px_3px_0_rgba(19,59,45,0.04)]'
                  : 'text-[#1e3328] hover:text-[#0c1e16] hover:bg-white/75 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),0_1px_3px_0_rgba(19,59,45,0.04)] border border-transparent hover:border-[#D5DFD7]/75'
            }`
      }`
    }
  >
    {({ isActive }) => (
      <>
        {/* Navigation Icon */}
        <Icon className={`w-4.5 h-4.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${
          isActive 
            ? 'text-emerald-300 drop-shadow-[0_0_6px_rgba(110,231,183,0.6)]' 
            : 'text-[#1b4332] group-hover:text-[#103527]'
        }`} />
        
        {!isCollapsed && (
          <span className={`text-[13px] tracking-wide truncate flex-1 font-medium ${
            isActive ? 'text-white font-semibold' : 'text-[#18241e]'
          }`}>
            {label}
          </span>
        )}

        {!isCollapsed && badge && (
          <span className="px-1.5 py-0.5 rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] text-[9.5px] font-mono font-bold tracking-wider shadow-xs">
            {badge}
          </span>
        )}

        {!isCollapsed && isActive && showChevronOnActive && (
          <ChevronRight className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
        )}

        {/* Floating tooltip for collapsed rail */}
        {isCollapsed && (
          <span 
            role="tooltip"
            className="fixed ml-14 px-2.5 py-1 bg-[#143d2b] border border-emerald-600/70 text-white text-[11px] font-semibold rounded-lg shadow-glass whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
          >
            {label}
          </span>
        )}
      </>
    )}
  </NavLink>
);

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smartlogix_sidebar_collapsed');
      if (saved !== null) return saved === 'true';
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

  // Reusable background graphics for sidebar
  const sidebarRouteDecorations = (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      <svg 
        className="w-full h-full text-emerald-800" 
        xmlns="http://www.w3.org/2000/svg" 
        preserveAspectRatio="none" 
        viewBox="0 0 240 800"
      >
        <path 
          d="M230,40 Q150,130 205,220 T215,360 Q190,450 140,530 T45,620" 
          fill="none" 
          stroke="#2D6A4F" 
          strokeWidth="1.2" 
          strokeDasharray="3,4" 
          opacity="0.14" 
        />
        <circle cx="195" cy="70" r="3" fill="#40916C" opacity="0.25" />
        <circle cx="215" cy="225" r="2.5" fill="#40916C" opacity="0.2" />
        <circle cx="175" cy="400" r="2.5" fill="#40916C" opacity="0.2" />
        <circle cx="218" cy="345" r="3.5" fill="#52B788" opacity="0.3" />
        <circle cx="48" cy="615" r="3" fill="#84cc16" opacity="0.4" />
      </svg>
      {/* Ambient soft glow */}
      <div className="absolute top-8 left-2 w-32 h-32 bg-emerald-100/30 rounded-full blur-2xl" />
    </div>
  );

  // Decorative atmospheric 3D warehouse scenery background
  const sidebarAtmosphericScenery = (
    <div 
      aria-hidden="true"
      className="absolute bottom-0 left-0 right-0 h-84 pointer-events-none select-none overflow-hidden z-0"
      style={{
        maskImage: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.88) 45%, rgba(0,0,0,0.2) 82%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.88) 45%, rgba(0,0,0,0.2) 82%, transparent 100%)',
      }}
    >
      <img 
        src="/images/smartlogix/sidebar-nature-scenery.jpg" 
        alt=""
        className="w-full h-full object-cover object-bottom opacity-[0.88] contrast-[1.07] saturate-[1.04] transition-all duration-300"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#EBF1EA]/25 via-transparent to-transparent pointer-events-none" />
    </div>
  );

  return (
    <div className="flex h-screen font-sans overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside 
        aria-label="Mobile Navigation"
        role="dialog"
        aria-modal="true"
        className={`fixed inset-y-0 left-0 w-64 glass-sidebar flex flex-col h-full z-40 transition-transform duration-300 ease-in-out border-r border-[#E2E4DC] lg:hidden relative overflow-hidden ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {sidebarRouteDecorations}
        {sidebarAtmosphericScenery}

        {/* Mobile Header */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-[#E2E4DC]/80 relative z-10 flex-shrink-0 bg-white/25 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-b from-[#18533c] to-[#0c2f21] border border-emerald-500/40 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.35),0_2px_4px_0_rgba(12,47,33,0.18),0_6px_16px_-4px_rgba(12,47,33,0.25)] flex items-center justify-center flex-shrink-0">
              <Warehouse className="text-white w-4.5 h-4.5 drop-shadow-xs" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#133B2D] font-bold text-base tracking-tight">SmartLogix</span>
                <span className="w-2 h-2 rounded-full bg-[#84cc16] shadow-[0_0_6px_rgba(132,204,22,0.8)] flex-shrink-0" />
              </div>
              <p className="text-[9px] text-[#4D7C5D] font-mono tracking-[0.2em] uppercase font-bold">
                LOGISTICS CLOUD
              </p>
            </div>
          </div>
          <button 
            className="p-1.5 rounded-lg text-[#133B2D]/75 hover:text-[#133B2D] hover:bg-white/80 border border-transparent hover:border-[#E2E4DC]/70 shadow-none hover:shadow-[inset_0_1px_0_0_#ffffff,0_1px_2px_0_rgba(19,59,45,0.06)] transition-all" 
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation List */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-2 space-y-1 custom-scrollbar relative z-10">
          <SidebarItem onClick={handleNavClick} to="/" icon={LayoutGrid} label="Dashboard" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/map" icon={Compass} label="Logistics Map" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/products" icon={Package} label="Products" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/inventory" icon={Box} label="Inventory" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/warehouses" icon={Warehouse} label="Warehouses" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/orders" icon={ShoppingCart} label="Orders" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/locations" icon={MapPin} label="Delivery Locations" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/vehicles" icon={Truck} label="Vehicles" isCollapsed={false} />
          <SidebarItem onClick={handleNavClick} to="/planning" icon={Route} label="Delivery Planning" isCollapsed={false} badge="DAA" />
          <SidebarItem onClick={handleNavClick} to="/distance-matrix" icon={Map} label="Distance Matrix" isCollapsed={false} badge="ORS" />
          <SidebarItem onClick={handleNavClick} to="/reports" icon={BarChart2} label="Reports" isCollapsed={false} />
        </nav>

        {/* Mobile Bottom Settings */}
        <div className="p-2.5 border-t border-white/50 relative z-10 mt-auto flex-shrink-0 bg-white/25 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.75),0_-2px_10px_rgba(19,59,45,0.03)]">
          <SidebarItem 
            onClick={handleNavClick} 
            to="/settings" 
            icon={Settings} 
            label="Settings" 
            isCollapsed={false} 
            showChevronOnActive={false}
          />
        </div>
      </aside>

      {/* Desktop & Tablet Sidebar */}
      <aside 
        aria-label="Sidebar Navigation"
        className={`hidden lg:flex flex-col h-full z-20 glass-sidebar border-r border-[#E2E4DC] transition-all duration-300 ease-in-out relative overflow-hidden ${
          isCollapsed ? 'w-18' : 'w-60'
        }`}
      >
        {sidebarRouteDecorations}
        {!isCollapsed && sidebarAtmosphericScenery}

        {/* Brand Header */}
        <div className={`px-3.5 py-3.5 border-b border-[#E2E4DC]/80 flex items-center relative z-10 flex-shrink-0 bg-white/20 backdrop-blur-xs ${
          isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'
        }`}>
          <Link to="/" className="flex items-center gap-2.5 min-w-0 group" title="SmartLogix Logistics Cloud">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-b from-[#18533c] to-[#0c2f21] border border-emerald-500/40 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.35),0_2px_4px_0_rgba(12,47,33,0.18),0_6px_16px_-4px_rgba(12,47,33,0.25)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Warehouse className="text-white w-4.5 h-4.5 drop-shadow-xs" />
            </div>
            
            {!isCollapsed && (
              <div className="min-w-0 truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#133B2D] font-bold text-base tracking-tight">SmartLogix</span>
                  <span className="w-2 h-2 rounded-full bg-[#84cc16] shadow-[0_0_6px_rgba(132,204,22,0.8)] flex-shrink-0" />
                </div>
                <p className="text-[9px] text-[#4D7C5D] font-mono tracking-[0.2em] uppercase font-bold truncate">
                  LOGISTICS CLOUD
                </p>
              </div>
            )}
          </Link>

          {/* Collapse / Expand Toggle Button */}
          <button 
            onClick={toggleCollapse}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg bg-white/80 hover:bg-white border border-[#E2E4DC]/90 text-[#133B2D] backdrop-blur-xs transition-all duration-200 flex-shrink-0 shadow-[inset_0_1px_0_0_#ffffff,0_1px_3px_0_rgba(19,59,45,0.08)] active:shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.12)] active:scale-95"
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-2 space-y-0.5 custom-scrollbar relative z-10 flex flex-col">
          <SidebarItem to="/" icon={LayoutGrid} label="Dashboard" isCollapsed={isCollapsed} />
          <SidebarItem to="/map" icon={Compass} label="Logistics Map" isCollapsed={isCollapsed} />
          <SidebarItem to="/products" icon={Package} label="Products" isCollapsed={isCollapsed} />
          <SidebarItem to="/inventory" icon={Box} label="Inventory" isCollapsed={isCollapsed} />
          <SidebarItem to="/warehouses" icon={Warehouse} label="Warehouses" isCollapsed={isCollapsed} />
          <SidebarItem to="/orders" icon={ShoppingCart} label="Orders" isCollapsed={isCollapsed} />
          <SidebarItem to="/locations" icon={MapPin} label="Delivery Locations" isCollapsed={isCollapsed} />
          <SidebarItem to="/vehicles" icon={Truck} label="Vehicles" isCollapsed={isCollapsed} />
          <SidebarItem to="/planning" icon={Route} label="Delivery Planning" isCollapsed={isCollapsed} badge="DAA" />
          <SidebarItem to="/distance-matrix" icon={Map} label="Distance Matrix" isCollapsed={isCollapsed} badge="ORS" />
          <SidebarItem to="/reports" icon={BarChart2} label="Reports" isCollapsed={isCollapsed} />
        </nav>

        {/* Bottom Settings Section */}
        <div className="p-2 border-t border-white/50 relative z-10 mt-auto flex-shrink-0 bg-white/25 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.75),0_-2px_10px_rgba(19,59,45,0.03)]">
          <SidebarItem 
            to="/settings" 
            icon={Settings} 
            label="Settings" 
            isCollapsed={isCollapsed} 
            showChevronOnActive={false}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <ScenicBackground />

        {/* Top Navbar */}
        <header className="h-16 glass-header flex items-center justify-between px-4 sm:px-8 flex-shrink-0 z-10 gap-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-1">
            <button 
              className="lg:hidden p-2 rounded-xl text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface transition-colors" 
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              onClick={toggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:inline-flex p-1.5 rounded-lg text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/80 transition-colors border border-brand-border/60 shadow-soft-xs"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-brand-text-secondary" />
              <input 
                type="text" 
                placeholder="Search orders, warehouses, fleet, routes..." 
                className="w-full bg-white/85 backdrop-blur-xs hover:bg-white border border-brand-border/90 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary text-brand-text shadow-soft-inset transition-all placeholder:text-brand-text-muted/60"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <button className="sm:hidden relative p-2 rounded-xl text-brand-text-secondary hover:text-brand-text hover:bg-white/80 transition-all">
              <Search className="w-5 h-5" />
            </button>
            
            <button 
              className="relative p-2 rounded-xl neumorphic-pill text-brand-text-secondary hover:text-brand-text"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
            </button>

            <div className="flex items-center gap-2.5 py-1.5 px-3 rounded-xl border border-brand-border/80 bg-white/80 backdrop-blur-xs shadow-soft-xs hover:border-brand-primary/40 hover:shadow-soft-sm transition-all cursor-pointer group">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-brand-text group-hover:text-brand-primary transition-colors">Operations Team</div>
                <div className="text-[10px] text-brand-text-secondary font-mono">Dispatcher</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-brand-soft border border-brand-primary/30 flex items-center justify-center text-brand-primary shadow-soft-xs group-hover:scale-105 transition-transform">
                <UserCircle className="w-5 h-5" />
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
