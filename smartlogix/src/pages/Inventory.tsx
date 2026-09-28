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
    <div className="p-8">
      <PageHeader 
        title="Inventory" 
        description="Track and manage stock levels across all locations"
        actions={
          <Button onClick={() => openModal()} disabled={warehouses.length === 0 || products.length === 0}>
            <Plus className="w-4 h-4 mr-2"/> Adjust Stock
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
         <Card className="p-6 border-l-4 border-l-brand-primary">
            <h4 className="text-brand-text-secondary text-sm font-medium">Total Tracked Items</h4>
            <p className="text-3xl font-bold mt-2">{inventory.length}</p>
         </Card>
         <Card className="p-6 border-l-4 border-l-yellow-500">
            <h4 className="text-brand-text-secondary text-sm font-medium">Low Stock Alerts</h4>
            <p className="text-3xl font-bold mt-2 text-yellow-600">{lowStockCount}</p>
         </Card>
         <Card className="p-6 border-l-4 border-l-red-500">
            <h4 className="text-brand-text-secondary text-sm font-medium">Out of Stock</h4>
            <p className="text-3xl font-bold mt-2 text-red-600">{outOfStockCount}</p>
         </Card>
      </div>

      <Card className="mt-6">
        <div className="p-4 border-b border-brand-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
            <Input 
              placeholder="Search by product name or SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex w-full md:w-auto gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-text-secondary hidden sm:block" />
              <select 
                value={filterWarehouse}
                onChange={e => setFilterWarehouse(e.target.value)}
                className="bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
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
              className="bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
            >
              <option value="all">All Statuses</option>
              <option value="ok">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-brand-text-secondary">Loading inventory...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-brand-text-secondary flex flex-col items-center">
            <Box className="w-12 h-12 mb-4 opacity-50" />
            <p>No inventory records found for these filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-surface border-b border-brand-border">
                <tr>
                  <th className="px-4 py-3 font-medium text-brand-text-secondary">Product</th>
                  <th className="px-4 py-3 font-medium text-brand-text-secondary">SKU</th>
                  <th className="px-4 py-3 font-medium text-brand-text-secondary">Warehouse</th>
                  <th className="px-4 py-3 font-medium text-brand-text-secondary text-right">Quantity</th>
                  <th className="px-4 py-3 font-medium text-brand-text-secondary text-right">Reorder Level</th>
                  <th className="px-4 py-3 font-medium text-brand-text-secondary">Status</th>
                  <th className="px-4 py-3 font-medium text-brand-text-secondary text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-brand-surface/50">
                    <td className="px-4 py-3 font-medium text-brand-text">{item.product?.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.product?.sku}</td>
                    <td className="px-4 py-3">{item.warehouse?.name}</td>
                    <td className="px-4 py-3 text-right font-medium">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-brand-text-secondary">{item.reorder_level}</td>
                    <td className="px-4 py-3">
                      {getStatusBadge(item.quantity, item.reorder_level)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => openModal(item)}>
                        <Edit2 className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-glass rounded-2xl">
            <div className="p-6 border-b border-brand-border">
              <h3 className="text-lg font-bold">{editingItem ? 'Update Stock' : 'Add Stock Record'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Warehouse</label>
                <select 
                  className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  value={formData.warehouse_id} 
                  onChange={e => setFormData({...formData, warehouse_id: e.target.value})}
                  disabled={!!editingItem} // Cannot change warehouse once created
                  required
                >
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Product</label>
                <select 
                  className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  value={formData.product_id} 
                  onChange={e => setFormData({...formData, product_id: e.target.value})}
                  disabled={!!editingItem} // Cannot change product once created
                  required
                >
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity *</label>
                  <Input type="number" min="0" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} />
                  {editingItem && <p className="text-xs text-brand-text-secondary mt-1">Sets absolute stock quantity.</p>}
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reorder Level *</label>
                  <Input type="number" min="0" required value={formData.reorder_level} onChange={e => setFormData({...formData, reorder_level: parseInt(e.target.value) || 0})} />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
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
