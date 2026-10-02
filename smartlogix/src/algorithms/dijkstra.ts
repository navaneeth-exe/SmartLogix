/**
 * Dedicated Dijkstra Shortest Path Algorithm for SmartLogix
 * 
 * Mathematical Formulation:
 * Given a directed or undirected graph G = (V, E) with non-negative edge weights w(u, v) >= 0:
 * Finds the shortest path distance and vertex sequence from a source vertex s to a target vertex t.
 * 
 * Properties:
 * - Deterministic: Consistent vertex ordering and deterministic tie-breaking.
 * - Non-negative edge weights: Strict rejection of negative edge weights.
 * - Handles disconnected or unreachable vertices gracefully with hasPath = false.
 * - Zero-weight edges supported.
 * - Immutable: Does not mutate the caller's graph or edge definitions.
 * - Standalone: Pure TypeScript with zero third-party graph dependencies.
 */

export interface DijkstraEdge {
  from: string;
  to: string;
  weight: number; // distance in km or meters, must be >= 0
}

export interface DijkstraNode {
  id: string;
  name?: string;
  type?: 'warehouse' | 'delivery_location';
}

export interface DijkstraGraphInput {
  nodes: DijkstraNode[];
  edges: DijkstraEdge[];
  isUndirected?: boolean; // if true, edge (u, v) is also traversable (v, u) with identical weight
}

export interface DijkstraResult {
  sourceId: string;
  targetId: string;
  distance: number; // Infinity if unreachable
  path: string[]; // sequence of node IDs from source to target, empty if no path
  visitedNodesCount: number;
  hasPath: boolean;
  executionTimeMs: number;
  error?: string;
}

export interface DijkstraMultiTargetResult {
  sourceId: string;
  distances: Record<string, number>; // targetId -> shortest distance
  previous: Record<string, string | null>; // targetId -> predecessor in shortest path tree
  visitedNodesCount: number;
  executionTimeMs: number;
  getPathTo: (targetId: string) => string[];
}

/**
 * Validates and executes Dijkstra's algorithm to find the single-pair shortest path.
 * 
 * Time Complexity: O((V + E) log V) with binary heap / priority queue or O(V^2) for adjacency map.
 * Given network graph sizes in SmartLogix (V <= 100), an adjacency list with min-distance extraction
 * provides microsecond execution time and absolute determinism.
 */
export function solveDijkstra(
  graph: DijkstraGraphInput,
  sourceId: string,
  targetId: string
): DijkstraResult {
  const startTime = performance.now();

  // 1. Validation
  const nodeIds = new Set(graph.nodes.map(n => n.id));
  if (!nodeIds.has(sourceId)) {
    return {
      sourceId,
      targetId,
      distance: Infinity,
      path: [],
      visitedNodesCount: 0,
      hasPath: false,
      executionTimeMs: Number((performance.now() - startTime).toFixed(3)),
      error: `Source node "${sourceId}" does not exist in graph.`
    };
  }

  if (!nodeIds.has(targetId)) {
    return {
      sourceId,
      targetId,
      distance: Infinity,
      path: [],
      visitedNodesCount: 0,
      hasPath: false,
      executionTimeMs: Number((performance.now() - startTime).toFixed(3)),
      error: `Target node "${targetId}" does not exist in graph.`
    };
  }

  // Trivial identity case
  if (sourceId === targetId) {
    return {
      sourceId,
      targetId,
      distance: 0,
      path: [sourceId],
      visitedNodesCount: 1,
      hasPath: true,
      executionTimeMs: Number((performance.now() - startTime).toFixed(3))
    };
  }

  // 2. Build Adjacency List
  const adj = new Map<string, { to: string; weight: number }[]>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (edge.weight < 0) {
      return {
        sourceId,
        targetId,
        distance: Infinity,
        path: [],
        visitedNodesCount: 0,
        hasPath: false,
        executionTimeMs: Number((performance.now() - startTime).toFixed(3)),
        error: `Negative edge weight (${edge.weight}) detected from "${edge.from}" to "${edge.to}". Dijkstra requires non-negative weights.`
      };
    }

    if (adj.has(edge.from) && adj.has(edge.to)) {
      adj.get(edge.from)!.push({ to: edge.to, weight: edge.weight });
      if (graph.isUndirected) {
        adj.get(edge.to)!.push({ to: edge.from, weight: edge.weight });
      }
    }
  }

  // Sort adjacency lists deterministically by weight, then node ID
  for (const [_, neighbors] of adj.entries()) {
    neighbors.sort((a, b) => a.weight - b.weight || a.to.localeCompare(b.to));
  }

  // 3. Dijkstra State Initialization
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  for (const node of graph.nodes) {
    distances.set(node.id, Infinity);
    previous.set(node.id, null);
    unvisited.add(node.id);
  }

  distances.set(sourceId, 0);

  let visitedCount = 0;

  // 4. Algorithm Loop
  while (unvisited.size > 0) {
    // Find unvisited node with smallest known distance
    let current: string | null = null;
    let minDistance = Infinity;

    for (const nodeId of unvisited) {
      const d = distances.get(nodeId)!;
      if (d < minDistance) {
        minDistance = d;
        current = nodeId;
      } else if (d === minDistance && current !== null && nodeId.localeCompare(current) < 0) {
        // Deterministic tie breaking
        current = nodeId;
      }
    }

    // If remaining nodes are unreachable or queue empty
    if (current === null || minDistance === Infinity) {
      break;
    }

    // Early termination if we reached target
    if (current === targetId) {
      visitedCount++;
      break;
    }

    unvisited.delete(current);
    visitedCount++;

    // Relax neighbors
    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.to)) continue;

      const alt = minDistance + neighbor.weight;
      const currentDist = distances.get(neighbor.to)!;

      if (alt < currentDist) {
        distances.set(neighbor.to, alt);
        previous.set(neighbor.to, current);
      }
    }
  }

  const finalDistance = distances.get(targetId)!;
  const hasPath = finalDistance !== Infinity;

  // 5. Reconstruct Path
  const path: string[] = [];
  if (hasPath) {
    let curr: string | null = targetId;
    while (curr !== null) {
      path.unshift(curr);
      curr = previous.get(curr) || null;
    }
  }

  const endTime = performance.now();
  return {
    sourceId,
    targetId,
    distance: hasPath ? Number(finalDistance.toFixed(3)) : Infinity,
    path,
    visitedNodesCount: visitedCount,
    hasPath,
    executionTimeMs: Number((endTime - startTime).toFixed(3))
  };
}

/**
 * Single-Source Multi-Target Dijkstra
 * Computes shortest distances from a source node to all other reachable nodes in the graph.
 */
export function solveDijkstraAllTargets(
  graph: DijkstraGraphInput,
  sourceId: string
): DijkstraMultiTargetResult {
  const startTime = performance.now();

  const nodeIds = new Set(graph.nodes.map(n => n.id));
  if (!nodeIds.has(sourceId)) {
    return {
      sourceId,
      distances: {},
      previous: {},
      visitedNodesCount: 0,
      executionTimeMs: Number((performance.now() - startTime).toFixed(3)),
      getPathTo: () => []
    };
  }

  const adj = new Map<string, { to: string; weight: number }[]>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (edge.weight >= 0 && adj.has(edge.from) && adj.has(edge.to)) {
      adj.get(edge.from)!.push({ to: edge.to, weight: edge.weight });
      if (graph.isUndirected) {
        adj.get(edge.to)!.push({ to: edge.from, weight: edge.weight });
      }
    }
  }

  for (const [_, neighbors] of adj.entries()) {
    neighbors.sort((a, b) => a.weight - b.weight || a.to.localeCompare(b.to));
  }

  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  for (const node of graph.nodes) {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  }

  distances[sourceId] = 0;
  let visitedCount = 0;

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minDistance = Infinity;

    for (const nodeId of unvisited) {
      const d = distances[nodeId];
      if (d < minDistance) {
        minDistance = d;
        current = nodeId;
      } else if (d === minDistance && current !== null && nodeId.localeCompare(current) < 0) {
        current = nodeId;
      }
    }

    if (current === null || minDistance === Infinity) {
      break;
    }

    unvisited.delete(current);
    visitedCount++;

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.to)) continue;

      const alt = minDistance + neighbor.weight;
      if (alt < distances[neighbor.to]) {
        distances[neighbor.to] = alt;
        previous[neighbor.to] = current;
      }
    }
  }

  const endTime = performance.now();
  return {
    sourceId,
    distances,
    previous,
    visitedNodesCount: visitedCount,
    executionTimeMs: Number((endTime - startTime).toFixed(3)),
    getPathTo: (targetId: string): string[] => {
      if (distances[targetId] === Infinity || !distances[targetId] && distances[targetId] !== 0) {
        return [];
      }
      const path: string[] = [];
      let curr: string | null = targetId;
      while (curr !== null) {
        path.unshift(curr);
        curr = previous[curr] || null;
      }
      return path;
    }
  };
}
