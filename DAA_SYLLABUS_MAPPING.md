# DAA Syllabus Mapping

> **Note:** The official DAA syllabus mapping has been incorporated based on the provided `Syllabus.png` and `CO Mapping of syllabus.png`.

## 1. Relevant Course Outcomes (COs) Addressed

This project practically demonstrates the following Course Outcomes from the syllabus:

| CO | Description | Project Application |
|---|---|---|
| **CO1** | Analyze any given algorithm and express its time and space complexities in asymptotic notations. | Demonstrated in `ALGORITHM_DESIGN.md` through the $O(n!)$ and $O(n^2)$ analysis of Branch and Bound and Greedy approaches. |
| **CO4** | Illustrate the representation, traversal and different operations on Graphs. | The delivery network is represented as a complete weighted graph (Distance Matrix). Algorithms traverse this graph to find paths. |
| **CO5** | Demonstrate Divide-and-conquer, Greedy Strategy, Dynamic programming, Branch-and Bound and Backtracking algorithm design techniques. | **Directly addressed.** The project implements both **Greedy Strategy** (Nearest Neighbor) and **Branch-and-Bound** (exact TSP solver). |
| **CO6** | Classify a problem as computationally tractable or intractable, and discuss strategies to address intractability. | Demonstrated by contrasting the intractable nature of exact TSP (Branch and Bound) with the tractable heuristic strategy (Greedy) for larger datasets. |

## 2. Syllabus Module Mapping

The project maps to specific topics outlined in the syllabus modules:

### Module 2: Graphs
*   **Syllabus Topic:** Graphs – Representations, Traversals...
*   **Project Implementation:** The `Distance Matrix` configuration directly represents a weighted graph adjacency matrix. Route optimization acts as specialized graph traversal.

### Module 3: Greedy Strategy
*   **Syllabus Topic:** Greedy Strategy - Control Abstraction
*   **Project Implementation:** Implemented as the baseline route planner (Nearest-Neighbor). The UI clearly identifies this as a non-optimal heuristic strategy.

### Module 4: Branch and Bound & Complexity
*   **Syllabus Topic:** Branch and Bound - Control Abstraction, Travelling Salesman Problem, Algorithm
*   **Project Implementation:** This is the **core academic centerpiece** of the project. A custom Branch and Bound algorithm is implemented in JavaScript to solve small instances of the TSP, exactly fulfilling this syllabus requirement.
*   **Syllabus Topic:** Complexity - Tractable and Intractable Problems; Complexity Classes: P, NP, NP-Hard...
*   **Project Implementation:** TSP is presented as an NP-Hard problem. The UI restricts the input size for the exact algorithm, practically demonstrating intractability, while offering the Greedy approximation for larger sets.

## 3. Concepts Explicitly Out of Scope

To ensure focus on the core requirements, the following syllabus topics are **not** implemented in the software application (though they may be discussed in theoretical reports):

*   Module 1: AVL Trees, Recurrence Equations (Not applicable to UI/Logistics simulation).
*   Module 2: Disjoint Sets, Merge Sort, Strassen’s Matrix Multiplication.
*   Module 3: Fractional Knapsack (Orders are indivisible; capacity validation is a simple sum, not optimization). Dijkstra's Algorithm / Floyd-Warshall (TSP determines order; it is not a simple shortest-path A-to-B problem).
*   Module 4: Bin Packing, Randomized Algorithms, N-Queens.
