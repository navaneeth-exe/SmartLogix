import { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { Warehouse } from '../types/database.types';
import { Search, Plus, Edit2 } from 'lucide-react';
import { MapLocationPicker } from '../components/MapLocationPicker';

export const Warehouses = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
  }>({
    code: '',
    name: '',
    address: '',
    latitude: null,
    longitude: null,
    is_active: true
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
        is_active: wh.is_active
      });
    } else {
      setEditingWarehouse(null);
      setFormData({ code: '', name: '', address: '', latitude: null, longitude: null, is_active: true });
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

    try {
      if (editingWarehouse) {
        await api.warehouses.update(editingWarehouse.id, {
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          address: formData.address.trim() || undefined,
          latitude: formData.latitude,
          longitude: formData.longitude,
          is_active: formData.is_active
        });
      } else {
        await api.warehouses.create({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          address: formData.address.trim() || undefined,
          latitude: formData.latitude,
          longitude: formData.longitude,
          is_active: formData.is_active
        });
      }
      setIsModalOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    }
  };

  const filtered = warehouses.filter(w => 
    w.name.toLowerCase().includes(search.toLowerCase()) || 
    w.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <PageHeader 
        title="Warehouses & Depots" 
        description="Manage regional warehouse facilities, geographic coordinates, and active dispatch status"
        actions={<Button onClick={() => openModal()}><Plus className="w-4 h-4 mr-2"/> Add Warehouse</Button>}
      />

      <Card variant="dense" noPadding className="overflow-hidden shadow-soft-sm">
        <div className="p-4 sm:p-5 border-b border-brand-border/80 flex items-center bg-white/50 backdrop-blur-xs">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
            <Input 
              placeholder="Search by name or code..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-sm text-brand-text-secondary">Loading warehouses...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-brand-text-secondary flex flex-col items-center">
            <div className="w-24 h-24 mb-3 rounded-2xl overflow-hidden soft-inset p-1 flex items-center justify-center shadow-soft-sm">
              <img src="/images/smartlogix/warehouse-small.jpg" alt="No warehouses" className="w-full h-full object-cover rounded-xl" />
            </div>
            <h4 className="font-bold text-brand-text">No warehouses found</h4>
            <p className="text-xs text-brand-text-secondary mt-1">Get started by creating your first regional distribution hub.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6 bg-brand-surface/20">
            {filtered.map(warehouse => (
              <Card key={warehouse.id} variant="glass" hoverable className="p-5 sm:p-6 flex flex-col justify-between h-full border border-brand-border/80">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-base text-brand-text">{warehouse.name}</h3>
                      <p className="text-xs font-mono font-bold text-brand-primary mt-0.5">{warehouse.code}</p>
                    </div>
                    <Badge variant={warehouse.is_active ? 'success' : 'default'} dot>
                      {warehouse.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-brand-text-secondary mb-4 space-y-2">
                    {warehouse.address ? (
                      <p className="line-clamp-2 leading-relaxed">{warehouse.address}</p>
                    ) : (
                      <p className="italic text-brand-text-muted">No address provided</p>
                    )}
                    {(warehouse.latitude !== null && warehouse.longitude !== null) && (
                      <div className="text-[11px] font-mono bg-brand-surface/90 px-2.5 py-1 rounded-lg border border-brand-border/70 inline-flex items-center gap-1.5 text-brand-text-secondary shadow-soft-xs">
                        <span className="text-brand-text-muted">Geo:</span>
                        <span className="text-brand-text font-semibold">{warehouse.latitude.toFixed(4)}°, {warehouse.longitude.toFixed(4)}°</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="pt-3 border-t border-brand-border/60 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => openModal(warehouse)}>
                    <Edit2 className="w-3.5 h-3.5 mr-1.5 text-brand-primary" />
                    Edit Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card variant="dense" noPadding className="w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl border border-brand-border/90 bg-white">
            <div className="p-5 border-b border-brand-border/80 sticky top-0 bg-brand-surface/50 backdrop-blur-xs z-10 flex items-center justify-between">
              <h3 className="text-base font-bold text-brand-text">{editingWarehouse ? 'Edit Warehouse Hub' : 'Add New Warehouse Hub'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-brand-text-secondary hover:text-brand-text">
                ✕
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
