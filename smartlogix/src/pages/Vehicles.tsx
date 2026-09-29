import { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { 
  Vehicle, 
  VehicleType, 
  VehicleStatus, 
  CapacityUnit 
} from '../types/database.types';
import { 
  Truck, Plus, Search, Filter, Edit2, Trash2, Eye, 
  CheckCircle2, AlertCircle, Wrench, XCircle, CheckCheck
} from 'lucide-react';

export const Vehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Feedback state
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    registration_number: '',
    vehicle_type: 'Van' as VehicleType,
    capacity: 1000 as number | string,
    capacity_unit: 'kg' as CapacityUnit,
    status: 'AVAILABLE' as VehicleStatus
  });

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const data = await api.vehicles.list();
      setVehicles(data);
      if (selectedVehicle) {
        const updated = data.find(v => v.id === selectedVehicle.id);
        if (updated) setSelectedVehicle(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load vehicles from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openFormModal = (v: Vehicle | null = null) => {
    setError('');
    if (v) {
      setEditingVehicle(v);
      setFormData({
        name: v.name,
        registration_number: v.registration_number,
        vehicle_type: v.vehicle_type,
        capacity: v.capacity,
        capacity_unit: v.capacity_unit,
        status: v.status
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        name: '',
        registration_number: '',
        vehicle_type: 'Van',
        capacity: 1000,
        capacity_unit: 'kg',
        status: 'AVAILABLE'
      });
    }
    setIsFormModalOpen(true);
  };

  const openDetailModal = (v: Vehicle) => {
    setError('');
    setSuccessMsg('');
    setSelectedVehicle(v);
    setIsDetailModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const reg = formData.registration_number.trim().toUpperCase();
    const name = formData.name.trim();
    const cap = parseFloat(formData.capacity as string);

    if (!name) {
      setError('Vehicle name/model is required.');
      return;
    }

    if (!reg) {
      setError('Registration number is required.');
      return;
    }

    if (isNaN(cap) || cap <= 0) {
      setError('Load capacity must be a positive number greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<Vehicle> = {
        name,
        registration_number: reg,
        vehicle_type: formData.vehicle_type,
        capacity: cap,
        capacity_unit: formData.capacity_unit,
        status: formData.status
      };

      if (editingVehicle) {
        await api.vehicles.update(editingVehicle.id, payload);
        setSuccessMsg(`Vehicle "${reg}" updated successfully.`);
      } else {
        await api.vehicles.create(payload);
        setSuccessMsg(`Vehicle "${reg}" registered successfully.`);
      }

      setIsFormModalOpen(false);
      await fetchVehicles();
    } catch (err: any) {
      if (err.message && err.message.includes('vehicles_registration_number_key')) {
        setError(`A vehicle with registration number "${reg}" is already registered. Registration numbers must be unique.`);
      } else {
        setError(err.message || 'An error occurred while saving the vehicle.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (vehicleId: string, newStatus: VehicleStatus) => {
    setError('');
    setSuccessMsg('');
    setActionLoading(true);
    try {
      await api.vehicles.updateStatus(vehicleId, newStatus);
      setSuccessMsg(`Vehicle status updated to ${newStatus}.`);
      await fetchVehicles();
    } catch (err: any) {
      setError(err.message || 'Failed to update vehicle status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (v: Vehicle) => {
    if (!window.confirm(`Are you sure you want to delete vehicle "${v.registration_number}" (${v.name})?`)) {
      return;
    }
    setError('');
    setSuccessMsg('');
    try {
      await api.vehicles.delete(v.id);
      setSuccessMsg(`Vehicle "${v.registration_number}" deleted successfully.`);
      if (isDetailModalOpen && selectedVehicle?.id === v.id) {
        setIsDetailModalOpen(false);
      }
      await fetchVehicles();
    } catch (err: any) {
      setError(err.message || 'Failed to delete vehicle.');
    }
  };

  const getStatusBadge = (status: VehicleStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCheck className="w-3 h-3"/> Available</Badge>;
      case 'ON_ROUTE':
        return <Badge variant="info" className="flex items-center gap-1"><Truck className="w-3 h-3"/> In Use / On Route</Badge>;
      case 'MAINTENANCE':
        return <Badge variant="warning" className="flex items-center gap-1"><Wrench className="w-3 h-3"/> Maintenance</Badge>;
      case 'OFF_DUTY':
        return <Badge variant="default" className="flex items-center gap-1"><XCircle className="w-3 h-3"/> Off Duty / Inactive</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: VehicleType) => {
    switch (type) {
      case 'Motorcycle':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Motorcycle</span>;
      case 'Van':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Van</span>;
      case 'Small Truck':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">Small Truck</span>;
      case 'Large Truck':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">Large Truck</span>;
      default:
        return <span className="text-xs">{type}</span>;
    }
  };

  const filtered = vehicles.filter(v => {
    const matchesSearch = 
      v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'all' || v.vehicle_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalCount = vehicles.length;
  const availableCount = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const onRouteCount = vehicles.filter(v => v.status === 'ON_ROUTE').length;
  const maintenanceCount = vehicles.filter(v => v.status === 'MAINTENANCE').length;
  const offDutyCount = vehicles.filter(v => v.status === 'OFF_DUTY').length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
      <PageHeader 
        title="Vehicles" 
        description="Monitor fleet units, configure payload capacities, and manage maintenance states"
        actions={
          <Button variant="primary" onClick={() => openFormModal()}>
            <Plus className="w-4 h-4 mr-2" /> Add Vehicle
          </Button>
        }
      />

      {/* Global Alerts */}
      {successMsg && !isDetailModalOpen && !isFormModalOpen && (
        <div className="p-4 bg-emerald-50/90 backdrop-blur-xs border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800 font-semibold ml-4">✕</button>
        </div>
      )}

      {error && !isDetailModalOpen && !isFormModalOpen && (
        <div className="p-4 bg-red-50/90 backdrop-blur-xs border border-red-200 text-red-800 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800 font-semibold ml-4">✕</button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card variant="glass" className="p-5 border-l-4 border-l-brand-primary">
          <h4 className="text-brand-text-secondary text-xs font-semibold uppercase tracking-wider">Total Fleet</h4>
          <p className="text-2xl font-bold mt-2 text-brand-text font-mono">{totalCount}</p>
        </Card>
        <Card variant="glass" className="p-5 border-l-4 border-l-emerald-500">
          <h4 className="text-brand-text-secondary text-xs font-semibold uppercase tracking-wider">Available</h4>
          <p className="text-2xl font-bold mt-2 text-emerald-600 font-mono">{availableCount}</p>
        </Card>
        <Card variant="glass" className="p-5 border-l-4 border-l-blue-500">
          <h4 className="text-brand-text-secondary text-xs font-semibold uppercase tracking-wider">In Use / Route</h4>
          <p className="text-2xl font-bold mt-2 text-blue-600 font-mono">{onRouteCount}</p>
        </Card>
        <Card variant="glass" className="p-5 border-l-4 border-l-amber-500">
          <h4 className="text-brand-text-secondary text-xs font-semibold uppercase tracking-wider">Maintenance</h4>
          <p className="text-2xl font-bold mt-2 text-amber-600 font-mono">{maintenanceCount}</p>
        </Card>
        <Card variant="glass" className="p-5 border-l-4 border-l-slate-400">
          <h4 className="text-brand-text-secondary text-xs font-semibold uppercase tracking-wider">Off Duty / Inactive</h4>
          <p className="text-2xl font-bold mt-2 text-slate-500 font-mono">{offDutyCount}</p>
        </Card>
      </div>

      {/* Main Table & Filter Card */}
      <Card variant="dense" className="overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-brand-border/60 flex flex-col md:flex-row items-center justify-between gap-4 bg-brand-surface/40">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
            <Input 
              placeholder="Search by registration number or model..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-text-secondary" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white/90 backdrop-blur-xs border border-brand-border/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 text-brand-text shadow-xs"
              >
                <option value="all">All Vehicle Types</option>
                <option value="Motorcycle">Motorcycle</option>
                <option value="Van">Van</option>
                <option value="Small Truck">Small Truck</option>
                <option value="Large Truck">Large Truck</option>
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/90 backdrop-blur-xs border border-brand-border/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 text-brand-text shadow-xs"
            >
              <option value="all">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ON_ROUTE">In Use / On Route</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OFF_DUTY">Off Duty / Inactive</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-brand-text-secondary">Loading vehicles...</div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center text-brand-text-secondary flex flex-col items-center">
            <div className="w-24 h-24 mb-4 rounded-2xl overflow-hidden soft-inset p-2 flex items-center justify-center shadow-soft-sm">
              <img 
                src="/images/smartlogix/smartlogix-3d-van.jpg" 
                alt="No vehicles found" 
                className="w-full h-full object-contain" 
              />
            </div>
            <h3 className="font-bold text-brand-text text-base">No vehicles found</h3>
            <p className="text-xs text-brand-text-secondary mt-1 mb-4 max-w-xs">No registered vehicle matches your current filter criteria.</p>
            <Button variant="primary" size="sm" onClick={() => openFormModal()}>
              <Plus className="w-4 h-4 mr-1" /> Add New Vehicle
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-surface/70 border-b border-brand-border/80 text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Registration</th>
                  <th className="px-4 py-3">Vehicle Name / Model</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Max Load Capacity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filtered.map(v => (
                  <tr key={v.id} className="hover:bg-brand-surface/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-brand-primary">
                      {v.registration_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-text">
                      {v.name}
                    </td>
                    <td className="px-4 py-3">
                      {getTypeBadge(v.vehicle_type)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-brand-text">
                      {Number(v.capacity).toLocaleString()} <span className="text-xs text-brand-text-secondary font-normal">{v.capacity_unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(v.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openDetailModal(v)} title="View Details">
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openFormModal(v)} title="Edit Vehicle">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <button
                          onClick={() => handleDelete(v)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Delete Vehicle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Vehicle Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <Card variant="modal" noPadding className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
            <div className="p-6 border-b border-brand-border/60 sticky top-0 bg-white/95 backdrop-blur-md z-10 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-brand-text">
                  {editingVehicle ? 'Edit Vehicle' : 'Register New Vehicle'}
                </h3>
                <p className="text-xs text-brand-text-secondary mt-0.5">
                  Configure vehicle registration, type, and payload limits
                </p>
              </div>
              <button 
                onClick={() => setIsFormModalOpen(false)} 
                className="w-8 h-8 rounded-lg bg-brand-surface/80 hover:bg-brand-surface border border-brand-border/60 flex items-center justify-center text-brand-text-secondary hover:text-brand-text transition-all active:scale-95"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-brand-text">Vehicle Name / Model *</label>
                <Input 
                  required
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Ford Transit EcoVan 02" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-brand-text">Registration Number *</label>
                <Input 
                  required
                  value={formData.registration_number} 
                  onChange={e => setFormData({...formData, registration_number: e.target.value.toUpperCase()})} 
                  placeholder="e.g. VAN-789-NYC" 
                  className="font-mono uppercase"
                />
                <p className="text-xs text-brand-text-secondary">License plate or fleet identifier. Must be unique.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-brand-text">Vehicle Type *</label>
                  <select
                    value={formData.vehicle_type}
                    onChange={e => setFormData({...formData, vehicle_type: e.target.value as VehicleType})}
                    className="w-full bg-white/90 backdrop-blur-xs border border-brand-border/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 text-brand-text shadow-xs"
                  >
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Van">Van</option>
                    <option value="Small Truck">Small Truck</option>
                    <option value="Large Truck">Large Truck</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-brand-text">Initial Status *</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as VehicleStatus})}
                    className="w-full bg-white/90 backdrop-blur-xs border border-brand-border/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 text-brand-text shadow-xs"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ON_ROUTE">In Use / On Route</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OFF_DUTY">Off Duty / Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-brand-text">Max Load Capacity *</label>
                  <Input 
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={formData.capacity} 
                    onChange={e => setFormData({...formData, capacity: e.target.value})} 
                    placeholder="e.g. 1500" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-brand-text">Capacity Unit *</label>
                  <select
                    value={formData.capacity_unit}
                    onChange={e => setFormData({...formData, capacity_unit: e.target.value as CapacityUnit})}
                    className="w-full bg-white/90 backdrop-blur-xs border border-brand-border/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 text-brand-text shadow-xs"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="units">Discrete Units</option>
                    <option value="m3">Cubic Meters (m³)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-brand-border/60">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingVehicle ? 'Save Changes' : 'Register Vehicle'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Vehicle Details Modal */}
      {isDetailModalOpen && selectedVehicle && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <Card variant="modal" noPadding className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
            <div className="p-6 border-b border-brand-border/60 sticky top-0 bg-white/95 backdrop-blur-md z-10 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold font-mono text-brand-text">{selectedVehicle.registration_number}</h3>
                  {getStatusBadge(selectedVehicle.status)}
                </div>
                <p className="text-xs text-brand-text-secondary mt-0.5">{selectedVehicle.name}</p>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)} 
                className="w-8 h-8 rounded-lg bg-brand-surface/80 hover:bg-brand-surface border border-brand-border/60 flex items-center justify-center text-brand-text-secondary hover:text-brand-text transition-all active:scale-95"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Feedback messages inside modal */}
              {error && (
                <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Attributes Card */}
              <div className="p-4 bg-brand-surface/70 rounded-xl border border-brand-border/80 space-y-3 shadow-xs">
                <div className="flex justify-between items-center text-sm border-b border-brand-border/60 pb-2">
                  <span className="text-brand-text-secondary">Vehicle Classification:</span>
                  <span>{getTypeBadge(selectedVehicle.vehicle_type)}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-brand-border/60 pb-2">
                  <span className="text-brand-text-secondary">Maximum Payload:</span>
                  <span className="font-bold font-mono text-brand-text">
                    {Number(selectedVehicle.capacity).toLocaleString()} {selectedVehicle.capacity_unit}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-brand-border/60 pb-2">
                  <span className="text-brand-text-secondary">Registered Date:</span>
                  <span className="text-xs text-brand-text">
                    {new Date(selectedVehicle.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-brand-text-secondary">Last Updated:</span>
                  <span className="text-xs text-brand-text">
                    {new Date(selectedVehicle.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Operational Status Workflow */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-3">
                  Manage Availability & Status
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedVehicle.status === 'AVAILABLE' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange(selectedVehicle.id, 'AVAILABLE')}
                    disabled={actionLoading || selectedVehicle.status === 'AVAILABLE'}
                    className="justify-start text-xs"
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Mark Available
                  </Button>

                  <Button
                    variant={selectedVehicle.status === 'MAINTENANCE' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange(selectedVehicle.id, 'MAINTENANCE')}
                    disabled={actionLoading || selectedVehicle.status === 'MAINTENANCE'}
                    className="justify-start text-xs"
                  >
                    <Wrench className="w-3.5 h-3.5 mr-1.5" /> Send to Maintenance
                  </Button>

                  <Button
                    variant={selectedVehicle.status === 'ON_ROUTE' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange(selectedVehicle.id, 'ON_ROUTE')}
                    disabled={actionLoading || selectedVehicle.status === 'ON_ROUTE'}
                    className="justify-start text-xs"
                  >
                    <Truck className="w-3.5 h-3.5 mr-1.5" /> Mark In Use
                  </Button>

                  <Button
                    variant={selectedVehicle.status === 'OFF_DUTY' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange(selectedVehicle.id, 'OFF_DUTY')}
                    disabled={actionLoading || selectedVehicle.status === 'OFF_DUTY'}
                    className="justify-start text-xs"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> Set Off Duty
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-brand-border/60 bg-brand-surface/40 flex justify-between items-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setIsDetailModalOpen(false);
                  openFormModal(selectedVehicle);
                }}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Vehicle
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

