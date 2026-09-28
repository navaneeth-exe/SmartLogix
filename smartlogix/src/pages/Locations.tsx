import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { DeliveryLocation } from '../types/database.types';
import { 
  MapPin, Plus, Search, Edit2, CheckCircle2, 
  XCircle, AlertCircle, Building2, MapPinOff, Trash2, Compass
} from 'lucide-react';
import { MapLocationPicker } from '../components/MapLocationPicker';

export const Locations = () => {
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<DeliveryLocation | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    is_active: boolean;
  }>({
    name: '',
    address: '',
    latitude: null,
    longitude: null,
    is_active: true
  });

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const data = await api.locations.list();
      setLocations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch delivery locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const openModal = (loc: DeliveryLocation | null = null) => {
    setError('');
    if (loc) {
      setEditingLocation(loc);
      setFormData({
        name: loc.name,
        address: loc.address || '',
        latitude: loc.latitude !== null && loc.latitude !== undefined ? Number(loc.latitude) : null,
        longitude: loc.longitude !== null && loc.longitude !== undefined ? Number(loc.longitude) : null,
        is_active: loc.is_active
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        address: '',
        latitude: null,
        longitude: null,
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.name.trim()) {
      setError('Location name is required.');
      return;
    }

    if (formData.latitude === null || formData.longitude === null) {
      setError('Please select the delivery destination on the interactive map.');
      return;
    }

    if (formData.latitude < -90 || formData.latitude > 90 || formData.longitude < -180 || formData.longitude > 180) {
      setError('Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<DeliveryLocation> = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        is_active: formData.is_active
      };

      if (editingLocation) {
        await api.locations.update(editingLocation.id, payload);
        setSuccessMsg(`Location "${payload.name}" updated successfully.`);
      } else {
        await api.locations.create(payload);
        setSuccessMsg(`Location "${payload.name}" created successfully.`);
      }

      setIsModalOpen(false);
      await fetchLocations();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the location.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (loc: DeliveryLocation) => {
    setError('');
    setSuccessMsg('');
    try {
      const newStatus = !loc.is_active;
      await api.locations.toggleActive(loc.id, newStatus);
      setSuccessMsg(`Location "${loc.name}" ${newStatus ? 'activated' : 'deactivated'}.`);
      await fetchLocations();
    } catch (err: any) {
      setError(err.message || 'Failed to update location status.');
    }
  };

  const handleDelete = async (loc: DeliveryLocation) => {
    if (!window.confirm(`Are you sure you want to delete "${loc.name}"? If historical orders reference this location, deactivation is recommended instead.`)) {
      return;
    }
    setError('');
    setSuccessMsg('');
    try {
      await api.locations.delete(loc.id);
      setSuccessMsg(`Location "${loc.name}" deleted successfully.`);
      await fetchLocations();
    } catch (err: any) {
      if (err.message && err.message.includes('violates foreign key constraint')) {
        setError(`Cannot delete "${loc.name}" because historical orders reference this location. Please deactivate it instead to preserve audit records.`);
      } else {
        setError(err.message || 'Failed to delete location.');
      }
    }
  };

  const filtered = locations.filter(loc => {
    const matchesSearch = 
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      (loc.address && loc.address.toLowerCase().includes(search.toLowerCase()));
    
    if (statusFilter === 'active') return matchesSearch && loc.is_active;
    if (statusFilter === 'inactive') return matchesSearch && !loc.is_active;
    return matchesSearch;
  });

  const totalCount = locations.length;
  const activeCount = locations.filter(l => l.is_active).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="p-8">
      <PageHeader 
        title="Delivery Locations" 
        description="Manage destination hubs, client facilities, and dispatch delivery points"
        actions={
          <div className="flex items-center gap-3">
            <Link to="/map">
              <Button variant="outline" className="flex items-center gap-1.5 text-xs font-semibold">
                <Compass className="w-4 h-4 text-brand-primary" />
                <span>Map Workspace</span>
              </Button>
            </Link>
            <Button onClick={() => openModal()}>
              <Plus className="w-4 h-4 mr-2" /> Add Delivery Location
            </Button>
          </div>
        }
      />

      {/* Feedback Messages */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800 font-semibold ml-4">✕</button>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800 font-semibold ml-4">✕</button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 border-l-4 border-l-brand-primary">
          <h4 className="text-brand-text-secondary text-sm font-medium">Total Destinations</h4>
          <p className="text-3xl font-bold mt-2 text-brand-text">{totalCount}</p>
        </Card>
        <Card className="p-6 border-l-4 border-l-emerald-500">
          <h4 className="text-brand-text-secondary text-sm font-medium">Active Locations</h4>
          <p className="text-3xl font-bold mt-2 text-emerald-600">{activeCount}</p>
        </Card>
        <Card className="p-6 border-l-4 border-l-slate-400">
          <h4 className="text-brand-text-secondary text-sm font-medium">Deactivated Locations</h4>
          <p className="text-3xl font-bold mt-2 text-slate-500">{inactiveCount}</p>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card>
        <div className="p-4 border-b border-brand-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
            <Input 
              placeholder="Search by destination name or address..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-medium text-brand-text-secondary">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-brand-text"
            >
              <option value="all">All Locations ({totalCount})</option>
              <option value="active">Active Only ({activeCount})</option>
              <option value="inactive">Deactivated Only ({inactiveCount})</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-brand-text-secondary">Loading delivery locations...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-brand-text-secondary flex flex-col items-center">
            <MapPinOff className="w-12 h-12 mb-4 opacity-40" />
            <h3 className="font-semibold text-brand-text text-base">No delivery locations found</h3>
            <p className="text-sm mt-1">Try adjusting your search criteria or add a new delivery location.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {filtered.map(loc => (
              <Card 
                key={loc.id} 
                className={`p-5 flex flex-col justify-between border transition-all ${
                  loc.is_active 
                    ? 'border-brand-border hover:border-brand-primary/60 hover:shadow-sm' 
                    : 'border-brand-border/60 bg-brand-surface/40 opacity-75'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-lg mt-0.5 ${loc.is_active ? 'bg-brand-primary/10 text-brand-primary' : 'bg-gray-100 text-gray-500'}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-brand-text leading-snug">{loc.name}</h3>
                        <p className="text-xs text-brand-text-secondary mt-0.5 font-mono">
                          ID: {loc.id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <Badge variant={loc.is_active ? 'success' : 'default'}>
                      {loc.is_active ? 'Active' : 'Deactivated'}
                    </Badge>
                  </div>

                  <div className="text-sm text-brand-text-secondary my-3 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 mt-1 flex-shrink-0 text-brand-primary" />
                      <p className="text-xs leading-relaxed text-brand-text">
                        {loc.address || <span className="italic text-brand-text-secondary">No street address provided</span>}
                      </p>
                    </div>

                    {(loc.latitude !== null && loc.longitude !== null) && (
                      <div className="text-xs font-mono text-brand-text-secondary bg-brand-surface px-2.5 py-1.5 rounded border border-brand-border/50">
                        Geo: {Number(loc.latitude).toFixed(4)}°, {Number(loc.longitude).toFixed(4)}°
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-brand-border flex items-center justify-between gap-2 mt-2">
                  <button
                    onClick={() => handleToggleActive(loc)}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                      loc.is_active 
                        ? 'text-amber-700 hover:bg-amber-50' 
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {loc.is_active ? (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Deactivate
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => openModal(loc)} title="Edit Location">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <button
                      onClick={() => handleDelete(loc)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      title="Delete Location (fails if referenced by orders)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Modal for Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-brand-border sticky top-0 bg-brand-card z-10 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-brand-text">
                  {editingLocation ? 'Edit Delivery Location' : 'Add New Delivery Location'}
                </h3>
                <p className="text-xs text-brand-text-secondary mt-0.5">
                  Configure delivery destination coordinates and details
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-brand-text-secondary hover:text-brand-text text-xl">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-brand-text">Location Name *</label>
                <Input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Apex Manufacturing Hub" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-brand-text">Address</label>
                <textarea 
                  className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary text-brand-text"
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  placeholder="Street address, city, state, postal code"
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
                label="Destination Location on Map"
                markerType="location"
                required
                height="220px"
              />

              <div className="p-3 bg-brand-surface rounded-lg border border-brand-border/60">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_active} 
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-brand-text">Active for deliveries</span>
                    <p className="text-xs text-brand-text-secondary">Only active locations can be selected when placing new orders.</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-brand-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingLocation ? 'Save Changes' : 'Create Location'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
