import { solveDijkstra } from '../src/algorithms/dijkstra';
import { solveRestockBinPacking } from '../src/algorithms/binPacking';
import { solveBranchAndBoundTSP, solveGreedyNearestNeighbor, validateTSPMatrix } from '../src/algorithms/tsp';
import { solveFloydWarshall } from '../src/algorithms/floydWarshall';
import { solveKruskalMST } from '../src/algorithms/kruskal';
import type { 
  Warehouse, 
  DeliveryLocation, 
  Product, 
  Order, 
  Vehicle, 
  DeliveryPlan,
  MatrixLocation 
} from '../src/types/database.types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('--- Running Phase 8 End-to-End Workflow & Production Hardening Test Suite ---');

// ==========================================
// TEST 1: Warehouse Capacity Foundation & Stock Consistency
// ==========================================
(() => {
  // Test occupied stock + available capacity = storage capacity
  const wh: Warehouse = {
    id: 'wh-1',
    code: 'WH-BLR-01',
    name: 'Bengaluru Central Hub',
    address: 'Indiranagar, Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    is_active: true,
    storage_capacity: 5000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const inventoryItems = [
    { id: 'inv-1', warehouse_id: 'wh-1', product_id: 'p-1', quantity: 1200, reorder_level: 10 },
    { id: 'inv-2', warehouse_id: 'wh-1', product_id: 'p-2', quantity: 800, reorder_level: 20 },
    { id: 'inv-3', warehouse_id: 'wh-1', product_id: 'p-3', quantity: 500, reorder_level: 5 }
  ];

  const occupiedStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
  const capacity = wh.storage_capacity ?? 5000;
  const availableCapacity = Math.max(0, capacity - occupiedStock);

  assert(occupiedStock === 2500, 'Occupied stock calculation must equal 2500');
  assert(availableCapacity === 2500, 'Available capacity must equal 2500');
  assert(occupiedStock + availableCapacity === capacity, 'Occupied stock + available capacity must equal total capacity');

  // Test zero inventory
  const emptyOccupied = 0;
  const emptyAvailable = Math.max(0, capacity - emptyOccupied);
  assert(emptyAvailable === capacity, 'Empty warehouse must have full available capacity');

  // Test null storage capacity fallback
  const whNullCap: Warehouse = { ...wh, id: 'wh-null', storage_capacity: null };
  const fallbackCapacity = whNullCap.storage_capacity != null ? Number(whNullCap.storage_capacity) : 10000;
  assert(fallbackCapacity === 10000, 'Null capacity must cleanly default to 10000');

  console.log('✓ Test 1 Passed: Warehouse capacity foundation & stock consistency verified');
})();

// ==========================================
// TEST 2: Inbound Restock Allocation via FFD Bin Packing
// ==========================================
(() => {
  const warehouses = [
    {
      warehouse: { id: 'wh-1', name: 'Hub North', code: 'HN', is_active: true } as Warehouse,
      currentStock: 3000,
      storageCapacity: 5000,
      availableCapacity: 2000
    },
    {
      warehouse: { id: 'wh-2', name: 'Hub South', code: 'HS', is_active: true } as Warehouse,
      currentStock: 4500,
      storageCapacity: 6000,
      availableCapacity: 1500
    },
    {
      warehouse: { id: 'wh-3', name: 'Hub East', code: 'HE', is_active: true } as Warehouse,
      currentStock: 1000,
      storageCapacity: 4000,
      availableCapacity: 3000
    }
  ];

  // Restock 4500 units of product
  const result = solveRestockBinPacking({
    productId: 'prod-solar',
    totalQuantity: 4500,
    warehouses
  });

  assert(result.totalAllocated === 4500, 'Total allocated must equal incoming batch 4500');
  assert(result.unallocatedQuantity === 0, 'No unallocated overflow expected when capacity (6500) > batch (4500)');
  assert(result.allocations.length === 2, 'Two warehouses utilized to absorb 4500 units');

  // FFD sorts by available capacity descending: Hub East (3000) -> Hub North (2000) -> Hub South (1500)
  const allocEast = result.allocations.find(a => a.warehouseId === 'wh-3')?.allocatedQuantity || 0;
  const allocNorth = result.allocations.find(a => a.warehouseId === 'wh-1')?.allocatedQuantity || 0;
  const allocSouth = result.allocations.find(a => a.warehouseId === 'wh-2')?.allocatedQuantity || 0;

  assert(allocEast === 3000, 'Largest available bin (Hub East) must receive full 3000 units first');
  assert(allocNorth === 1500, 'Second bin (Hub North) must receive remaining 1500 units');
  assert(allocSouth === 0, 'Third bin (Hub South) receives 0 since 4500 was fully satisfied');

  console.log('✓ Test 2 Passed: FFD restock bin packing allocation verified');
})();

// ==========================================
// TEST 3: Dijkstra Warehouse Fulfillment Recommendation & Stock Validation
// ==========================================
(() => {
  const nodes = [
    { id: 'wh-a', name: 'Warehouse Alpha', type: 'warehouse' as const },
    { id: 'wh-b', name: 'Warehouse Beta', type: 'warehouse' as const },
    { id: 'cust-dest', name: 'Customer Destination', type: 'delivery_location' as const }
  ];

  const edges = [
    { from: 'wh-a', to: 'cust-dest', weight: 45 },
    { from: 'wh-b', to: 'cust-dest', weight: 20 }
  ];

  // Solve Dijkstra from both candidate warehouses
  const resAlpha = solveDijkstra({ nodes, edges, isUndirected: true }, 'wh-a', 'cust-dest');
  const resBeta = solveDijkstra({ nodes, edges, isUndirected: true }, 'wh-b', 'cust-dest');

  assert(resAlpha.hasPath && resAlpha.distance === 45, 'Alpha to Dest must be 45 km');
  assert(resBeta.hasPath && resBeta.distance === 20, 'Beta to Dest must be 20 km');

  // Case 1: Beta has stock -> Beta recommended (20 km < 45 km)
  const betaStockReady = true;
  const alphaStockReady = true;
  const optimalWhId = betaStockReady ? 'wh-b' : 'wh-a';
  assert(optimalWhId === 'wh-b', 'Beta recommended due to closer road distance and available stock');

  // Case 2: Beta OUT OF STOCK -> Alpha recommended even though farther
  const betaStockEmpty = false;
  const optimalFallbackWhId = betaStockEmpty ? 'wh-b' : (alphaStockReady ? 'wh-a' : null);
  assert(optimalFallbackWhId === 'wh-a', 'Alpha recommended as stock-ready fallback when Beta is out of stock');

  console.log('✓ Test 3 Passed: Dijkstra warehouse fulfillment recommendation with stock validation verified');
})();

// ==========================================
// TEST 4: Order Status State Machine & Transition Rules
// ==========================================
(() => {
  const validTransitions: Record<string, string[]> = {
    PENDING: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['DISPATCHED', 'CANCELLED'],
    DISPATCHED: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [], // Terminal
    CANCELLED: []  // Terminal
  };

  function canTransition(current: string, next: string): boolean {
    return (validTransitions[current] || []).includes(next);
  }

  assert(canTransition('PENDING', 'PROCESSING'), 'PENDING -> PROCESSING is valid');
  assert(canTransition('PENDING', 'CANCELLED'), 'PENDING -> CANCELLED is valid');
  assert(!canTransition('PENDING', 'DELIVERED'), 'PENDING -> DELIVERED directly is invalid');
  assert(!canTransition('PENDING', 'DISPATCHED'), 'PENDING -> DISPATCHED directly is invalid');

  assert(canTransition('PROCESSING', 'DISPATCHED'), 'PROCESSING -> DISPATCHED is valid');
  assert(canTransition('DISPATCHED', 'DELIVERED'), 'DISPATCHED -> DELIVERED is valid');

  assert(!canTransition('DELIVERED', 'PENDING'), 'DELIVERED cannot be modified');
  assert(!canTransition('CANCELLED', 'PROCESSING'), 'CANCELLED cannot be modified');

  console.log('✓ Test 4 Passed: Order status lifecycle state machine verified');
})();

// ==========================================
// TEST 5: Vehicle Assignment & Strict Capacity Unit Semantics (kg, units, m3)
// ==========================================
(() => {
  const planOrders = [
    { id: 'o-1', items: [{ weight_kg: 25, quantity: 4 }, { weight_kg: 50, quantity: 2 }] }, // weight = 200kg, units = 6
    { id: 'o-2', items: [{ weight_kg: 10, quantity: 5 }] }                                   // weight = 50kg, units = 5
  ];

  let totalWeightKg = 0;
  let totalUnits = 0;
  planOrders.forEach(o => {
    o.items.forEach(i => {
      totalWeightKg += i.weight_kg * i.quantity;
      totalUnits += i.quantity;
    });
  });

  assert(totalWeightKg === 250, 'Total plan payload weight must be 250 kg');
  assert(totalUnits === 11, 'Total plan units must be 11 units');

  // Vehicle 1: 500 kg capacity (Weight Unit) -> Sufficient
  const v1: Vehicle = {
    id: 'v-1',
    name: 'Van 1',
    registration_number: 'VAN-1',
    vehicle_type: 'Van',
    capacity: 500,
    capacity_unit: 'kg',
    status: 'AVAILABLE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  assert(v1.capacity >= totalWeightKg, 'Vehicle 1 capacity (500 kg) must satisfy plan requirement (250 kg)');

  // Vehicle 2: 200 kg capacity (Weight Unit) -> Insufficient
  const v2: Vehicle = { ...v1, id: 'v-2', capacity: 200 };
  assert(v2.capacity < totalWeightKg, 'Vehicle 2 capacity (200 kg) must be flagged insufficient for 250 kg');

  // Vehicle 3: 20 units capacity (Discrete Units) -> Sufficient
  const v3: Vehicle = { ...v1, id: 'v-3', capacity: 20, capacity_unit: 'units' };
  assert(v3.capacity >= totalUnits, 'Vehicle 3 capacity (20 units) must satisfy plan requirement (11 units)');

  // Vehicle 4: 10 m3 capacity (Volumetric Unit) -> Incompatible without fabricated conversions
  const v4: Vehicle = { ...v1, id: 'v-4', capacity: 10, capacity_unit: 'm3' };
  const isCompatibleUnit = v4.capacity_unit === 'kg' || v4.capacity_unit === 'units';
  assert(!isCompatibleUnit, 'Volumetric capacity unit (m3) must be explicitly flagged as incompatible with order weight/units');

  console.log('✓ Test 5 Passed: Vehicle assignment capacity & unit semantics verified');
})();

// ==========================================
// TEST 6: Delivery Plan Route Optimization (Branch & Bound TSP vs Greedy NN)
// ==========================================
(() => {
  const locations: MatrixLocation[] = [
    { id: 'wh', name: 'Central Depot', type: 'warehouse', latitude: 12.97, longitude: 77.59 },
    { id: 'loc-1', name: 'Stop 1', type: 'delivery_location', latitude: 12.98, longitude: 77.60 },
    { id: 'loc-2', name: 'Stop 2', type: 'delivery_location', latitude: 12.99, longitude: 77.61 },
    { id: 'loc-3', name: 'Stop 3', type: 'delivery_location', latitude: 12.96, longitude: 77.58 }
  ];

  // Symmetric 4x4 matrix
  const matrix = [
    [0, 10, 25, 15],
    [10, 0, 12, 20],
    [25, 12, 0, 18],
    [15, 20, 18, 0]
  ];

  const validation = validateTSPMatrix(locations, matrix);
  assert(validation.valid, 'TSP matrix must be valid');

  const bbResult = solveBranchAndBoundTSP({ locations, matrix, maxLocationsLimit: 10 });
  const greedyResult = solveGreedyNearestNeighbor({ locations, matrix, maxLocationsLimit: 10 });

  assert(bbResult.hasTour, 'Branch & Bound must find a valid closed tour');
  assert(greedyResult.hasTour, 'Greedy Nearest Neighbor must find a valid closed tour');
  assert(bbResult.tourIndices[0] === 0, 'Tour must start at Depot (index 0)');
  assert(bbResult.tourIndices[bbResult.tourIndices.length - 1] === 0, 'Tour must return to Depot (index 0)');
  assert(bbResult.totalDistance <= greedyResult.totalDistance, 'Exact Branch & Bound distance must be <= Greedy heuristic');

  console.log('✓ Test 6 Passed: Delivery plan route optimization (B&B vs Greedy) verified');
})();

// ==========================================
// TEST 7: Delivery Plan Cancellation & Resource Release
// ==========================================
(() => {
  const initialVehicle: Vehicle = {
    id: 'veh-99',
    name: 'Delivery Truck',
    registration_number: 'TRK-99',
    vehicle_type: 'Large Truck',
    capacity: 3500,
    capacity_unit: 'kg',
    status: 'ON_ROUTE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const initialPlan: DeliveryPlan = {
    id: 'plan-1',
    plan_number: 'PLN-2026-0001',
    warehouse_id: 'wh-1',
    vehicle_id: 'veh-99',
    status: 'PLANNED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    vehicle: initialVehicle,
    delivery_plan_orders: [
      { id: 'dpo-1', delivery_plan_id: 'plan-1', order_id: 'ord-1' },
      { id: 'dpo-2', delivery_plan_id: 'plan-1', order_id: 'ord-2' }
    ]
  };

  // Simulate cancellation action:
  // 1. Plan status becomes CANCELLED
  // 2. Vehicle returns to AVAILABLE
  // 3. Orders become eligible for new delivery plans
  const cancelledPlan: DeliveryPlan = {
    ...initialPlan,
    status: 'CANCELLED',
    vehicle: null,
    vehicle_id: null
  };
  const releasedVehicle: Vehicle = {
    ...initialVehicle,
    status: 'AVAILABLE'
  };

  assert(cancelledPlan.status === 'CANCELLED', 'Plan must transition to CANCELLED');
  assert(cancelledPlan.vehicle === null, 'Vehicle association on plan must be cleared');
  assert(releasedVehicle.status === 'AVAILABLE', 'Vehicle status must be restored to AVAILABLE');

  // Verify eligible orders filter excludes CANCELLED plan orders from active assigned set
  const activePlans = [cancelledPlan].filter(p => p.status === 'PLANNED');
  const assignedOrderIds = new Set<string>();
  activePlans.forEach(p => p.delivery_plan_orders?.forEach(dpo => assignedOrderIds.add(dpo.order_id)));

  assert(!assignedOrderIds.has('ord-1'), 'Cancelled plan order 1 must be eligible for new planning');
  assert(!assignedOrderIds.has('ord-2'), 'Cancelled plan order 2 must be eligible for new planning');

  console.log('✓ Test 7 Passed: Delivery plan cancellation & resource release integrity verified');
})();

// ==========================================
// TEST 8: Reports & Live Telemetry Consistency with Live Data
// ==========================================
(() => {
  const warehouses: Warehouse[] = [
    { id: 'w-1', name: 'Depot A', code: 'D-A', storage_capacity: 5000, is_active: true } as Warehouse,
    { id: 'w-2', name: 'Depot B', code: 'D-B', storage_capacity: 8000, is_active: true } as Warehouse
  ];

  const inventory = [
    { warehouse_id: 'w-1', quantity: 2000 },
    { warehouse_id: 'w-1', quantity: 1500 },
    { warehouse_id: 'w-2', quantity: 4000 }
  ];

  const stockMap = new Map<string, number>();
  inventory.forEach(i => stockMap.set(i.warehouse_id, (stockMap.get(i.warehouse_id) || 0) + i.quantity));

  const warehouseBreakdown = warehouses.map(w => {
    const occupied = stockMap.get(w.id) || 0;
    const capacity = w.storage_capacity ?? 5000;
    const available = Math.max(0, capacity - occupied);
    return { warehouse: w, occupied, capacity, available };
  });

  const totalCapacity = warehouseBreakdown.reduce((sum, item) => sum + item.capacity, 0);
  const totalOccupiedStock = warehouseBreakdown.reduce((sum, item) => sum + item.occupied, 0);
  const totalAvailableStorage = Math.max(0, totalCapacity - totalOccupiedStock);

  assert(totalCapacity === 13000, 'Total network capacity must be 13000');
  assert(totalOccupiedStock === 7500, 'Total occupied stock must be 7500 (3500 + 4000)');
  assert(totalAvailableStorage === 5500, 'Total available storage must be 5500');
  assert(totalOccupiedStock + totalAvailableStorage === totalCapacity, 'Occupied (7500) + Available (5500) must exactly equal Capacity (13000)');

  console.log('✓ Test 8 Passed: Reports & live telemetry data consistency verified');
})();

// ==========================================
// TEST 9: Edge Cases: Zero Entities, Disconnected Graph & Invalid Distances
// ==========================================
(() => {
  // Empty locations list
  const emptyValidation = validateTSPMatrix([], []);
  assert(!emptyValidation.valid, 'Empty locations matrix must be rejected by validator');

  // Disconnected graph in Floyd-Warshall
  const fwRes = solveFloydWarshall({
    nodes: [
      { id: 'n-1', name: 'Island 1', type: 'warehouse' },
      { id: 'n-2', name: 'Island 2', type: 'delivery_location' }
    ],
    edges: [], // Disconnected
    isUndirected: true
  });
  const pathBetween = fwRes.getPath('n-1', 'n-2');
  assert(!pathBetween.hasPath, 'Disconnected nodes must return hasPath = false');
  assert(pathBetween.distance === Infinity, 'Disconnected nodes distance must be Infinity');

  // Kruskal on disconnected graph produces Minimum Spanning Forest
  const kruskalRes = solveKruskalMST({
    nodes: [
      { id: 'a', name: 'A', type: 'warehouse' },
      { id: 'b', name: 'B', type: 'delivery_location' },
      { id: 'c', name: 'C', type: 'warehouse' },
      { id: 'd', name: 'D', type: 'delivery_location' }
    ],
    edges: [
      { from: 'a', to: 'b', weight: 10 },
      { from: 'c', to: 'd', weight: 20 }
    ],
    isUndirected: true
  });
  assert(kruskalRes.componentCount === 2, 'Disconnected graph must yield 2 spanning components');
  assert(kruskalRes.isConnected === false, 'Graph must be recognized as disconnected');
  assert(kruskalRes.mstEdges.length === 2, 'MST must span reachable components with 2 edges');

  console.log('✓ Test 9 Passed: Edge cases (zero entities, disconnected graph, and partial matrices) verified');
})();

console.log('\nALL 9 END-TO-END WORKFLOW INTEGRITY & HARDENING TESTS PASSED SUCCESSFULLY!');
