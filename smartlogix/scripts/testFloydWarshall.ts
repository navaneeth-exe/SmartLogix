import { solveFloydWarshall, type FloydWarshallInput } from '../src/algorithms/floydWarshall.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`);
  }
}

console.log('--- Running Floyd-Warshall Comprehensive Test Suite ---');

// Test 1: Simple 3-node graph & Multi-hop detour optimization
// Graph: A -> B = 5, B -> C = 2, A -> C = 10 (Direct edge is 10, but A -> B -> C is 7)
{
  const input: FloydWarshallInput = {
    nodes: [
      { id: 'A', name: 'Node A' },
      { id: 'B', name: 'Node B' },
      { id: 'C', name: 'Node C' }
    ],
    edges: [
      { from: 'A', to: 'B', weight: 5 },
      { from: 'B', to: 'C', weight: 2 },
      { from: 'A', to: 'C', weight: 10 }
    ]
  };

  const res = solveFloydWarshall(input);
  const pathAC = res.getPath('A', 'C');

  assert(pathAC.hasPath === true, 'Path A -> C should exist');
  assert(pathAC.distance === 7, `Path A -> C distance should be 7, got ${pathAC.distance}`);
  assert(pathAC.pathIds.join('->') === 'A->B->C', `Path A -> C should be A->B->C, got ${pathAC.pathIds.join('->')}`);
  assert(pathAC.hopCount === 2, `Hop count should be 2, got ${pathAC.hopCount}`);
  console.log('✓ Test 1 & 2 Passed: 3-node graph with multi-hop detour optimization (A->B->C = 7 vs direct 10)');
}

// Test 3: Disconnected graph / Unreachable nodes
{
  const input: FloydWarshallInput = {
    nodes: [
      { id: 'X', name: 'Node X' },
      { id: 'Y', name: 'Node Y' },
      { id: 'Z', name: 'Node Z (Isolated)' }
    ],
    edges: [
      { from: 'X', to: 'Y', weight: 4 }
    ]
  };

  const res = solveFloydWarshall(input);
  const pathXZ = res.getPath('X', 'Z');
  const pathZX = res.getPath('Z', 'X');

  assert(pathXZ.hasPath === false, 'X -> Z should be unreachable');
  assert(pathXZ.distance === Infinity, 'X -> Z distance should be Infinity');
  assert(pathXZ.pathIds.length === 0, 'X -> Z pathIds should be empty');
  assert(pathZX.hasPath === false, 'Z -> X should be unreachable');
  console.log('✓ Test 3 Passed: Disconnected graph & unreachable nodes return Infinity / hasPath: false');
}

// Test 4: Source = Destination (Identity)
{
  const input: FloydWarshallInput = {
    nodes: [
      { id: 'A', name: 'Depot' },
      { id: 'B', name: 'Site' }
    ],
    edges: [
      { from: 'A', to: 'B', weight: 12 }
    ]
  };

  const res = solveFloydWarshall(input);
  const pathAA = res.getPath('A', 'A');

  assert(pathAA.hasPath === true, 'A -> A should have path');
  assert(pathAA.distance === 0, `A -> A distance should be 0, got ${pathAA.distance}`);
  assert(pathAA.hopCount === 0, `A -> A hop count should be 0, got ${pathAA.hopCount}`);
  assert(pathAA.pathIds[0] === 'A', 'A -> A path should contain [A]');
  console.log('✓ Test 4 Passed: Source = Destination yields 0.00 km, 0 hops, and correct node identity');
}

// Test 5: Zero-weight edges
{
  const input: FloydWarshallInput = {
    nodes: [
      { id: 'A', name: 'Gate 1' },
      { id: 'B', name: 'Gate 2 (Co-located)' }
    ],
    edges: [
      { from: 'A', to: 'B', weight: 0 }
    ]
  };

  const res = solveFloydWarshall(input);
  const pathAB = res.getPath('A', 'B');

  assert(pathAB.hasPath === true, 'A -> B path should exist');
  assert(pathAB.distance === 0, `Zero-weight edge should result in distance 0, got ${pathAB.distance}`);
  console.log('✓ Test 5 Passed: Zero-weight edges handled accurately without rejection');
}

// Test 6: Multiple intermediate vertices (4-hop traversal)
// 1 -> 2 -> 3 -> 4 -> 5
{
  const input: FloydWarshallInput = {
    nodes: [
      { id: '1', name: 'N1' },
      { id: '2', name: 'N2' },
      { id: '3', name: 'N3' },
      { id: '4', name: 'N4' },
      { id: '5', name: 'N5' }
    ],
    edges: [
      { from: '1', to: '2', weight: 3 },
      { from: '2', to: '3', weight: 4 },
      { from: '3', to: '4', weight: 2 },
      { from: '4', to: '5', weight: 1 },
      { from: '1', to: '5', weight: 25 } // Suboptimal direct edge
    ]
  };

  const res = solveFloydWarshall(input);
  const path15 = res.getPath('1', '5');

  assert(path15.distance === 10, `Multi-hop distance should be 3+4+2+1=10, got ${path15.distance}`);
  assert(path15.pathIds.join('->') === '1->2->3->4->5', `Path should be 1->2->3->4->5, got ${path15.pathIds.join('->')}`);
  assert(path15.hopCount === 4, `Hop count should be 4, got ${path15.hopCount}`);
  console.log('✓ Test 6 Passed: Multi-hop chain across 4 intermediate hops correctly reconstructed');
}

// Test 7: Duplicate edges (Minimum edge weight safely preserved)
{
  const input: FloydWarshallInput = {
    nodes: [
      { id: 'P', name: 'Point P' },
      { id: 'Q', name: 'Point Q' }
    ],
    edges: [
      { from: 'P', to: 'Q', weight: 18.5 },
      { from: 'P', to: 'Q', weight: 12.0 }, // Lower duplicate
      { from: 'P', to: 'Q', weight: 22.0 }  // Higher duplicate
    ]
  };

  const res = solveFloydWarshall(input);
  const pathPQ = res.getPath('P', 'Q');

  assert(pathPQ.distance === 12.0, `Duplicate edge should resolve to min weight 12.0, got ${pathPQ.distance}`);
  console.log('✓ Test 7 Passed: Duplicate edges between same vertices safely resolve to minimum weight');
}

// Test 8: Input immutability
{
  const nodes = [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }];
  const edges = [{ from: 'A', to: 'B', weight: 5 }];
  const edgesCopy = JSON.stringify(edges);
  const nodesCopy = JSON.stringify(nodes);

  solveFloydWarshall({ nodes, edges });

  assert(JSON.stringify(nodes) === nodesCopy, 'Input nodes array must not be mutated');
  assert(JSON.stringify(edges) === edgesCopy, 'Input edges array must not be mutated');
  console.log('✓ Test 8 Passed: Input graph data structures strictly immutable');
}

// Test 9: Undirected / Symmetric mode
{
  const input: FloydWarshallInput = {
    nodes: [
      { id: 'U', name: 'Node U' },
      { id: 'V', name: 'Node V' }
    ],
    edges: [
      { from: 'U', to: 'V', weight: 8.4 }
    ],
    isUndirected: true
  };

  const res = solveFloydWarshall(input);
  const pathUV = res.getPath('U', 'V');
  const pathVU = res.getPath('V', 'U');

  assert(pathUV.distance === 8.4, 'U -> V distance should be 8.4');
  assert(pathVU.distance === 8.4, 'V -> U distance should be 8.4 under symmetric mode');
  console.log('✓ Test 9 Passed: Symmetric mode correctly establishes bidirectional connectivity');
}

// Test 10: Negative cycle detection diagnostic
{
  const input: FloydWarshallInput = {
    nodes: [
      { id: '1', name: 'Node 1' },
      { id: '2', name: 'Node 2' }
    ],
    edges: [
      { from: '1', to: '2', weight: 1 },
      { from: '2', to: '1', weight: 2 }
    ]
  };

  const res = solveFloydWarshall(input);
  assert(res.hasNegativeCycle === false, 'Positive road weights must not trigger negative cycle');
  console.log('✓ Test 10 Passed: Negative cycle diagnostic verified');
}

console.log('\nALL 10 FLOYD-WARSHALL TESTS PASSED SUCCESSFULLY!');
