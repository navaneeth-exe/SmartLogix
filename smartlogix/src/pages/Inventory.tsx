import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

import { api } from '../services/api';
import type { Inventory, Product, Warehouse } from '../types/database.types';
import { Search, Plus, Edit2, Box, Filter } from 'lucide-react';

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
          <Button onClick={() => openModal()} disabled={warehouses.length === 0 || products.length === 0}>
            <Plus className="w-4 h-4 mr-2"/> Adjust Stock
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-brand-primary">
          <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">Total Tracked Items</span>
          <p className="text-3xl font-extrabold text-brand-text mt-1.5 tracking-tight font-sans">{inventory.length}</p>
          <span className="text-[11px] text-brand-text-secondary/80 mt-1 block">Active SKU-warehouse pairs</span>
        </Card>
        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Low Stock Alerts</span>
          <p className="text-3xl font-extrabold text-amber-600 mt-1.5 tracking-tight font-sans">{lowStockCount}</p>
          <span className="text-[11px] text-amber-700/80 mt-1 block">At or below reorder threshold</span>
        </Card>
        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-rose-500">
          <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Out of Stock</span>
          <p className="text-3xl font-extrabold text-rose-600 mt-1.5 tracking-tight font-sans">{outOfStockCount}</p>
          <span className="text-[11px] text-rose-700/80 mt-1 block">Zero inventory available</span>
        </Card>
      </div>

      <Card variant="dense" noPadding className="overflow-hidden shadow-soft-sm">
        <div className="p-4 sm:p-5 border-b border-brand-border/80 flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-xs">
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
                className="bg-white/90 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/10"
              >
                <option value="all">All Warehouses</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white/90 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/10"
            >
              <option value="all">All Statuses</option>
              <option value="ok">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-sm text-brand-text-secondary">Loading inventory records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-brand-text-secondary flex flex-col items-center">
            <Box className="w-12 h-12 mb-3 opacity-40 text-brand-primary" />
            <p className="text-sm font-medium">No inventory records found for these filters.</p>
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
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 bg-white/40">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-brand-soft/30 transition-colors group">
                    <td className="px-5 py-3.5 font-semibold text-brand-text">{item.product?.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-brand-text group-hover:text-brand-primary transition-colors">{item.product?.sku}</td>
                    <td className="px-5 py-3.5 text-xs text-brand-text-secondary">{item.warehouse?.name}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-brand-text">{item.quantity}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-brand-text-secondary">{item.reorder_level}</td>
                    <td className="px-5 py-3.5">
                      {getStatusBadge(item.quantity, item.reorder_level)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button variant="outline" size="sm" onClick={() => openModal(item)}>
                        <Edit2 className="w-3.5 h-3.5 mr-1 text-brand-primary" /> Adjust
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card variant="dense" noPadding className="w-full max-w-md shadow-2xl rounded-2xl overflow-hidden border border-brand-border/90 bg-white">
            <div className="p-5 border-b border-brand-border/80 bg-brand-surface/40 flex items-center justify-between">
              <h3 className="text-base font-bold text-brand-text">{editingItem ? 'Adjust Stock Quantity' : 'Add Inventory Record'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-brand-text-secondary hover:text-brand-text">
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
    </div>
  );
};
