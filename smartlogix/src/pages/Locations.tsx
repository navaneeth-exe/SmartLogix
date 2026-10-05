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
  XCircle, AlertCircle, Building2, Trash2, Compass, X
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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <PageHeader 
        title="Delivery Locations" 
        description="Manage destination hubs, client facilities, and dispatch delivery points"
        actions={
          <div className="flex items-center gap-3">
            <Link to="/map">
              <Button variant="outline" size="md" className="flex items-center gap-1.5 text-xs font-semibold">
                <Compass className="w-4 h-4 text-brand-primary" />
                <span>Map Workspace</span>
              </Button>
            </Link>
            <Button onClick={() => openModal()} size="md">
              <Plus className="w-4 h-4 mr-2" /> Add Delivery Location
            </Button>
          </div>
        }
      />

      {/* Feedback Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-semibold shadow-soft-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} aria-label="Dismiss message" className="text-emerald-600 hover:text-emerald-800 font-bold ml-4 p-1 rounded hover:bg-emerald-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-xs font-semibold shadow-soft-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} aria-label="Dismiss error" className="text-red-600 hover:text-red-800 font-bold ml-4 p-1 rounded hover:bg-rose-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-brand-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">Total Destinations</span>
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-1.5 text-brand-text tracking-tight font-sans">{totalCount}</p>
          <span className="text-[11px] text-brand-text-secondary/80 mt-1 block">Registered destination points</span>
        </Card>

        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Active Locations</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-1.5 text-emerald-700 tracking-tight font-sans">{activeCount}</p>
          <span className="text-[11px] text-emerald-700/80 mt-1 block">Eligible for dispatch routes</span>
        </Card>

        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-slate-400">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Deactivated Locations</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100/80 flex items-center justify-center text-slate-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-1.5 text-slate-600 tracking-tight font-sans">{inactiveCount}</p>
          <span className="text-[11px] text-slate-500 block mt-1">Temporarily offline</span>
        </Card>
      </div>

      {/* Urban Delivery Endpoints & Micro-Hub Showcase Banner */}
      <div className="soft-card rounded-2xl p-5 sm:p-6 relative overflow-hidden border border-brand-border/80 shadow-soft-sm bg-gradient-to-r from-white/90 via-white/80 to-sky-50/40">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="max-w-xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-sky-800 bg-sky-100/90 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Last-Mile Drop-off Network
              </span>
              <span className="text-[11px] text-brand-text-secondary">Urban Commercial Geocoding</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-brand-text tracking-tight">
              Micro-Fulfillment Endpoints & Smart Lockers
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
              Every customer destination is mapped with precise road coordinates and access profiles. Destinations form the target vertices for Dijkstra fulfillment recommendations and intermediate stops for vehicle TSP route tours.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-surface/80 border border-brand-border/60 text-brand-text font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Road Distance Matrix Ready
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-surface/80 border border-brand-border/60 text-brand-text font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                Dijkstra Target Vertices
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-surface/80 border border-brand-border/60 text-brand-text font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                Smart Locker Curbside Access
              </span>
            </div>
          </div>

          <div className="w-full md:w-64 h-36 md:h-40 rounded-xl overflow-hidden soft-inset p-1.5 flex-shrink-0 shadow-soft-sm bg-white/60">
            <img 
              src="/images/smartlogix/urban-delivery-hub.jpg" 
              alt="Modern urban micro-fulfillment center with smart locker pickup station and electric delivery van" 
              loading="lazy"
              className="w-full h-full object-cover rounded-lg hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <Card variant="dense" noPadding className="overflow-hidden shadow-soft-sm">
        <div className="p-4 sm:p-5 border-b border-brand-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-md">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
            <Input 
              placeholder="Search by destination name or address..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-brand-text-secondary hidden sm:inline">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full sm:w-auto bg-white/85 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
              >
                <option value="all">All Locations ({totalCount})</option>
                <option value="active">Active Only ({activeCount})</option>
                <option value="inactive">Deactivated Only ({inactiveCount})</option>
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
          <div className="p-12 text-center text-sm text-brand-text-secondary">Loading delivery locations...</div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center text-brand-text-secondary flex flex-col items-center">
            <div className="w-24 h-24 mb-3 rounded-2xl overflow-hidden soft-inset p-1 flex items-center justify-center shadow-soft-sm">
              <img src="/images/smartlogix/location-pin.jpg" alt="No locations" className="w-full h-full object-cover rounded-xl" />
            </div>
            <h3 className="font-bold text-brand-text text-base">No delivery locations found</h3>
            <p className="text-xs text-brand-text-secondary mt-1 max-w-xs">Try adjusting your search criteria or add a new delivery destination.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6 bg-brand-surface/20">
            {filtered.map(loc => (
              <Card 
                key={loc.id} 
                variant="glass"
                hoverable
                className={`p-5 sm:p-6 flex flex-col justify-between border transition-all ${
                  loc.is_active 
                    ? 'border-brand-border/90' 
                    : 'border-brand-border/60 bg-brand-surface/60 opacity-80'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-xl mt-0.5 shadow-soft-xs ${loc.is_active ? 'bg-brand-soft text-brand-primary border border-brand-primary/20' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-brand-text leading-snug">{loc.name}</h3>
                        <p className="text-[11px] text-brand-text-secondary mt-0.5 font-mono">
                          ID: {loc.id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <Badge variant={loc.is_active ? 'success' : 'default'} dot>
                      {loc.is_active ? 'Active' : 'Deactivated'}
                    </Badge>
                  </div>

                  <div className="text-xs text-brand-text-secondary my-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand-primary" />
                      <p className="text-xs leading-relaxed text-brand-text">
                        {loc.address || <span className="italic text-brand-text-muted">No street address provided</span>}
                      </p>
                    </div>

                    {(loc.latitude !== null && loc.longitude !== null) && (
                      <div className="text-[11px] font-mono text-brand-text bg-brand-surface/90 px-2.5 py-1 rounded-lg border border-brand-border/70 inline-flex items-center gap-1.5 shadow-soft-xs">
                        <span className="text-brand-text-muted">Geo:</span>
                        <span className="font-semibold">{Number(loc.latitude).toFixed(4)}°, {Number(loc.longitude).toFixed(4)}°</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-brand-border/60 flex items-center justify-between gap-2 mt-2">
                  <button
                    onClick={() => handleToggleActive(loc)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
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
                      <Edit2 className="w-3.5 h-3.5 mr-1 text-brand-primary" /> Edit
                    </Button>
                    <button
                      onClick={() => handleDelete(loc)}
                      className="p-1.5 text-brand-text-secondary hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete Location"
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
        <div className="fixed inset-0 bg-black/35 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <Card variant="modal" noPadding className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
            <div className="p-5 border-b border-brand-border/80 sticky top-0 bg-brand-surface/60 backdrop-blur-md z-10 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-brand-text">
                  {editingLocation ? 'Edit Delivery Location' : 'Add New Delivery Location'}
                </h3>
                <p className="text-[11px] text-brand-text-secondary mt-0.5">
                  Configure delivery destination coordinates and details
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-lg bg-brand-surface/80 hover:bg-brand-surface border border-brand-border/60 flex items-center justify-center text-brand-text-secondary hover:text-brand-text transition-all active:scale-95"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Input 
                  label="Location Name *"
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Apex Manufacturing Hub" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">Address</label>
                <textarea 
                  className="w-full rounded-xl border border-brand-border/90 bg-white/90 px-3.5 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary text-brand-text shadow-soft-inset transition-all"
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

              <div className="p-3.5 bg-brand-surface/70 rounded-xl border border-brand-border/70">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_active} 
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-brand-text">Active for deliveries</span>
                    <p className="text-[11px] text-brand-text-secondary">Only active locations can be selected when placing new orders.</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-brand-border/60">
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
