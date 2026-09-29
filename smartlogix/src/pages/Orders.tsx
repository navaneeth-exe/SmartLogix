import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import type { Order, OrderStatus, OrderPriority } from '../types/database.types';
import { 
  ShoppingCart, Plus, Search, Filter, Eye, CheckCircle2, 
  Clock, Truck, CheckCheck, XCircle, AlertCircle, Building2, MapPin
} from 'lucide-react';

export const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api.orders.list();
      setOrders(data);
      // If modal is open, refresh selected order data
      if (selectedOrder) {
        const updated = data.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const openDetails = (order: Order) => {
    setError('');
    setSuccessMsg('');
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const handleStatusTransition = async (orderId: string, nextStatus: OrderStatus) => {
    setError('');
    setSuccessMsg('');
    setActionLoading(true);
    try {
      await api.orders.updateStatus(orderId, nextStatus);
      setSuccessMsg(`Order status successfully updated to ${nextStatus}.`);
      await fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to update order status.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning" className="flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</Badge>;
      case 'PROCESSING':
        return <Badge variant="info" className="flex items-center gap-1"><Clock className="w-3 h-3"/> Processing</Badge>;
      case 'DISPATCHED':
        return <Badge variant="purple" className="flex items-center gap-1"><Truck className="w-3 h-3"/> Dispatched</Badge>;
      case 'DELIVERED':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCheck className="w-3 h-3"/> Delivered</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger" className="flex items-center gap-1"><XCircle className="w-3 h-3"/> Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: OrderPriority) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="danger" dot>URGENT</Badge>;
      case 'HIGH':
        return <Badge variant="warning" dot>HIGH</Badge>;
      case 'MEDIUM':
        return <Badge variant="info" dot>MEDIUM</Badge>;
      case 'LOW':
        return <Badge variant="default" dot>LOW</Badge>;
      default:
        return <Badge variant="default">{priority}</Badge>;
    }
  };

  const filtered = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (order.delivery_location?.name && order.delivery_location.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const totalCount = orders.length;
  const pendingCount = orders.filter(o => o.status === 'PENDING').length;
  const inProgressCount = orders.filter(o => o.status === 'PROCESSING' || o.status === 'DISPATCHED').length;
  const deliveredCount = orders.filter(o => o.status === 'DELIVERED').length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
      <PageHeader 
        title="Orders" 
        description="Monitor, fulfill, and track distribution orders and status transitions"
        actions={
          <Link to="/orders/create">
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-2" /> Create New Order
            </Button>
          </Link>
        }
      />

      {/* Global Message */}
      {successMsg && !isDetailOpen && (
        <div className="p-4 bg-emerald-50/90 backdrop-blur-xs border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800 font-semibold ml-4">✕</button>
        </div>
      )}

      {error && !isDetailOpen && (
        <div className="p-4 bg-red-50/90 backdrop-blur-xs border border-red-200 text-red-800 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800 font-semibold ml-4">✕</button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card variant="glass" hoverable className="p-5 border-l-4 border-l-brand-primary">
          <div className="flex items-center justify-between">
            <h4 className="text-brand-text-secondary text-xs font-semibold uppercase tracking-wider">Total Orders</h4>
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-1.5 text-brand-text font-mono">{totalCount}</p>
          <span className="text-[11px] text-brand-text-secondary/80 mt-1 block">All registered dispatch orders</span>
        </Card>

        <Card variant="glass" hoverable className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-800">Pending Verification</h4>
            <div className="w-8 h-8 rounded-xl bg-amber-100/80 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-1.5 text-amber-700 font-mono">{pendingCount}</p>
          <span className="text-[11px] text-amber-700/80 mt-1 block">Awaiting order approval</span>
        </Card>

        <Card variant="glass" hoverable className="p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-800">In Transit / Routed</h4>
            <div className="w-8 h-8 rounded-xl bg-blue-100/80 flex items-center justify-center text-blue-700">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-1.5 text-blue-700 font-mono">{inProgressCount}</p>
          <span className="text-[11px] text-blue-700/80 mt-1 block">Processing or dispatched</span>
        </Card>

        <Card variant="glass" hoverable className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Delivered</h4>
            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-700">
              <CheckCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-1.5 text-emerald-700 font-mono">{deliveredCount}</p>
          <span className="text-[11px] text-emerald-700/80 mt-1 block">Successfully completed</span>
        </Card>
      </div>

      {/* Table & Filter Card */}
      <Card variant="dense" noPadding className="overflow-hidden shadow-soft-sm">
        <div className="p-4 sm:p-5 border-b border-brand-border/80 flex flex-col md:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-md">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
            <Input 
              placeholder="Search by order number or destination..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-text-secondary hidden sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white/85 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
              >
                <option value="all">All Statuses ({totalCount})</option>
                <option value="PENDING">Pending ({pendingCount})</option>
                <option value="PROCESSING">Processing</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="DELIVERED">Delivered ({deliveredCount})</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white/85 backdrop-blur-xs border border-brand-border/90 rounded-xl px-3.5 py-2 text-xs font-semibold text-brand-text shadow-[inset_0_1px_2px_0_rgba(19,59,45,0.04)] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
            >
              <option value="all">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {(search || statusFilter !== 'all' || priorityFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); }}
                className="text-xs text-brand-text-secondary hover:text-brand-text"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-brand-text-secondary">Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-brand-text-secondary flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-surface/60 flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 opacity-40 text-brand-primary" />
            </div>
            <h3 className="font-bold text-brand-text text-base">No orders found</h3>
            <p className="text-xs text-brand-text-secondary mt-1 mb-4">No order matches the current filter criteria.</p>
            <Link to="/orders/create">
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Place an Order
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-brand-surface/70 border-b border-brand-border/80 text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Order Number</th>
                  <th className="px-5 py-3.5">Destination</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Items</th>
                  <th className="px-5 py-3.5 text-right">Total Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 bg-white/40">
                {filtered.map(order => {
                  const itemCount = order.order_items?.reduce((s, i) => s + i.quantity, 0) || 0;
                  const formattedDate = new Date(order.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <tr key={order.id} className="hover:bg-brand-soft/30 transition-colors group">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-brand-text group-hover:text-brand-primary transition-colors">
                        <span className="bg-brand-surface/80 border border-brand-border/80 px-2 py-0.5 rounded-md">
                          {order.order_number}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-sm text-brand-text flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                          <span>{order.delivery_location?.name || 'Unknown'}</span>
                        </div>
                        {order.delivery_location?.address && (
                          <div className="text-[11px] text-brand-text-secondary truncate max-w-xs ml-5">
                            {order.delivery_location.address}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {getPriorityBadge(order.priority)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-brand-surface rounded-md border border-brand-border/60">
                          {itemCount} units
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-brand-text">
                        ${Number(order.total_amount).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-brand-text-secondary font-medium">
                        {formattedDate}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openDetails(order)}
                          className="shadow-xs hover:shadow-glass"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-brand-primary" /> Inspect
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

      {/* Order Details Drawer / Modal */}
      {isDetailOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <Card variant="modal" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/80 shadow-[0_20px_50px_rgba(19,59,45,0.18)]">
            {/* Header */}
            <div className="p-6 border-b border-brand-border/60 sticky top-0 bg-white/90 backdrop-blur-md z-10 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold font-mono text-brand-text">{selectedOrder.order_number}</h3>
                  {getStatusBadge(selectedOrder.status)}
                  {getPriorityBadge(selectedOrder.priority)}
                </div>
                <p className="text-xs text-brand-text-secondary mt-1">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/80 hover:bg-white border border-brand-border/70 flex items-center justify-center text-brand-text-secondary hover:text-brand-text shadow-soft-xs active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Feedback Alert within Modal */}
              {error && (
                <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Destination Card */}
              <div className="p-4 bg-brand-surface rounded-xl border border-brand-border">
                <h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-brand-primary" /> Delivery Destination
                </h4>
                <div className="text-sm font-bold text-brand-text">
                  {selectedOrder.delivery_location?.name || 'Destination Not Found'}
                </div>
                <div className="text-xs text-brand-text-secondary mt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-brand-primary flex-shrink-0" />
                  <span>{selectedOrder.delivery_location?.address || 'No street address listed'}</span>
                </div>
                {selectedOrder.delivery_location?.latitude != null && selectedOrder.delivery_location?.longitude != null && (
                  <div className="text-xs font-mono text-brand-text-secondary mt-2">
                    Coordinates: {Number(selectedOrder.delivery_location?.latitude).toFixed(4)}°, {Number(selectedOrder.delivery_location?.longitude).toFixed(4)}°
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-3">
                  Ordered Products ({selectedOrder.order_items?.length || 0} line items)
                </h4>
                <div className="border border-brand-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-brand-surface border-b border-brand-border text-xs text-brand-text-secondary">
                      <tr>
                        <th className="px-4 py-2.5">Item</th>
                        <th className="px-4 py-2.5 text-center">Qty</th>
                        <th className="px-4 py-2.5 text-right">Historical Unit Price</th>
                        <th className="px-4 py-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {selectedOrder.order_items?.map(item => (
                        <tr key={item.id} className="hover:bg-brand-surface/30">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-brand-text">{item.product?.name || 'Product'}</div>
                            <div className="text-xs font-mono text-brand-text-secondary">{item.product?.sku}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-brand-text">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-brand-text-secondary">
                            ${Number(item.unit_price).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-brand-text font-mono">
                            ${(item.quantity * Number(item.unit_price)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="p-4 bg-brand-surface rounded-xl border border-brand-border flex justify-between items-center">
                <div>
                  <div className="text-xs text-brand-text-secondary">Total Quantity</div>
                  <div className="text-base font-bold text-brand-text">
                    {selectedOrder.order_items?.reduce((s, i) => s + i.quantity, 0)} units
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-brand-text-secondary">Grand Total Amount</div>
                  <div className="text-2xl font-black text-brand-primary font-mono">
                    ${Number(selectedOrder.total_amount).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Status Transition Lifecycle Controls */}
              <div className="pt-4 border-t border-brand-border">
                <h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-3">
                  Status Workflow & Actions
                </h4>

                {selectedOrder.status === 'PENDING' && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="primary"
                      onClick={() => handleStatusTransition(selectedOrder.id, 'PROCESSING')}
                      disabled={actionLoading}
                    >
                      <Clock className="w-4 h-4 mr-2" /> Start Processing
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleStatusTransition(selectedOrder.id, 'CANCELLED')}
                      disabled={actionLoading}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Cancel Order
                    </Button>
                  </div>
                )}

                {selectedOrder.status === 'PROCESSING' && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="primary"
                      onClick={() => handleStatusTransition(selectedOrder.id, 'DISPATCHED')}
                      disabled={actionLoading}
                    >
                      <Truck className="w-4 h-4 mr-2" /> Dispatch Order
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleStatusTransition(selectedOrder.id, 'CANCELLED')}
                      disabled={actionLoading}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Cancel Order
                    </Button>
                  </div>
                )}

                {selectedOrder.status === 'DISPATCHED' && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="primary"
                      onClick={() => handleStatusTransition(selectedOrder.id, 'DELIVERED')}
                      disabled={actionLoading}
                    >
                      <CheckCheck className="w-4 h-4 mr-2" /> Mark as Delivered
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleStatusTransition(selectedOrder.id, 'CANCELLED')}
                      disabled={actionLoading}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Cancel Order
                    </Button>
                  </div>
                )}

                {selectedOrder.status === 'DELIVERED' && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>This order has been completed and delivered. Status is final and locked.</span>
                  </div>
                )}

                {selectedOrder.status === 'CANCELLED' && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-800 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>This order has been cancelled. Status is terminal and cannot be reactivated.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-brand-border bg-brand-surface/40 flex justify-end">
              <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                Close Details
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

