/**
 * Dedicated Floyd-Warshall All-Pairs Shortest Path Algorithm for SmartLogix
 * 
 * Mathematical Formulation:
 * Given a directed graph G = (V, E) with vertex set V = {0, 1, ..., n-1} and non-negative edge weights:
 * Dynamic Programming recurrence for intermediate vertices k in {0, ..., n-1}:
 *   dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
 * Next-hop predecessor tracking for path reconstruction:
 *   next[i][j] = next[i][k] if dist[i][k] + dist[k][j] < dist[i][j]
 * 
 * Properties:
 * - Deterministic: Stable vertex ordering and immutable input consumption.
 * - Exact All-Pairs: Computes O(V^2) pairwise shortest distances simultaneously.
 * - Path Reconstruction: Reconstructs exact sequence of vertex hops between any reachable pair.
 * - Negative Cycle Detection: Detects if any dist[i][i] < 0 (diagnostic for road distance graphs).
 * - Zero Dependencies: Pure TypeScript without external graph libraries or framework side-effects.
 * 
 * Complexity:
 * - Time Complexity: O(V^3)
 * - Space Complexity: O(V^2) for distance and next-hop matrices
 */

export interface FloydWarshallNode {
  id: string;
  name: string;
  type?: 'warehouse' | 'delivery_location';
}

export interface FloydWarshallEdge {
  from: string;
  to: string;
  weight: number; // distance in km or meters, must be >= 0
}

export interface FloydWarshallInput {
  nodes: FloydWarshallNode[];
  edges: FloydWarshallEdge[];
  isUndirected?: boolean; // if true, edge (u, v) creates symmetric edge (v, u)
}

export interface FloydWarshallResult {
  algorithmName: string;
  nodes: FloydWarshallNode[];
  nodeIndexMap: Record<string, number>;
  distances: number[][]; // [i][j] = shortest distance in km (Infinity if unreachable)
  next: (number | null)[][]; // [i][j] = intermediate next vertex index for path reconstruction
  reachablePairsCount: number;
  totalPossiblePairs: number;
  hasNegativeCycle: boolean;
  executionTimeMs: number;
  getPath: (fromId: string, toId: string) => {
    pathIds: string[];
    pathNames: string[];
    distance: number;
    hasPath: boolean;
    hopCount: number;
  };
}

/**
 * Validates and executes the Floyd-Warshall All-Pairs Shortest Path algorithm.
 */
export function solveFloydWarshall(input: FloydWarshallInput): FloydWarshallResult {
  const startTime = performance.now();
  const { nodes, edges, isUndirected = false } = input;
  const n = nodes.length;

  // 1. Build Node Index Lookup
  const nodeIndexMap: Record<string, number> = {};
  nodes.forEach((node, idx) => {
    nodeIndexMap[node.id] = idx;
  });

  // 2. Initialize Distance and Next-Hop Matrices
  // dist[i][j] = Infinity, dist[i][i] = 0
  const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const next: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));

  for (let i = 0; i < n; i++) {
    dist[i][i] = 0;
    next[i][i] = i;
  }

  // 3. Load Direct Edges (handling multiple edges safely by keeping minimum weight)
  for (const edge of edges) {
    const u = nodeIndexMap[edge.from];
    const v = nodeIndexMap[edge.to];

    if (u !== undefined && v !== undefined) {
      if (edge.weight < 0) {
        // Non-negative road distance invariant check
        continue;
      }

      if (edge.weight < dist[u][v]) {
        dist[u][v] = edge.weight;
        next[u][v] = v;
      }

      if (isUndirected && edge.weight < dist[v][u]) {
        dist[v][u] = edge.weight;
        next[v][u] = u;
      }
    }
  }

  // 4. Floyd-Warshall Dynamic Programming Triple Loop: O(V^3)
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      if (dist[i][k] === Infinity) continue;

      for (let j = 0; j < n; j++) {
        if (dist[k][j] === Infinity) continue;

        const candidateDist = dist[i][k] + dist[k][j];
        if (candidateDist < dist[i][j]) {
          dist[i][j] = candidateDist;
          next[i][j] = next[i][k];
        }
      }
    }
  }

  // 5. Check for Negative Cycles (diagnostic)
  let hasNegativeCycle = false;
  for (let i = 0; i < n; i++) {
    if (dist[i][i] < 0) {
      hasNegativeCycle = true;
      break;
    }
  }

  // Count reachable pairs
  let reachablePairsCount = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && dist[i][j] !== Infinity) {
        reachablePairsCount++;
      }
    }
  }

  // Format distances to 2 decimal places for clean reporting
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (dist[i][j] !== Infinity) {
        dist[i][j] = Number(dist[i][j].toFixed(2));
      }
    }
  }

  const endTime = performance.now();

  // Path reconstruction helper
  const getPath = (fromId: string, toId: string) => {
    const u = nodeIndexMap[fromId];
    const v = nodeIndexMap[toId];

    if (u === undefined || v === undefined) {
      return { pathIds: [], pathNames: [], distance: Infinity, hasPath: false, hopCount: 0 };
    }

    if (u === v) {
      return {
        pathIds: [fromId],
        pathNames: [nodes[u]?.name || fromId],
        distance: 0,
        hasPath: true,
        hopCount: 0
      };
    }

    if (dist[u][v] === Infinity || next[u][v] === null) {
      return { pathIds: [], pathNames: [], distance: Infinity, hasPath: false, hopCount: 0 };
    }

    const pathIndices: number[] = [u];
    let curr = u;

    // Safety limit prevents infinite loops if negative cycles exist
    let stepCount = 0;
    while (curr !== v && stepCount <= n) {
      const nextStep = next[curr][v];
      if (nextStep === null) break;
      pathIndices.push(nextStep);
      curr = nextStep;
      stepCount++;
    }

    if (curr !== v) {
      return { pathIds: [], pathNames: [], distance: Infinity, hasPath: false, hopCount: 0 };
    }

    const pathIds = pathIndices.map(idx => nodes[idx].id);
    const pathNames = pathIndices.map(idx => nodes[idx].name);

    return {
      pathIds,
      pathNames,
      distance: dist[u][v],
      hasPath: true,
      hopCount: pathIndices.length - 1
    };
  };

  return {
    algorithmName: 'Floyd-Warshall All-Pairs Shortest Path',
    nodes,
    nodeIndexMap,
    distances: dist,
    next,
    reachablePairsCount,
    totalPossiblePairs: n * (n - 1),
    hasNegativeCycle,
    executionTimeMs: Number((endTime - startTime).toFixed(3)),
    getPath
  };
}
