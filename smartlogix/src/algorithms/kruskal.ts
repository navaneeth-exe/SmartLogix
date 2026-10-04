/**
 * Dedicated Kruskal's Minimum Spanning Tree (MST) Algorithm for SmartLogix
 * 
 * Mathematical Formulation:
 * Given an undirected, connected, weighted graph G = (V, E) with non-negative edge weights:
 * A Spanning Tree T = (V, E_T) is an acyclic subgraph connecting all vertices with |V| - 1 edges.
 * A Minimum Spanning Tree minimizes the total weight: W(T) = sum(w(e) for e in E_T).
 * 
 * Kruskal's Greedy Paradigm:
 * 1. Normalize and filter input edges into canonical undirected candidate edges.
 * 2. Sort all undirected candidate edges in non-decreasing order of weight:
 *    w(e_1) <= w(e_2) <= ... <= w(e_m).
 *    Deterministic tie-breaking is enforced using vertex identifiers.
 * 3. Initialize a Disjoint Set (Union-Find) with each vertex as an isolated singleton.
 * 4. Iterate over sorted edges:
 *    - For candidate edge (u, v):
 *      - If find(u) != find(v): Include edge in E_T, union(u, v).
 *      - If find(u) == find(v): Reject edge (creates a cycle in the current component).
 * 5. Terminate when |V| - 1 edges are selected, or all edges are evaluated.
 * 
 * Connectivity & Forest Properties:
 * - If the input graph is connected, Kruskal produces a single Minimum Spanning Tree with |V| - 1 edges.
 * - If the input graph is disconnected, Kruskal produces a Minimum Spanning Forest with |V| - C edges,
 *   where C is the number of connected components.
 * 
 * Complexity:
 * - Time Complexity: O(E log E) dominated by sorting the candidate edges.
 *   (Equivalent to O(E log V) because log E <= 2 log V).
 * - Union-Find operations take O(E * α(V)), which is near-linear O(E).
 * - Space Complexity: O(V + E) for edge structures and disjoint-set tracking.
 */

import { UnionFind } from './unionFind.ts';

export interface KruskalNode {
  id: string;
  name: string;
  type?: 'warehouse' | 'delivery_location';
  latitude?: number | null;
  longitude?: number | null;
}

export interface KruskalEdge {
  from: string;
  to: string;
  fromName?: string;
  toName?: string;
  weight: number; // distance in km, must be >= 0
}

export interface KruskalInput {
  nodes: KruskalNode[];
  edges: KruskalEdge[];
}

export interface KruskalResult {
  algorithmName: string;
  mstEdges: KruskalEdge[];
  rejectedEdgesCount: number;
  totalCost: number; // sum of weights in km
  vertexCount: number;
  inputEdgeCount: number;
  selectedEdgeCount: number;
  isConnected: boolean;
  componentCount: number;
  isForest: boolean;
  executionTimeMs: number;
}

/**
 * Executes Kruskal's algorithm to compute the Minimum Spanning Tree / Forest.
 */
export function solveKruskalMST(input: KruskalInput): KruskalResult {
  const startTime = performance.now();
  const { nodes, edges } = input;
  const n = nodes.length;

  if (n === 0) {
    return {
      algorithmName: "Kruskal's Minimum Spanning Tree",
      mstEdges: [],
      rejectedEdgesCount: 0,
      totalCost: 0,
      vertexCount: 0,
      inputEdgeCount: 0,
      selectedEdgeCount: 0,
      isConnected: true,
      componentCount: 0,
      isForest: false,
      executionTimeMs: 0
    };
  }

  // 1. Build Node Name Lookup & Register All Vertices in Union-Find
  const nodeMap = new Map<string, KruskalNode>();
  const uf = new UnionFind<string>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    uf.makeSet(node.id);
  }

  // 2. Canonicalize & Deduplicate Undirected Edges
  // For MST, road connections between u and v are undirected.
  // If directed pairs (u -> v) and (v -> u) exist, consolidate into single undirected edge with min weight.
  const canonicalEdgeMap = new Map<string, KruskalEdge>();

  for (const edge of edges) {
    // Invariant: Ignore self-loops
    if (edge.from === edge.to) continue;

    // Invariant: Non-negative finite road distance
    if (edge.weight < 0 || edge.weight === Infinity || isNaN(edge.weight)) continue;

    // Only process edges whose endpoints exist in the vertex set
    if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)) continue;

    // Stable canonical key: sort IDs alphabetically
    const [u, v] = edge.from < edge.to ? [edge.from, edge.to] : [edge.to, edge.from];
    const key = `${u}:::${v}`;

    const existing = canonicalEdgeMap.get(key);
    if (!existing || edge.weight < existing.weight) {
      canonicalEdgeMap.set(key, {
        from: u,
        to: v,
        fromName: nodeMap.get(u)?.name ?? u,
        toName: nodeMap.get(v)?.name ?? v,
        weight: edge.weight
      });
    }
  }

  const candidateEdges = Array.from(canonicalEdgeMap.values());

  // 3. Sort Candidate Edges in Non-Decreasing Order with Deterministic Tie-Breaking: O(E log E)
  candidateEdges.sort((a, b) => {
    if (a.weight !== b.weight) {
      return a.weight - b.weight;
    }
    // Deterministic tie-breaking on vertex IDs
    if (a.from !== b.from) {
      return a.from.localeCompare(b.from);
    }
    return a.to.localeCompare(b.to);
  });

  // 4. Kruskal Greedy Selection Loop using Union-Find Cycle Detection
  const mstEdges: KruskalEdge[] = [];
  let rejectedEdgesCount = 0;
  let totalCost = 0;
  const targetEdgeCount = n - 1;

  for (const edge of candidateEdges) {
    // If endpoints belong to different disjoint sets, include edge (no cycle formed)
    if (uf.union(edge.from, edge.to)) {
      mstEdges.push(edge);
      totalCost += edge.weight;
    } else {
      // Endpoints already in the same component; adding this edge would create a cycle
      rejectedEdgesCount++;
    }
  }

  const endTime = performance.now();
  const componentCount = uf.getComponentCount();
  const isConnected = n <= 1 || mstEdges.length === targetEdgeCount;
  const isForest = !isConnected;

  return {
    algorithmName: "Kruskal's Minimum Spanning Tree",
    mstEdges,
    rejectedEdgesCount,
    totalCost: Number(totalCost.toFixed(2)),
    vertexCount: n,
    inputEdgeCount: candidateEdges.length,
    selectedEdgeCount: mstEdges.length,
    isConnected,
    componentCount,
    isForest,
    executionTimeMs: Number((endTime - startTime).toFixed(3))
  };
}
