import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { 
  Product, 
  DeliveryLocation, 
  Warehouse, 
  Inventory, 
  OrderPriority 
} from '../types/database.types';
import { 
  ShoppingCart, ArrowLeft, Plus, Trash2, AlertCircle, 
  CheckCircle2, Info, Building2, Package, Layers
} from 'lucide-react';

interface SelectedItem {
  product_id: string;
  quantity: number;
}

export const CreateOrder = () => {
  const navigate = useNavigate();

  // Data sources
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventoryList, setInventoryList] = useState<Inventory[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form Fields
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [priority, setPriority] = useState<OrderPriority>('MEDIUM');
  const [items, setItems] = useState<SelectedItem[]>([]);

  // Item selector staging
  const [stagingProductId, setStagingProductId] = useState('');
  const [stagingQty, setStagingQty] = useState(1);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingInitial(true);
      const [locs, prods, whs, inv] = await Promise.all([
        api.locations.getActive(),
        api.products.list(),
        api.warehouses.list(),
        api.inventory.list()
      ]);

      setLocations(locs);
      setProducts(prods);
      setWarehouses(whs);
      setInventoryList(inv);

      if (locs.length > 0) {
        setSelectedLocationId(locs[0].id);
      }
      if (prods.length > 0) {
        setStagingProductId(prods[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize order creation form.');
    } finally {
      setLoadingInitial(false);
    }
  };

  // Helper to compute available stock for a product
  const getProductStock = (productId: string, warehouseId?: string) => {
    if (warehouseId) {
      const record = inventoryList.find(i => i.product_id === productId && i.warehouse_id === warehouseId);
      return record ? record.quantity : 0;
    }
    // Sum across all warehouses
    return inventoryList
      .filter(i => i.product_id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Add staging item to items list
  const handleAddItem = () => {
    setError('');
    if (!stagingProductId) {
      setError('Please select a product.');
      return;
    }
    if (stagingQty <= 0 || !Number.isInteger(stagingQty)) {
      setError('Quantity must be a positive integer.');
      return;
    }

    const available = getProductStock(stagingProductId, selectedWarehouseId || undefined);
    const existingIndex = items.findIndex(i => i.product_id === stagingProductId);
    const totalQtyRequested = existingIndex > -1 ? items[existingIndex].quantity + stagingQty : stagingQty;

    if (totalQtyRequested > available) {
      const prod = products.find(p => p.id === stagingProductId);
      setError(`Cannot add ${stagingQty} units. Total requested (${totalQtyRequested}) exceeds available stock (${available}) for "${prod?.name}".`);
      return;
    }

    if (existingIndex > -1) {
      // Merge quantity
      const updated = [...items];
      updated[existingIndex].quantity += stagingQty;
      setItems(updated);
    } else {
      setItems([...items, { product_id: stagingProductId, quantity: stagingQty }]);
    }

    // Reset staging quantity
    setStagingQty(1);
  };

  const handleUpdateItemQty = (productId: string, newQty: number) => {
    setError('');
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const available = getProductStock(productId, selectedWarehouseId || undefined);
    if (newQty > available) {
      const prod = products.find(p => p.id === productId);
      setError(`Quantity (${newQty}) exceeds available stock (${available}) for "${prod?.name}".`);
      return;
    }

    setItems(items.map(item => item.product_id === productId ? { ...item, quantity: newQty } : item));
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter(item => item.product_id !== productId));
  };

  // Calculations for order preview
  const stagingProduct = products.find(p => p.id === stagingProductId);
  const stagingAvailableStock = stagingProductId ? getProductStock(stagingProductId, selectedWarehouseId || undefined) : 0;

  const totalDistinctItems = items.length;
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const estimatedSubtotal = items.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.product_id);
    return sum + (prod ? prod.unit_price * item.quantity : 0);
  }, 0);

  // Check if any added item exceeds stock
  const stockErrors: string[] = [];
  items.forEach(item => {
    const available = getProductStock(item.product_id, selectedWarehouseId || undefined);
    if (item.quantity > available) {
      const prod = products.find(p => p.id === item.product_id);
      stockErrors.push(`"${prod?.name || 'Product'}": requested ${item.quantity}, available ${available}`);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedLocationId) {
      setError('Please select an active delivery destination.');
      return;
    }

    if (items.length === 0) {
      setError('Order must contain at least one item.');
      return;
    }

    if (stockErrors.length > 0) {
      setError(`Cannot submit order due to insufficient stock:\n${stockErrors.join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.orders.create({
        delivery_location_id: selectedLocationId,
        priority,
        warehouse_id: selectedWarehouseId || undefined,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
      });

      setSuccessResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-brand-text-secondary">Loading order preparation data...</div>
      </div>
    );
  }

  // Success Confirmation Screen
  if (successResult) {
    const orderData = successResult.order || successResult;
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="p-8 text-center border-emerald-200 bg-white">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-brand-text">Order Created Successfully!</h2>
          <p className="text-brand-text-secondary mt-1">
            Order has been placed in <span className="font-semibold text-brand-primary">PENDING</span> status and recorded in the database.
          </p>

          <div className="my-6 p-4 bg-brand-surface rounded-xl border border-brand-border inline-block text-left w-full max-w-md">
            <div className="flex justify-between py-1.5 border-b border-brand-border/60 text-sm">
              <span className="text-brand-text-secondary">Order Number:</span>
              <span className="font-mono font-bold text-brand-text">{orderData.order_number}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-brand-border/60 text-sm">
              <span className="text-brand-text-secondary">Status:</span>
              <Badge variant="warning">{orderData.status}</Badge>
            </div>
            <div className="flex justify-between py-1.5 border-b border-brand-border/60 text-sm">
              <span className="text-brand-text-secondary">Priority:</span>
              <span className="font-semibold text-brand-text">{orderData.priority}</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-brand-text-secondary">Total Amount:</span>
              <span className="font-bold text-emerald-600">${Number(orderData.total_amount).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => { setSuccessResult(null); setItems([]); }}>
              Create Another Order
            </Button>
            <Button variant="primary" onClick={() => navigate('/orders')}>
              View Orders List
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/orders" className="p-2 rounded-lg bg-brand-surface border border-brand-border text-brand-text hover:bg-brand-card transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Create New Order</h1>
          <p className="text-sm text-brand-text-secondary">
            Configure destination, line items, and validate stock availability
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="whitespace-pre-line">{error}</div>
        </div>
      )}

      {locations.length === 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>No active delivery locations found. Please activate or add a location before placing orders.</span>
          </div>
          <Link to="/locations" className="text-amber-800 font-bold underline ml-4">
            Manage Locations
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Details & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Order Destination & Settings */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-primary" />
              1. Delivery Destination & Settings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-brand-text">Delivery Location *</label>
                <select
                  required
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-brand-text"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.address ? `(${loc.address})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-brand-text-secondary">
                  Only verified, active delivery locations are displayed.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-brand-text">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as OrderPriority)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-brand-text"
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority (Standard)</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Express</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-brand-text">Stock Validation Scope</label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-brand-text"
                >
                  <option value="">All Warehouses (Network-Wide Stock)</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
                <p className="text-xs text-brand-text-secondary">
                  Checks stock against selected warehouse or entire network.
                </p>
              </div>
            </div>
          </Card>

          {/* Section 2: Order Items */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-primary" />
              2. Add Products to Order
            </h3>

            {/* Product selection bar */}
            <div className="p-4 bg-brand-surface rounded-xl border border-brand-border mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6 space-y-1">
                  <label className="text-xs font-semibold text-brand-text">Select Product</label>
                  <select
                    value={stagingProductId}
                    onChange={(e) => setStagingProductId(e.target.value)}
                    className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-brand-text"
                  >
                    {products.map(p => {
                      const avail = getProductStock(p.id, selectedWarehouseId || undefined);
                      return (
                        <option key={p.id} value={p.id} disabled={avail === 0}>
                          {p.name} — ${p.unit_price.toFixed(2)} ({avail > 0 ? `${avail} in stock` : 'Out of stock'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <label className="text-xs font-semibold text-brand-text">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={stagingQty}
                    onChange={(e) => setStagingQty(parseInt(e.target.value) || 1)}
                    className="bg-brand-card"
                  />
                </div>

                <div className="sm:col-span-3">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddItem}
                    disabled={stagingAvailableStock <= 0}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                </div>
              </div>

              {stagingProduct && (
                <div className="mt-3 flex items-center justify-between text-xs text-brand-text-secondary pt-2 border-t border-brand-border/50">
                  <span>Unit Price: <strong className="text-brand-text">${stagingProduct.unit_price.toFixed(2)}</strong></span>
                  <span>
                    Stock Available:{' '}
                    <strong className={stagingAvailableStock > 0 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                      {stagingAvailableStock} units
                    </strong>
                  </span>
                  <span>Line Est: <strong className="text-brand-text">${(stagingProduct.unit_price * (stagingQty || 0)).toFixed(2)}</strong></span>
                </div>
              )}
            </div>

            {/* Items List Table */}
            {items.length === 0 ? (
              <div className="p-8 text-center text-brand-text-secondary border-2 border-dashed border-brand-border rounded-xl">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No items added to this order yet.</p>
                <p className="text-xs text-brand-text-secondary mt-1">Select products and quantities above to populate order.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-brand-surface border-b border-brand-border text-xs text-brand-text-secondary">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-right">Available Stock</th>
                      <th className="px-4 py-3 text-center">Quantity</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {items.map(item => {
                      const prod = products.find(p => p.id === item.product_id);
                      const available = getProductStock(item.product_id, selectedWarehouseId || undefined);
                      const hasStockError = item.quantity > available;
                      const lineTotal = (prod ? prod.unit_price * item.quantity : 0);

                      return (
                        <tr key={item.product_id} className={`hover:bg-brand-surface/40 ${hasStockError ? 'bg-red-50/60' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-brand-text">{prod?.name || 'Unknown Product'}</div>
                            <div className="text-xs font-mono text-brand-text-secondary">{prod?.sku}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant={available >= item.quantity ? 'success' : 'danger'}>
                              {available} units
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItemQty(item.product_id, parseInt(e.target.value) || 0)}
                              className="w-20 text-center bg-brand-surface border border-brand-border rounded px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-brand-text-secondary">
                            ${prod?.unit_price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-brand-text">
                            ${lineTotal.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.product_id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Order Summary & Review */}
        <div className="space-y-6">
          <Card className="p-6 sticky top-6">
            <h3 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-primary" />
              Order Summary
            </h3>

            <div className="space-y-3 pb-4 border-b border-brand-border text-sm">
              <div className="flex justify-between">
                <span className="text-brand-text-secondary">Distinct Products:</span>
                <span className="font-semibold text-brand-text">{totalDistinctItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text-secondary">Total Quantity:</span>
                <span className="font-semibold text-brand-text">{totalItemCount} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text-secondary">Priority Level:</span>
                <span className="font-semibold text-brand-text">{priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text-secondary">Destination:</span>
                <span className="font-medium text-brand-text text-right truncate max-w-[180px]">
                  {locations.find(l => l.id === selectedLocationId)?.name || 'None selected'}
                </span>
              </div>
            </div>

            <div className="py-4 border-b border-brand-border">
              <div className="flex justify-between items-baseline">
                <span className="text-base font-bold text-brand-text">Estimated Total:</span>
                <span className="text-2xl font-black text-brand-primary">
                  ${estimatedSubtotal.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-brand-text-secondary mt-1">
                Final total is verified and locked in atomically by PostgreSQL RPC.
              </p>
            </div>

            {/* Inventory Status Note */}
            <div className="my-4 p-3 bg-brand-surface rounded-lg border border-brand-border/60 text-xs text-brand-text-secondary space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-brand-text">
                <Info className="w-3.5 h-3.5 text-brand-primary" />
                <span>Inventory Verification Policy</span>
              </div>
              <p>
                Order creation checks active stock levels across the inventory network. Actual physical stock deduction occurs during dispatch planning (Phase 6).
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              disabled={submitting || items.length === 0 || stockErrors.length > 0 || locations.length === 0}
            >
              {submitting ? 'Placing Order...' : 'Confirm & Place Order'}
            </Button>

            {stockErrors.length > 0 && (
              <p className="text-xs text-red-600 mt-2 font-medium text-center">
                Resolve stock deficits above before submitting.
              </p>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
};
