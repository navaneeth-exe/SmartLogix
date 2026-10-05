import { supabase } from '../lib/supabase';
import type { 
  Product, 
  Warehouse, 
  Inventory, 
  DeliveryLocation, 
  Order, 
  OrderStatus,
  CreateOrderInput,
  Vehicle,
  VehicleStatus,
  LocationDistance,
  DistanceSource,
  RoadMatrixResponse,
  DeliveryPlan,
  CreateDeliveryPlanInput,
  RouteOptimizationAlgorithm,
  RouteStop
} from '../types/database.types';

// Lightweight, zero-dependency in-flight deduplicator and short TTL cache
// Prevents duplicate concurrent fetches across simultaneous components (e.g. Dashboard, Reports, Workspace)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const apiCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();
const DEFAULT_TTL_MS = 15000; // 15 seconds fresh cache for catalog/reference queries

async function cachedFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const cached = apiCache.get(key);
  const now = Date.now();
  if (cached && (now - cached.timestamp < ttlMs)) {
    return cached.data as T;
  }

  // Deduplicate identical in-flight promises
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const result = await fetcher();
      apiCache.set(key, { data: result, timestamp: Date.now() });
      return result;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}

export function invalidateApiCache(prefix?: string) {
  if (!prefix) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.startsWith(prefix)) {
      apiCache.delete(key);
    }
  }
}

export const api = {
  products: {
    async list(forceFresh = false) {
      if (forceFresh) invalidateApiCache('products');
      return cachedFetch('products:list', async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Product[];
      }, 30000);
    },
    async create(product: Partial<Product>) {
      invalidateApiCache('products');
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();
      if (error) throw error;
      return data as Product;
    },
    async update(id: string, updates: Partial<Product>) {
      invalidateApiCache('products');
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Product;
    }
  },

  warehouses: {
    async list(forceFresh = false) {
      if (forceFresh) invalidateApiCache('warehouses');
      return cachedFetch('warehouses:list', async () => {
        const { data, error } = await supabase
          .from('warehouses')
          .select('*')
          .order('name');
        if (error) throw error;
        return data as Warehouse[];
      }, 30000);
    },
    async create(warehouse: Partial<Warehouse>) {
      invalidateApiCache('warehouses');
      const { data, error } = await supabase
        .from('warehouses')
        .insert([warehouse])
        .select()
        .single();
      if (error) throw error;
      return data as Warehouse;
    },
    async update(id: string, updates: Partial<Warehouse>) {
      invalidateApiCache('warehouses');
      const { data, error } = await supabase
        .from('warehouses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Warehouse;
    }
  },

  inventory: {
    async list(forceFresh = false) {
      if (forceFresh) invalidateApiCache('inventory');
      return cachedFetch('inventory:list', async () => {
        const { data, error } = await supabase
          .from('inventory')
          .select('*, product:products(*), warehouse:warehouses(*)')
          .order('updated_at', { ascending: false });
        if (error) throw error;
        return data as Inventory[];
      }, 10000);
    },
    async getByWarehouse(warehouse_id: string) {
      const { data, error } = await supabase
        .from('inventory')
        .select('*, product:products(*)')
        .eq('warehouse_id', warehouse_id);
      if (error) throw error;
      return data as Inventory[];
    },
    async updateStock(id: string, updates: { quantity?: number; reorder_level?: number }) {
      invalidateApiCache('inventory');
      const { data, error } = await supabase
        .from('inventory')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, product:products(*), warehouse:warehouses(*)')
        .single();
      if (error) throw error;
      return data as Inventory;
    },
    async addStock(warehouse_id: string, product_id: string, quantity: number, reorder_level: number = 10) {
      invalidateApiCache('inventory');
      const { data: existing, error: checkError } = await supabase
        .from('inventory')
        .select('*')
        .eq('warehouse_id', warehouse_id)
        .eq('product_id', product_id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        return this.updateStock(existing.id, { quantity: existing.quantity + quantity });
      } else {
        const { data, error } = await supabase
          .from('inventory')
          .insert([{ warehouse_id, product_id, quantity, reorder_level }])
          .select('*, product:products(*), warehouse:warehouses(*)')
          .single();
        if (error) throw error;
        return data as Inventory;
      }
    },
    async applyRestockAllocation(productId: string, allocations: { warehouseId: string; quantity: number }[]) {
      invalidateApiCache('inventory');
      const results: Inventory[] = [];
      for (const item of allocations) {
        if (item.quantity > 0) {
          const res = await this.addStock(item.warehouseId, productId, item.quantity);
          results.push(res);
        }
      }
      return results;
    }
  },

  locations: {
    async list(forceFresh = false) {
      if (forceFresh) invalidateApiCache('locations');
      return cachedFetch('locations:list', async () => {
        const { data, error } = await supabase
          .from('delivery_locations')
          .select('*')
          .order('name');
        if (error) throw error;
        return data as DeliveryLocation[];
      }, 30000);
    },
    async getActive(forceFresh = false) {
      if (forceFresh) invalidateApiCache('locations');
      return cachedFetch('locations:active', async () => {
        const { data, error } = await supabase
          .from('delivery_locations')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data as DeliveryLocation[];
      }, 30000);
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('delivery_locations')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as DeliveryLocation;
    },
    async create(location: Partial<DeliveryLocation>) {
      invalidateApiCache('locations');
      const { data, error } = await supabase
        .from('delivery_locations')
        .insert([location])
        .select()
        .single();
      if (error) throw error;
      return data as DeliveryLocation;
    },
    async update(id: string, updates: Partial<DeliveryLocation>) {
      invalidateApiCache('locations');
      const { data, error } = await supabase
        .from('delivery_locations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as DeliveryLocation;
    },
    async toggleActive(id: string, is_active: boolean) {
      invalidateApiCache('locations');
      const { data, error } = await supabase
        .from('delivery_locations')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as DeliveryLocation;
    },
    async delete(id: string) {
      invalidateApiCache('locations');
      const { error } = await supabase
        .from('delivery_locations')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    }
  },

  orders: {
    async list(forceFresh = false) {
      if (forceFresh) invalidateApiCache('orders');
      return cachedFetch('orders:list', async () => {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            delivery_location:delivery_locations(*),
            order_items:order_items(
              *,
              product:products(*)
            )
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Order[];
      }, 10000);
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          delivery_location:delivery_locations(*),
          order_items:order_items(
            *,
            product:products(*)
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Order;
    },
    async create(input: CreateOrderInput) {
      invalidateApiCache('orders');
      invalidateApiCache('inventory');
      invalidateApiCache('plans');
      const { data, error } = await supabase.rpc('create_order_atomic', {
        p_delivery_location_id: input.delivery_location_id,
        p_priority: input.priority || 'MEDIUM',
        p_items: input.items,
        p_warehouse_id: input.warehouse_id || null
      });
      if (error) throw error;
      return data;
    },
    async updateStatus(id: string, status: OrderStatus) {
      invalidateApiCache('orders');
      invalidateApiCache('plans');
      const { data, error } = await supabase.rpc('update_order_status', {
        p_order_id: id,
        p_new_status: status
      });
      if (error) throw error;
      return data;
    }
  },

  vehicles: {
    async list(forceFresh = false) {
      if (forceFresh) invalidateApiCache('vehicles');
      return cachedFetch('vehicles:list', async () => {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Vehicle[];
      }, 15000);
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Vehicle;
    },
    async create(vehicle: Partial<Vehicle>) {
      invalidateApiCache('vehicles');
      invalidateApiCache('plans');
      const { data, error } = await supabase
        .from('vehicles')
        .insert([vehicle])
        .select()
        .single();
      if (error) throw error;
      return data as Vehicle;
    },
    async update(id: string, updates: Partial<Vehicle>) {
      invalidateApiCache('vehicles');
      invalidateApiCache('plans');
      const { data, error } = await supabase
        .from('vehicles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Vehicle;
    },
    async updateStatus(id: string, status: VehicleStatus) {
      invalidateApiCache('vehicles');
      invalidateApiCache('plans');
      const { data, error } = await supabase
        .from('vehicles')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Vehicle;
    },
    async delete(id: string) {
      invalidateApiCache('vehicles');
      invalidateApiCache('plans');
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    }
  },

  distances: {
    async list(forceFresh = false) {
      if (forceFresh) invalidateApiCache('distances');
      return cachedFetch('distances:list', async () => {
        const { data, error } = await supabase
          .from('location_distances')
          .select('*');
        if (error) throw error;
        return data as LocationDistance[];
      }, 45000); // 45s cache since distances are topological and rarely change
    },
    async save(
      origin_id: string, 
      destination_id: string, 
      distance: number, 
      symmetric: boolean = true,
      options?: {
        distance_meters?: number;
        distance_source?: DistanceSource;
        routing_profile?: string;
        duration_seconds?: number | null;
      }
    ) {
      invalidateApiCache('distances');
      const { error } = await supabase.rpc('save_location_distance', {
        p_origin_id: origin_id,
        p_destination_id: destination_id,
        p_distance: distance,
        p_symmetric: symmetric,
        p_distance_meters: options?.distance_meters ?? null,
        p_distance_source: options?.distance_source ?? 'MANUAL_SIMULATION',
        p_routing_profile: options?.routing_profile ?? 'driving-car',
        p_duration_seconds: options?.duration_seconds ?? null
      });
      if (error) throw error;
      return true;
    },
    async saveBatch(entries: { 
      origin_id: string; 
      destination_id: string; 
      distance: number;
      distance_meters?: number | null;
      distance_source?: DistanceSource;
      routing_profile?: string;
      duration_seconds?: number | null;
      generated_at?: string;
    }[]) {
      invalidateApiCache('distances');
      const { data, error } = await supabase
        .from('location_distances')
        .upsert(entries, { onConflict: 'origin_id,destination_id' })
        .select();
      if (error) throw error;
      return data as LocationDistance[];
    },
    async generateRoadMatrix(locations: { id: string; name: string; latitude: number; longitude: number }[], profile: string = 'driving-car'): Promise<RoadMatrixResponse> {
      const { data, error } = await supabase.functions.invoke('ors-matrix', {
        body: { locations, profile }
      });

      if (error) {
        throw new Error(error.message || 'Failed to call OpenRouteService distance matrix function.');
      }
      if (!data || data.error) {
        throw new Error(data?.error || 'OpenRouteService returned an error.');
      }
      return data as RoadMatrixResponse;
    }
  },

  plans: {
    async list(forceFresh = false) {
      if (forceFresh) invalidateApiCache('plans');
      return cachedFetch('plans:list', async () => {
        const { data, error } = await supabase
          .from('delivery_plans')
          .select(`
            *,
            warehouse:warehouses(*),
            vehicle:vehicles(*),
            delivery_plan_orders(
              *,
              order:orders(
                *,
                delivery_location:delivery_locations(*),
                order_items:order_items(
                  *,
                  product:products(*)
                )
              )
            )
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as DeliveryPlan[];
      }, 10000);
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('delivery_plans')
        .select(`
          *,
          warehouse:warehouses(*),
          vehicle:vehicles(*),
          delivery_plan_orders(
            *,
            order:orders(
              *,
              delivery_location:delivery_locations(*),
              order_items:order_items(
                *,
                product:products(*)
              )
            )
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as DeliveryPlan;
    },
    async create(input: CreateDeliveryPlanInput) {
      invalidateApiCache('plans');
      invalidateApiCache('orders');
      const { data, error } = await supabase.rpc('create_delivery_plan_atomic', {
        p_warehouse_id: input.warehouse_id,
        p_order_ids: input.order_ids
      });
      if (error) throw error;
      return data;
    },
    async cancel(id: string) {
      invalidateApiCache('plans');
      invalidateApiCache('orders');
      invalidateApiCache('vehicles');
      const { data, error } = await supabase.rpc('cancel_delivery_plan', {
        p_plan_id: id
      });
      if (error) throw error;
      return data;
    },
    async assignVehicle(planId: string, vehicleId: string) {
      invalidateApiCache('plans');
      invalidateApiCache('vehicles');
      const { data, error } = await supabase.rpc('assign_vehicle_to_delivery_plan', {
        p_plan_id: planId,
        p_vehicle_id: vehicleId
      });
      if (error) throw error;
      return data;
    },
    async removeVehicle(planId: string) {
      invalidateApiCache('plans');
      invalidateApiCache('vehicles');
      const { data, error } = await supabase.rpc('remove_vehicle_from_delivery_plan', {
        p_plan_id: planId
      });
      if (error) throw error;
      return data;
    },
    async getAvailableVehicles() {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'AVAILABLE')
        .order('capacity', { ascending: true });
      if (error) throw error;
      return data as Vehicle[];
    },
    async getEligibleOrders() {
      // 1. Get all active delivery plans' assigned order_ids
      const { data: activePlans, error: plansErr } = await supabase
        .from('delivery_plans')
        .select('id, delivery_plan_orders(order_id)')
        .eq('status', 'PLANNED');
      
      if (plansErr) throw plansErr;

      const assignedOrderIds = new Set<string>();
      activePlans?.forEach(p => {
        p.delivery_plan_orders?.forEach((dpo: { order_id: string }) => {
          if (dpo.order_id) assignedOrderIds.add(dpo.order_id);
        });
      });

      // 2. Fetch orders eligible for planning (not cancelled, delivered, dispatched)
      const { data: allOrders, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          *,
          delivery_location:delivery_locations(*),
          order_items:order_items(
            *,
            product:products(*)
          )
        `)
        .not('status', 'in', '("CANCELLED","DELIVERED","DISPATCHED")')
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;

      // Filter out orders currently assigned to an active PLANNED plan
      return (allOrders as Order[]).filter(o => !assignedOrderIds.has(o.id));
    },
    async saveRoute(planId: string, algorithm: RouteOptimizationAlgorithm, stops: RouteStop[], distance: number, timeMs: number) {
      invalidateApiCache('plans');
      const { data, error } = await supabase.rpc('save_delivery_plan_route', {
        p_plan_id: planId,
        p_algorithm: algorithm,
        p_stops: stops,
        p_distance: distance,
        p_time_ms: timeMs
      });
      if (error) throw error;
      return data;
    }
  }
};
