export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unit_price: number;
  weight_kg?: number;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  reorder_level: number;
  updated_at: string;
  // joined fields
  product?: Product;
  warehouse?: Warehouse;
}

export interface DeliveryLocation {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type OrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  // joined fields
  product?: Product;
}

export interface Order {
  id: string;
  order_number: string;
  delivery_location_id: string;
  status: OrderStatus;
  priority: OrderPriority;
  total_amount: number;
  created_at: string;
  updated_at: string;
  // joined fields
  delivery_location?: DeliveryLocation;
  order_items?: OrderItem[];
}

export interface CreateOrderItemInput {
  product_id: string;
  quantity: number;
}

export interface CreateOrderInput {
  delivery_location_id: string;
  priority?: OrderPriority;
  items: CreateOrderItemInput[];
  warehouse_id?: string;
}

export type VehicleType = 'Motorcycle' | 'Van' | 'Small Truck' | 'Large Truck';
export type VehicleStatus = 'AVAILABLE' | 'ON_ROUTE' | 'MAINTENANCE' | 'OFF_DUTY';
export type CapacityUnit = 'kg' | 'units' | 'm3';

export interface Vehicle {
  id: string;
  name: string;
  registration_number: string;
  vehicle_type: VehicleType;
  capacity: number;
  capacity_unit: CapacityUnit;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export type DistanceSource = 'ORS_ROAD' | 'MANUAL_SIMULATION';

export interface LocationDistance {
  id: string;
  origin_id: string;
  destination_id: string;
  distance: number;
  distance_meters?: number | null;
  distance_source?: DistanceSource;
  routing_profile?: string;
  duration_seconds?: number | null;
  generated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RoadMatrixResponse {
  success: boolean;
  source: DistanceSource;
  profile: string;
  units: string;
  generated_at: string;
  distances_meters: (number | null)[][];
  durations_seconds: (number | null)[][];
  matrix_km: number[][];
  unreachable_pairs: { origin: string; destination: string }[];
}

export interface MatrixLocation {
  id: string;
  name: string;
  type: 'warehouse' | 'delivery_location';
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface AlgorithmResult {
  algorithmName: string;
  tourIndices: number[];
  tourLocations: MatrixLocation[];
  totalDistance: number;
  executionTimeMs: number;
  nodesExplored?: number;
  nodesPruned?: number;
  isOptimal: boolean;
  hasTour: boolean;
  error?: string;
}

export type DeliveryPlanStatus = 'PLANNED' | 'CANCELLED';

export interface DeliveryPlanOrder {
  id: string;
  delivery_plan_id: string;
  order_id: string;
  created_at: string;
  order?: Order;
}

export type RouteOptimizationAlgorithm = 'BRANCH_AND_BOUND' | 'GREEDY_NEAREST_NEIGHBOR';

export interface RouteStop {
  sequence: number;
  locationId: string;
  name: string;
  type: 'warehouse' | 'delivery_location';
  address?: string | null;
  ordersCount?: number;
  latitude?: number | null;
  longitude?: number | null;
}

export interface DeliveryPlan {
  id: string;
  plan_number: string;
  warehouse_id: string;
  vehicle_id?: string | null;
  status: DeliveryPlanStatus;
  route_algorithm?: RouteOptimizationAlgorithm | null;
  route_stops?: RouteStop[] | null;
  route_distance?: number | null;
  route_execution_time_ms?: number | null;
  route_generated_at?: string | null;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
  vehicle?: Vehicle | null;
  delivery_plan_orders?: DeliveryPlanOrder[];
  orders?: Order[];
}

export interface CreateDeliveryPlanInput {
  warehouse_id: string;
  order_ids: string[];
}


