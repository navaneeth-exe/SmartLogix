import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { Warehouse } from '../types/database.types';
import { Search, Plus, Edit2, Building2, MapPin, Compass, Radio, Filter, RefreshCw, Layers, X } from 'lucide-react';
import { MapLocationPicker } from '../components/MapLocationPicker';

export const Warehouses = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    is_active: boolean;
    storage_capacity: number | '' | null;
  }>({
    code: '',
    name: '',
    address: '',
    latitude: null,
    longitude: null,
    is_active: true,
    storage_capacity: ''
  });

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const data = await api.warehouses.list();
      setWarehouses(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const openModal = (wh: Warehouse | null = null) => {
    setError('');
    if (wh) {
      setEditingWarehouse(wh);
      setFormData({ 
        code: wh.code, 
        name: wh.name, 
        address: wh.address || '', 
        latitude: wh.latitude !== null && wh.latitude !== undefined ? Number(wh.latitude) : null, 
        longitude: wh.longitude !== null && wh.longitude !== undefined ? Number(wh.longitude) : null,
        is_active: wh.is_active,
        storage_capacity: wh.storage_capacity !== null && wh.storage_capacity !== undefined ? Number(wh.storage_capacity) : ''
      });
    } else {
      setEditingWarehouse(null);
      setFormData({ code: '', name: '', address: '', latitude: null, longitude: null, is_active: true, storage_capacity: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.code || !formData.name) {
      setError('Please fill in required fields correctly.');
      return;
    }

    if (formData.latitude === null || formData.longitude === null) {
      setError('Please select the warehouse location on the interactive map.');
      return;
    }
    
    if (formData.latitude < -90 || formData.latitude > 90 || formData.longitude < -180 || formData.longitude > 180) {
      setError('Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.');
      return;
    }

    if (formData.storage_capacity !== '' && formData.storage_capacity !== null && Number(formData.storage_capacity) <= 0) {
      setError('Storage capacity must be greater than 0.');
      return;
    }

    const capacityValue = formData.storage_capacity !== '' && formData.storage_capacity !== null 
      ? Number(formData.storage_capacity) 
      : null;

    try {
      if (editingWarehouse) {
        await api.warehouses.update(editingWarehouse.id, {
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          address: formData.address.trim() || undefined,
          latitude: formData.latitude,
          longitude: formData.longitude,
          is_active: formData.is_active,
          storage_capacity: capacityValue
        });
      } else {
        await api.warehouses.create({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          address: formData.address.trim() || undefined,
          latitude: formData.latitude,
          longitude: formData.longitude,
          is_active: formData.is_active,
          storage_capacity: capacityValue
        });
      }
      setIsModalOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    }
  };

  const metrics = useMemo(() => {
    const totalCount = warehouses.length;
    const activeCount = warehouses.filter(w => w.is_active).length;
    const geoMappedCount = warehouses.filter(w => w.latitude !== null && w.longitude !== null).length;
    const totalCapacity = warehouses.reduce((sum, w) => sum + (w.storage_capacity ? Number(w.storage_capacity) : 0), 0);
    return { totalCount, activeCount, geoMappedCount, totalCapacity };
  }, [warehouses]);

  const filtered = warehouses.filter(w => {
    const matchesSearch = 
      w.name.toLowerCase().includes(search.toLowerCase()) || 
      w.code.toLowerCase().includes(search.toLowerCase()) ||
      (w.address && w.address.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && w.is_active) || 
      (statusFilter === 'inactive' && !w.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      <PageHeader 
        title="Warehouses & Depots" 
        description="Manage regional warehouse facilities, geographic coordinates, and active dispatch status"
        actions={
          <Button onClick={() => openModal()} className="flex items-center gap-2">
            <Plus className="w-4 h-4"/>
            <span>Add Warehouse</span>
          </Button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-brand-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">Total Warehouses</span>
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-brand-text mt-1.5 tracking-tight font-sans">{metrics.totalCount}</p>
          <span className="text-[11px] text-brand-text-secondary/80 mt-1 block">Registered logistics facilities</span>
        </Card>

        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Active Dispatch Hubs</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-700">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 mt-1.5 tracking-tight font-sans">{metrics.activeCount}</p>
          <span className="text-[11px] text-emerald-700/80 mt-1 block">Live in DAA routing matrix</span>
        </Card>

        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">Storage Capacity</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100/80 flex items-center justify-center text-indigo-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-indigo-700 mt-1.5 tracking-tight font-mono">
            {metrics.totalCapacity > 0 ? metrics.totalCapacity.toLocaleString() : 'Uncapped'}
          </p>
          <span className="text-[11px] text-indigo-700/80 mt-1 block">Total configured unit limit</span>
        </Card>

        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-800 uppercase tracking-wider">GPS Mapped Nodes</span>
            <div className="w-8 h-8 rounded-xl bg-sky-100/80 flex items-center justify-center text-sky-700">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-sky-700 mt-1.5 tracking-tight font-mono">{metrics.geoMappedCount}</p>
          <span className="text-[11px] text-sky-700/80 mt-1 block">Precise latitude/longitude</span>
        </Card>
      </div>

      {/* Regional Hub Network & Cross-Docking Facility Banner */}
      <div className="soft-card rounded-2xl p-5 sm:p-6 relative overflow-hidden border border-brand-border/80 shadow-soft-sm bg-gradient-to-r from-white/90 via-white/80 to-emerald-50/40">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="max-w-xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Regional Hub Infrastructure
              </span>
              <span className="text-[11px] text-brand-text-secondary">Multi-Bay Dock Logistics</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-brand-text tracking-tight">
              Fulfillment Hubs & Cross-Docking Terminals
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
              Distribution depots serve as the source vertices ($v_0$) for delivery tours and bounded bins for inventory restock lots. Each facility features geocoded coordinates, configured unit capacities, and dedicated outbound dispatch bays.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-surface/80 border border-brand-border/60 text-brand-text font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Storage Capacity Tracking
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-surface/80 border border-brand-border/60 text-brand-text font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                GPS Geofenced Depots
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-surface/80 border border-brand-border/60 text-brand-text font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Cross-Dock Staging
              </span>
            </div>
          </div>

          <div className="w-full md:w-64 h-36 md:h-40 rounded-xl overflow-hidden soft-inset p-1.5 flex-shrink-0 shadow-soft-sm bg-white/60">
            <img 
              src="/images/smartlogix/warehouse-hero.jpg" 
              alt="Modern regional warehouse distribution center with multi-bay loading docks and transport trucks" 
              loading="lazy"
              className="w-full h-full object-cover rounded-lg hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>
      </div>

      <Card variant="dense" noPadding className="overflow-hidden shadow-soft-sm">
        <div className="p-4 sm:p-5 border-b border-brand-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-md">
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
            <Input 
              placeholder="Search by name, code, or address..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex w-full sm:w-auto items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-brand-text-secondary hidden sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full sm:w-auto bg-white/85 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
              >
                <option value="all">All Statuses ({warehouses.length})</option>
                <option value="active">Active Hubs ({metrics.activeCount})</option>
                <option value="inactive">Inactive Hubs ({metrics.totalCount - metrics.activeCount})</option>
              </select>
            </div>

            {(search || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                className="text-xs text-brand-text-secondary hover:text-brand-text"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-sm text-brand-text-secondary flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
            <span>Loading warehouses...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-brand-text-secondary flex flex-col items-center">
            <div className="w-24 h-24 mb-3 rounded-2xl overflow-hidden soft-inset p-1 flex items-center justify-center shadow-soft-sm">
              <img src="/images/smartlogix/warehouse-small.jpg" alt="No warehouses" className="w-full h-full object-cover rounded-xl" />
            </div>
            <h4 className="font-bold text-brand-text">No warehouses found</h4>
            <p className="text-xs text-brand-text-secondary mt-1">
              {search || statusFilter !== 'all' 
                ? 'Try adjusting your search criteria or resetting filters.' 
                : 'Get started by creating your first regional distribution hub.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6 bg-brand-surface/20">
            {filtered.map(warehouse => (
              <Card key={warehouse.id} variant="glass" hoverable className="p-5 sm:p-6 flex flex-col justify-between h-full border border-brand-border/80 shadow-soft-sm hover:shadow-glass-hover">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0 shadow-soft-xs">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-brand-text leading-tight">{warehouse.name}</h3>
                        <p className="text-xs font-mono font-bold text-brand-primary mt-0.5">{warehouse.code}</p>
                      </div>
                    </div>
                    <Badge variant={warehouse.is_active ? 'success' : 'default'} dot>
                      {warehouse.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-brand-text-secondary mb-4 space-y-2.5">
                    {warehouse.address ? (
                      <p className="line-clamp-2 leading-relaxed flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-text-muted shrink-0 mt-0.5" />
                        <span>{warehouse.address}</span>
                      </p>
                    ) : (
                      <p className="italic text-brand-text-muted">No physical address specified</p>
                    )}
                    {(warehouse.latitude !== null && warehouse.longitude !== null) && (
                      <div className="text-[11px] font-mono bg-brand-surface/90 px-2.5 py-1 rounded-lg border border-brand-border/70 inline-flex items-center gap-1.5 text-brand-text-secondary shadow-soft-xs">
                        <Compass className="w-3 h-3 text-brand-primary" />
                        <span className="text-brand-text font-semibold">{warehouse.latitude.toFixed(4)}°, {warehouse.longitude.toFixed(4)}°</span>
                      </div>
                    )}
                    <div className="text-[11px] bg-brand-surface/90 px-2.5 py-1 rounded-lg border border-brand-border/70 inline-flex items-center justify-between w-full text-brand-text-secondary shadow-soft-xs">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-indigo-600" />
                        <span>Storage Capacity:</span>
                      </span>
                      <span className="font-mono font-bold text-brand-text">
                        {warehouse.storage_capacity ? `${Number(warehouse.storage_capacity).toLocaleString()} units` : 'Default (10,000 units)'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-brand-border/60 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => openModal(warehouse)} className="shadow-xs hover:shadow-glass">
                    <Edit2 className="w-3.5 h-3.5 mr-1.5 text-brand-primary" />
                    Edit Hub
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <Card variant="modal" noPadding className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
            <div className="p-5 border-b border-brand-border/80 sticky top-0 bg-brand-surface/60 backdrop-blur-md z-10 flex items-center justify-between">
              <h3 className="text-base font-bold text-brand-text">{editingWarehouse ? 'Edit Warehouse Hub' : 'Add New Warehouse Hub'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-lg bg-brand-surface/80 hover:bg-brand-surface border border-brand-border/60 flex items-center justify-center text-brand-text-secondary hover:text-brand-text transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">{error}</div>}
              
              <div className="space-y-1.5">
                <Input label="Warehouse Code *" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. WH-CENTRAL" />
              </div>
              
              <div className="space-y-1.5">
                <Input label="Warehouse Name *" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Central Distribution Center" />
              </div>

              <div className="space-y-1.5">
                <Input 
                  label="Storage Capacity" 
                  type="number"
                  min="1"
                  step="any"
                  value={formData.storage_capacity ?? ''} 
                  onChange={e => setFormData({...formData, storage_capacity: e.target.value === '' ? '' : Number(e.target.value)})} 
                  placeholder="e.g. 5000" 
                />
                <p className="text-[11px] text-brand-text-muted">Maximum storage capacity available at this warehouse.</p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">Physical Address</label>
                <textarea 
                  className="w-full rounded-xl border border-brand-border/90 bg-white/90 px-3.5 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary text-brand-text shadow-soft-inset transition-all"
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  rows={2}
                  placeholder="Street, City, State, Postal Code"
                />
              </div>

              <MapLocationPicker
                value={{ latitude: formData.latitude, longitude: formData.longitude }}
                onChange={(coords) => {
                  setFormData(prev => ({
                    ...prev,
                    latitude: coords ? coords.latitude : null,
                    longitude: coords ? coords.longitude : null
                  }));
                }}
                label="Warehouse Geographic Location"
                markerType="warehouse"
                required
                height="220px"
              />
              
              <div className="flex items-center gap-2.5 pt-2">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={formData.is_active} 
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="rounded border-brand-border text-brand-primary focus:ring-brand-primary w-4 h-4"
                />
                <label htmlFor="isActive" className="text-xs font-semibold text-brand-text cursor-pointer">Warehouse is active for dispatch operations</label>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-brand-border/60">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary">{editingWarehouse ? 'Save Changes' : 'Create Warehouse'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
