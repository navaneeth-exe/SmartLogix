import { UnionFind } from '../src/algorithms/unionFind.ts';
import { solveKruskalMST, type KruskalInput } from '../src/algorithms/kruskal.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`);
  }
}

console.log('--- Running Union-Find & Kruskal MST Comprehensive Test Suite ---');

// ==========================================
// 1. UNION-FIND TESTS
// ==========================================

// UF Test 1: Initial components & makeSet
{
  const uf = new UnionFind(['A', 'B', 'C', 'D']);
  assert(uf.getComponentCount() === 4, `Initial component count should be 4, got ${uf.getComponentCount()}`);
  assert(!uf.connected('A', 'B'), 'A and B should initially be disconnected');
  console.log('✓ UF Test 1 Passed: Initial disjoint sets and component count');
}

// UF Test 2: find() and union() operations with path compression
{
  const uf = new UnionFind(['1', '2', '3', '4']);
  const merged12 = uf.union('1', '2');
  assert(merged12 === true, 'First union between 1 and 2 should return true');
  assert(uf.connected('1', '2'), '1 and 2 should be connected');
  assert(uf.getComponentCount() === 3, 'Component count should decrease to 3');

  const merged23 = uf.union('2', '3');
  assert(merged23 === true, 'Union between 2 and 3 should return true');
  assert(uf.connected('1', '3'), '1 and 3 should be connected via transitivity');
  assert(uf.getComponentCount() === 2, 'Component count should decrease to 2');

  // Redundant union (cycle detection)
  const redundantMerge = uf.union('1', '3');
  assert(redundantMerge === false, 'Redundant union between 1 and 3 must return false');
  assert(uf.getComponentCount() === 2, 'Component count must not decrease on redundant union');
  console.log('✓ UF Test 2 Passed: find(), union(), and cycle detection on redundant merge');
}

// UF Test 3: getComponents grouping
{
  const uf = new UnionFind(['X', 'Y', 'Z', 'W']);
  uf.union('X', 'Y');
  uf.union('Z', 'W');
  const components = uf.getComponents();
  assert(components.size === 2, `Should have 2 disjoint components, got ${components.size}`);
  console.log('✓ UF Test 3 Passed: Disjoint component grouping');
}

// ==========================================
// 2. KRUSKAL MST TESTS
// ==========================================

// Kruskal Test 1: Triangle Graph (Known textbook example: A-B=1, B-C=2, A-C=5 => MST: A-B, B-C, total=3)
{
  const input: KruskalInput = {
    nodes: [
      { id: 'A', name: 'Node A' },
      { id: 'B', name: 'Node B' },
      { id: 'C', name: 'Node C' }
    ],
    edges: [
      { from: 'A', to: 'B', weight: 1 },
      { from: 'B', to: 'C', weight: 2 },
      { from: 'A', to: 'C', weight: 5 }
    ]
  };

  const res = solveKruskalMST(input);
  assert(res.isConnected === true, 'Triangle graph should be fully connected');
  assert(res.selectedEdgeCount === 2, `Should select 2 edges (V-1), got ${res.selectedEdgeCount}`);
  assert(res.totalCost === 3, `Total MST cost should be 3, got ${res.totalCost}`);
  assert(res.rejectedEdgesCount === 1, `Should reject 1 cycle edge (A-C), got ${res.rejectedEdgesCount}`);
  console.log('✓ Kruskal Test 1 Passed: Classical triangle graph with optimal MST weight = 3');
}

// Kruskal Test 2: Symmetric bidirectional road edges consolidation
{
  const input: KruskalInput = {
    nodes: [
      { id: 'U', name: 'Warehouse Hub' },
      { id: 'V', name: 'Delivery Point' }
    ],
    edges: [
      { from: 'U', to: 'V', weight: 4.5 },
      { from: 'V', to: 'U', weight: 4.5 } // Reverse symmetric edge
    ]
  };

  const res = solveKruskalMST(input);
  assert(res.selectedEdgeCount === 1, 'Should consolidate symmetric road edges into 1 undirected edge');
  assert(res.totalCost === 4.5, `Total cost should be 4.5, got ${res.totalCost}`);
  console.log('✓ Kruskal Test 2 Passed: Symmetric directed road distances consolidated into single undirected edge');
}

// Kruskal Test 3: Disconnected graph produces Minimum Spanning Forest
{
  const input: KruskalInput = {
    nodes: [
      { id: '1', name: 'Cluster 1 - Node 1' },
      { id: '2', name: 'Cluster 1 - Node 2' },
      { id: '3', name: 'Cluster 2 - Node 3' },
      { id: '4', name: 'Cluster 2 - Node 4' }
    ],
    edges: [
      { from: '1', to: '2', weight: 2.0 },
      { from: '3', to: '4', weight: 3.5 }
      // No edges between {1, 2} and {3, 4}
    ]
  };

  const res = solveKruskalMST(input);
  assert(res.isConnected === false, 'Disconnected graph must report isConnected: false');
  assert(res.isForest === true, 'Disconnected graph must report isForest: true');
  assert(res.componentCount === 2, `Component count should be 2, got ${res.componentCount}`);
  assert(res.selectedEdgeCount === 2, `Forest should contain 2 edges (V - C = 4 - 2 = 2), got ${res.selectedEdgeCount}`);
  assert(res.totalCost === 5.5, `Total forest cost should be 2.0 + 3.5 = 5.5, got ${res.totalCost}`);
  console.log('✓ Kruskal Test 3 Passed: Disconnected graph yields valid Minimum Spanning Forest without artificial bridging');
}

// Kruskal Test 4: Equal-weight edges and deterministic tie-breaking
{
  const input: KruskalInput = {
    nodes: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' }
    ],
    edges: [
      { from: 'A', to: 'B', weight: 2 },
      { from: 'B', to: 'C', weight: 2 },
      { from: 'A', to: 'C', weight: 2 }
    ]
  };

  const res1 = solveKruskalMST(input);
  const res2 = solveKruskalMST(input);

  assert(res1.totalCost === 4, 'Total cost should be 4');
  assert(res1.selectedEdgeCount === 2, 'Should select 2 edges');
  assert(
    JSON.stringify(res1.mstEdges) === JSON.stringify(res2.mstEdges),
    'Repeated executions on equal-weight edges must produce strictly deterministic results'
  );
  console.log('✓ Kruskal Test 4 Passed: Equal-weight tie breaking is strictly deterministic');
}

// Kruskal Test 5: Self-loops and negative edge sanitization
{
  const input: KruskalInput = {
    nodes: [
      { id: 'P', name: 'Node P' },
      { id: 'Q', name: 'Node Q' }
    ],
    edges: [
      { from: 'P', to: 'P', weight: 0 },   // Self-loop
      { from: 'P', to: 'Q', weight: -5 },  // Invalid negative road distance
      { from: 'P', to: 'Q', weight: 7 }    // Valid edge
    ]
  };

  const res = solveKruskalMST(input);
  assert(res.selectedEdgeCount === 1, 'Only valid edge P-Q should be selected');
  assert(res.totalCost === 7, `Total cost should be 7, got ${res.totalCost}`);
  console.log('✓ Kruskal Test 5 Passed: Self-loops and invalid negative edges safely sanitized');
}

// Kruskal Test 6: Zero-weight edges handled accurately
{
  const input: KruskalInput = {
    nodes: [
      { id: '1', name: 'Site 1' },
      { id: '2', name: 'Site 2' }
    ],
    edges: [
      { from: '1', to: '2', weight: 0 }
    ]
  };

  const res = solveKruskalMST(input);
  assert(res.selectedEdgeCount === 1, 'Zero weight edge should be selected');
  assert(res.totalCost === 0, `Total cost should be 0, got ${res.totalCost}`);
  console.log('✓ Kruskal Test 6 Passed: Zero-weight edges correctly admitted');
}

// Kruskal Test 7: Duplicate edges with differing weights (lower weight selected)
{
  const input: KruskalInput = {
    nodes: [
      { id: 'X', name: 'Node X' },
      { id: 'Y', name: 'Node Y' }
    ],
    edges: [
      { from: 'X', to: 'Y', weight: 15.0 },
      { from: 'X', to: 'Y', weight: 8.2 }, // Lower weight
      { from: 'Y', to: 'X', weight: 12.0 }
    ]
  };

  const res = solveKruskalMST(input);
  assert(res.totalCost === 8.2, `Duplicate edges should resolve to min weight 8.2, got ${res.totalCost}`);
  console.log('✓ Kruskal Test 7 Passed: Duplicate edges between same vertices resolve to minimum weight');
}

// Kruskal Test 8: Immutability of input structures
{
  const nodes = [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }];
  const edges = [{ from: 'A', to: 'B', weight: 3 }];
  const nodesJson = JSON.stringify(nodes);
  const edgesJson = JSON.stringify(edges);

  solveKruskalMST({ nodes, edges });

  assert(JSON.stringify(nodes) === nodesJson, 'Nodes array must not be mutated');
  assert(JSON.stringify(edges) === edgesJson, 'Edges array must not be mutated');
  console.log('✓ Kruskal Test 8 Passed: Input graph data structures strictly immutable');
}

// Kruskal Test 9: Complete 5-vertex benchmark graph
// Complete graph K_5 with non-trivial weights:
// A-B=1, B-C=2, C-D=3, D-E=4, E-A=5, A-C=6, B-D=7, C-E=8, D-A=9, B-E=10
// MST should pick: A-B(1), B-C(2), C-D(3), D-E(4) = total 10.
{
  const input: KruskalInput = {
    nodes: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' },
      { id: 'D', name: 'D' },
      { id: 'E', name: 'E' }
    ],
    edges: [
      { from: 'A', to: 'B', weight: 1 },
      { from: 'B', to: 'C', weight: 2 },
      { from: 'C', to: 'D', weight: 3 },
      { from: 'D', to: 'E', weight: 4 },
      { from: 'E', to: 'A', weight: 5 },
      { from: 'A', to: 'C', weight: 6 },
      { from: 'B', to: 'D', weight: 7 },
      { from: 'C', to: 'E', weight: 8 },
      { from: 'D', to: 'A', weight: 9 },
      { from: 'B', to: 'E', weight: 10 }
    ]
  };

  const res = solveKruskalMST(input);
  assert(res.selectedEdgeCount === 4, `MST should have 4 edges (V-1), got ${res.selectedEdgeCount}`);
  assert(res.totalCost === 10, `MST total cost should be 1+2+3+4=10, got ${res.totalCost}`);
  assert(res.rejectedEdgesCount === 6, `Should reject 6 cycle edges, got ${res.rejectedEdgesCount}`);
  console.log('✓ Kruskal Test 9 Passed: K_5 benchmark graph selects 4 optimal edges with cost = 10');
}

console.log('\nALL UNION-FIND AND KRUSKAL MST TESTS PASSED SUCCESSFULLY!');
