# Algorithm Design

## 1. Problem Definition: Travelling Salesperson Problem (TSP)

The route optimization module models a specific variation of the Travelling Salesperson Problem (TSP).

**Given:**
*   A set of locations $L = \{l_0, l_1, l_2, \dots, l_n\}$, where $l_0$ is the origin warehouse and $l_1 \dots l_n$ are the delivery locations.
*   A configured distance matrix $D$ where $D_{i,j}$ represents the distance from location $l_i$ to location $l_j$.
*   The distance matrix is non-negative ($D_{i,j} \ge 0$) and the distance to self is zero ($D_{i,i} = 0$). It may or may not be symmetric.

**Objective:**
Find an ordered sequence of visits (a tour) $P = \langle l_0, l_{k_1}, l_{k_2}, \dots, l_{k_n}, l_0 \rangle$ that:
1.  Starts at the warehouse $l_0$.
2.  Visits every delivery location $l_1 \dots l_n$ exactly once.
3.  Returns to the warehouse $l_0$ (closed tour).
4.  Minimizes the total route distance: $Cost(P) = D_{0,k_1} + \sum_{m=1}^{n-1} D_{k_m, k_{m+1}} + D_{k_n, 0}$.

---

## 2. Distance Matrix vs. Map Coordinates

*   **Critical Distinction:** The algorithms operate **exclusively** on the manually configured distance matrix $D$.
*   Map coordinates (latitude/longitude) are used **only** for visual representation via React Leaflet.
*   Calculated Euclidean or Haversine road distances are explicitly **out of scope**.

---

## 3. Algorithm 1: Branch and Bound (Exact)

Branch and Bound is used to find the **optimal** route for small instances of the TSP.

### 3.1 Design
*   **State Space Tree:** Each node represents a partial tour. The root node is the warehouse $l_0$. Branches represent moving to unvisited locations.
*   **Cost Calculation:** The actual cost incurred so far (sum of distances of the partial tour).
*   **Lower Bound Calculation:** To prune branches, we calculate a lower bound for the remaining unvisited locations. A common approach is the sum of the minimum outgoing edges for all unvisited nodes plus the minimum outgoing edge from the last visited node.
*   **Pruning Condition:** If `Current Cost + Lower Bound >= Best Cost Found So Far`, prune the branch.

### 3.2 Pseudocode

```text
function TSP_BranchAndBound(DistanceMatrix, NumLocations):
    Initialize BestTour = null
    Initialize MinCost = INFINITY
    Initialize InitialPath = [0] // 0 is warehouse
    
    // Node structure: (path_so_far, cost_so_far, bound)
    RootNode = createNode(InitialPath, 0, calculateInitialBound(DistanceMatrix))
    
    Queue = PriorityQueue based on lower bound (or simple stack for DFS)
    Queue.push(RootNode)
    
    while Queue is not empty:
        CurrentNode = Queue.pop()
        
        // Prune if current lower bound is worse than best found
        if CurrentNode.bound >= MinCost:
            continue
            
        LastVisited = CurrentNode.path_so_far.last()
        
        // If all locations visited, complete the tour by returning to 0
        if CurrentNode.path_so_far.length == NumLocations:
            TotalCost = CurrentNode.cost_so_far + DistanceMatrix[LastVisited][0]
            if TotalCost < MinCost:
                MinCost = TotalCost
                BestTour = CurrentNode.path_so_far + [0]
            continue
            
        // Branch to all unvisited nodes
        for i from 1 to NumLocations - 1:
            if i is not in CurrentNode.path_so_far:
                NewPath = CurrentNode.path_so_far + [i]
                NewCost = CurrentNode.cost_so_far + DistanceMatrix[LastVisited][i]
                NewBound = calculateBound(NewPath, DistanceMatrix) // Actual cost + remaining bound
                
                if NewBound < MinCost:
                    Queue.push(createNode(NewPath, NewCost, NewBound))
                    
    return BestTour, MinCost
```

### 3.3 Complexity Analysis
*   **Time Complexity:** Worst case $O(n!)$ where $n$ is the number of locations. The bounding function significantly reduces the average case, but it remains intractable for large $n$.
*   **Space Complexity:** $O(n!)$ in worst-case BFS/Best-First search, or $O(n^2)$ for DFS if only storing the active path and matrix.

---

## 4. Algorithm 2: Greedy Nearest-Neighbor (Heuristic)

Implemented as a baseline for comparison against the exact method.

### 4.1 Design
*   Start at the warehouse $l_0$.
*   At each step, look at all unvisited locations.
*   Select the location with the minimum distance from the current location.
*   Mark it as visited and add to the route.
*   Repeat until all locations are visited.
*   Add the distance back to the warehouse $l_0$.

### 4.2 Pseudocode

```text
function TSP_Greedy(DistanceMatrix, NumLocations):
    Visited = boolean array of size NumLocations, initially false
    Tour = [0]
    Visited[0] = true
    CurrentNode = 0
    TotalCost = 0
    
    for count from 1 to NumLocations - 1:
        NextNode = -1
        MinDist = INFINITY
        
        for i from 1 to NumLocations - 1:
            if not Visited[i] and DistanceMatrix[CurrentNode][i] < MinDist:
                MinDist = DistanceMatrix[CurrentNode][i]
                NextNode = i
                
        Tour.push(NextNode)
        Visited[NextNode] = true
        TotalCost += MinDist
        CurrentNode = NextNode
        
    // Return to warehouse
    TotalCost += DistanceMatrix[CurrentNode][0]
    Tour.push(0)
    
    return Tour, TotalCost
```

### 4.3 Complexity Analysis
*   **Time Complexity:** $O(n^2)$ where $n$ is the number of locations. Very fast and scalable.
*   **Space Complexity:** $O(n)$ to store the tour and visited array.
*   **Optimality:** Does **not** guarantee an optimal solution. It is a heuristic.

---

## 5. Vehicle Capacity Validation (Not Knapsack)

*   **Important:** Capacity checking in this application is **not** the Fractional Knapsack problem.
*   Customer orders are treated as **indivisible whole units**.
*   The validation algorithm simply sums the weight of selected orders:
    $TotalWeight = \sum_{order \in Selected} Order.Weight$
*   If $TotalWeight > Vehicle.MaxCapacity$, the dispatch plan is rejected.
*   We do not attempt to optimize which orders to fit into the vehicle using 0/1 Knapsack in this initial scope; the user manually selects the orders.

---

## 6. Limitations

*   **Scalability:** Branch and Bound will freeze the browser if executed on too many locations. The UI must restrict exact execution to $\le 10$ locations.
*   **Symmetry:** If the user configures an asymmetric distance matrix, the algorithms will process it as a directed graph, which is mathematically sound but may diverge from real-world road expectations.
*   **Missing Distances:** The application assumes a fully connected graph. If a distance is undefined ($D_{i,j} = \infty$), the algorithms must handle it gracefully without crashing.
