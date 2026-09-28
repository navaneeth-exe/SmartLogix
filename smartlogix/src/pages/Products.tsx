import { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { Product } from '../types/database.types';
import { Search, Plus, Edit2, PackageOpen } from 'lucide-react';

export const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({ sku: '', name: '', description: '', category: '', unit_price: 0 });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.products.list();
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openModal = (prod: Product | null = null) => {
    setError('');
    if (prod) {
      setEditingProduct(prod);
      setFormData({ sku: prod.sku, name: prod.name, description: prod.description || '', category: prod.category || '', unit_price: prod.unit_price });
    } else {
      setEditingProduct(null);
      setFormData({ sku: '', name: '', description: '', category: '', unit_price: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.sku || !formData.name || formData.unit_price < 0) {
      setError('Please fill in required fields correctly. Price must be >= 0.');
      return;
    }

    try {
      if (editingProduct) {
        await api.products.update(editingProduct.id, formData);
      } else {
        await api.products.create(formData);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    }
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <PageHeader 
        title="Products" 
        description="Manage product catalog, SKUs, and pricing"
        actions={<Button onClick={() => openModal()}><Plus className="w-4 h-4 mr-2"/> Add Product</Button>}
      />

      <Card className="mt-6">
        <div className="p-4 border-b border-brand-border flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
            <Input 
              placeholder="Search by name or SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-brand-text-secondary">Loading products...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-brand-text-secondary flex flex-col items-center">
            <PackageOpen className="w-12 h-12 mb-4 opacity-50" />
            <p>No products found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-surface border-b border-brand-border">
                <tr>
                  <th className="px-4 py-3 font-medium text-brand-text-secondary">SKU</th>
                  <th className="px-4 py-3 font-medium text-brand-text-secondary">Name</th>
                  <th className="px-4 py-3 font-medium text-brand-text-secondary">Category</th>
                  <th className="px-4 py-3 font-medium text-brand-text-secondary">Price</th>
                  <th className="px-4 py-3 font-medium text-brand-text-secondary text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filtered.map(product => (
                  <tr key={product.id} className="hover:bg-brand-surface/50">
                    <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                    <td className="px-4 py-3 font-medium text-brand-text">{product.name}</td>
                    <td className="px-4 py-3"><Badge variant="default">{product.category || 'Uncategorized'}</Badge></td>
                    <td className="px-4 py-3 font-medium"></td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" onClick={() => openModal(product)}>
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
              <h3 className="text-lg font-bold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">SKU *</label>
                <Input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Product Name *</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit Price ($) *</label>
                <Input type="number" step="0.01" min="0" required value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: parseFloat(e.target.value)})} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea 
                  className="w-full rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary">{editingProduct ? 'Save Changes' : 'Create Product'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
