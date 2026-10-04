import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { Product } from '../types/database.types';
import { Search, Plus, Edit2, PackageOpen, Package, Layers, DollarSign, Filter, RefreshCw } from 'lucide-react';

export const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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

  // Derive categories and metrics from real products data
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category?.trim() || 'General'));
    return ['all', ...Array.from(cats).sort()];
  }, [products]);

  const metrics = useMemo(() => {
    const totalCount = products.length;
    const uniqueCatsCount = new Set(products.map(p => p.category?.trim() || 'General')).size;
    const avgPrice = totalCount > 0 
      ? (products.reduce((acc, p) => acc + Number(p.unit_price || 0), 0) / totalCount).toFixed(2)
      : '0.00';
    return { totalCount, uniqueCatsCount, avgPrice };
  }, [products]);

  const filtered = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || (p.category?.trim() || 'General') === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      <PageHeader 
        title="Products Catalog" 
        description="Manage product catalog, SKUs, and pricing across distribution networks"
        actions={
          <Button onClick={() => openModal()} className="flex items-center gap-2">
            <Plus className="w-4 h-4"/>
            <span>Add Product</span>
          </Button>
        }
      />

      {/* Product Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-brand-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">Catalog SKUs</span>
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-brand-text mt-1.5 tracking-tight font-sans">{metrics.totalCount}</p>
          <span className="text-[11px] text-brand-text-secondary/80 mt-1 block">Active distinct master SKUs</span>
        </Card>

        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Product Categories</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 mt-1.5 tracking-tight font-sans">{metrics.uniqueCatsCount}</p>
          <span className="text-[11px] text-emerald-700/80 mt-1 block">Active merchandise segments</span>
        </Card>

        <Card variant="glass" hoverable className="p-5 sm:p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Avg Unit Price</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100/80 flex items-center justify-center text-amber-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-700 mt-1.5 tracking-tight font-mono">${metrics.avgPrice}</p>
          <span className="text-[11px] text-amber-700/80 mt-1 block">Standard catalog pricing</span>
        </Card>
      </div>

      {/* Product Catalog & Packaging Showcase Banner */}
      <div className="soft-card rounded-2xl p-5 sm:p-6 relative overflow-hidden border border-brand-border/80 shadow-soft-sm bg-gradient-to-r from-white/90 via-white/80 to-emerald-50/40">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="max-w-xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Merchandise & Packaging Standard
              </span>
              <span className="text-[11px] text-brand-text-secondary">SKU-Calibrated Lot Sizing</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-brand-text tracking-tight">
              Standardized Distribution Catalog & Eco-Packaging
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
              Every master product SKU in SmartLogix is mapped with unit weights and standard packaging dimensions, ensuring accurate volumetric load balancing during vehicle dispatch and automated restocking.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-surface/80 border border-brand-border/60 text-brand-text font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Eco-Forest Cartons
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-surface/80 border border-brand-border/60 text-brand-text font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Automated QR Serialization
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-surface/80 border border-brand-border/60 text-brand-text font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Multi-Depot Storage Sizing
              </span>
            </div>
          </div>

          <div className="w-full md:w-64 h-36 md:h-40 rounded-xl overflow-hidden soft-inset p-1.5 flex-shrink-0 shadow-soft-sm bg-white/60">
            <img 
              src="/images/smartlogix/package-cluster.jpg" 
              alt="Standardized sustainable packaged inventory cartons ready for dispatch" 
              loading="lazy"
              className="w-full h-full object-cover rounded-lg hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card variant="dense" noPadding className="overflow-hidden shadow-soft-sm">
        <div className="p-4 sm:p-5 border-b border-brand-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-md">
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
            <Input 
              placeholder="Search by name, SKU, or description..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex w-full sm:w-auto items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-brand-text-secondary hidden sm:block" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto bg-white/85 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {(search || selectedCategory !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setSelectedCategory('all'); }}
                className="text-xs text-brand-text-secondary hover:text-brand-text"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-brand-text-secondary flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
            <span className="text-sm font-medium">Loading products catalog...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-brand-text-secondary flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-surface/60 flex items-center justify-center mb-3">
              <PackageOpen className="w-8 h-8 opacity-40 text-brand-primary" />
            </div>
            <h4 className="font-bold text-brand-text text-base">No products found</h4>
            <p className="text-xs text-brand-text-secondary mt-1 max-w-sm">
              {search || selectedCategory !== 'all' 
                ? 'Try adjusting your search criteria or resetting filters.' 
                : 'Get started by creating your first product SKU.'}
            </p>
            {(!search && selectedCategory === 'all') && (
              <Button onClick={() => openModal()} size="sm" className="mt-4">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-brand-surface/70 border-b border-brand-border/80">
                <tr className="text-xs uppercase tracking-wider font-semibold text-brand-text-secondary">
                  <th className="px-5 py-3.5">SKU</th>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Unit Price</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 bg-white/40">
                {filtered.map(product => (
                  <tr key={product.id} className="hover:bg-brand-soft/30 transition-colors group">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-brand-text group-hover:text-brand-primary transition-colors">
                      <span className="bg-brand-surface/80 border border-brand-border/80 px-2 py-0.5 rounded-md">
                        {product.sku}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-brand-text">
                      <div className="text-sm font-bold text-brand-text">{product.name}</div>
                      {product.description && <div className="text-xs text-brand-text-secondary font-normal truncate max-w-xs">{product.description}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-brand-text-secondary">
                      <Badge variant="sage">{product.category || 'General'}</Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-text">
                      ${Number(product.unit_price).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button variant="outline" size="sm" onClick={() => openModal(product)} className="shadow-xs hover:shadow-glass">
                        <Edit2 className="w-3.5 h-3.5 mr-1 text-brand-primary" /> Edit
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
        <div className="fixed inset-0 bg-black/35 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <Card variant="modal" noPadding className="w-full max-w-md rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-brand-border/80 bg-brand-surface/40 flex items-center justify-between">
              <h3 className="text-lg font-bold text-brand-text">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-brand-surface/80 hover:bg-brand-surface border border-brand-border/60 flex items-center justify-center text-brand-text-secondary hover:text-brand-text transition-all active:scale-95"
              >
                ✕
              </button>
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
