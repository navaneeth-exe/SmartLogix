# Product Requirements Document (PRD)

## 1. Functional Requirements

### 1.1 Dashboard Module
*   **FR-DB-01:** Display total number of products.
*   **FR-DB-02:** Display total inventory quantity across all warehouses.
*   **FR-DB-03:** Display number of configured warehouses.
*   **FR-DB-04:** Display order statistics (total, pending, fulfillable, shortage, dispatched, in-transit, delivered).
*   **FR-DB-05:** Display vehicle statistics (total, available, assigned).
*   **FR-DB-06:** Display total distance recorded across all delivery plans.
*   **FR-DB-07:** Dashboard metrics must reflect real-time database state without hardcoded values.

### 1.2 Product Management Module
*   **FR-PR-01:** Add, view, edit, search, and delete products.
*   **FR-PR-02:** Product fields: ID, Name, SKU, Description, Unit of Measurement, Weight per Unit, Status.
*   **FR-PR-03:** Prevent deletion of a product referenced by existing inventory or orders.

### 1.3 Inventory Management Module
*   **FR-IN-01:** Record and update stock quantity for a specific product at a specific warehouse.
*   **FR-IN-02:** View inventory grouped by product or by warehouse.
*   **FR-IN-03:** System must reject negative stock quantities.
*   **FR-IN-04:** Identify and display product shortages when orders exceed available stock.

### 1.4 Warehouse Management Module
*   **FR-WH-01:** Add, view, edit, and delete fictional warehouses.
*   **FR-WH-02:** Warehouse fields: ID, Name, Address, Latitude, Longitude, Status.
*   **FR-WH-03:** Prevent deletion if the warehouse contains inventory or is referenced in an active plan.

### 1.5 Customer Order Management Module
*   **FR-OR-01:** Create, view, edit, and cancel orders.
*   **FR-OR-02:** Order fields: ID, Customer Name/Ref, Date, Delivery Location, Items (Product + Quantity), Status.
*   **FR-OR-03:** Calculate total order weight based on product unit weights.
*   **FR-OR-04:** Orders cannot be edited or cancelled if they are in 'Ready for Dispatch' or later statuses.
*   **FR-OR-05:** Orders are indivisible (cannot be partially fulfilled or split).

### 1.6 Delivery Location Management Module
*   **FR-DL-01:** Add, view, edit, and delete delivery locations.
*   **FR-DL-02:** Location fields: ID, Name, Address, Latitude, Longitude.
*   **FR-DL-03:** Moving a location's map coordinates must *not* automatically update the distance matrix.

### 1.7 Vehicle Management Module
*   **FR-VE-01:** Add, view, edit, and delete vehicles.
*   **FR-VE-02:** Vehicle fields: ID, Name/Reg, Maximum Capacity, Capacity Unit, Availability Status.

### 1.8 Delivery Planning Module
*   **FR-PL-01:** Create a delivery plan by selecting an origin warehouse, eligible orders, and an available vehicle.
*   **FR-PL-02:** Validate that the combined weight of selected orders does not exceed the vehicle's capacity.
*   **FR-PL-03:** Validate that all required products are available in the selected warehouse.
*   **FR-PL-04:** Configure and store a distance matrix between warehouses and delivery locations.
*   **FR-PL-05:** Execute selected algorithm (Branch and Bound or Greedy) using the distance matrix.
*   **FR-PL-06:** Display ordered visit sequence and total calculated distance.
*   **FR-PL-07:** Prevent an order from being included in multiple active plans.

### 1.9 Dispatch & Delivery Status Module
*   **FR-DI-01:** Dispatch a reviewed plan, transitioning related orders to 'Dispatched'.
*   **FR-DI-02:** Atomically deduct allocated inventory upon dispatch to prevent double deduction.
*   **FR-DI-03:** Mark vehicle as unavailable/assigned upon dispatch.
*   **FR-DI-04:** Allow manual progression of delivery status to 'Delivered'.

### 1.10 Map Visualization Module
*   **FR-MP-01:** Display warehouses and delivery locations as markers on a 2D Leaflet map.
*   **FR-MP-02:** Display planned routes as polylines connecting markers in the algorithmically determined order.

---

## 2. Non-Functional Requirements

*   **NFR-01 (Performance):** UI must remain responsive. If exact TSP algorithms exceed 10-12 nodes, warn the user and optionally terminate or run asynchronously.
*   **NFR-02 (Security):** Database must be secured using Supabase Row Level Security (RLS). Service role keys must not be in the frontend.
*   **NFR-03 (Usability):** The application must clearly distinguish between map coordinates (visualization) and the configured distance matrix (algorithm input).
*   **NFR-04 (Cost):** The application must rely entirely on free-tier services (Supabase, Vercel, OpenStreetMap). No paid APIs.

---

## 3. Business Rules

### 3.1 Order Lifecycle
*   **Pending:** Newly created.
*   **Confirmed:** Acknowledged.
*   **Processing:** Inventory check passed.
*   **Ready for Dispatch:** Included in a delivery plan.
*   **Dispatched:** Vehicle has left warehouse; inventory is deducted.
*   **Delivered:** Order reached customer.
*   **Cancelled:** Terminated before dispatch.
*   **On Hold:** Stock shortage or other issue.
*   *Rule:* Status progression is forward only, except for specific cancellations. Dispatched orders cannot be cancelled via normal flow.

### 3.2 Inventory Rules
*   Inventory is specific to a `(Warehouse, Product)` pair.
*   Stock levels cannot be negative.
*   Shortages prevent an order from entering 'Ready for Dispatch'.

### 3.3 Vehicle Capacity Rules
*   $\sum (\text{Order Weight}) \le \text{Vehicle Capacity}$ for a given dispatch plan.
*   Orders are atomic; they cannot be split to fit capacity.

### 3.4 Dispatch Rules
*   Dispatch operation must be atomic.
*   An order can only be assigned to one active plan at a time.
*   A vehicle can only be assigned to one active plan at a time.

---

## 4. Acceptance Criteria

1.  A user can create, view, edit, and safely delete products.
2.  A user can create and manage multiple warehouses.
3.  Inventory quantities are associated with products and warehouses.
4.  Negative inventory is rejected by the system.
5.  A user can create orders with multiple order items.
6.  Orders referencing nonexistent products are rejected.
7.  Stock shortages are calculated and displayed correctly when creating a plan.
8.  A user can create and manage delivery locations.
9.  A user can create and manage vehicles.
10. Vehicle capacity is checked before assignment to a plan.
11. An order that exceeds vehicle capacity cannot be assigned to that vehicle.
12. A user can manually configure the distance matrix.
13. The route-planning algorithm uses the configured distances, NOT map coordinates.
14. The generated route starts at the selected warehouse.
15. Every required delivery location in the plan is visited exactly once.
16. The route returns to the warehouse (closed tour).
17. The reported route distance matches the sum of edges in the distance matrix for the generated route.
18. Branch and Bound produces an optimal result for supported small instances.
19. A greedy result is clearly identified as a heuristic.
20. A user can review a plan before dispatch.
21. Invalid orders (e.g., shortages) cannot be dispatched.
22. An order cannot be assigned to multiple active dispatch plans.
23. Repeated dispatch actions do not deduct inventory multiple times.
24. Delivery status updates are reflected accurately in the dashboard.
25. The map displays warehouses, delivery locations, and selected routes.
26. Moving a map marker updates visual position but does not modify the algorithmic distance matrix.
27. The application handles empty states (no data) gracefully without crashing.
28. Database relationships remain valid; deletion of referenced entities is prevented.

---

## 5. Error and Edge-Case Handling

*   **Database Constraints:** Use SQL `CHECK` constraints (e.g., `quantity >= 0`) and foreign keys to prevent corrupt data even if frontend validation fails.
*   **TSP Scalability:** If a user selects > 12 locations for Branch and Bound, display a modal warning about factorial time complexity and offer to switch to the Greedy algorithm.
*   **Missing Distance Data:** If the algorithm is invoked but the distance matrix lacks an entry for a pair of locations, abort the algorithm and prompt the user to configure the missing distance.
*   **Concurrent Modification:** In a single-operator simulated environment, this is low risk. However, atomic database transactions (via RPC) during dispatch will prevent race conditions if multiple tabs are open.
