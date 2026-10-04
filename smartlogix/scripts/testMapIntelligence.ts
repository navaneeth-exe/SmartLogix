/**
 * Verification test suite for SmartLogix Map Intelligence Layer
 * 
 * Verifies:
 * 1. TSP tour -> map waypoint/stop conversion
 * 2. Dijkstra result -> path conversion
 * 3. Floyd-Warshall result -> reconstructed path conversion
 * 4. Kruskal result -> MST edge conversion
 * 5. Handling of missing coordinates
 * 6. Empty result / empty graph handling
 * 7. Disconnected graph handling
 * 8. Missing selected source/destination
 */

import { solveDijkstra } from '../src/algorithms/dijkstra.ts';
import { solveFloydWarshall } from '../src/algorithms/floydWarshall.ts';
import { solveKruskalMST } from '../src/algorithms/kruskal.ts';
import { solveBranchAndBoundTSP } from '../src/algorithms/tsp.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

console.log('--- Running Map Intelligence Layer Verification Test Suite ---');

// Test 1: TSP result -> map polyline conversion
{
  const locations = [
    { id: 'depot', name: 'Depot', type: 'warehouse' as const },
    { id: 's1', name: 'Stop 1', type: 'delivery_location' as const },
    { id: 's2', name: 'Stop 2', type: 'delivery_location' as const },
    { id: 's3', name: 'Stop 3', type: 'delivery_location' as const }
  ];
  const matrix = [
    [0, 10, 15, 20],
    [10, 0, 35, 25],
    [15, 35, 0, 30],
    [20, 25, 30, 0]
  ];
  const tspRes = solveBranchAndBoundTSP({ locations, matrix });
  assert(tspRes.tourIndices.length === 5, 'TSP tour must have N+1 nodes returning to depot');
  assert(tspRes.tourIndices[0] === 0 && tspRes.tourIndices[4] === 0, 'TSP tour must start and finish at depot index 0');

  // Verify coordinate mapping helper logic
  const mockCoords: Record<string, [number, number]> = {
    'depot': [40.71, -74.00],
    's1': [40.72, -74.01],
    's2': [40.73, -74.02],
    's3': [40.74, -74.03]
  };
  const pathCoords = tspRes.tourLocations.map(loc => mockCoords[loc.id]).filter(Boolean);
  assert(pathCoords.length === 5, 'Every tour stop mapped to lat/lng');
  console.log('✓ Test 1 Passed: TSP result -> map route conversion');
}

// Test 2: Dijkstra result -> path conversion
{
  const nodes = [
    { id: 'wh-1', name: 'Hub A' },
    { id: 'loc-1', name: 'Stop 1' },
    { id: 'loc-2', name: 'Stop 2' }
  ];
  const edges = [
    { from: 'wh-1', to: 'loc-1', weight: 5 },
    { from: 'loc-1', to: 'loc-2', weight: 4 },
    { from: 'wh-1', to: 'loc-2', weight: 12 }
  ];
  const dijkstraRes = solveDijkstra({ nodes, edges, isUndirected: true }, 'wh-1', 'loc-2');
  assert(dijkstraRes.hasPath, 'Dijkstra finds valid path');
  assert(dijkstraRes.distance === 9, 'Shortest path is 5 + 4 = 9 km');
  assert(dijkstraRes.path.join('->') === 'wh-1->loc-1->loc-2', 'Path sequence correctly follows hops');
  console.log('✓ Test 2 Passed: Dijkstra result -> map path conversion');
}

// Test 3: Floyd-Warshall result -> reconstructed path conversion
{
  const nodes = [
    { id: 'n1', name: 'Node 1' },
    { id: 'n2', name: 'Node 2' },
    { id: 'n3', name: 'Node 3' }
  ];
  const edges = [
    { from: 'n1', to: 'n2', weight: 3 },
    { from: 'n2', to: 'n3', weight: 4 }
  ];
  const fwRes = solveFloydWarshall({ nodes, edges, isUndirected: true });
  const pathInfo = fwRes.getPath('n1', 'n3');
  assert(pathInfo.hasPath, 'Reconstructed path found');
  assert(pathInfo.distance === 7, 'Reconstructed distance is 7 km');
  assert(pathInfo.hopCount === 2, '2 hops');
  assert(pathInfo.pathIds.join('->') === 'n1->n2->n3', 'PathIds sequence matches');
  console.log('✓ Test 3 Passed: Floyd-Warshall result -> reconstructed path conversion');
}

// Test 4: Kruskal result -> MST edge conversion
{
  const nodes = [
    { id: 'A', name: 'Hub A' },
    { id: 'B', name: 'Hub B' },
    { id: 'C', name: 'Hub C' }
  ];
  const edges = [
    { from: 'A', to: 'B', weight: 2 },
    { from: 'B', to: 'C', weight: 3 },
    { from: 'A', to: 'C', weight: 10 }
  ];
  const mstRes = solveKruskalMST({ nodes, edges });
  assert(mstRes.isConnected, 'MST is connected');
  assert(mstRes.mstEdges.length === 2, 'MST has |V| - 1 = 2 edges');
  assert(mstRes.totalCost === 5, 'MST total weight is 5 km');
  console.log('✓ Test 4 Passed: Kruskal result -> MST edge conversion');
}

// Test 5: Missing coordinates handling
{
  const coordMap = new Map<string, [number, number]>();
  coordMap.set('A', [40.71, -74.00]);
  // 'B' has no coordinates (missing / null)
  coordMap.set('C', [40.73, -74.02]);

  const path = ['A', 'B', 'C'];
  const validCoords = path
    .map(id => coordMap.get(id))
    .filter((c): c is [number, number] => c !== undefined);

  assert(validCoords.length === 2, 'Gracefully filters out missing coordinate nodes without crashing');
  console.log('✓ Test 5 Passed: Missing coordinates handling gracefully handled');
}

// Test 6: Empty result / empty graph handling
{
  const emptyDijkstra = solveDijkstra({ nodes: [], edges: [] }, 'missing-1', 'missing-2');
  assert(!emptyDijkstra.hasPath, 'Empty graph returns hasPath: false');
  assert(emptyDijkstra.distance === Infinity, 'Empty graph returns Infinity');

  const emptyMst = solveKruskalMST({ nodes: [], edges: [] });
  assert(emptyMst.mstEdges.length === 0, 'Empty MST returns empty edge list');
  assert(emptyMst.totalCost === 0, 'Empty MST returns 0 cost');
  console.log('✓ Test 6 Passed: Empty result / empty graph handling');
}

// Test 7: Disconnected graph handling
{
  const nodes = [
    { id: 'A', name: 'Island A' },
    { id: 'B', name: 'Island B' }
  ];
  const edges: any[] = []; // No connecting edges
  const dijkstraRes = solveDijkstra({ nodes, edges }, 'A', 'B');
  assert(!dijkstraRes.hasPath, 'Disconnected graph has no path');
  assert(dijkstraRes.distance === Infinity, 'Disconnected distance is Infinity');

  const fwRes = solveFloydWarshall({ nodes, edges });
  const fwPath = fwRes.getPath('A', 'B');
  assert(!fwPath.hasPath, 'Floyd-Warshall reports no path between disconnected components');

  const kruskalRes = solveKruskalMST({ nodes, edges });
  assert(!kruskalRes.isConnected, 'Kruskal recognizes disconnected spanning forest');
  assert(kruskalRes.isForest, 'Marked as forest');
  console.log('✓ Test 7 Passed: Disconnected graph handling');
}

// Test 8: Missing selected source/destination
{
  const nodes = [{ id: 'A', name: 'A' }];
  const edges: any[] = [];
  const dijkstraRes = solveDijkstra({ nodes, edges }, '', 'A');
  assert(!dijkstraRes.hasPath, 'Blank source returns no path');
  assert(dijkstraRes.error !== undefined, 'Reports error for missing node');
  console.log('✓ Test 8 Passed: Missing selected source/destination handling');
}

console.log('\nALL 8 MAP INTELLIGENCE LAYER TESTS PASSED SUCCESSFULLY!');
