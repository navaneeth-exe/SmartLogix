import type { MatrixLocation, AlgorithmResult } from '../types/database.types';

export interface TSPInput {
  locations: MatrixLocation[];
  matrix: number[][]; // distance matrix in km: matrix[i][j] = distance from locations[i] to locations[j]
  maxLocationsLimit?: number;
}

/**
 * Validates the distance matrix input for TSP execution.
 */
export function validateTSPMatrix(locations: MatrixLocation[], matrix: number[][]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const n = locations.length;

  if (n < 2) {
    errors.push('At least two locations (1 warehouse and at least 1 delivery location) must be selected.');
    return { valid: false, errors };
  }

  if (matrix.length !== n) {
    errors.push(`Matrix row count (${matrix.length}) does not match selected locations count (${n}).`);
    return { valid: false, errors };
  }

  for (let i = 0; i < n; i++) {
    if (!matrix[i] || matrix[i].length !== n) {
      errors.push(`Row ${i + 1} (${locations[i]?.name || i}) length does not match locations count (${n}).`);
      continue;
    }

    for (let j = 0; j < n; j++) {
      const dist = matrix[i][j];
      if (dist === null || dist === undefined || isNaN(dist)) {
        errors.push(`Missing distance value between "${locations[i].name}" and "${locations[j].name}".`);
      } else if (dist < 0) {
        errors.push(`Negative distance (${dist} km) between "${locations[i].name}" and "${locations[j].name}" is invalid.`);
      } else if (i === j && dist !== 0) {
        errors.push(`Self-distance for "${locations[i].name}" must be 0 km (currently ${dist} km).`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Greedy Nearest-Neighbor Heuristic for TSP.
 * Time Complexity: O(n^2)
 *
 * Algorithm Strategy:
 * 1. Start at depot node index 0 (the selected warehouse).
 * 2. At current node, pick the unvisited node with minimum edge distance.
 * 3. Mark it visited and repeat until all nodes have been visited.
 * 4. Return to depot node 0 to complete the round trip.
 */
export function solveGreedyNearestNeighbor(input: TSPInput): AlgorithmResult {
  const startTime = performance.now();
  const { locations, matrix } = input;
  const n = locations.length;

  if (n < 2) {
    return {
      algorithmName: 'Greedy Nearest-Neighbor (Heuristic)',
      tourIndices: [],
      tourLocations: [],
      totalDistance: 0,
      executionTimeMs: 0,
      isOptimal: false,
      hasTour: false,
      error: 'At least 2 locations required.'
    };
  }

  const visited = new Array(n).fill(false);
  const tour: number[] = [0];
  visited[0] = true;
  let totalDistance = 0;
  let curr = 0;

  for (let step = 1; step < n; step++) {
    let nextNode = -1;
    let minDistance = Infinity;

    for (let candidate = 0; candidate < n; candidate++) {
      if (!visited[candidate]) {
        const d = matrix[curr][candidate];
        if (d < minDistance) {
          minDistance = d;
          nextNode = candidate;
        }
      }
    }

    if (nextNode === -1 || minDistance === Infinity) {
      const endTime = performance.now();
      return {
        algorithmName: 'Greedy Nearest-Neighbor (Heuristic)',
        tourIndices: tour,
        tourLocations: tour.map(idx => locations[idx]),
        totalDistance,
        executionTimeMs: Number((endTime - startTime).toFixed(3)),
        isOptimal: false,
        hasTour: false,
        error: 'Incomplete tour: isolated node encountered with no accessible edge.'
      };
    }

    visited[nextNode] = true;
    tour.push(nextNode);
    totalDistance += minDistance;
    curr = nextNode;
  }

  // Return to starting depot (node 0)
  const returnDist = matrix[curr][0];
  totalDistance += returnDist;
  tour.push(0);

  const endTime = performance.now();

  return {
    algorithmName: 'Greedy Nearest-Neighbor (Heuristic)',
    tourIndices: tour,
    tourLocations: tour.map(idx => locations[idx]),
    totalDistance: Number(totalDistance.toFixed(2)),
    executionTimeMs: Number((endTime - startTime).toFixed(3)),
    isOptimal: false,
    hasTour: true
  };
}

/**
 * Branch and Bound Exact Solver for Travelling Salesman Problem (TSP).
 * Worst-Case Time Complexity: O(n!)
 *
 * Algorithm Strategy:
 * - Fixed starting depot at node 0.
 * - Computes an admissible lower bound on unvisited edges.
 *   Lower Bound = current path cost + min edge from current node to unvisited
 *                 + sum(min outgoing edge from each unvisited node to other unvisited or depot).
 * - Best-so-far tour cost is initialized using the Nearest Neighbor heuristic solution.
 * - Explores candidate paths in best-bound priority order.
 * - Prunes any branch whose lower bound >= best known complete tour cost.
 */
export function solveBranchAndBoundTSP(input: TSPInput): AlgorithmResult {
  const startTime = performance.now();
  const { locations, matrix, maxLocationsLimit = 12 } = input;
  const n = locations.length;

  if (n < 2) {
    return {
      algorithmName: 'Branch and Bound (Optimal TSP)',
      tourIndices: [],
      tourLocations: [],
      totalDistance: 0,
      executionTimeMs: 0,
      isOptimal: false,
      hasTour: false,
      error: 'At least 2 locations required.'
    };
  }

  if (n > maxLocationsLimit) {
    return {
      algorithmName: 'Branch and Bound (Optimal TSP)',
      tourIndices: [],
      tourLocations: [],
      totalDistance: 0,
      executionTimeMs: 0,
      isOptimal: false,
      hasTour: false,
      error: `Input size (${n} locations) exceeds safe interactive limit of ${maxLocationsLimit} for Branch & Bound. Please select fewer delivery locations to ensure optimal browser responsiveness.`
    };
  }

  // Use Greedy solution as initial upper bound for efficient pruning
  const greedyRes = solveGreedyNearestNeighbor(input);
  let bestDistance = greedyRes.hasTour ? greedyRes.totalDistance : Infinity;
  let bestTour: number[] = greedyRes.hasTour ? [...greedyRes.tourIndices] : [];

  let nodesExplored = 0;
  let nodesPruned = 0;

  // Precompute minimum outgoing edges for each node (excluding self-loops)
  const minOutgoing = new Array(n).fill(Infinity);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && matrix[i][j] < minOutgoing[i]) {
        minOutgoing[i] = matrix[i][j];
      }
    }
  }

  // Helper function to calculate admissible lower bound
  function calculateBound(curr: number, visitedMask: number, currentCost: number): number {
    let bound = currentCost;

    // Minimum edge from current node to any unvisited node
    let minFromCurr = Infinity;
    for (let j = 0; j < n; j++) {
      if (!(visitedMask & (1 << j))) {
        if (matrix[curr][j] < minFromCurr) {
          minFromCurr = matrix[curr][j];
        }
      }
    }
    if (minFromCurr !== Infinity) {
      bound += minFromCurr;
    }

    // Sum of minimum outgoing edges from each unvisited node
    for (let i = 0; i < n; i++) {
      if (!(visitedMask & (1 << i))) {
        let minOut = matrix[i][0]; // can always return to depot
        for (let j = 0; j < n; j++) {
          if (i !== j && !(visitedMask & (1 << j))) {
            if (matrix[i][j] < minOut) {
              minOut = matrix[i][j];
            }
          }
        }
        bound += minOut;
      }
    }

    return bound;
  }

  // Branch & Bound recursive search with bounding & pruning
  function search(curr: number, count: number, visitedMask: number, currentCost: number, path: number[]) {
    nodesExplored++;

    // Base case: All locations visited, close the tour back to depot 0
    if (count === n) {
      const returnCost = matrix[curr][0];
      const tourCost = currentCost + returnCost;
      if (tourCost < bestDistance) {
        bestDistance = tourCost;
        bestTour = [...path, 0];
      }
      return;
    }

    // Sort next candidates by edge distance for earlier discovery of better upper bounds
    const candidates: { node: number; edgeCost: number }[] = [];
    for (let next = 0; next < n; next++) {
      if (!(visitedMask & (1 << next))) {
        candidates.push({ node: next, edgeCost: matrix[curr][next] });
      }
    }
    candidates.sort((a, b) => a.edgeCost - b.edgeCost);

    for (const cand of candidates) {
      const nextNode = cand.node;
      const nextCost = currentCost + cand.edgeCost;

      // Lower bound check: prune branch if lower bound cannot beat best tour
      const nextMask = visitedMask | (1 << nextNode);
      const estimatedBound = calculateBound(nextNode, nextMask, nextCost);

      if (estimatedBound >= bestDistance) {
        nodesPruned++;
        continue; // Prune branch
      }

      path.push(nextNode);
      search(nextNode, count + 1, nextMask, nextCost, path);
      path.pop();
    }
  }

  // Start search from depot (node 0)
  search(0, 1, 1 << 0, 0, [0]);

  const endTime = performance.now();

  return {
    algorithmName: 'Branch and Bound (Optimal TSP)',
    tourIndices: bestTour,
    tourLocations: bestTour.map(idx => locations[idx]),
    totalDistance: Number(bestDistance.toFixed(2)),
    executionTimeMs: Number((endTime - startTime).toFixed(3)),
    nodesExplored,
    nodesPruned,
    isOptimal: true,
    hasTour: bestTour.length === n + 1
  };
}
