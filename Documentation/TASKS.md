# Development Tasks

This document outlines the specific, testable tasks required to build the application, ordered by dependency.

## Phase 1: Database and Backend Setup
- [ ] **TASK-DB-01:** Define PostgreSQL schema (Products, Warehouses, Inventory, Locations, Vehicles, Orders, DistanceMatrix, Plans).
- [ ] **TASK-DB-02:** Execute schema creation in Supabase.
- [ ] **TASK-DB-03:** Set up Row Level Security (RLS) policies for anonymous/authenticated access as required.
- [ ] **TASK-DB-04:** Create PostgreSQL RPC function for atomic Dispatch operation (deduct inventory, update status).

## Phase 2: Frontend Foundation
- [ ] **TASK-FE-01:** Initialize React + Vite project.
- [ ] **TASK-FE-02:** Install core dependencies (`react-router-dom`, `@supabase/supabase-js`, `lucide-react` for icons).
- [ ] **TASK-FE-03:** Configure Supabase client utility (`supabase.js`).
- [ ] **TASK-FE-04:** Create main application layout (Sidebar navigation, Header, Main content area).

## Phase 3: Core CRUD Modules
- [ ] **TASK-CR-01:** Implement Product Module (List, Add, Edit, Delete).
- [ ] **TASK-CR-02:** Implement Warehouse Module (List, Add, Edit, Delete).
- [ ] **TASK-CR-03:** Implement Delivery Location Module (List, Add, Edit, Delete).
- [ ] **TASK-CR-04:** Implement Vehicle Module (List, Add, Edit, Delete).

## Phase 4: Inventory & Order Management
- [ ] **TASK-IO-01:** Implement Inventory UI (View stock per warehouse, add/adjust stock).
- [ ] **TASK-IO-02:** Implement Order Creation UI (Select customer, location, add products/quantities).
- [ ] **TASK-IO-03:** Implement Order validation logic (Check product existence, calculate total weight).
- [ ] **TASK-IO-04:** Implement Order List view with status badges.

## Phase 5: Map & Distance Configuration
- [ ] **TASK-MP-01:** Install and configure `react-leaflet` and `leaflet`.
- [ ] **TASK-MP-02:** Create Map Component displaying Warehouses and Delivery Locations as markers.
- [ ] **TASK-MP-03:** Implement UI to manually configure the Distance Matrix between locations.

## Phase 6: Algorithms
- [ ] **TASK-AL-01:** Implement pure JS function: `calculateBranchAndBoundTSP(distanceMatrix, locations)`.
- [ ] **TASK-AL-02:** Implement pure JS function: `calculateGreedyTSP(distanceMatrix, locations)`.
- [ ] **TASK-AL-03:** Write unit tests for algorithms with a known small distance matrix.

## Phase 7: Delivery Planning Workflow
- [ ] **TASK-PL-01:** Build Planning UI (Select warehouse, vehicle, and pending orders).
- [ ] **TASK-PL-02:** Implement validation: Vehicle capacity check.
- [ ] **TASK-PL-03:** Implement validation: Inventory shortage check across selected orders.
- [ ] **TASK-PL-04:** Integrate algorithms: Run TSP on selected locations and display route + distance.
- [ ] **TASK-PL-05:** Draw resulting route polyline on the Leaflet map.

## Phase 8: Dispatch and Dashboard
- [ ] **TASK-DP-01:** Implement Dispatch button that calls the Supabase RPC function.
- [ ] **TASK-DP-02:** Implement Delivery Status update UI (mark as delivered).
- [ ] **TASK-DB-05:** Implement Dashboard UI component.
- [ ] **TASK-DB-06:** Fetch and display real-time statistics (totals, statuses, vehicle usage) on Dashboard.

## Phase 9: Testing and Deployment
- [ ] **TASK-QA-01:** Perform end-to-end manual testing of the complete workflow.
- [ ] **TASK-QA-02:** Verify empty states and error boundaries.
- [ ] **TASK-DE-01:** Deploy frontend to Vercel and verify environment variables.
