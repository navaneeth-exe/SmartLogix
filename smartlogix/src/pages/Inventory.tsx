import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

import { api } from '../services/api';
import type { 
  Inventory, 
  Product, 
  Warehouse, 
  BinPackingResult, 
  RestockWarehouseCapacity 
} from '../types/database.types';
import { solveRestockBinPacking } from '../algorithms/binPacking';
import { Search, Plus, Edit2, Box, Filter, Sparkles, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

export const InventoryPage = () => {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [error, setError] = useState('');

  // Restock Allocation Optimization State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockProductId, setRestockProductId] = useState('');
  const [restockQuantity, setRestockQuantity] = useState<number | ''>('');
  const [restockError, setRestockError] = useState('');
  const [restockSuccess, setRestockSuccess] = useState('');
  const [optimizingRestock, setOptimizingRestock] = useState(false);
  const [restockProposal, setRestockProposal] = useState<BinPackingResult | null>(null);
  const [applyingAllocation, setApplyingAllocation] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ 
    warehouse_id: '', 
    product_id: '', 
    quantity: 0, 
    reorder_level: 10 
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invData, prodData, whData] = await Promise.all([
        api.inventory.list(),
        api.products.list(),
        api.warehouses.list()
      ]);
      setInventory(invData);
      setProducts(prodData);
      setWarehouses(whData);
      
      if (whData.length > 0 && prodData.length > 0) {
        setFormData(prev => ({
          ...prev,
          warehouse_id: whData[0].id,
          product_id: prodData[0].id
        }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (item: Inventory | null = null) => {
    setError('');
    if (item) {
      setEditingItem(item);
      setFormData({ 
        warehouse_id: item.warehouse_id, 
        product_id: item.product_id, 
        quantity: item.quantity, 
        reorder_level: item.reorder_level 
      });
    } else {
      setEditingItem(null);
      if (warehouses.length > 0 && products.length > 0) {
        setFormData({ 
          warehouse_id: warehouses[0].id, 
          product_id: products[0].id, 
          quantity: 0, 
          reorder_level: 10 
        });
      }
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.quantity < 0 || formData.reorder_level < 0) {
      setError('Quantity and reorder level cannot be negative.');
      return;
    }

    try {
      if (editingItem) {
        await api.inventory.updateStock(editingItem.id, {
          quantity: formData.quantity,
          reorder_level: formData.reorder_level
        });
      } else {
        // Find existing to avoid violation
        const existing = inventory.find(i => i.warehouse_id === formData.warehouse_id && i.product_id === formData.product_id);
        if (existing) {
           await api.inventory.updateStock(existing.id, {
             quantity: formData.quantity,
             reorder_level: formData.reorder_level
           });
        } else {
           await api.inventory.addStock(formData.warehouse_id, formData.product_id, formData.quantity, formData.reorder_level);
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    }
  };

  const openRestockModal = () => {
    setRestockError('');
    setRestockSuccess('');
    setRestockProposal(null);
    setRestockQuantity('');
    if (products.length > 0) {
      setRestockProductId(products[0].id);
    }
    setIsRestockModalOpen(true);
  };

  const handleCalculateRestockAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    setRestockError('');
    setRestockSuccess('');

    const qty = Number(restockQuantity);
    if (!restockProductId) {
      setRestockError('Please select a product to restock.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setRestockError('Please enter a valid incoming restock quantity greater than 0.');
      return;
    }

    try {
      setOptimizingRestock(true);

      // 1. Gather active warehouses
      const activeWarehouses = warehouses.filter(w => w.is_active);
      if (activeWarehouses.length === 0) {
        throw new Error('No active warehouses are configured to accept restocks.');
      }

      // 2. Compute occupied stock per warehouse across all inventory
      const occupiedByWh = new Map<string, number>();
      inventory.forEach(inv => {
        const curr = occupiedByWh.get(inv.warehouse_id) || 0;
        occupiedByWh.set(inv.warehouse_id, curr + (inv.quantity || 0));
      });

      // 3. Assemble RestockWarehouseCapacity bins
      const warehouseBins: RestockWarehouseCapacity[] = activeWarehouses.map(wh => {
        const currentStock = occupiedByWh.get(wh.id) || 0;
        // If storage_capacity is unset or null, default to a generous baseline or currentStock
        const storageCapacity = wh.storage_capacity != null ? Number(wh.storage_capacity) : 10000;
        const availableCapacity = Math.max(0, storageCapacity - currentStock);

        return {
          warehouse: wh,
          currentStock,
          storageCapacity,
          availableCapacity
        };
      });

      // 4. Run First Fit Decreasing (FFD) Bin Packing Algorithm
      const result = solveRestockBinPacking({
        productId: restockProductId,
        totalQuantity: qty,
        warehouses: warehouseBins
      });

      setRestockProposal(result);
    } catch (err: any) {
      setRestockError(err.message || 'Failed to calculate restock allocation proposal.');
    } finally {
      setOptimizingRestock(false);
    }
  };

  const handleApplyRestockAllocation = async () => {
    if (!restockProposal || restockProposal.allocations.length === 0) return;
    setRestockError('');
    setRestockSuccess('');

    try {
      setApplyingAllocation(true);
      const allocationPayload = restockProposal.allocations.map(a => ({
        warehouseId: a.warehouseId,
        quantity: a.allocatedQuantity
      }));

      await api.inventory.applyRestockAllocation(restockProposal.productId, allocationPayload);

      setRestockSuccess(`Successfully applied restock allocation of ${restockProposal.totalAllocated} units across ${restockProposal.warehousesUtilized} warehouses.`);
      setRestockProposal(null);
      await fetchData();
    } catch (err: any) {
      setRestockError(err.message || 'Failed to apply restock allocation to inventory.');
    } finally {
      setApplyingAllocation(false);
    }
  };

  const filtered = useMemo(() => {
    return inventory.filter(item => {
      const matchSearch = 
        item.product?.name.toLowerCase().includes(search.toLowerCase()) || 
        item.product?.sku.toLowerCase().includes(search.toLowerCase());
      
      const matchWarehouse = filterWarehouse === 'all' || item.warehouse_id === filterWarehouse;
      
      let matchStatus = true;
      if (filterStatus === 'low') {
        matchStatus = item.quantity > 0 && item.quantity <= item.reorder_level;
      } else if (filterStatus === 'out') {
        matchStatus = item.quantity === 0;
      } else if (filterStatus === 'ok') {
        matchStatus = item.quantity > item.reorder_level;
      }
      
      return matchSearch && matchWarehouse && matchStatus;
    });
  }, [inventory, search, filterWarehouse, filterStatus]);

  const getStatusBadge = (qty: number, reorder: number) => {
    if (qty === 0) return <Badge variant="danger">Out of Stock</Badge>;
    if (qty <= reorder) return <Badge variant="warning">Low Stock</Badge>;
    return <Badge variant="success">In Stock</Badge>;
  };

  const lowStockCount = inventory.filter(i => i.quantity > 0 && i.quantity <= i.reorder_level).length;
  const outOfStockCount = inventory.filter(i => i.quantity === 0).length;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <PageHeader 
        title="Inventory Tracking" 
        description="Track and manage stock levels, unit thresholds, and reorder levels across all regional hubs"
        actions={
          <div className="flex items-center gap-2.5">
            <Button 
              variant="secondary" 
              onClick={openRestockModal} 
              disabled={warehouses.length === 0 || products.length === 0}
              className="border-emerald-600/30 text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100/90 shadow-xs"
            >
              <Sparkles className="w-4 h-4 mr-2 text-emerald-600" /> Restock Allocation (DAA)
            </Button>
            <Button onClick={() => openModal()} disabled={warehouses.length === 0 || products.length === 0}>
              <Plus className="w-4 h-4 mr-2"/> Adjust Stock
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-brand-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">Total Tracked Items</span>
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-brand-text mt-1.5 tracking-tight font-sans">{inventory.length}</p>
          <span className="text-[11px] text-brand-text-secondary/80 mt-1 block">Active SKU-warehouse pairs</span>
        </Card>

        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Low Stock Alerts</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100/80 flex items-center justify-center text-amber-700">
              <Filter className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-700 mt-1.5 tracking-tight font-sans">{lowStockCount}</p>
          <span className="text-[11px] text-amber-700/80 mt-1 block">At or below reorder threshold</span>
        </Card>

        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Out of Stock</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100/80 flex items-center justify-center text-rose-700">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-700 mt-1.5 tracking-tight font-sans">{outOfStockCount}</p>
          <span className="text-[11px] text-rose-700/80 mt-1 block">Zero inventory available</span>
        </Card>
      </div>

      <Card variant="dense" noPadding className="overflow-hidden shadow-soft-sm">
        <div className="p-4 sm:p-5 border-b border-brand-border/80 flex flex-col md:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-md">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
            <Input 
              placeholder="Search by product name or SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex w-full md:w-auto gap-3 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-text-secondary hidden sm:block" />
              <select 
                value={filterWarehouse}
                onChange={e => setFilterWarehouse(e.target.value)}
                className="bg-white/85 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
              >
                <option value="all">All Warehouses ({warehouses.length})</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white/85 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
            >
              <option value="all">All Stock Statuses</option>
              <option value="ok">In Stock</option>
              <option value="low">Low Stock ({lowStockCount})</option>
              <option value="out">Out of Stock ({outOfStockCount})</option>
            </select>

            {(search || filterWarehouse !== 'all' || filterStatus !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setFilterWarehouse('all'); setFilterStatus('all'); }}
                className="text-xs text-brand-text-secondary hover:text-brand-text"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-sm text-brand-text-secondary">Loading inventory records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-brand-text-secondary flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-surface/60 flex items-center justify-center mb-3">
              <Box className="w-8 h-8 opacity-40 text-brand-primary" />
            </div>
            <h4 className="font-bold text-brand-text text-base">No inventory records found</h4>
            <p className="text-xs text-brand-text-secondary mt-1 max-w-sm">
              {search || filterWarehouse !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search query or warehouse filter.'
                : 'Get started by configuring initial warehouse stock levels.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-brand-surface/70 border-b border-brand-border/80">
                <tr className="text-xs uppercase tracking-wider font-semibold text-brand-text-secondary">
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">SKU</th>
                  <th className="px-5 py-3.5">Warehouse Hub</th>
                  <th className="px-5 py-3.5 text-right">Quantity</th>
                  <th className="px-5 py-3.5 text-right">Reorder Level</th>
                  <th className="px-5 py-3.5">Status & Stock Gauge</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 bg-white/40">
                {filtered.map(item => {
                  const percent = item.reorder_level > 0 
                    ? Math.min(100, Math.round((item.quantity / (item.reorder_level * 2)) * 100))
                    : 100;
                  const barColor = item.quantity === 0 
                    ? 'bg-rose-500' 
                    : item.quantity <= item.reorder_level 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-500';

                  return (
                    <tr key={item.id} className="hover:bg-brand-soft/30 transition-colors group">
                      <td className="px-5 py-3.5 font-semibold text-brand-text">
                        <div className="font-bold">{item.product?.name}</div>
                        {item.product?.category && (
                          <span className="text-[11px] text-brand-text-secondary">{item.product.category}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-brand-text group-hover:text-brand-primary transition-colors">
                        <span className="bg-brand-surface/80 border border-brand-border/80 px-2 py-0.5 rounded-md">
                          {item.product?.sku}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-brand-text-secondary font-medium">
                        <div>{item.warehouse?.name}</div>
                        {item.warehouse?.code && (
                          <span className="font-mono text-[10px] text-brand-primary font-bold">{item.warehouse.code}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-brand-text text-base">
                        {item.quantity}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-brand-text-secondary">
                        {item.reorder_level}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1.5">
                          {getStatusBadge(item.quantity, item.reorder_level)}
                          <div className="w-24 bg-brand-surface/80 rounded-full h-1.5 overflow-hidden border border-brand-border/60">
                            <div 
                              className={`h-full ${barColor} rounded-full transition-all duration-300`} 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button variant="outline" size="sm" onClick={() => openModal(item)} className="shadow-xs hover:shadow-glass">
                          <Edit2 className="w-3.5 h-3.5 mr-1 text-brand-primary" /> Adjust
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <Card variant="modal" noPadding className="w-full max-w-md rounded-2xl overflow-hidden border border-white/80 shadow-[0_20px_50px_rgba(19,59,45,0.18)]">
            <div className="p-5 border-b border-brand-border/70 bg-white/85 backdrop-blur-md flex items-center justify-between">
              <h3 className="text-base font-bold text-brand-text font-sans">{editingItem ? 'Adjust Stock Quantity' : 'Add Inventory Record'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-lg bg-white/80 hover:bg-white border border-brand-border/70 flex items-center justify-center text-brand-text-secondary hover:text-brand-text shadow-soft-xs active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">{error}</div>}
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">Warehouse Hub</label>
                <select 
                  className="w-full bg-white/90 border border-brand-border/90 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-brand-primary/10 text-brand-text shadow-soft-inset disabled:bg-brand-surface/70"
                  value={formData.warehouse_id} 
                  onChange={e => setFormData({...formData, warehouse_id: e.target.value})}
                  disabled={!!editingItem}
                  required
                >
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">Product SKU</label>
                <select 
                  className="w-full bg-white/90 border border-brand-border/90 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-brand-primary/10 text-brand-text shadow-soft-inset disabled:bg-brand-surface/70"
                  value={formData.product_id} 
                  onChange={e => setFormData({...formData, product_id: e.target.value})}
                  disabled={!!editingItem}
                  required
                >
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Input label="Quantity *" type="number" min="0" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} />
                  {editingItem && <p className="text-[11px] text-brand-text-secondary">Sets absolute units count.</p>}
                </div>
                
                <div className="space-y-1.5">
                  <Input label="Reorder Level *" type="number" min="0" required value={formData.reorder_level} onChange={e => setFormData({...formData, reorder_level: parseInt(e.target.value) || 0})} />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-brand-border/60">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary">{editingItem ? 'Save Stock' : 'Add Record'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Restock Allocation Modal (DAA Bin Packing) */}
      {isRestockModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <Card variant="modal" noPadding className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-soft-lg">
            <div className="p-5 border-b border-brand-border/80 sticky top-0 bg-brand-surface/80 backdrop-blur-md z-10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-brand-text">Restock Allocation Optimizer</h3>
                  <p className="text-xs text-brand-text-secondary">First Fit Decreasing (FFD) Bin Packing across warehouse capacities</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRestockModalOpen(false)} 
                className="w-8 h-8 rounded-lg bg-brand-surface/80 hover:bg-brand-surface border border-brand-border/60 flex items-center justify-center text-brand-text-secondary hover:text-brand-text transition-all active:scale-95"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {restockError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{restockError}</span>
                </div>
              )}

              {restockSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{restockSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCalculateRestockAllocation} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">Incoming Product SKU *</label>
                    <select 
                      className="w-full bg-white/90 border border-brand-border/90 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-brand-primary/10 text-brand-text shadow-soft-inset"
                      value={restockProductId} 
                      onChange={e => setRestockProductId(e.target.value)}
                      required
                    >
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Input 
                      label="Incoming Shipment Quantity *" 
                      type="number" 
                      min="1" 
                      required 
                      value={restockQuantity} 
                      onChange={e => setRestockQuantity(e.target.value === '' ? '' : parseInt(e.target.value))} 
                      placeholder="e.g. 500" 
                    />
                    <p className="text-[11px] text-brand-text-muted">Total units arriving for warehouse placement.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    loading={optimizingRestock}
                    disabled={products.length === 0}
                    className="flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" /> Calculate Optimal Allocation
                  </Button>
                </div>
              </form>

              {/* Proposed Allocation Review Section */}
              {restockProposal && (
                <div className="border border-brand-border/80 rounded-xl p-5 bg-brand-surface/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-brand-border/60">
                    <div>
                      <h4 className="text-sm font-bold text-brand-text flex items-center gap-2">
                        <Layers className="w-4 h-4 text-brand-primary" />
                        Proposed Allocation Plan
                      </h4>
                      <p className="text-xs text-brand-text-secondary mt-0.5">
                        Solver: <span className="font-semibold text-brand-text">{restockProposal.algorithmName}</span> ({restockProposal.executionTimeMs} ms)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={restockProposal.unallocatedQuantity === 0 ? 'success' : 'warning'}>
                        {restockProposal.totalAllocated} / {restockProposal.totalRequested} Allocated
                      </Badge>
                    </div>
                  </div>

                  {restockProposal.unallocatedQuantity > 0 && (
                    <div className="p-3 bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <span className="font-bold">Capacity Overflow Warning: </span>
                        {restockProposal.unallocatedQuantity} units could not be accommodated across active warehouse facilities. Remaining capacity across all hubs has been saturated.
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider block">Warehouse Breakdown</span>
                    <div className="grid grid-cols-1 gap-2.5">
                      {restockProposal.allocations.map(a => (
                        <div key={a.warehouseId} className="p-3.5 bg-white rounded-xl border border-brand-border/70 flex items-center justify-between gap-3 shadow-soft-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-brand-text">{a.warehouseName}</span>
                              <span className="text-[11px] font-mono text-brand-primary bg-brand-surface px-1.5 py-0.5 rounded font-bold">{a.warehouseCode}</span>
                            </div>
                            <p className="text-xs text-brand-text-secondary mt-1">
                              Room before: <span className="font-semibold">{a.initialAvailableCapacity}</span> units · Remaining after: <span className="font-semibold">{a.remainingCapacity}</span> units
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs text-brand-text-muted block">To Allocate</span>
                            <span className="text-base font-extrabold text-emerald-700">+{a.allocatedQuantity} units</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-brand-border/60 flex items-center justify-between">
                    <p className="text-xs text-brand-text-muted">
                      Review proposed allocation. Click below to apply stock directly to inventory.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="primary" 
                        onClick={handleApplyRestockAllocation}
                        loading={applyingAllocation}
                        disabled={restockProposal.totalAllocated === 0}
                        className="bg-emerald-700 hover:bg-emerald-800"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirm & Apply to Inventory
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
