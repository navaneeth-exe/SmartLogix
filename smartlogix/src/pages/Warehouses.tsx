import { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { Warehouse } from '../types/database.types';
import { Search, Plus, Edit2, Warehouse as WarehouseIcon } from 'lucide-react';
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
    <div className="p-8">
      <PageHeader 
        title="Warehouses" 
        description="Manage warehouse locations and details"
        actions={<Button onClick={() => openModal()}><Plus className="w-4 h-4 mr-2"/> Add Warehouse</Button>}
      />

      <Card className="mt-6">
        <div className="p-4 border-b border-brand-border flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
            <Input 
              placeholder="Search by name or code..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-brand-text-secondary">Loading warehouses...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-brand-text-secondary flex flex-col items-center">
            <div className="w-24 h-24 mb-3 rounded-2xl overflow-hidden soft-inset p-1 flex items-center justify-center shadow-soft-sm">
              <img src="/images/smartlogix/warehouse-small.jpg" alt="No warehouses" className="w-full h-full object-cover rounded-xl" />
            </div>
            <h4 className="font-bold text-brand-text">No warehouses found</h4>
            <p className="text-xs text-brand-text-secondary mt-1">Get started by creating your first regional distribution hub.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filtered.map(warehouse => (
              <Card key={warehouse.id} hoverable className="p-5 flex flex-col h-full border border-brand-border/80">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-base text-brand-text">{warehouse.name}</h3>
                    <p className="text-xs font-mono font-semibold text-brand-primary mt-0.5">{warehouse.code}</p>
                  </div>
                  <Badge variant={warehouse.is_active ? 'success' : 'default'} dot>
                    {warehouse.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="text-sm text-brand-text-secondary mb-4 flex-1">
                  {warehouse.address ? (
                     <p className="mb-2 line-clamp-2 text-xs">{warehouse.address}</p>
                  ) : (
                     <p className="mb-2 italic text-xs">No address provided</p>
                  )}
                  {(warehouse.latitude !== null && warehouse.longitude !== null) && (
                    <div className="text-[11px] font-mono bg-brand-surface/70 px-2 py-0.5 rounded border border-brand-border/60 inline-flex items-center gap-1 text-brand-text-secondary">
                      <span>Coords:</span>
                      <span className="text-brand-text font-medium">{warehouse.latitude.toFixed(4)}, {warehouse.longitude.toFixed(4)}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-3 border-t border-brand-border/60 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => openModal(warehouse)}>
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                    Edit Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto shadow-glass rounded-2xl">
            <div className="p-6 border-b border-brand-border sticky top-0 bg-brand-card z-10">
              <h3 className="text-lg font-bold">{editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Warehouse Code *</label>
                <Input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. WH-001" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Warehouse Name *</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Central Hub" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <textarea 
                  className="w-full rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  rows={2}
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
              
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={formData.is_active} 
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="rounded border-brand-border text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor="isActive" className="text-sm font-medium">Warehouse is active</label>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-brand-border">
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
