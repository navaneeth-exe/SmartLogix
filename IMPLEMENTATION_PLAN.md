# Implementation Plan

## 1. Project Implementation Phases

The project will be implemented in five distinct phases:

### Phase 1: Foundation and Setup
*   **Goal:** Establish the development environment, database schema, and initial UI skeleton.
*   **Key Deliverables:** 
    *   Vite + React project setup.
    *   Supabase project configuration and database tables created.
    *   Basic routing and UI layout (navigation, dashboard placeholder).

### Phase 2: Core Data Management (CRUD)
*   **Goal:** Implement management interfaces for all fundamental entities.
*   **Key Deliverables:**
    *   Product management module.
    *   Warehouse management module.
    *   Vehicle management module.
    *   Delivery location management module.
    *   Inventory management module (recording stock).

### Phase 3: Order Management and Map Integration
*   **Goal:** Enable order creation, validation, and spatial visualization.
*   **Key Deliverables:**
    *   Order creation and lifecycle management.
    *   Inventory validation against orders.
    *   React Leaflet map implementation displaying warehouses and locations.

### Phase 4: Algorithm and Delivery Planning
*   **Goal:** Implement the core DAA algorithms and the delivery planning workflow.
*   **Key Deliverables:**
    *   Distance matrix configuration UI.
    *   Branch and Bound TSP algorithm implementation.
    *   Greedy Nearest-Neighbor heuristic implementation.
    *   Delivery plan creation, validation (capacity, etc.), and algorithm execution.
    *   Route visualization on the map.

### Phase 5: Dispatch, Status Tracking, and Polish
*   **Goal:** Complete the dispatch workflow, dashboard metrics, and final testing.
*   **Key Deliverables:**
    *   Dispatch functionality (updating inventory and statuses atomically).
    *   Delivery status tracking.
    *   Dashboard metrics integration.
    *   Final testing and bug fixing.
    *   Deployment to Vercel.

---

## 2. Dependency Order Between Modules

The development of modules must strictly follow this dependency graph to avoid blocked tasks:

1.  **Database Schema** (Foundation for all modules)
2.  **Products & Warehouses & Vehicles & Delivery Locations** (Independent of each other, but required by others)
3.  **Inventory** (Depends on Products and Warehouses)
4.  **Orders** (Depends on Products, Inventory, and Delivery Locations)
5.  **Distance Matrix** (Depends on Delivery Locations and Warehouses)
6.  **Algorithms** (Depends on Distance Matrix)
7.  **Delivery Planning** (Depends on Orders, Warehouses, Vehicles, and Algorithms)
8.  **Dispatch** (Depends on Delivery Planning, Orders, Vehicles, and Inventory)
9.  **Dashboard** (Depends on all data modules for metrics)

---

## 3. Development Milestones

*   **Milestone 1: Database & Basic UI Setup** (End of Phase 1)
*   **Milestone 2: CRUD Functionality Complete** (End of Phase 2)
*   **Milestone 3: Orders and Map Working** (End of Phase 3)
*   **Milestone 4: Route Optimization Functional** (End of Phase 4) - *Critical DAA academic milestone.*
*   **Milestone 5: Production Ready** (End of Phase 5)

---

## 4. Integration Strategy

*   **Frontend-Backend Integration:** All data operations will use the `@supabase/supabase-js` client. API calls will be encapsulated in service functions or custom hooks to keep UI components clean.
*   **Algorithm Integration:** Algorithms will run synchronously or as web workers (if necessary to prevent UI freezing, though instances are small) in the browser, accepting the distance matrix and selected locations as input, and returning an ordered sequence and distance.
*   **Map Integration:** The map will react to state changes in the application (e.g., selecting a plan updates the route polyline). Coordinates and routing logic remain strictly separated.

---

## 5. Testing Strategy

*   **Manual Feature Testing:** Each module will be manually tested against its acceptance criteria upon completion.
*   **Algorithm Verification:** 
    *   Test Branch and Bound against known small TSP instances to verify optimality.
    *   Verify the return leg is correctly included in distance calculations.
    *   Compare Greedy vs. Branch and Bound results.
*   **Constraint Testing:**
    *   Attempt to create negative inventory (should fail).
    *   Attempt to dispatch an order exceeding vehicle capacity (should fail).
    *   Attempt to dispatch an order with insufficient stock (should fail).

---

## 6. Deployment Plan

1.  **Database:** Deploy final schema and RLS policies to the production Supabase instance.
2.  **Environment Variables:** Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel.
3.  **Frontend Build:** Deploy the `main` branch to Vercel. Vercel will automatically run `npm run build` and host the static assets.
4.  **Post-Deployment Verification:** Perform a complete test of the workflow (create warehouse -> inventory -> order -> plan -> route -> dispatch) on the live URL.

---

## 7. Risks and Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Branch and Bound performance** | High (UI freeze) | Restrict the maximum number of locations allowed for the exact algorithm (e.g., limit to 10-12 stops). Display clear warnings. |
| **Data Inconsistency (Dispatch)** | High (Logical errors) | Use Supabase RPC functions (PostgreSQL stored procedures) for atomic dispatch operations that update orders, vehicles, and inventory simultaneously. |
| **Coordinate vs. Distance confusion** | Medium (Academic deduction) | Clearly label UI elements. Store distance matrix explicitly in the DB, completely detached from map lat/lng calculations. |
| **Time constraints** | Medium (Incomplete project) | Stick strictly to the defined scope. Do not implement any "Out of Scope" features. Follow the dependency order. |

---

## 8. Practical Implementation Sequence

1.  Create Supabase project and execute SQL schema definition.
2.  Initialize Vite project, install dependencies (`react-router-dom`, `@supabase/supabase-js`, `react-leaflet`, `leaflet`).
3.  Implement Supabase client utility.
4.  Build layout (Sidebar, Navbar, Main Content area).
5.  Build Product management pages (List, Add/Edit).
6.  Build Warehouse management pages.
7.  Build Delivery Location pages.
8.  Build Vehicle management pages.
9.  Build Inventory management pages (linking products and warehouses).
10. Build Order management pages (with stock validation).
11. Implement Distance Matrix configuration interface.
12. Implement Branch and Bound and Greedy algorithm logic (pure JavaScript functions).
13. Build Delivery Planning interface (selecting orders, warehouse, vehicle -> running algorithm).
14. Integrate React Leaflet map to visualize locations and planned routes.
15. Implement Dispatch logic (Supabase RPC recommended for atomicity).
16. Implement Dashboard metrics.
17. Final review and deployment.
