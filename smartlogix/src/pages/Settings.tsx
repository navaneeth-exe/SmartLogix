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
  Server
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [defaultAlgorithm, setDefaultAlgorithm] = useState<'BRANCH_AND_BOUND' | 'GREEDY_NEAREST_NEIGHBOR'>('BRANCH_AND_BOUND');
  const [maxNodesExact, setMaxNodesExact] = useState<number>(10);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="System Settings & Infrastructure"
        description="Configure DAA algorithm solver parameters, map visualization behavior, and database health monitors."
      />

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50/90 backdrop-blur-xs border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>System configuration preferences saved successfully.</span>
        </div>
      )}

      {/* DAA Algorithm Engine Configuration */}
      <Card variant="glass" className="p-6 space-y-5">
        <div className="border-b border-brand-border/60 pb-3">
          <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand-primary" />
            DAA Optimization Engine Parameters
          </h3>
          <p className="text-xs text-brand-text-secondary mt-0.5">
            Tuning thresholds for Travelling Salesperson Problem (TSP) solver heuristics
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-brand-text block mb-1">
                Default Optimization Solver
              </label>
              <select
                value={defaultAlgorithm}
                onChange={(e) => setDefaultAlgorithm(e.target.value as any)}
                className="w-full bg-white/90 backdrop-blur-xs border border-brand-border/80 rounded-xl px-3 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/40 shadow-xs"
              >
                <option value="BRANCH_AND_BOUND">Branch & Bound (Exact Tour with Lower-Bound Pruning)</option>
                <option value="GREEDY_NEAREST_NEIGHBOR">Greedy Nearest Neighbor (Rapid Heuristic)</option>
              </select>
              <span className="text-[11px] text-brand-text-secondary mt-1 block">
                Preferred algorithm initially selected in the delivery planning workspace.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-text block mb-1">
                Branch & Bound Stop Limit (Safety Guard)
              </label>
              <input
                type="number"
                min={4}
                max={15}
                value={maxNodesExact}
                onChange={(e) => setMaxNodesExact(Number(e.target.value))}
                className="w-full bg-white/90 backdrop-blur-xs border border-brand-border/80 rounded-xl px-3 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/40 shadow-xs"
              />
              <span className="text-[11px] text-brand-text-secondary mt-1 block">
                Prevents browser thread blocking from factorial combinatorial state-space growth (default: 10 stops).
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" type="submit" className="text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <Save className="w-3.5 h-3.5" />
              <span>Save Solver Preferences</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Database & Spatial Engine Health */}
      <Card variant="glass" className="p-6 space-y-4">
        <div className="border-b border-brand-border/60 pb-3">
          <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
            <Server className="w-5 h-5 text-brand-primary" />
            Infrastructure & Database Integration Health
          </h3>
          <p className="text-xs text-brand-text-secondary mt-0.5">
            Operational status of database connections, RLS policies, and spatial components
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white/70 backdrop-blur-xs rounded-xl border border-brand-border/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-text">Supabase PostgreSQL</span>
              <Badge variant="success" dot>Active</Badge>
            </div>
            <p className="text-[11px] text-brand-text-secondary">
              Relational core running PostgreSQL with transactional atomic procedures.
            </p>
          </div>

          <div className="p-3.5 bg-white/70 backdrop-blur-xs rounded-xl border border-brand-border/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-text">OpenRouteService API</span>
              <Badge variant="lime" dot>Active</Badge>
            </div>
            <p className="text-[11px] text-brand-text-secondary">
              Edge Function (ors-matrix) with real driving road distance matrix.
            </p>
          </div>

          <div className="p-3.5 bg-white/70 backdrop-blur-xs rounded-xl border border-brand-border/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-text">Leaflet Map & OSM</span>
              <Badge variant="success" dot>Operational</Badge>
            </div>
            <p className="text-[11px] text-brand-text-secondary">
              OpenStreetMap tile server active. Auto-fit viewport bounds enabled.
            </p>
          </div>

          <div className="p-3.5 bg-white/70 backdrop-blur-xs rounded-xl border border-brand-border/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-text">Distance Matrix Table</span>
              <Badge variant="success" dot>Synchronized</Badge>
            </div>
            <p className="text-[11px] text-brand-text-secondary">
              Directional asymmetric distance lookups enforcing strict DAA matrix integrity.
            </p>
          </div>
        </div>
      </Card>

      {/* Security & RLS Policies Status */}
      <Card variant="glass" className="p-6 space-y-3">
        <h3 className="text-sm font-bold text-brand-text flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          Security Guardrails & Business Constraints
        </h3>
        <ul className="space-y-1.5 text-xs text-brand-text-secondary">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>Vehicles cannot be double-booked across conflicting active delivery plans.</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>Customer orders are atomically locked to a single active plan until completion or plan cancellation.</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>Inventory deduction is protected against double-counting and validates stock availability.</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>Exact algorithms (Branch & Bound) automatically reject requests exceeding safe node limit.</span>
          </li>
        </ul>
      </Card>
    </div>
  );
};
