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
  OrderPriority,
  FulfillmentRecommendation,
  WarehouseFulfillmentCandidate
} from '../types/database.types';
import { 
  ShoppingCart, ArrowLeft, Plus, Trash2, AlertCircle, 
  CheckCircle2, Info, Building2, Package, Layers,
  Navigation, Sparkles, Check, RefreshCw
} from 'lucide-react';
import { solveDijkstra } from '../algorithms/dijkstra';

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

  // Phase 3: Warehouse Fulfillment Recommendation (Dijkstra)
  const [calculatingRecommendation, setCalculatingRecommendation] = useState(false);
  const [fulfillmentRecommendation, setFulfillmentRecommendation] = useState<FulfillmentRecommendation | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [showRecommendationPanel, setShowRecommendationPanel] = useState(false);

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

  // Phase 3: Calculate Warehouse Fulfillment Recommendation via Dijkstra Shortest Path
  const handleCalculateRecommendation = async () => {
    setRecommendationError(null);
    if (!selectedLocationId) {
      setRecommendationError('Please select a delivery destination first.');
      setShowRecommendationPanel(true);
      return;
    }

    if (items.length === 0) {
      setRecommendationError('Please add at least one line item to the order to evaluate warehouse stock.');
      setShowRecommendationPanel(true);
      return;
    }

    const destLocation = locations.find(l => l.id === selectedLocationId);
    if (!destLocation) {
      setRecommendationError('Selected delivery destination is invalid or inactive.');
      setShowRecommendationPanel(true);
      return;
    }

    setCalculatingRecommendation(true);
    setShowRecommendationPanel(true);

    try {
      const startTime = performance.now();
      // Fetch current location distances from database
      const storedDistances = await api.distances.list();

      // Build Dijkstra Graph
      // Nodes = active warehouses + active delivery locations
      const graphNodes = [
        ...warehouses.filter(w => w.is_active).map(w => ({ id: w.id, name: w.name, type: 'warehouse' as const })),
        ...locations.map(l => ({ id: l.id, name: l.name, type: 'delivery_location' as const }))
      ];

      // Edges = location_distances
      const graphEdges = storedDistances.map(d => ({
        from: d.origin_id,
        to: d.destination_id,
        weight: Number(d.distance)
      }));

      const activeWarehouses = warehouses.filter(w => w.is_active);
      const candidates: WarehouseFulfillmentCandidate[] = [];

      for (const wh of activeWarehouses) {
        // 1. Stock check across all items in order
        let hasSufficientStock = true;
        let totalAvail = 0;
        const stockBreakdown = items.map(item => {
          const invRec = inventoryList.find(i => i.product_id === item.product_id && i.warehouse_id === wh.id);
          const availQty = invRec ? invRec.quantity : 0;
          totalAvail += availQty;
          const isSufficient = availQty >= item.quantity;
          if (!isSufficient) {
            hasSufficientStock = false;
          }
          const prod = products.find(p => p.id === item.product_id);
          return {
            productId: item.product_id,
            productName: prod?.name || 'Product',
            requestedQty: item.quantity,
            availableQty: availQty,
            isSufficient
          };
        });

        // 2. Dijkstra shortest path from warehouse to destination
        const dijkstraRes = solveDijkstra(
          { nodes: graphNodes, edges: graphEdges, isUndirected: true },
          wh.id,
          selectedLocationId
        );

        candidates.push({
          warehouse: wh,
          hasSufficientStock,
          totalAvailableStock: totalAvail,
          stockBreakdown,
          shortestDistanceKm: dijkstraRes.hasPath ? dijkstraRes.distance : null,
          path: dijkstraRes.path,
          isReachable: dijkstraRes.hasPath,
          transitEstimateHours: dijkstraRes.hasPath ? Number((dijkstraRes.distance / 50).toFixed(1)) : null
        });
      }

      // Rank candidates:
      // Priority 1: Has sufficient stock for ALL items (true before false)
      // Priority 2: Is reachable (has shortest distance)
      // Priority 3: Shortest distance in km ascending
      // Priority 4: Warehouse name alphabetical tie-break
      candidates.sort((a, b) => {
        if (a.hasSufficientStock !== b.hasSufficientStock) {
          return a.hasSufficientStock ? -1 : 1;
        }
        if (a.isReachable !== b.isReachable) {
          return a.isReachable ? -1 : 1;
        }
        if (a.shortestDistanceKm !== null && b.shortestDistanceKm !== null) {
          if (a.shortestDistanceKm !== b.shortestDistanceKm) {
            return a.shortestDistanceKm - b.shortestDistanceKm;
          }
        }
        return a.warehouse.name.localeCompare(b.warehouse.name);
      });

      // Best recommendation: first candidate that has sufficient stock and is reachable
      const optimal = candidates.find(c => c.hasSufficientStock && c.isReachable) 
        || candidates.find(c => c.hasSufficientStock) 
        || candidates[0] 
        || null;

      const endTime = performance.now();

      setFulfillmentRecommendation({
        destinationLocation: destLocation,
        candidates,
        recommendedWarehouseId: optimal ? optimal.warehouse.id : null,
        algorithmName: 'Dijkstra Shortest Path with Stock Verification',
        executionTimeMs: Number((endTime - startTime).toFixed(3)),
        edgeCountEvaluated: graphEdges.length
      });
    } catch (err: any) {
      setRecommendationError(err.message || 'Failed to compute fulfillment recommendation.');
    } finally {
      setCalculatingRecommendation(false);
    }
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
      <div className="max-w-7xl mx-auto p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-brand-text-secondary text-sm font-medium">Loading order preparation data...</div>
      </div>
    );
  }

  // Success Confirmation Screen
  if (successResult) {
    const orderData = successResult.order || successResult;
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8 animate-fade-in">
        <Card variant="glass" className="p-8 sm:p-12 text-center border-emerald-200/80 shadow-glass rounded-2xl">
          <div className="w-16 h-16 bg-emerald-100/80 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-brand-text">Order Created Successfully!</h2>
          <p className="text-brand-text-secondary mt-1 text-sm">
            Order has been placed in <span className="font-semibold text-brand-primary">PENDING</span> status and recorded in the database.
          </p>

          <div className="my-6 p-5 bg-white/80 backdrop-blur-xs rounded-xl border border-brand-border/80 inline-block text-left w-full max-w-md shadow-xs">
            <div className="flex justify-between py-2 border-b border-brand-border/60 text-sm">
              <span className="text-brand-text-secondary">Order Number:</span>
              <span className="font-mono font-bold text-brand-text">{orderData.order_number}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-brand-border/60 text-sm">
              <span className="text-brand-text-secondary">Status:</span>
              <Badge variant="warning">{orderData.status}</Badge>
            </div>
            <div className="flex justify-between py-2 border-b border-brand-border/60 text-sm">
              <span className="text-brand-text-secondary">Priority:</span>
              <span className="font-semibold text-brand-text">{orderData.priority}</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-brand-text-secondary">Total Amount:</span>
              <span className="font-bold text-emerald-600 font-mono">${Number(orderData.total_amount).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
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
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/orders" className="p-2.5 rounded-xl bg-white/85 backdrop-blur-xs border border-brand-border/80 text-brand-text hover:bg-brand-surface hover:shadow-glass transition-all active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Create New Order</h1>
          <p className="text-xs text-brand-text-secondary mt-0.5">
            Configure destination, line items, and validate stock availability across distribution hubs
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50/90 backdrop-blur-xs border border-rose-200 text-rose-800 rounded-xl flex items-start gap-3 text-xs font-semibold shadow-soft-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="whitespace-pre-line">{error}</div>
        </div>
      )}

      {locations.length === 0 && (
        <div className="p-4 bg-amber-50/90 backdrop-blur-xs border border-amber-200 text-amber-800 rounded-xl flex items-center justify-between text-xs font-semibold shadow-soft-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>No active delivery locations found. Please activate or add a location before placing orders.</span>
          </div>
          <Link to="/locations" className="text-amber-800 font-bold underline ml-4">
            Manage Locations
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: Form Details & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Order Destination & Settings */}
          <Card variant="glass" className="p-6">
            <h3 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2 border-b border-brand-border/60 pb-3">
              <Building2 className="w-4 h-4 text-brand-primary" />
              1. Delivery Destination & Logistics Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-brand-text block">Delivery Destination *</label>
                <select
                  required
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-white/85 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.address ? `(${loc.address})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-brand-text-secondary">
                  Only verified, active delivery locations are selectable for atomic order dispatch.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-text block">Dispatch Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as OrderPriority)}
                  className="w-full bg-white/85 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
                >
                  <option value="LOW">Low Priority (Standard Economy)</option>
                  <option value="MEDIUM">Medium Priority (Standard Delivery)</option>
                  <option value="HIGH">High Priority (Expedited)</option>
                  <option value="URGENT">Urgent Express (Critical Delivery)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-brand-text block">Stock Validation Scope</label>
                  <button
                    type="button"
                    onClick={handleCalculateRecommendation}
                    disabled={calculatingRecommendation || items.length === 0}
                    className="text-[11px] font-bold text-brand-primary hover:text-brand-primary-hover flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Recommend Hub (Dijkstra)</span>
                  </button>
                </div>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full bg-white/85 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
                >
                  <option value="">All Warehouses (Network-Wide Inventory)</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
                <p className="text-[11px] text-brand-text-secondary">
                  Filters availability against selected warehouse depot or entire network.
                </p>
              </div>
            </div>

            {/* Phase 3: Dijkstra Warehouse Fulfillment Recommendation Panel */}
            {showRecommendationPanel && (
              <div className="mt-5 pt-4 border-t border-brand-border/60 animate-fade-in space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-brand-primary/10 text-brand-primary">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-brand-text">Fulfillment Hub Optimization (Dijkstra Shortest Path)</h4>
                      <p className="text-[10px] text-brand-text-secondary">
                        Evaluates real network road distances and on-hand stock for all line items.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCalculateRecommendation}
                      loading={calculatingRecommendation}
                      className="text-xs h-7 px-2.5"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Recompute
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowRecommendationPanel(false)}
                      className="text-xs text-brand-text-secondary hover:text-brand-text px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {recommendationError && (
                  <div className="p-3 bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>{recommendationError}</span>
                  </div>
                )}

                {fulfillmentRecommendation && (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-brand-text-secondary bg-brand-surface/40 p-2.5 rounded-xl border border-brand-border/40">
                      <span>Destination: <strong className="text-brand-text">{fulfillmentRecommendation.destinationLocation.name}</strong></span>
                      <span>Evaluated: <strong className="text-brand-text font-mono">{fulfillmentRecommendation.candidates.length} hubs</strong> ({fulfillmentRecommendation.edgeCountEvaluated} edges)</span>
                      <span>Runtime: <strong className="text-brand-text font-mono">{fulfillmentRecommendation.executionTimeMs} ms</strong></span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {fulfillmentRecommendation.candidates.map((cand) => {
                        const isRecommended = cand.warehouse.id === fulfillmentRecommendation.recommendedWarehouseId;
                        const isSelected = cand.warehouse.id === selectedWarehouseId;

                        return (
                          <div
                            key={cand.warehouse.id}
                            className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                              isSelected
                                ? 'bg-brand-primary/5 border-brand-primary shadow-xs'
                                : isRecommended
                                ? 'bg-emerald-50/70 border-emerald-300'
                                : 'bg-white/80 border-brand-border/80'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="font-bold text-brand-text flex items-center gap-1.5">
                                  <span>{cand.warehouse.name}</span>
                                  <span className="font-mono text-[10px] text-brand-text-secondary">({cand.warehouse.code})</span>
                                </div>
                                {isRecommended && (
                                  <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                                    Recommended
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-brand-text-secondary">
                                <span>Shortest Road Distance:</span>
                                <span className="font-mono font-bold text-brand-text">
                                  {cand.shortestDistanceKm !== null ? `${cand.shortestDistanceKm} km` : 'No Route'}
                                </span>
                              </div>

                              {cand.transitEstimateHours !== null && (
                                <div className="flex items-center justify-between text-[11px] text-brand-text-secondary">
                                  <span>Est. Transit:</span>
                                  <span className="font-mono text-brand-text">~{cand.transitEstimateHours} hrs</span>
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[11px] text-brand-text-secondary">
                                <span>Stock Status:</span>
                                <Badge variant={cand.hasSufficientStock ? 'success' : 'danger'} className="text-[10px]">
                                  {cand.hasSufficientStock ? 'Full Stock Ready' : 'Insufficient Stock'}
                                </Badge>
                              </div>

                              {cand.stockBreakdown.length > 0 && (
                                <div className="text-[10px] text-brand-text-secondary pt-1 border-t border-brand-border/40 space-y-0.5">
                                  {cand.stockBreakdown.map((sb) => (
                                    <div key={sb.productId} className="flex justify-between">
                                      <span className="truncate max-w-[120px]">{sb.productName}:</span>
                                      <span className={sb.isSufficient ? 'text-emerald-700 font-mono font-bold' : 'text-rose-600 font-mono font-bold'}>
                                        {sb.availableQty} / {sb.requestedQty}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="pt-2 mt-2 border-t border-brand-border/40">
                              <Button
                                type="button"
                                size="sm"
                                variant={isSelected ? 'primary' : isRecommended ? 'primary' : 'outline'}
                                onClick={() => setSelectedWarehouseId(cand.warehouse.id)}
                                className="w-full text-xs h-7"
                              >
                                {isSelected ? (
                                  <span className="flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Selected Hub
                                  </span>
                                ) : (
                                  <span>Fulfill From This Hub</span>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Section 2: Order Items */}
          <Card variant="dense" className="p-6">
            <h3 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2 border-b border-brand-border/60 pb-3">
              <Package className="w-4 h-4 text-brand-primary" />
              2. Add Products to Order
            </h3>

            {/* Product selection bar */}
            <div className="p-4 bg-brand-surface/70 backdrop-blur-xs rounded-xl border border-brand-border/80 mb-6 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6 space-y-1">
                  <label className="text-xs font-semibold text-brand-text">Select Product</label>
                  <select
                    value={stagingProductId}
                    onChange={(e) => setStagingProductId(e.target.value)}
                    className="w-full bg-white/85 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
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
                    className="bg-white/85 text-center font-bold"
                  />
                </div>

                <div className="sm:col-span-3">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddItem}
                    disabled={stagingAvailableStock <= 0}
                    className="w-full h-[42px] flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> 
                    <span>Add Item</span>
                  </Button>
                </div>
              </div>

              {stagingProduct && (
                <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-brand-text-secondary pt-2.5 border-t border-brand-border/60 gap-2">
                  <span>Catalog Price: <strong className="text-brand-text font-mono font-bold">${stagingProduct.unit_price.toFixed(2)}</strong></span>
                  <span>
                    Available Inventory:{' '}
                    <strong className={stagingAvailableStock > 0 ? 'text-emerald-700 font-bold font-mono' : 'text-rose-600 font-bold font-mono'}>
                      {stagingAvailableStock} units
                    </strong>
                  </span>
                  <span>Line Estimate: <strong className="text-brand-text font-mono font-bold">${(stagingProduct.unit_price * (stagingQty || 0)).toFixed(2)}</strong></span>
                </div>
              )}
            </div>

            {/* Items List Table */}
            {items.length === 0 ? (
              <div className="p-8 text-center text-brand-text-secondary border-2 border-dashed border-brand-border/80 rounded-2xl bg-brand-surface/20">
                <div className="w-12 h-12 rounded-2xl bg-brand-surface/60 flex items-center justify-center mx-auto mb-2">
                  <ShoppingCart className="w-6 h-6 opacity-40 text-brand-primary" />
                </div>
                <p className="text-sm font-bold text-brand-text">No items added to this order yet</p>
                <p className="text-xs text-brand-text-secondary mt-1">Select products and quantities above to populate order line items.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-brand-border/80 shadow-soft-xs">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-brand-surface/70 border-b border-brand-border/80 text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-right">Available Stock</th>
                      <th className="px-4 py-3 text-center">Quantity</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/60 bg-white/40">
                    {items.map(item => {
                      const prod = products.find(p => p.id === item.product_id);
                      const available = getProductStock(item.product_id, selectedWarehouseId || undefined);
                      const hasStockError = item.quantity > available;
                      const lineTotal = (prod ? prod.unit_price * item.quantity : 0);

                      return (
                        <tr key={item.product_id} className={`hover:bg-brand-soft/30 transition-colors ${hasStockError ? 'bg-rose-50/70' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="font-bold text-sm text-brand-text">{prod?.name || 'Unknown Product'}</div>
                            {prod?.sku && (
                              <div className="font-mono text-xs font-semibold text-brand-text-secondary mt-0.5">
                                <span className="bg-brand-surface/80 border border-brand-border/80 px-1.5 py-0.5 rounded">
                                  {prod.sku}
                                </span>
                              </div>
                            )}
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
                              className="w-20 text-center bg-white/85 border border-brand-border/90 rounded-lg px-2 py-1.5 text-xs font-bold font-mono text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-brand-text-secondary">
                            ${prod?.unit_price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-brand-text font-mono">
                            ${lineTotal.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.product_id)}
                              className="p-1.5 text-brand-text-secondary hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors active:scale-90"
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
          <Card variant="glass" className="p-6 sticky top-6 shadow-glass rounded-2xl border border-brand-border/80">
            <h3 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2 border-b border-brand-border/60 pb-3">
              <Layers className="w-4 h-4 text-brand-primary" />
              Order Summary
            </h3>

            <div className="space-y-3 pb-4 border-b border-brand-border/60 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-brand-text-secondary">Distinct Line Items:</span>
                <span className="font-bold text-brand-text font-mono">{totalDistinctItems}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-brand-text-secondary">Total Dispatch Units:</span>
                <span className="font-bold text-brand-text font-mono">{totalItemCount} units</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-brand-text-secondary">Priority Level:</span>
                <span className="font-bold text-brand-text">{priority}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-brand-text-secondary">Destination:</span>
                <span className="font-semibold text-brand-text text-right truncate max-w-[160px]">
                  {locations.find(l => l.id === selectedLocationId)?.name || 'None selected'}
                </span>
              </div>
            </div>

            <div className="py-4 border-b border-brand-border/60">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-brand-text">Estimated Subtotal:</span>
                <span className="text-2xl font-black text-brand-primary font-mono">
                  ${estimatedSubtotal.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-brand-text-secondary mt-1">
                Final total is verified and locked in atomically by PostgreSQL procedure.
              </p>
            </div>

            {/* Inventory Status Note */}
            <div className="my-4 p-3.5 bg-brand-surface/70 rounded-xl border border-brand-border/60 text-xs text-brand-text-secondary space-y-1.5 shadow-soft-xs">
              <div className="flex items-center gap-1.5 font-semibold text-brand-text">
                <Info className="w-3.5 h-3.5 text-brand-primary" />
                <span>Inventory Verification Policy</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Order creation checks active stock levels across the inventory network. Physical stock deduction occurs upon dispatch planning execution.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={submitting}
              disabled={submitting || items.length === 0 || stockErrors.length > 0 || locations.length === 0}
            >
              Confirm & Place Order
            </Button>

            {stockErrors.length > 0 && (
              <p className="text-xs text-rose-600 mt-2 font-semibold text-center">
                Resolve stock deficits above before submitting order.
              </p>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
};
