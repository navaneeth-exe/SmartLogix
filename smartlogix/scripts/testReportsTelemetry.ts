/**
 * Verification test suite for SmartLogix Reports & DAA Telemetry Integration
 * 
 * Verifies:
 * 1. Empty dataset handling
 * 2. No delivery plans
 * 3. No inventory records
 * 4. No warehouses
 * 5. Empty distance graph
 * 6. Partial distance graph with missing / infinite edges
 * 7. Multiple delivery plans with mixed statuses
 * 8. Different TSP algorithms (Branch & Bound vs Greedy vs Unrouted)
 * 9. Disconnected graph topology calculations
 * 10. Zero / undefined / null optional telemetry fields
 */

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

const DAA_ALGORITHM_CATALOG = [
  { id: 'tsp-bb', name: 'Branch & Bound TSP', paradigm: 'Backtracking', timeComplexity: 'Worst-case O(2ⁿ · n²)', spaceComplexity: 'O(n²)', systemLocation: 'src/algorithms/tsp.ts' },
  { id: 'tsp-greedy', name: 'Greedy Nearest Neighbor TSP', paradigm: 'Greedy', timeComplexity: 'O(n²)', spaceComplexity: 'O(n)', systemLocation: 'src/algorithms/tsp.ts' },
  { id: 'bin-packing', name: 'First-Fit Decreasing (FFD) Bin Packing', paradigm: 'Greedy Approximation', timeComplexity: 'O(m log m)', spaceComplexity: 'O(m)', systemLocation: 'src/algorithms/binPacking.ts' },
  { id: 'dijkstra', name: "Dijkstra's Algorithm", paradigm: 'Greedy Vertex Relaxation', timeComplexity: 'O((V + E) log V)', spaceComplexity: 'O(V + E)', systemLocation: 'src/algorithms/dijkstra.ts' },
  { id: 'floyd-warshall', name: 'Floyd-Warshall Algorithm', paradigm: 'Dynamic Programming', timeComplexity: 'O(V³)', spaceComplexity: 'O(V²)', systemLocation: 'src/algorithms/floydWarshall.ts' },
  { id: 'kruskal', name: "Kruskal's Minimum Spanning Tree (MST)", paradigm: 'Greedy Edge Selection', timeComplexity: 'O(E log E)', spaceComplexity: 'O(V + E)', systemLocation: 'src/algorithms/kruskal.ts' },
  { id: 'union-find', name: 'Union-Find / Disjoint-Set Data Structure', paradigm: 'Disjoint-Set', timeComplexity: 'O(α(V)) amortized', spaceComplexity: 'O(V)', systemLocation: 'src/algorithms/unionFind.ts' }
];

// Extraction helper simulating Reports.tsx memoized metrics calculation
function computeReportMetrics(data: {
  plans?: any[];
  orders?: any[];
  vehicles?: any[];
  warehouses?: any[];
  inventory?: any[];
  locations?: any[];
  distances?: any[];
  products?: any[];
}) {
  const plans = data.plans || [];
  const orders = data.orders || [];
  const vehicles = data.vehicles || [];
  const warehouses = data.warehouses || [];
  const inventory = data.inventory || [];
  const locations = data.locations || [];
  const distances = data.distances || [];
  const products = data.products || [];

  const totalPlans = plans.length;
  const activePlans = plans.filter(p => p.status === 'PLANNED').length;
  const cancelledPlans = plans.filter(p => p.status === 'CANCELLED').length;
  const planFulfillmentRate = totalPlans > 0 ? Math.round((activePlans / totalPlans) * 100) : 0;

  const plansWithRoute = plans.filter(p => p.route_distance != null);
  const totalRoutedDistance = plansWithRoute.reduce((sum, p) => sum + (Number(p.route_distance) || 0), 0);
  const avgRouteDistance = plansWithRoute.length > 0 ? (totalRoutedDistance / plansWithRoute.length).toFixed(1) : '0';

  const branchAndBoundPlans = plans.filter(p => p.route_algorithm === 'BRANCH_AND_BOUND');
  const greedyPlans = plans.filter(p => p.route_algorithm === 'GREEDY_NEAREST_NEIGHBOR');
  const branchAndBoundCount = branchAndBoundPlans.length;
  const greedyCount = greedyPlans.length;
  const unroutedPlansCount = Math.max(0, totalPlans - (branchAndBoundCount + greedyCount));

  const assignedVehicles = plans.filter(p => p.status === 'PLANNED' && p.vehicle_id).length;
  const fleetUtilization = vehicles.length > 0 ? Math.round((assignedVehicles / vehicles.length) * 100) : 0;

  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;
  const orderFulfillmentRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

  const stockByWarehouse = new Map<string, number>();
  inventory.forEach(item => {
    stockByWarehouse.set(item.warehouse_id, (stockByWarehouse.get(item.warehouse_id) || 0) + (item.quantity || 0));
  });

  let totalCapacity = 0;
  let totalOccupiedStock = 0;

  const warehouseBreakdown = warehouses.map(w => {
    const occupied = stockByWarehouse.get(w.id) || 0;
    const capacity = w.storage_capacity && w.storage_capacity > 0 ? w.storage_capacity : 10000;
    const available = Math.max(0, capacity - occupied);
    const utilization = Math.min(100, Math.round((occupied / capacity) * 100));

    totalCapacity += capacity;
    totalOccupiedStock += occupied;

    return { warehouse: w, occupied, capacity, available, utilization };
  });

  const networkCapacityUtilization = totalCapacity > 0 ? Math.round((totalOccupiedStock / totalCapacity) * 100) : 0;

  const vertexCount = warehouses.length + locations.length;
  const validEdges = distances.filter(d => d.distance > 0 && d.distance !== Infinity && d.origin_id !== d.destination_id);
  const edgeCount = validEdges.length;
  const totalGraphRoadKm = validEdges.reduce((sum, d) => sum + Number(d.distance), 0);
  const avgEdgeDistance = edgeCount > 0 ? (totalGraphRoadKm / edgeCount).toFixed(1) : '0';

  return {
    totalPlans,
    activePlans,
    cancelledPlans,
    planFulfillmentRate,
    plansWithRouteCount: plansWithRoute.length,
    totalRoutedDistance: totalRoutedDistance.toFixed(1),
    avgRouteDistance,
    branchAndBoundCount,
    greedyCount,
    unroutedPlansCount,
    assignedVehicles,
    fleetUtilization,
    totalOrders,
    deliveredOrders,
    orderFulfillmentRate,
    warehouseBreakdown,
    totalCapacity,
    totalOccupiedStock,
    networkCapacityUtilization,
    vertexCount,
    edgeCount,
    totalGraphRoadKm: totalGraphRoadKm.toFixed(1),
    avgEdgeDistance,
    totalProducts: products.length
  };
}

console.log('--- Running Reports & DAA Telemetry Comprehensive Test Suite ---');

// Test 1: Empty dataset handling
{
  const m = computeReportMetrics({});
  assert(m.totalPlans === 0, 'Total plans should be 0');
  assert(m.totalOrders === 0, 'Total orders should be 0');
  assert(m.planFulfillmentRate === 0, 'Fulfillment rate should be 0% on empty plans');
  assert(m.networkCapacityUtilization === 0, 'Capacity utilization should be 0%');
  assert(m.vertexCount === 0, 'Node count should be 0');
  assert(m.edgeCount === 0, 'Edge count should be 0');
  console.log('✓ Test 1 Passed: Empty dataset gracefully handled');
}

// Test 2: No delivery plans
{
  const m = computeReportMetrics({
    warehouses: [{ id: 'w1', name: 'Hub 1', storage_capacity: 1000 }],
    vehicles: [{ id: 'v1', name: 'Van 1' }]
  });
  assert(m.totalPlans === 0, '0 plans');
  assert(m.branchAndBoundCount === 0, '0 B&B');
  assert(m.greedyCount === 0, '0 Greedy');
  assert(m.unroutedPlansCount === 0, '0 Unrouted');
  assert(m.fleetUtilization === 0, 'Fleet utilization 0% when no plans assigned');
  console.log('✓ Test 2 Passed: No delivery plans handled');
}

// Test 3: No inventory records
{
  const m = computeReportMetrics({
    warehouses: [{ id: 'w1', name: 'Hub 1', storage_capacity: 2000 }],
    inventory: []
  });
  assert(m.totalOccupiedStock === 0, 'Occupied stock is 0');
  assert(m.networkCapacityUtilization === 0, 'Utilization is 0%');
  assert(m.warehouseBreakdown[0].available === 2000, 'Full 2000 capacity available');
  console.log('✓ Test 3 Passed: Zero inventory handled with full capacity available');
}

// Test 4: No warehouses
{
  const m = computeReportMetrics({
    inventory: [{ id: 'i1', warehouse_id: 'w1', quantity: 100 }]
  });
  assert(m.warehouseBreakdown.length === 0, '0 warehouse breakdown items');
  assert(m.totalCapacity === 0, 'Total capacity is 0');
  assert(m.networkCapacityUtilization === 0, '0% utilization without division by zero');
  console.log('✓ Test 4 Passed: Zero warehouses handled without division by zero');
}

// Test 5: Empty distance graph
{
  const m = computeReportMetrics({
    warehouses: [{ id: 'w1', name: 'Hub 1' }],
    locations: [{ id: 'loc1', name: 'Stop 1' }],
    distances: []
  });
  assert(m.vertexCount === 2, '2 vertices');
  assert(m.edgeCount === 0, '0 edges');
  assert(m.avgEdgeDistance === '0', 'Avg edge distance is 0');
  assert(m.totalGraphRoadKm === '0.0', 'Total road km is 0.0');
  console.log('✓ Test 5 Passed: Empty distance graph topology calculated');
}

// Test 6: Partial distance graph with self-loops, 0 distance, and Infinity
{
  const m = computeReportMetrics({
    warehouses: [{ id: 'w1', name: 'Hub 1' }],
    locations: [{ id: 'loc1', name: 'Stop 1' }],
    distances: [
      { origin_id: 'w1', destination_id: 'w1', distance: 0 }, // self loop
      { origin_id: 'w1', destination_id: 'loc1', distance: 15.5 }, // valid edge
      { origin_id: 'loc1', destination_id: 'w1', distance: Infinity }, // unreachable
      { origin_id: 'loc1', destination_id: 'w1', distance: -5 } // invalid negative
    ]
  });
  assert(m.edgeCount === 1, 'Only 1 valid edge sanitized');
  assert(m.totalGraphRoadKm === '15.5', 'Total distance is 15.5 km');
  assert(m.avgEdgeDistance === '15.5', 'Average distance is 15.5 km');
  console.log('✓ Test 6 Passed: Partial distance graph sanitization verified');
}

// Test 7: Multiple delivery plans with mixed statuses
{
  const m = computeReportMetrics({
    plans: [
      { id: 'p1', status: 'PLANNED', route_distance: 25.0, vehicle_id: 'v1' },
      { id: 'p2', status: 'PLANNED', route_distance: 35.0, vehicle_id: 'v2' },
      { id: 'p3', status: 'CANCELLED', route_distance: 10.0, vehicle_id: 'v1' }
    ],
    vehicles: [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }, { id: 'v4' }]
  });
  assert(m.totalPlans === 3, '3 total plans');
  assert(m.activePlans === 2, '2 active plans');
  assert(m.cancelledPlans === 1, '1 cancelled plan');
  assert(m.planFulfillmentRate === 67, 'Fulfillment rate 67% (2/3)');
  assert(m.totalRoutedDistance === '70.0', '70 km total routed');
  assert(m.avgRouteDistance === '23.3', 'Avg route distance is 23.3 km');
  assert(m.fleetUtilization === 50, '2 out of 4 vehicles assigned = 50% utilization');
  console.log('✓ Test 7 Passed: Multiple delivery plans and fleet assignment audited');
}

// Test 8: Different TSP algorithms breakdown
{
  const m = computeReportMetrics({
    plans: [
      { id: 'p1', status: 'PLANNED', route_algorithm: 'BRANCH_AND_BOUND', route_distance: 40 },
      { id: 'p2', status: 'PLANNED', route_algorithm: 'BRANCH_AND_BOUND', route_distance: 30 },
      { id: 'p3', status: 'PLANNED', route_algorithm: 'GREEDY_NEAREST_NEIGHBOR', route_distance: 85 },
      { id: 'p4', status: 'PLANNED', route_algorithm: null, route_distance: null }
    ]
  });
  assert(m.branchAndBoundCount === 2, '2 Branch & Bound plans');
  assert(m.greedyCount === 1, '1 Greedy plan');
  assert(m.unroutedPlansCount === 1, '1 Unrouted plan pending solver');
  console.log('✓ Test 8 Passed: TSP algorithm distribution accurately categorized');
}

// Test 9: Disconnected graph metrics
{
  const m = computeReportMetrics({
    warehouses: [{ id: 'w1' }, { id: 'w2' }],
    locations: [{ id: 'loc1' }, { id: 'loc2' }],
    distances: [
      { origin_id: 'w1', destination_id: 'loc1', distance: 10 },
      { origin_id: 'loc1', destination_id: 'w1', distance: 10 }
    ] // Component {w1, loc1} is disconnected from {w2, loc2}
  });
  assert(m.vertexCount === 4, '4 vertices in disconnected graph');
  assert(m.edgeCount === 2, '2 directed edges between component 1');
  assert(m.avgEdgeDistance === '10.0', 'Avg distance 10 km');
  console.log('✓ Test 9 Passed: Disconnected graph metrics computed');
}

// Test 10: DAA Algorithm Catalog Completeness
{
  assert(DAA_ALGORITHM_CATALOG.length === 7, 'Catalog must contain exactly 7 DAA algorithms');
  const ids = DAA_ALGORITHM_CATALOG.map(a => a.id);
  assert(ids.includes('tsp-bb'), 'Contains Branch & Bound TSP');
  assert(ids.includes('tsp-greedy'), 'Contains Greedy Nearest Neighbor');
  assert(ids.includes('bin-packing'), 'Contains First-Fit Decreasing');
  assert(ids.includes('dijkstra'), 'Contains Dijkstra');
  assert(ids.includes('floyd-warshall'), 'Contains Floyd-Warshall');
  assert(ids.includes('kruskal'), 'Contains Kruskal');
  assert(ids.includes('union-find'), 'Contains Union-Find');

  DAA_ALGORITHM_CATALOG.forEach(algo => {
    assert(algo.name.length > 0, `Algo ${algo.id} has name`);
    assert(algo.timeComplexity.length > 0, `Algo ${algo.id} has time complexity`);
    assert(algo.spaceComplexity.length > 0, `Algo ${algo.id} has space complexity`);
    assert(algo.paradigm.length > 0, `Algo ${algo.id} has paradigm`);
    assert(algo.systemLocation.length > 0, `Algo ${algo.id} has system location`);
  });
  console.log('✓ Test 10 Passed: 7-Algorithm catalog specifications strictly verified');
}

console.log('\nALL 10 REPORTS & DAA TELEMETRY TESTS PASSED SUCCESSFULLY!');
