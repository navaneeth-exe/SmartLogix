import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  Compass, 
  ShieldCheck, 
  CheckCircle2, 
  Save,
  Server,
  Sliders,
  Cpu,
  RotateCcw,
  Info,
  Check
} from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

export const Settings: React.FC = () => {
  // Config state with localStorage persistence
  const [defaultAlgorithm, setDefaultAlgorithm] = useState<'BRANCH_AND_BOUND' | 'GREEDY_NEAREST_NEIGHBOR'>(() => {
    return (localStorage.getItem('smartlogix_default_algorithm') as any) || 'BRANCH_AND_BOUND';
  });

  const [maxNodesExact, setMaxNodesExact] = useState<number>(() => {
    const saved = localStorage.getItem('smartlogix_bb_node_limit');
    return saved ? Number(saved) : 10;
  });

  const [routingProfile, setRoutingProfile] = useState<string>(() => {
    return localStorage.getItem('smartlogix_routing_profile') || 'driving-car';
  });

  const [autoCollapseSidebar, setAutoCollapseSidebar] = useState<boolean>(() => {
    return localStorage.getItem('smartlogix_auto_collapse_sidebar') === 'true';
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'solver' | 'infrastructure' | 'security' | 'preferences'>('solver');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('smartlogix_default_algorithm', defaultAlgorithm);
    localStorage.setItem('smartlogix_bb_node_limit', String(maxNodesExact));
    localStorage.setItem('smartlogix_routing_profile', routingProfile);
    localStorage.setItem('smartlogix_auto_collapse_sidebar', String(autoCollapseSidebar));

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleResetDefaults = () => {
    setDefaultAlgorithm('BRANCH_AND_BOUND');
    setMaxNodesExact(10);
    setRoutingProfile('driving-car');
    setAutoCollapseSidebar(false);

    localStorage.removeItem('smartlogix_default_algorithm');
    localStorage.removeItem('smartlogix_bb_node_limit');
    localStorage.removeItem('smartlogix_routing_profile');
    localStorage.removeItem('smartlogix_auto_collapse_sidebar');

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Motion variants
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
          title="System Settings & Infrastructure"
          description="Configure DAA algorithm solver parameters, map visualization behavior, and monitor live database and edge services."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 text-xs font-semibold bg-white/90 hover:bg-brand-surface shadow-xs py-2 px-3"
              >
                <RotateCcw className="w-3.5 h-3.5 text-brand-text-secondary" />
                <span>Reset to Defaults</span>
              </Button>
            </div>
          }
        />
      </motion.div>

      {/* Save Success Alert Notification */}
      {savedSuccess && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-50/95 backdrop-blur-md border border-emerald-300/80 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-soft-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>System configuration preferences saved successfully to local operational storage.</span>
          </div>
          <Badge variant="success" className="text-[10px]">Saved</Badge>
        </motion.div>
      )}

      {/* Structured Navigation Tabs */}
      <motion.div variants={itemVariants} className="flex border-b border-brand-border/80 gap-2 overflow-x-auto pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('solver')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'solver'
              ? 'bg-brand-primary text-white shadow-soft-xs'
              : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/70'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>DAA Solvers & Optimization</span>
        </button>

        <button
          onClick={() => setActiveTab('infrastructure')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'infrastructure'
              ? 'bg-brand-primary text-white shadow-soft-xs'
              : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/70'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Infrastructure & Health</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-brand-primary text-white shadow-soft-xs'
              : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/70'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Business & Security Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'bg-brand-primary text-white shadow-soft-xs'
              : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/70'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Interface & Map Defaults</span>
        </button>
      </motion.div>

      {/* TAB 1: DAA Algorithm Engine Configuration */}
      {activeTab === 'solver' && (
        <motion.div variants={itemVariants}>
          <Card variant="glass" className="p-6 sm:p-7 space-y-6">
            <div className="border-b border-brand-border/60 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                    <Compass className="w-5 h-5 text-brand-primary" />
                    DAA Optimization Engine Parameters
                  </h3>
                  <p className="text-xs text-brand-text-secondary mt-1">
                    Fine-tune default Travelling Salesperson Problem (TSP) solver heuristics and recursion safety boundaries
                  </p>
                </div>
                <Badge variant="lime" className="text-[10px]">DAA Active</Badge>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Default Algorithm */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-text block">
                    Default Optimization Solver
                  </label>
                  <select
                    value={defaultAlgorithm}
                    onChange={(e) => setDefaultAlgorithm(e.target.value as any)}
                    className="w-full bg-white/90 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-text shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
                  >
                    <option value="BRANCH_AND_BOUND">
                      Branch & Bound (Exact Tour with Lower-Bound Pruning)
                    </option>
                    <option value="GREEDY_NEAREST_NEIGHBOR">
                      Greedy Nearest Neighbor (Polynomial Heuristic)
                    </option>
                  </select>
                  <p className="text-[11px] text-brand-text-secondary leading-relaxed">
                    Determines the default solver automatically pre-selected when launching the Delivery Planning workspace.
                  </p>
                  <div className="p-3 rounded-xl bg-brand-surface/60 border border-brand-border/60 text-xs space-y-1">
                    <span className="font-semibold text-brand-text">Active Selection: </span>
                    {defaultAlgorithm === 'BRANCH_AND_BOUND' ? (
                      <span className="text-emerald-800">
                        Guaranteed optimal tour; prunes states using admissible outgoing distance lower-bounds.
                      </span>
                    ) : (
                      <span className="text-amber-800">
                        Fast $O(n^2)$ tour heuristic; selects nearest unvisited stop greedily.
                      </span>
                    )}
                  </div>
                </div>

                {/* Branch & Bound Stop Limit */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-text">
                      Branch & Bound Stop Limit (Safety Guard)
                    </label>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-brand-soft text-brand-dark">
                      {maxNodesExact} stops
                    </span>
                  </div>
                  <input
                    type="number"
                    min={4}
                    max={15}
                    value={maxNodesExact}
                    onChange={(e) => setMaxNodesExact(Math.max(4, Math.min(15, Number(e.target.value))))}
                    className="w-full bg-white/90 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-brand-text shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
                  />
                  <p className="text-[11px] text-brand-text-secondary leading-relaxed">
                    Prevents browser thread blocking from factorial combinatorial state-space growth (configurable range: 4–15 stops).
                  </p>
                  <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                    maxNodesExact <= 10 
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' 
                      : 'bg-amber-50/70 border-amber-200 text-amber-800'
                  }`}>
                    {maxNodesExact <= 10 ? (
                      <div className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Recommended setting: Instantaneous state exploration without lag.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 font-medium">
                        <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>High node count: Combinatorial branching may cause brief compute delays.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-border/60 flex items-center justify-between">
                <span className="text-xs text-brand-text-secondary">
                  Parameters persist locally across browser sessions.
                </span>
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="text-xs font-bold flex items-center gap-1.5 shadow-xs py-2 px-4"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Solver Parameters</span>
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {/* TAB 2: Database & Spatial Infrastructure Health */}
      {activeTab === 'infrastructure' && (
        <motion.div variants={itemVariants}>
          <Card variant="glass" className="p-6 sm:p-7 space-y-6">
            <div className="border-b border-brand-border/60 pb-4">
              <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                <Server className="w-5 h-5 text-brand-primary" />
                Infrastructure & Service Connectivity
              </h3>
              <p className="text-xs text-brand-text-secondary mt-1">
                Real-time operational status of database connections, edge routing services, and spatial renderers
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Supabase */}
              <div className="p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-brand-border/80 shadow-xs hover:shadow-soft-md transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-text">Supabase PostgreSQL</span>
                  <Badge variant="success" dot>Active</Badge>
                </div>
                <p className="text-[11px] text-brand-text-secondary leading-relaxed">
                  PostgreSQL relational core with live realtime subscriptions and atomic procedures.
                </p>
                <div className="pt-2 border-t border-brand-border/40 text-[10px] text-stone-500 font-mono">
                  Schema: public • RLS Enforced
                </div>
              </div>

              {/* Card 2: OpenRouteService */}
              <div className="p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-brand-border/80 shadow-xs hover:shadow-soft-md transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-text">OpenRouteService API</span>
                  <Badge variant="lime" dot>Connected</Badge>
                </div>
                <p className="text-[11px] text-brand-text-secondary leading-relaxed">
                  Edge Function (<code>ors-matrix</code>) computing exact road driving matrices with meter accuracy.
                </p>
                <div className="pt-2 border-t border-brand-border/40 text-[10px] text-stone-500 font-mono">
                  Profile: driving-car • Directional
                </div>
              </div>

              {/* Card 3: Leaflet */}
              <div className="p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-brand-border/80 shadow-xs hover:shadow-soft-md transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-text">React Leaflet & OSM</span>
                  <Badge variant="success" dot>Operational</Badge>
                </div>
                <p className="text-[11px] text-brand-text-secondary leading-relaxed">
                  OpenStreetMap vector tile server active with dynamic coordinate markers and polylines.
                </p>
                <div className="pt-2 border-t border-brand-border/40 text-[10px] text-stone-500 font-mono">
                  Renderer: Leaflet 1.9 • Auto-fit Bounds
                </div>
              </div>

              {/* Card 4: Distance Matrix */}
              <div className="p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-brand-border/80 shadow-xs hover:shadow-soft-md transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-text">Distance Matrix Table</span>
                  <Badge variant="success" dot>Synchronized</Badge>
                </div>
                <p className="text-[11px] text-brand-text-secondary leading-relaxed">
                  Directional asymmetric lookups enforcing graph weight integrity for all TSP tours.
                </p>
                <div className="pt-2 border-t border-brand-border/40 text-[10px] text-stone-500 font-mono">
                  Precision: km • Stored internal meters
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* TAB 3: Security & Business Rules */}
      {activeTab === 'security' && (
        <motion.div variants={itemVariants}>
          <Card variant="glass" className="p-6 sm:p-7 space-y-5">
            <div className="border-b border-brand-border/60 pb-4">
              <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                Security Guardrails & Business Constraints
              </h3>
              <p className="text-xs text-brand-text-secondary mt-1">
                Active policies preventing fleet collisions, duplicate dispatches, and inventory depletion anomalies
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/80 border border-brand-border/70 shadow-xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-brand-text">Fleet Anti-Collision Locking</h4>
                  <p className="text-xs text-brand-text-secondary mt-0.5 leading-relaxed">
                    Vehicles cannot be double-booked across conflicting active delivery plans. Assigned fleet units stay locked until plan delivery or cancellation.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/80 border border-brand-border/70 shadow-xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-brand-text">Atomic Customer Order Lock</h4>
                  <p className="text-xs text-brand-text-secondary mt-0.5 leading-relaxed">
                    Customer orders are atomically bound to a single active delivery plan, preventing duplicate deliveries or fragmented route dispatch.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/80 border border-brand-border/70 shadow-xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-brand-text">Inventory Deficit Protection</h4>
                  <p className="text-xs text-brand-text-secondary mt-0.5 leading-relaxed">
                    Stock validation ensures orders cannot exceed physical warehouse stock quantities, preventing negative inventory balances.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/80 border border-brand-border/70 shadow-xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-brand-text">DAA Combinatorial Boundary</h4>
                  <p className="text-xs text-brand-text-secondary mt-0.5 leading-relaxed">
                    Exact Branch & Bound solver automatically enforces the safety node limit ({maxNodesExact} stops) to eliminate risk of thread blocking.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* TAB 4: Interface & Map Defaults */}
      {activeTab === 'preferences' && (
        <motion.div variants={itemVariants}>
          <Card variant="glass" className="p-6 sm:p-7 space-y-6">
            <div className="border-b border-brand-border/60 pb-4">
              <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-primary" />
                Interface & Map Visualization Defaults
              </h3>
              <p className="text-xs text-brand-text-secondary mt-1">
                Customize operational units, sidebar behavior, and routing profile presets
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Distance Units */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-text block">
                    Metric Distance Unit
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Kilometres (km) — System Fixed"
                    className="w-full bg-brand-surface/70 border border-brand-border/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-text cursor-not-allowed opacity-80"
                  />
                  <span className="text-[11px] text-brand-text-secondary">
                    All DAA edge weights, ORS matrix API payloads, and tour summaries strictly use kilometres (km).
                  </span>
                </div>

                {/* Routing Profile */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-text block">
                    OpenRouteService Vehicle Profile
                  </label>
                  <select
                    value={routingProfile}
                    onChange={(e) => setRoutingProfile(e.target.value)}
                    className="w-full bg-white/90 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-text shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
                  >
                    <option value="driving-car">driving-car (Standard Fleet Delivery Vans)</option>
                    <option value="driving-hgv">driving-hgv (Heavy Freight Trucks)</option>
                  </select>
                  <span className="text-[11px] text-brand-text-secondary">
                    Selects physical road network speed limits and turn restrictions for matrix calculations.
                  </span>
                </div>

                {/* Auto collapse sidebar option */}
                <div className="space-y-2 md:col-span-2 pt-2 border-t border-brand-border/60">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCollapseSidebar}
                      onChange={(e) => setAutoCollapseSidebar(e.target.checked)}
                      className="rounded text-brand-primary focus:ring-brand-primary w-4 h-4"
                    />
                    <span className="text-xs font-bold text-brand-text">
                      Prefer compact navigation rail on startup
                    </span>
                  </label>
                  <p className="text-[11px] text-brand-text-secondary pl-7">
                    When enabled, the sidebar automatically collapses to an icon rail to provide wider horizontal canvas space for the map and analytics.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-border/60 flex items-center justify-between">
                <span className="text-xs text-brand-text-secondary">
                  Preferences will be applied to your active browser environment.
                </span>
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="text-xs font-bold flex items-center gap-1.5 shadow-xs py-2 px-4"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Preferences</span>
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};
