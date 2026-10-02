# SmartLogix Phase 0 Baseline Audit

> **Document Type:** Pre-Flight Architectural Baseline & System Lock  
> **Baseline Commit Hash:** `884becbb14eb4d2254e265498a4e35f4e387fae6`  
> **Authoritative Baseline Reference:** `EXISTING_VERSION.md` (Version 1.0.0-FREEZE)  
> **Audit Status:** Complete & Verified — All Baseline Invariants Locked  

---

## 1. Current Repository State

- **Repository Root:** `c:\Users\NAVANEETH\Documents\Academic Projects\Smart Inventory & Delivery Optimization System`
- **Application Directory:** `smartlogix/`
- **Package Architecture:** Vite 8.3.0 + React 19.2.8 + TypeScript 6.0.2 + TailwindCSS 3.4.19
- **Core Technology Stack:**
  - Client Database SDK: `@supabase/supabase-js` (`^2.117.2`)
  - Mapping Engine: `leaflet` (`^1.9.4`) & `react-leaflet` (`^5.0.0`)
  - Motion & Polish: `framer-motion` (`^13.4.4`)
  - Visualizations: `recharts` (`^3.10.1`)
  - Icons: `lucide-react` (`^1.48.0`)

---

## 2. Git State

- **Current Branch:** `main`
- **Current HEAD Commit:** `884becbb14eb4d2254e265498a4e35f4e387fae6` (`feat(ui): complete phase 5 reports, charts and settings redesign`)
- **Working Tree Status:** Clean working directory with non-breaking UI refinements and uncommitted snapshot files:
  - `M smartlogix/UI_REDESIGN_PHASES.md`
  - `M smartlogix/UI_REDESIGN_TASKS.md`
  - `M smartlogix/src/pages/Planning.tsx`
  - `M smartlogix/src/pages/Reports.tsx`
  - `?? EXISTING_VERSION.md`
- **Change Control Rule:** No commits, resets, or stash operations executed during Phase 0.

---

## 3. Existing Algorithms

Exhaustive audit of `smartlogix/src/algorithms/` and surrounding files:

1. **Branch and Bound TSP Solver (`solveBranchAndBoundTSP`)**:
   - Location: `smartlogix/src/algorithms/tsp.ts`
   - Role: Exact solver for the Traveling Salesperson Problem.
   - Initial Bound: Solves Greedy Nearest Neighbor first to seed `bestDistance` with an initial upper bound for aggressive pruning.
   - Bounding Strategy: Calculates an admissible lower bound:
     $$\text{currentCost} + \min_{\text{unvisited}}(\text{outgoing from current}) + \sum_{\text{unvisited}} \min(\text{outgoing to unvisited or depot})$$
   - Candidate Ordering: Dynamically sorts unvisited edges in ascending distance order.
   - Pruning: Immediately aborts recursive sub-branches if $\text{estimatedBound} \ge \text{bestDistance}$.
   - Complexity: Worst-case $O(n!)$, constrained to $n \le 10$ nodes in UI for browser safety.

2. **Greedy Nearest Neighbor Heuristic (`solveGreedyNearestNeighbor`)**:
   - Location: `smartlogix/src/algorithms/tsp.ts`
   - Role: Fast polynomial approximation heuristic.
   - Strategy: Begins at depot node 0, iteratively visits the closest unvisited node, and returns to depot 0.
   - Complexity: $O(n^2)$ time, $O(n)$ space.

3. **Input Matrix Validation (`validateTSPMatrix`)**:
   - Location: `smartlogix/src/algorithms/tsp.ts`
   - Verifies dimension matching, non-negative edge weights, zero self-loops, and absence of `NaN`/`null` values.

---

## 4. Frozen Components

The following codebase components are **FROZEN** and must not be refactored, renamed, re-implemented, or modified:

| Component | File Path | Freeze Policy |
| :--- | :--- | :--- |
| **TSP Algorithms** | `smartlogix/src/algorithms/tsp.ts` | **STRICTLY FROZEN**. No signature, heuristic, complexity, or logic edits. |
| **Historical Migrations** | `smartlogix/supabase/migrations/*.sql` | **STRICTLY FROZEN**. Never edit migrations `000000` through `000007`. |
| **ORS Edge Function** | `smartlogix/supabase/functions/ors-matrix/index.ts` | **STRICTLY FROZEN**. Contract `{ locations, profile }` must be preserved. |
| **Core Database RPCs** | `smartlogix/supabase/migrations/` | **STRICTLY FROZEN**. `create_order_atomic`, `update_order_status`, `create_delivery_plan_atomic`, `assign_vehicle_to_delivery_plan`, `save_delivery_plan_route`. |
| **Existing App Routes** | `smartlogix/src/App.tsx` | **STRICTLY FROZEN**. All 13 URL paths remain unchanged. |
| **Existing Map Stack** | `smartlogix/src/components/RouteMap.tsx`, `MapLocationPicker.tsx` | **STRICTLY FROZEN**. Do not build redundant map systems. |

---

## 5. Existing Database Schema

The database consists of 8 tables across 10 migration files:

1. **`warehouses`**: `id`, `name`, `code` (UNIQUE), `address`, `latitude`, `longitude`, `is_active`, `created_at`, `updated_at`.
   - **CONFIRMED:** There is **NO** warehouse capacity, volume, or storage limit column.
2. **`products`**: `id`, `sku` (UNIQUE), `name`, `description`, `category`, `unit_price`, `weight_kg` (default 10.0), `created_at`, `updated_at`.
3. **`inventory`**: `id`, `warehouse_id` (FK), `product_id` (FK), `quantity`, `reorder_level`, `updated_at`. Composite unique `(warehouse_id, product_id)`.
4. **`delivery_locations`**: `id`, `name`, `address`, `latitude`, `longitude`, `is_active`, `created_at`, `updated_at`.
5. **`orders`**: `id`, `order_number` (UNIQUE), `delivery_location_id` (FK), `status`, `priority`, `total_amount`, `created_at`, `updated_at`.
6. **`order_items`**: `id`, `order_id` (FK), `product_id` (FK), `quantity`, `unit_price`, `created_at`.
7. **`vehicles`**: `id`, `name`, `registration_number` (UNIQUE), `vehicle_type` ('Motorcycle', 'Van', 'Small Truck', 'Large Truck'), `capacity`, `capacity_unit` ('kg', 'units', 'm3'), `status` ('AVAILABLE', 'ON_ROUTE', 'MAINTENANCE', 'OFF_DUTY'), `created_at`, `updated_at`.
8. **`delivery_plans`**: `id`, `plan_number` (UNIQUE), `warehouse_id` (FK), `vehicle_id` (FK), `status` ('PLANNED', 'CANCELLED'), `route_algorithm`, `route_stops` (JSONB), `route_distance`, `route_execution_time_ms`, `route_generated_at`, `created_at`, `updated_at`.
   - Partial unique index: `idx_delivery_plans_active_vehicle` on `(vehicle_id) WHERE status = 'PLANNED' AND vehicle_id IS NOT NULL`.
9. **`delivery_plan_orders`**: `id`, `delivery_plan_id` (FK), `order_id` (FK), `created_at`. Composite unique `(delivery_plan_id, order_id)`.
10. **`location_distances`**: `id`, `origin_id`, `destination_id`, `distance`, `distance_meters`, `distance_source`, `routing_profile`, `duration_seconds`, `generated_at`, `created_at`, `updated_at`. Composite unique `(origin_id, destination_id)`.

---

## 6. Existing Supabase RPCs

All transactional logic is encapsulated in PostgreSQL `SECURITY DEFINER` stored procedures:

1. `create_order_atomic(p_delivery_location_id, p_priority, p_items, p_warehouse_id)`: Atomically validates stock, inserts order and line items.
2. `update_order_status(p_order_id, p_new_status)`: Enforces valid state machine transitions (`PENDING` -> `PROCESSING` -> `DISPATCHED` -> `DELIVERED` or `CANCELLED`).
3. `create_delivery_plan_atomic(p_warehouse_id, p_order_ids)`: Creates delivery plan, verifies orders are not in another active plan.
4. `assign_vehicle_to_delivery_plan(p_plan_id, p_vehicle_id)`: Validates vehicle availability and capacity ($\sum \le \text{capacity}$), transitions vehicle to `ON_ROUTE`.
5. `remove_vehicle_from_delivery_plan(p_plan_id)`: Unassigns vehicle and restores status to `AVAILABLE`.
6. `cancel_delivery_plan(p_plan_id)`: Cancels plan and automatically releases any assigned vehicle back to `AVAILABLE`.
7. `save_delivery_plan_route(p_plan_id, p_algorithm, p_stops, p_distance, p_time_ms)`: Persists route telemetry against plan.
8. `save_location_distance(p_origin_id, p_destination_id, p_distance, p_symmetric, ...)`: Upserts road distance matrix edge entries.
9. `update_inventory_stock(p_warehouse_id, p_product_id, p_quantity, p_reorder_level)`: Atomic inventory level adjustment.

---

## 7. Existing API Architecture

- Centralized in `smartlogix/src/services/api.ts` across 8 namespaces:
  - `api.products`: `list`, `create`, `update`
  - `api.warehouses`: `list`, `create`, `update`
  - `api.inventory`: `list`, `getByWarehouse`, `updateStock`, `addStock`
  - `api.locations`: `list`, `getActive`, `getById`, `create`, `update`, `toggleActive`, `delete`
  - `api.orders`: `list`, `getById`, `create`, `updateStatus`
  - `api.vehicles`: `list`, `getById`, `create`, `update`, `updateStatus`, `delete`
  - `api.distances`: `list`, `save`, `saveBatch`, `generateRoadMatrix`
  - `api.plans`: `list`, `getById`, `create`, `cancel`, `assignVehicle`, `removeVehicle`, `getAvailableVehicles`, `getEligibleOrders`, `saveRoute`
- **Extension Rule:** Existing method signatures must not be altered. Future warehouse allocation and optimization methods must be added additively.

---

## 8. Existing Map Architecture

- Standardized on `leaflet` + `react-leaflet` with OpenStreetMap base layer.
- Components:
  - `RouteMap.tsx`: Visualizes depot and delivery stops with custom DivIcons, numbered stop sequence badges, polyline connections, and auto-fit bounding box.
  - `MapLocationPicker.tsx`: Modal geocoder and pin placement tool for setting precise coordinates.
  - `MapWorkspace.tsx`: Comprehensive logistics GIS command center showing all warehouses and delivery points.
- **Rule:** Future algorithm visualizers (e.g. allocation networks, shortest paths) must reuse this Leaflet mapping infrastructure rather than creating new map engines.

---

## 9. Existing Application Routes

All 13 routes configured in `smartlogix/src/App.tsx` verified functional:

1. `/`: Dashboard (`Dashboard.tsx`)
2. `/map`: Logistics Map Workspace (`MapWorkspace.tsx`)
3. `/products`: Product Catalog (`Products.tsx`)
4. `/inventory`: Warehouse Stock Management (`Inventory.tsx`)
5. `/warehouses`: Facility Directory (`Warehouses.tsx`)
6. `/orders`: Customer Orders Pipeline (`Orders.tsx`)
7. `/orders/create`: Order Creation Builder (`CreateOrder.tsx`)
8. `/locations`: Delivery Locations Directory (`Locations.tsx`)
9. `/vehicles`: Fleet & Vehicle Management (`Vehicles.tsx`)
10. `/planning`: Delivery Plan & DAA Optimization (`Planning.tsx`)
11. `/distance-matrix`: Distance Matrix & ORS Tool (`DistanceMatrix.tsx`)
12. `/reports`: Analytics & Recharts Reports (`Reports.tsx`)
13. `/settings`: System Solver Configuration (`Settings.tsx`)
- Catch-all redirect: `*` -> `/`

---

## 10. Existing Warehouse Capabilities

- **Current State:**
  - Warehouses store identifier, name, code, address, and GIS coordinates (`latitude`, `longitude`).
  - Warehouses act as the round-trip start and end depot for TSP delivery tours.
- **Audit Findings:**
  - **Storage Capacity:** NOT modeled in schema or frontend.
  - **Restock Allocation:** NOT automated; user manually inputs restock quantity.
  - **Fulfillment Allocation:** NOT algorithmically optimized; user manually selects warehouse or order builder picks first available.

---

## 11. Existing Delivery Planning Pipeline

```
Customer Orders (PENDING / PROCESSING)
                 ↓
Warehouse Selection (User Depot Pick)
                 ↓
Delivery Plan Creation (create_delivery_plan_atomic RPC)
                 ↓
Vehicle Assignment (assign_vehicle_to_delivery_plan RPC - Linear Capacity Sum Check)
                 ↓
ORS Road Distance Matrix (Edge Function -> location_distances)
                 ↓
DAA Optimization (Branch & Bound TSP OR Greedy Nearest Neighbor in tsp.ts)
                 ↓
Saved Route (save_delivery_plan_route RPC)
                 ↓
RouteMap Visualization (React-Leaflet Polyline + Sequenced DivIcons)
```

---

## 12. Build / TypeScript / Lint Verification

- **TypeScript Compiler (`node "./node_modules/typescript/bin/tsc" -b`):**
  - **Result:** PASSED (Exit code 0, 0 errors).
- **Production Build (`node "./node_modules/vite/bin/vite.js" build`):**
  - **Result:** PASSED (Exit code 0 in 4.52s, complete production bundle emitted).
- **Linter (`node "./node_modules/oxlint/bin/oxlint"`):**
  - **Result:** PASSED (0 errors, 16 pre-existing non-blocking warnings on React 19 hook dependency patterns).

---

## 13. Confirmed Missing Capabilities

The following capabilities are **CONFIRMED NOT PRESENT** in the codebase:

1. **Warehouse Storage Capacity:** No schema column or validation.
2. **Automated Restock Allocation:** No replenishment optimization algorithm.
3. **Automated Fulfillment Warehouse Selection:** No multi-warehouse proximity/cost allocation.
4. **0/1 Knapsack Problem:** Not in codebase (vehicle assignment is a linear sum check).
5. **Fractional Knapsack Problem:** Not in codebase.
6. **Bin Packing Problem (FFD / BFD):** Not in codebase.
7. **Dijkstra's Algorithm:** Not in codebase (road matrix is fetched externally via ORS).
8. **Floyd-Warshall Algorithm:** Not in codebase.
9. **Kruskal / Prim MST:** Not in codebase.
10. **Union-Find Disjoint Set:** Not in codebase.

---

## 14. Phase 0 Rules

For all subsequent phases, the following rules are permanently binding:

1. `src/algorithms/tsp.ts` is **FROZEN**.
2. Existing Branch and Bound TSP is **FROZEN**.
3. Existing Greedy Nearest Neighbor is **FROZEN**.
4. Existing ORS Edge Function is **PRESERVED**.
5. Existing database RPC signatures and behaviors are **PRESERVED**.
6. Historical database migrations (`000000` to `000007`) are **PRESERVED** (new migrations must use new files).
7. All 13 existing application routes are **PRESERVED**.
8. Existing Leaflet map architecture is **PRESERVED**.
9. All new algorithms must be strictly **ADDITIVE** and placed in **NEW** dedicated files in `src/algorithms/`.
10. API service extensions must preserve all existing method contracts.
11. The established UI design system (`Card`, `Button`, `Badge`, `PageHeader`, `Input`, `Select`) must be reused.

---

## 15. Phase 0 Conclusion

All pre-flight audits, code inspections, database verifications, and build checks have succeeded with zero errors.

# READY FOR PHASE 1
