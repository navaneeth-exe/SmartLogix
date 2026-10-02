# SMARTLOGIX — EXISTING SYSTEM ARCHITECTURE SNAPSHOT
> **Document Version:** 1.0.0-FREEZE  
> **Repository Commit Hash:** 884becbb14eb4d2254e265498a4e35f4e387fae6  
> **Snapshot Date:** 2026-10-03  
> **Status:** Current Production Architecture Reference Before Warehouse Optimization Extension  

---

## 1. PROJECT IDENTITY

| Attribute | Specification |
| :--- | :--- |
| **System Name** | SmartLogix |
| **Repository Root** | `c:\Users\NAVANEETH\Documents\Academic Projects\Smart Inventory & Delivery Optimization System` |
| **Application Subfolder** | `smartlogix/` |
| **Domain** | Intelligent Inventory Management & Vehicle Delivery Routing Optimization |
| **Current Purpose** | Comprehensive logistics management web platform providing inventory tracking across warehouses, customer order management, fleet dispatching, OpenRouteService road-distance matrix calculation, and DAA-based Traveling Salesperson Problem (TSP) vehicle tour optimization. |
| **Design Paradigm** | Atmospheric Spatial Glassmorphism / Neumorphic Logistics Command Center (Sage / Forest Green & Warm Ivory palette with Framer Motion transitions). |

---

## 2. COMPLETE PROJECT STRUCTURE

```
Smart Inventory & Delivery Optimization System/
├── EXISTING_VERSION.md                                # This document (Current System Architecture Reference)
├── UI_REDESIGN_PHASES.md                              # Historical phase logs (Phases 1-6 UI refinements)
├── UI_REDESIGN_TASKS.md                               # Detailed UI design task checklist
└── smartlogix/                                        # Frontend React/Vite application & Edge Functions
    ├── index.html                                     # HTML5 entrypoint with Google Fonts & responsive viewport
    ├── package.json                                   # NPM dependencies & scripts (React 19, Vite 8, Leaflet, Recharts)
    ├── postcss.config.js                              # PostCSS configuration with TailwindCSS & Autoprefixer
    ├── tailwind.config.js                             # Custom Tailwind palette (brand-ivory, brand-surface, brand-primary)
    ├── tsconfig.json                                  # TypeScript configuration root
    ├── tsconfig.app.json                              # App-specific TS compiler settings (target ES2020, strict)
    ├── tsconfig.node.json                             # Node/Vite specific TS compiler settings
    ├── vite.config.ts                                 # Vite bundler configuration (@vitejs/plugin-react)
    ├── public/                                        # Static public assets
    │   └── images/
    │       └── smartlogix/
    │           ├── scenic-landscape.jpg               # Scenic 3D logistics miniature world backdrop
    │           └── sidebar-nature-scenery.jpg         # Sidebar atmospheric natural landscape backdrop
    ├── supabase/                                      # Backend Supabase configuration & migrations
    │   ├── functions/
    │   │   └── ors-matrix/
    │   │       └── index.ts                           # Deno Edge Function invoking OpenRouteService Matrix API v2
    │   └── migrations/
    │       ├── 20260927000000_initial_schema.sql      # Core tables: warehouses, products, inventory, locations, orders, order_items, vehicles
    │       ├── 20260927000001_inventory_rpc.sql       # RPC update_inventory_stock (atomic stock adjustment)
    │       ├── 20260928000000_phase5_delivery_orders.sql # RPC create_order_atomic and update_order_status
    │       ├── 20260928000001_phase6_vehicles.sql     # Added vehicle_type, capacity_unit, and vehicle RLS policies
    │       ├── 20260928000002_phase7_distance_matrix.sql # Table location_distances & RPC save_location_distance
    │       ├── 20260928000003_phase8_delivery_plans.sql # Table delivery_plans, delivery_plan_orders & RPC create_delivery_plan_atomic
    │       ├── 20260928000004_phase9_vehicle_assignment.sql # Column weight_kg, indexes, assign_vehicle_to_delivery_plan & remove_vehicle RPCs
    │       ├── 20260928000005_phase10_route_optimization.sql # Delivery plans route columns, RPC save_delivery_plan_route, simulation seed
    │       ├── 20260928000006_warehouses_write_policies.sql # Public RLS write policies for warehouses map editor
    │       └── 20260928000007_road_distance_matrix.sql # Road telemetry columns & updated save_location_distance RPC
    └── src/                                           # TypeScript Frontend Application Source
        ├── App.css                                    # Base utility styles
        ├── App.tsx                                    # Client routing root with 13 routes and Layout shell
        ├── index.css                                  # Global CSS, Tailwind layers, frosted glass & neumorphic shadow tokens
        ├── main.tsx                                   # React DOM root render mount
        ├── algorithms/
        │   └── tsp.ts                                 # DAA Algorithms: validateTSPMatrix, solveGreedyNearestNeighbor, solveBranchAndBoundTSP
        ├── assets/                                    # SVG & static graphics (hero.png, react.svg, vite.svg)
        ├── components/
        │   ├── Layout.tsx                             # Master responsive layout with collapsible frosted sidebar, header, and scenic backdrop
        │   ├── MapLocationPicker.tsx                  # Interactive React-Leaflet map modal for pin placement & geocoding
        │   ├── RouteMap.tsx                           # Interactive React-Leaflet route viewer with polyline and stop sequence pins
        │   ├── ScenicBackground.tsx                   # Multi-layered 3D atmospheric backdrop with topographic contours & ambient glow
        │   └── ui/                                    # Reusable atomic UI design system components
        │       ├── Badge.tsx                          # Status badges (success, warning, danger, info, lime, sage, purple, default)
        │       ├── Button.tsx                         # Tactile buttons with 6 variants (primary, secondary, outline, danger, lime, ghost)
        │       ├── Card.tsx                           # Neumorphic soft cards, elevated cards, and frosted glass containers
        │       ├── Input.tsx                          # Frosted form input fields with leading icon support and error states
        │       ├── PageHeader.tsx                     # Standardized page title, description, and action button bar
        │       └── Select.tsx                         # Custom styled select dropdown with SVG indicator
        ├── lib/
        │   └── supabase.ts                            # Supabase client instantiation (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
        ├── pages/                                     # 13 Application Page Views
        │   ├── CreateOrder.tsx                        # Order creation builder with atomic multi-item selection & inventory validation
        │   ├── Dashboard.tsx                          # Executive operational command center with KPI stat cards & Recharts graphs
        │   ├── DistanceMatrix.tsx                     # 2D transit distance matrix editor with ORS Road integration and live TSP benchmark
        │   ├── Inventory.tsx                          # Warehouse stock tracker with reorder alerts and stock adjustment modal
        │   ├── Locations.tsx                          # Delivery destination directory with status toggles and map coordinate picker
        │   ├── MapWorkspace.tsx                       # Fullscreen GIS map workspace with warehouse & destination markers, routing overlay
        │   ├── Orders.tsx                             # Order lifecycle pipeline (PENDING -> PROCESSING -> DISPATCHED -> DELIVERED)
        │   ├── Planning.tsx                           # Delivery plan creation, vehicle capacity assignment, and DAA route optimization
        │   ├── Products.tsx                           # Master product catalog with SKU, category, unit price, and weight
        │   ├── Reports.tsx                            # Comprehensive analytics dashboard with Recharts visualizations & CSV audit export
        │   ├── Settings.tsx                           # System solver preferences, node limits, ORS profile, and infrastructure health
        │   ├── Vehicles.tsx                           # Fleet vehicle management with capacity tracking and operational statuses
        │   └── Warehouses.tsx                         # Warehouse facility manager with GIS coordinate setting and active status toggles
        ├── services/
        │   └── api.ts                                 # Centralized Supabase data service (8 sub-namespaces, 28 methods & RPC wrappers)
        └── types/
            └── database.types.ts                      # Complete TypeScript schema definitions, models, enums, and API payloads
```

---

## 3. PACKAGE / DEPENDENCY INVENTORY

The project is built on Vite 8 with React 19. Complete inventory from `smartlogix/package.json`:

| Package Name | Installed Version | Purpose in SmartLogix |
| :--- | :--- | :--- |
| **react** | `^19.2.8` | Core UI library for component state, hooks, and virtual DOM |
| **react-dom** | `^19.2.8` | React DOM renderer for web browsers |
| **react-router-dom** | `^7.18.4` | Client-side routing, URL navigation, nested routes, and route redirects |
| **@supabase/supabase-js** | `^2.117.2` | Official Supabase PostgreSQL client for tables, RPC execution, and Edge Functions |
| **leaflet** | `^1.9.4` | Open-source interactive JavaScript mapping engine |
| **react-leaflet** | `^5.0.0` | React component wrappers for Leaflet (`MapContainer`, `TileLayer`, `Marker`, `Polyline`) |
| **@types/leaflet** | `^1.9.22` | TypeScript type declarations for Leaflet objects and DivIcons |
| **framer-motion** | `^13.4.4` | Physics-based animations, layout transitions, and staggered container fades |
| **lucide-react** | `^1.48.0` | Comprehensive modern iconography across all application pages |
| **recharts** | `^3.10.1` | Composable SVG charting library for bar charts, pie charts, and KPI telemetry |
| **tailwindcss** | `^3.4.19` | Utility-first CSS framework for spatial design, colors, and layout |
| **postcss** | `^8.5.28` | CSS post-processing pipeline |
| **autoprefixer** | `^10.6.1` | Automatic vendor prefix injection for cross-browser CSS compatibility |
| **typescript** | `~6.0.2` | Strict static typing and build verification |
| **vite** | `^8.3.0` | Next-generation frontend tooling and rapid HMR development server |
| **@vitejs/plugin-react** | `^6.1.1` | Vite plugin providing Fast Refresh and JSX transformation |
| **oxlint** | `^1.81.0` | High-performance Rust-based JavaScript/TypeScript linter |
| **@types/react** | `^19.2.18` | TypeScript type definitions for React |
| **@types/react-dom** | `^19.2.7` | TypeScript type definitions for React DOM |
| **@types/node** | `^24.13.3` | Node.js runtime type declarations |

---

## 4. DATABASE — COMPLETE DOCUMENTATION

The SmartLogix backend database is PostgreSQL hosted on Supabase (`tukysvupnqlypzjdcqwl.supabase.co`). It consists of 8 tables across 10 migration files.

### 4.1 Table: `warehouses`
- **Purpose**: Physical distribution and storage centers acting as the starting and ending depots for delivery routes.
- **Columns**:
  - `id` (`UUID`, Primary Key, `DEFAULT uuid_generate_v4()`)
  - `name` (`TEXT`, NOT NULL) — Display name (e.g., "Central Logistics Hub")
  - `code` (`TEXT`, UNIQUE, NOT NULL) — Unique alphanumeric code (e.g., "WH-BLR-01")
  - `address` (`TEXT`, NULL) — Physical street address
  - `latitude` (`NUMERIC`, NULL) — Geographic latitude for map positioning and ORS routing
  - `longitude` (`NUMERIC`, NULL) — Geographic longitude for map positioning and ORS routing
  - `is_active` (`BOOLEAN`, `DEFAULT true`) — Operational toggle
  - `created_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
  - `updated_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
- **Indexes**: Primary key `id`, unique constraint on `code`.
- **Foreign Keys**: Referenced by `inventory.warehouse_id` (CASCADE) and `delivery_plans.warehouse_id` (RESTRICT).
- **Read & Write Patterns**:
  - Direct read via `api.warehouses.list()`.
  - Direct insert via `api.warehouses.create()` and update via `api.warehouses.update()`.
  - Draggable map coordinate updates in `MapWorkspace.tsx` and `Warehouses.tsx`.

### 4.2 Table: `products`
- **Purpose**: Master SKU catalog of goods stored, tracked, and dispatched.
- **Columns**:
  - `id` (`UUID`, Primary Key, `DEFAULT uuid_generate_v4()`)
  - `sku` (`TEXT`, UNIQUE, NOT NULL) — Stock Keeping Unit (e.g., "SOL-INV-5000")
  - `name` (`TEXT`, NOT NULL) — Item name
  - `description` (`TEXT`, NULL) — Detailed specifications
  - `category` (`TEXT`, NULL) — Categorization tag (e.g., "Electronics", "Hardware")
  - `unit_price` (`NUMERIC`, NOT NULL, `CHECK (unit_price >= 0)`) — Base selling price
  - `weight_kg` (`NUMERIC`, NOT NULL, `DEFAULT 10.0`, `CHECK (weight_kg > 0)`) — Unit weight added in Phase 9 for fleet capacity validation
  - `created_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
  - `updated_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
- **Foreign Keys**: Referenced by `inventory.product_id` (CASCADE) and `order_items.product_id` (RESTRICT).
- **Read & Write Patterns**: Direct table query through `api.products.list()`, `api.products.create()`, and `api.products.update()`.

### 4.3 Table: `inventory`
- **Purpose**: Stock levels per product within specific warehouse facilities.
- **Columns**:
  - `id` (`UUID`, Primary Key, `DEFAULT uuid_generate_v4()`)
  - `warehouse_id` (`UUID`, NOT NULL, `REFERENCES warehouses(id) ON DELETE CASCADE`)
  - `product_id` (`UUID`, NOT NULL, `REFERENCES products(id) ON DELETE CASCADE`)
  - `quantity` (`INTEGER`, NOT NULL, `CHECK (quantity >= 0)`) — Available on-hand quantity
  - `reorder_level` (`INTEGER`, NOT NULL, `DEFAULT 0`, `CHECK (reorder_level >= 0)`) — Threshold for low-stock warnings
  - `updated_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
- **Constraints**: Composite UNIQUE constraint `UNIQUE(warehouse_id, product_id)`.
- **Foreign Keys**: Many-to-One with `warehouses` and `products`.
- **Read & Write Patterns**:
  - Read with joined product and warehouse details via `api.inventory.list()`.
  - Filtered warehouse stock via `api.inventory.getByWarehouse(warehouse_id)`.
  - Atomic stock updates via Postgres function `update_inventory_stock(p_warehouse_id, p_product_id, p_quantity, p_reorder_level)`.

### 4.4 Table: `delivery_locations`
- **Purpose**: Customer drop-off destinations, retail stores, or client facilities.
- **Columns**:
  - `id` (`UUID`, Primary Key, `DEFAULT uuid_generate_v4()`)
  - `name` (`TEXT`, NOT NULL) — Location destination name
  - `address` (`TEXT`, NULL) — Street address
  - `latitude` (`NUMERIC`, NULL) — Geographic latitude for map positioning and ORS routing
  - `longitude` (`NUMERIC`, NULL) — Geographic longitude for map positioning and ORS routing
  - `is_active` (`BOOLEAN`, `DEFAULT true`) — Active status toggle
  - `created_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
  - `updated_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
- **Foreign Keys**: Referenced by `orders.delivery_location_id` (RESTRICT).
- **Read & Write Patterns**: Read via `api.locations.list()` and `api.locations.getActive()`. Managed through `Locations.tsx` and interactive map pin placement in `MapLocationPicker.tsx`.

### 4.5 Table: `orders`
- **Purpose**: Customer orders placed for delivery to specific locations.
- **Columns**:
  - `id` (`UUID`, Primary Key, `DEFAULT uuid_generate_v4()`)
  - `order_number` (`TEXT`, UNIQUE, NOT NULL) — Formatted order identifier (e.g., `ORD-20261003-84729`)
  - `delivery_location_id` (`UUID`, NOT NULL, `REFERENCES delivery_locations(id) ON DELETE RESTRICT`)
  - `status` (`TEXT`, NOT NULL, `CHECK (status IN ('PENDING', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'))`)
  - `priority` (`TEXT`, `CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))`)
  - `total_amount` (`NUMERIC`, `CHECK (total_amount >= 0)`) — Calculated monetary subtotal
  - `created_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
  - `updated_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
- **Foreign Keys**: Many-to-One with `delivery_locations`. Referenced by `order_items.order_id` (CASCADE) and `delivery_plan_orders.order_id` (RESTRICT).
- **Read & Write Patterns**:
  - Atomic creation through stored procedure `create_order_atomic(p_delivery_location_id, p_priority, p_items, p_warehouse_id)`.
  - State machine transition enforcement through stored procedure `update_order_status(p_order_id, p_new_status)`.
  - Read with joined `delivery_location` and `order_items.product` via `api.orders.list()`.

### 4.6 Table: `order_items`
- **Purpose**: Line items associated with customer orders.
- **Columns**:
  - `id` (`UUID`, Primary Key, `DEFAULT uuid_generate_v4()`)
  - `order_id` (`UUID`, NOT NULL, `REFERENCES orders(id) ON DELETE CASCADE`)
  - `product_id` (`UUID`, NOT NULL, `REFERENCES products(id) ON DELETE RESTRICT`)
  - `quantity` (`INTEGER`, NOT NULL, `CHECK (quantity > 0)`)
  - `unit_price` (`NUMERIC`, NOT NULL, `CHECK (unit_price >= 0)`) — Locked price at order creation
  - `created_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
- **Foreign Keys**: Many-to-One with `orders` and `products`.

### 4.7 Table: `vehicles`
- **Purpose**: Fleet assets available for physical delivery dispatch.
- **Columns**:
  - `id` (`UUID`, Primary Key, `DEFAULT uuid_generate_v4()`)
  - `name` (`TEXT`, NOT NULL) — Vehicle description (e.g., "Heavy Cargo Hauler")
  - `registration_number` (`TEXT`, UNIQUE, NULL) — License registration plate
  - `vehicle_type` (`TEXT`, NOT NULL, `DEFAULT 'Van'`, `CHECK (vehicle_type IN ('Motorcycle', 'Van', 'Small Truck', 'Large Truck'))`)
  - `capacity` (`NUMERIC`, NOT NULL, `CHECK (capacity > 0)`) — Payload capacity limit
  - `capacity_unit` (`TEXT`, NOT NULL, `DEFAULT 'kg'`, `CHECK (capacity_unit IN ('kg', 'units', 'm3'))`)
  - `status` (`TEXT`, NOT NULL, `CHECK (status IN ('AVAILABLE', 'ON_ROUTE', 'MAINTENANCE', 'OFF_DUTY'))`)
  - `created_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
  - `updated_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
- **Foreign Keys**: Referenced by `delivery_plans.vehicle_id` (SET NULL).
- **Read & Write Patterns**: CRUD through `api.vehicles`, filtered query for assignment via `api.plans.getAvailableVehicles()`.

### 4.8 Table: `delivery_plans`
- **Purpose**: Delivery dispatch batches bundling customer orders from a single warehouse depot.
- **Columns**:
  - `id` (`UUID`, Primary Key, `DEFAULT uuid_generate_v4()`)
  - `plan_number` (`TEXT`, UNIQUE, NOT NULL) — Formatted batch number (e.g., `PLN-2026-0001`)
  - `warehouse_id` (`UUID`, NOT NULL, `REFERENCES warehouses(id) ON DELETE RESTRICT`)
  - `vehicle_id` (`UUID`, NULL, `REFERENCES vehicles(id) ON DELETE SET NULL`)
  - `status` (`TEXT`, NOT NULL, `DEFAULT 'PLANNED'`, `CHECK (status IN ('PLANNED', 'CANCELLED'))`)
  - `route_algorithm` (`TEXT`, NULL) — Algorithm used: `'BRANCH_AND_BOUND'` or `'GREEDY_NEAREST_NEIGHBOR'`
  - `route_stops` (`JSONB`, NULL) — Ordered array of stop objects: `[{ sequence, locationId, name, type, address, ordersCount, latitude, longitude }]`
  - `route_distance` (`NUMERIC`, NULL) — Total computed round-trip tour distance in kilometers
  - `route_execution_time_ms` (`NUMERIC`, NULL) — Execution time of algorithm solver in milliseconds
  - `route_generated_at` (`TIMESTAMP WITH TIME ZONE`, NULL) — Timestamp when route was optimized and saved
  - `created_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
  - `updated_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
- **Indexes**:
  - `idx_delivery_plans_warehouse` on `warehouse_id`
  - `idx_delivery_plans_status` on `status`
  - `idx_delivery_plans_vehicle` on `vehicle_id`
  - **Unique Anti-Collision Index**: `idx_delivery_plans_active_vehicle` on `(vehicle_id) WHERE status = 'PLANNED' AND vehicle_id IS NOT NULL`. Prevents double-booking any vehicle to multiple active plans.

### 4.9 Table: `delivery_plan_orders`
- **Purpose**: Junction table establishing a Many-to-Many association between delivery plans and customer orders.
- **Columns**:
  - `id` (`UUID`, Primary Key, `DEFAULT uuid_generate_v4()`)
  - `delivery_plan_id` (`UUID`, NOT NULL, `REFERENCES delivery_plans(id) ON DELETE CASCADE`)
  - `order_id` (`UUID`, NOT NULL, `REFERENCES orders(id) ON DELETE RESTRICT`)
  - `created_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
- **Constraints**: Composite UNIQUE constraint `UNIQUE(delivery_plan_id, order_id)`.
- **Indexes**: `idx_delivery_plan_orders_plan` on `delivery_plan_id`, `idx_delivery_plan_orders_order` on `order_id`.

### 4.10 Table: `location_distances`
- **Purpose**: Pairwise edge distance matrix caching road distance or simulation distances between nodes.
- **Columns**:
  - `id` (`UUID`, Primary Key, `DEFAULT uuid_generate_v4()`)
  - `origin_id` (`UUID`, NOT NULL) — UUID of origin warehouse or delivery location
  - `destination_id` (`UUID`, NOT NULL) — UUID of destination warehouse or delivery location
  - `distance` (`NUMERIC`, NOT NULL, `CHECK (distance >= 0)`) — Distance in kilometers
  - `distance_meters` (`NUMERIC`, NULL) — Distance in meters from ORS Matrix API
  - `distance_source` (`VARCHAR(50)`, `DEFAULT 'MANUAL_SIMULATION'`) — `'ORS_ROAD'` or `'MANUAL_SIMULATION'`
  - `routing_profile` (`VARCHAR(50)`, `DEFAULT 'driving-car'`) — Routing profile used (e.g., `'driving-car'`)
  - `duration_seconds` (`NUMERIC`, NULL) — Travel duration in seconds from ORS
  - `generated_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
  - `created_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
  - `updated_at` (`TIMESTAMP WITH TIME ZONE`, `DEFAULT NOW()`)
- **Constraints**: Composite UNIQUE constraint `UNIQUE(origin_id, destination_id)`.
- **Note**: Not bound by foreign key constraints to allow origin/destination IDs to reference either `warehouses` or `delivery_locations`.

---

## 5. DATABASE RELATIONSHIP MAP

\`\`\`
+---------------------+              +-----------------------+
|     warehouses      | 1          * |       inventory       |
|---------------------|<-------------|-----------------------|
| id (PK)             |              | id (PK)               |
| name                |              | warehouse_id (FK)     |
| code (UNIQUE)       |              | product_id (FK)       |----+
| latitude, longitude |              | quantity              |    |
+---------------------+              | reorder_level         |    |
        | 1                          +-----------------------+    |
        |                                                         |
        | *                                                       |
+---------------------+              +-----------------------+    |
|   delivery_plans    |              |       products        |    |
|---------------------|              |-----------------------|<---+
| id (PK)             |              | id (PK)               |
| plan_number (UNIQUE)|              | sku (UNIQUE)          |
| warehouse_id (FK)   |              | name, unit_price      |
| vehicle_id (FK)-----+              | weight_kg             |
| status (PLANNED)    |              +-----------------------+
| route_stops (JSONB) |                          | 1
| route_distance      |                          |
+---------------------+                          | *
        | 1                          +-----------------------+
        |                            |      order_items      |
        | *                          |-----------------------|
+---------------------+              | id (PK)               |
|delivery_plan_orders |              | order_id (FK)---------+
|---------------------|              | product_id (FK)       |
| id (PK)             |              | quantity, unit_price  |
| delivery_plan_id(FK)|              +-----------------------+
| order_id (FK)-------+                          |
+---------------------+                          |
        |                                        |
        +------------------+                     |
                           |                     |
                           v *                   v 1
+---------------------+  +-----------------------------------+
|      vehicles       |  |              orders               |
|---------------------|  |-----------------------------------|
| id (PK)             |  | id (PK)                           |
| registration_number |  | order_number (UNIQUE)             |
| capacity, unit      |  | delivery_location_id (FK)         |
| status              |  | status, priority, total_amount    |
+---------------------+  +-----------------------------------+
                                           | *
                                           |
                                           v 1
                         +-----------------------------------+
                         |        delivery_locations         |
                         |-----------------------------------|
                         | id (PK)                           |
                         | name, address                     |
                         | latitude, longitude, is_active    |
                         +-----------------------------------+
\`\`\`

---

## 6. SUPABASE & ROW LEVEL SECURITY (RLS) AUDIT

### 6.1 Client Configuration
- Instantiated in `src/lib/supabase.ts` via `createClient(supabaseUrl, supabaseAnonKey)`.
- Falls back to hardcoded production project keys if environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` are absent.

### 6.2 Authentication Status
- **Authentication is NOT currently implemented in the frontend.** There is no login screen, user session store, or auth token handling.
- The user persona is assumed to be an authenticated Logistics Manager / Operations Dispatcher.

### 6.3 Row Level Security (RLS) Policies
- All 8 tables have `ALTER TABLE <tablename> ENABLE ROW LEVEL SECURITY;` enabled.
- To allow the client application to run without requiring a user login session, all tables have **development-permissive public policies** for `anon`, `authenticated`, and `service_role`.
- Full public read (`SELECT`) and write (`INSERT`, `UPDATE`, `DELETE`) policies exist on:
  - `warehouses`
  - `products`
  - `inventory`
  - `delivery_locations`
  - `orders`
  - `order_items`
  - `vehicles`
  - `delivery_plans`
  - `delivery_plan_orders`
  - `location_distances`

### 6.4 Stored Procedures / RPC Functions
All core transactional operations are implemented via PostgreSQL `SECURITY DEFINER` stored procedures to guarantee data integrity:

1. **`create_order_atomic(p_delivery_location_id UUID, p_priority TEXT, p_items JSONB, p_warehouse_id UUID)`**:
   - Validates active status of the destination delivery location.
   - Aggregates duplicate items in memory.
   - If `p_warehouse_id` is passed, verifies stock availability in that warehouse; otherwise verifies across the global inventory.
   - Generates unique order number `ORD-YYYYMMDD-XXXXX`.
   - Atomically inserts the `orders` row and corresponding `order_items` rows in a single database transaction.

2. **`update_order_status(p_order_id UUID, p_new_status TEXT)`**:
   - Validates existence and checks terminal states (`DELIVERED` and `CANCELLED` are immutable).
   - Validates state machine rules:
     - `PENDING` -> `PROCESSING` or `CANCELLED`
     - `PROCESSING` -> `DISPATCHED` or `CANCELLED`
     - `DISPATCHED` -> `DELIVERED` or `CANCELLED`

3. **`create_delivery_plan_atomic(p_warehouse_id UUID, p_order_ids UUID[])`**:
   - Validates that the selected warehouse is active.
   - Verifies that none of the selected orders are `CANCELLED` or `DELIVERED`.
   - Verifies that none of the selected orders are already attached to another active (`status = 'PLANNED'`) delivery plan.
   - Generates a sequential plan number `PLN-YYYY-XXXX`.
   - Inserts `delivery_plans` and links orders in `delivery_plan_orders`.

4. **`assign_vehicle_to_delivery_plan(p_plan_id UUID, p_vehicle_id UUID)`**:
   - Verifies plan is in `PLANNED` status.
   - Verifies vehicle exists and is `AVAILABLE`.
   - Computes total order weight ($\sum \text{quantity} \times \text{weight\_kg}$) and total order units ($\sum \text{quantity}$).
   - Validates payload against vehicle capacity (`kg` or `units`).
   - If replacing a previously assigned vehicle, returns the old vehicle status to `AVAILABLE`.
   - Marks the new vehicle status as `ON_ROUTE`.
   - Enforces unique index `idx_delivery_plans_active_vehicle`.

5. **`remove_vehicle_from_delivery_plan(p_plan_id UUID)`**:
   - Disassociates `vehicle_id` from plan.
   - Resets vehicle status to `AVAILABLE`.

6. **`cancel_delivery_plan(p_plan_id UUID)`**:
   - Reverts plan status to `CANCELLED`.
   - Automatically releases any assigned vehicle back to `AVAILABLE`.

7. **`save_delivery_plan_route(p_plan_id UUID, p_algorithm TEXT, p_stops JSONB, p_distance NUMERIC, p_time_ms NUMERIC)`**:
   - Persists optimized TSP sequence, distance telemetry, algorithm name, and execution duration.

8. **`save_location_distance(p_origin_id UUID, p_destination_id UUID, p_distance NUMERIC, p_symmetric BOOLEAN, p_distance_meters NUMERIC, p_distance_source VARCHAR, p_routing_profile VARCHAR, p_duration_seconds NUMERIC)`**:
   - Upserts forward (and optionally reverse symmetric) road or simulation distance edges.

9. **`update_inventory_stock(p_warehouse_id UUID, p_product_id UUID, p_quantity INTEGER, p_reorder_level INTEGER)`**:
   - Upserts product stock level and reorder threshold.

---

## 7. PRODUCTS IMPLEMENTATION

- **Database Fields**: `id`, `sku`, `name`, `description`, `category`, `unit_price`, `weight_kg`, `created_at`, `updated_at`.
- **UI View (`src/pages/Products.tsx`)**:
  - Displays KPI metric cards: Total Products, Categories count, Catalog Value ($), and Average Unit Price ($).
  - Search filter by product name, SKU, or description.
  - Category dropdown filter.
  - Creation and Edit Modal supporting SKU, Name, Description, Category, Unit Price, and Weight.
  - Form validation: SKU & Name required, `unit_price >= 0`.
- **API Methods**:
  - `api.products.list()`: Retrieves all products ordered by `created_at DESC`.
  - `api.products.create(product)`: Inserts new product.
  - `api.products.update(id, updates)`: Updates existing product.

---

## 8. INVENTORY IMPLEMENTATION

- **Database Schema**: Joined between `products` and `warehouses` with `quantity` and `reorder_level`.
- **Stock Threshold Logic**:
  - `OUT OF STOCK`: `quantity === 0` (Red badge)
  - `LOW STOCK`: `quantity <= reorder_level` (Amber badge)
  - `IN STOCK`: `quantity > reorder_level` (Emerald badge)
- **UI View (`src/pages/Inventory.tsx`)**:
  - Multi-warehouse filter tabs and low-stock filter toggle.
  - Adjust Stock Modal: Direct quantity adjustment calling stored procedure `update_inventory_stock`.
  - Stock Addition Modal: Select product, select warehouse, input quantity and reorder threshold via `api.inventory.addStock()`.
- **API Methods**:
  - `api.inventory.list()`: Returns all inventory rows joined with `product:products(*)` and `warehouse:warehouses(*)`.
  - `api.inventory.getByWarehouse(warehouse_id)`: Filtered inventory query.
  - `api.inventory.updateStock(id, { quantity, reorder_level })`: Direct table update.
  - `api.inventory.addStock(warehouse_id, product_id, quantity, reorder_level)`: Upsert query.

---

## 9. WAREHOUSES IMPLEMENTATION

- **Database Fields**: `id`, `name`, `code`, `address`, `latitude`, `longitude`, `is_active`, `created_at`, `updated_at`.
- **Facility Capacity & Allocation Audit**:
  - **AUDIT RESULT: NOT IMPLEMENTED IN CURRENT VERSION.**
  - The `warehouses` table stores identity, code, and GIS coordinates. It does **NOT** contain a `capacity`, `max_volume`, or `storage_limit` column.
  - Warehouse stock allocation algorithms (e.g., selecting which warehouse fulfills an order or where restocks are placed) do **NOT** exist in code. Warehouse selection is entirely manual by the user during Order Creation or Delivery Planning.
- **GIS & Map Integration**:
  - Integrates `MapLocationPicker.tsx` in creation/edit modal. Clicking the map auto-fills latitude and longitude coordinates.
  - Coordinates validated: Latitude $[-90, 90]$, Longitude $[-180, 180]$.
  - Draggable warehouse markers in `MapWorkspace.tsx` update coordinates in real time.
- **API Methods**: `api.warehouses.list()`, `api.warehouses.create()`, `api.warehouses.update()`.

---

## 10. ORDERS & ORDER LIFECYCLE

- **Order State Machine**:
  ```
  +-----------+           +--------------+           +--------------+           +-------------+
  |  PENDING  | --------> |  PROCESSING  | --------> |  DISPATCHED  | --------> |  DELIVERED  |
  +-----------+           +--------------+           +--------------+           +-------------+
        |                        |                          |
        +------------------------+--------------------------+-----------------> +-------------+
                                 |                                              |  CANCELLED  |
                                 +--------------------------------------------> +-------------+
  ```
- **Order Priorities**: `LOW`, `MEDIUM`, `HIGH`, `URGENT` (color-coded badges).
- **Order Creation Builder (`src/pages/CreateOrder.tsx`)**:
  - Step 1: Select Active Delivery Location.
  - Step 2: Set Order Priority.
  - Step 3 (Optional): Select Fulfillment Warehouse to view and enforce localized stock availability.
  - Step 4: Multi-item selector with live quantity and line-item subtotal calculation.
  - Form submission calls `api.orders.create()` which triggers `create_order_atomic` in Supabase.
- **Order Pipeline View (`src/pages/Orders.tsx`)**:
  - Filter by status (`ALL`, `PENDING`, `PROCESSING`, `DISPATCHED`, `DELIVERED`, `CANCELLED`) and priority.
  - Order Detail Modal with line items breakdown and order timeline.
  - Status transition action buttons strictly enforcing permitted transitions.

---

## 11. ORDER ITEMS IMPLEMENTATION

- **Data Model**: `order_items` stores `order_id`, `product_id`, `quantity`, and `unit_price`.
- **Pricing Guarantee**: `unit_price` is captured at the moment of order creation from `products.unit_price` to prevent future catalog price updates from altering historical order totals.
- **Payload Calculation**: In Phase 9, vehicle assignment calculates total weight dynamically:
  $$\text{Total Plan Weight (kg)} = \sum (\text{order\_items.quantity} \times \text{products.weight\_kg})$$

---

## 12. DELIVERY LOCATIONS IMPLEMENTATION

- **Database Fields**: `id`, `name`, `address`, `latitude`, `longitude`, `is_active`, `created_at`, `updated_at`.
- **UI View (`src/pages/Locations.tsx`)**:
  - Filter by Active, Inactive, or All. Search by name or address.
  - Interactive modal with `MapLocationPicker.tsx` to set dropoff coordinates.
  - Active/Inactive toggle (`api.locations.toggleActive()`) prevents deactivated locations from receiving new customer orders.
- **Geographic Validation**: Requires non-null latitude and longitude before being used in OpenRouteService road distance matrix calculations.

---

## 13. VEHICLES & FLEET IMPLEMENTATION

- **Database Schema**: `id`, `name`, `registration_number`, `vehicle_type`, `capacity`, `capacity_unit`, `status`, `created_at`, `updated_at`.
- **Supported Vehicle Types**: `'Motorcycle'`, `'Van'`, `'Small Truck'`, `'Large Truck'`.
- **Supported Capacity Units**: `'kg'`, `'units'`, `'m3'`.
- **Supported Operational Statuses**: `'AVAILABLE'`, `'ON_ROUTE'`, `'MAINTENANCE'`, `'OFF_DUTY'`.
- **Assignment Logic (`assign_vehicle_to_delivery_plan`)**:
  - Validates vehicle status is `AVAILABLE` (or already assigned to this plan).
  - Validates total order weight $\le$ vehicle capacity (if unit is `kg`) or total quantity $\le$ vehicle capacity (if unit is `units`).
  - Sets vehicle status to `ON_ROUTE`.
  - **Knapsack Audit**:
    > **AUDIT RESULT: LINEAR CAPACITY CHECK ONLY.**
    > The vehicle assignment procedure does **NOT** run a 0/1 Knapsack optimization algorithm to select or pack items into vehicles. It strictly performs a sum-check ($\sum \le \text{capacity}$) and aborts with an exception if the assigned plan's orders exceed the vehicle's capacity.
- **Fleet Anti-Collision Constraint**:
  - PostgreSQL unique partial index:
    ```sql
    CREATE UNIQUE INDEX idx_delivery_plans_active_vehicle 
    ON delivery_plans(vehicle_id) 
    WHERE status = 'PLANNED' AND vehicle_id IS NOT NULL;
    ```
  - Physically prevents two concurrent active delivery plans from booking the same vehicle.

---

## 14. DELIVERY PLANNING PIPELINE

The delivery planning pipeline connects orders, warehouses, vehicles, and routing algorithms into an operational workflow:

```
[Customer Orders (PENDING / PROCESSING)]
                  |
                  v
[Select Warehouse Depot] + [Select Eligible Orders]
                  |
                  v  (create_delivery_plan_atomic RPC)
        [Delivery Plan Created (PLANNED)]
                  |
                  +---> [Assign Vehicle] (Capacity Check & Status -> ON_ROUTE)
                  |
                  +---> [Generate Road Distances (ORS)] -> (Fetches & caches matrix)
                  |
                  +---> [Run DAA Algorithm] (Branch & Bound OR Greedy Nearest-Neighbor)
                  |
                  v  (save_delivery_plan_route RPC)
     [Optimized Tour Persisted with Stops, Distance & Map Polyline]
```

### 14.1 Order Eligibility Filtering
Implemented in `api.plans.getEligibleOrders()`:
1. Queries all active delivery plans where `status = 'PLANNED'` and extracts all currently booked `order_id` values.
2. Queries all orders where `status NOT IN ('CANCELLED', 'DELIVERED', 'DISPATCHED')`.
3. Filters out any order whose ID is already present in an active plan.
4. Guarantees that an order cannot be included in multiple delivery plans simultaneously.

### 14.2 Plan Execution & Routing Handler (`Planning.tsx`)
1. Aggregates all orders in the plan by their destination `delivery_location_id`.
2. Assembles node array: Node 0 = Warehouse Depot, Nodes $1 \dots k$ = Unique Delivery Locations.
3. Retrieves saved distance matrix from `location_distances` table.
4. Checks safe limit for Branch and Bound ($n \le 10$ locations). If $n > 10$, advises switching to Greedy Nearest-Neighbor.
5. Invokes `solveBranchAndBoundTSP()` or `solveGreedyNearestNeighbor()` from `src/algorithms/tsp.ts`.
6. Formats tour indices into `RouteStop[]` sequence with depot return at stop $n+1$.
7. Invokes `api.plans.saveRoute()` to persist route JSON, total distance in km, and execution time in ms.

---

## 15. OPENROUTESERVICE (ORS) INTEGRATION

### 15.1 Edge Function Architecture
- Location: `smartlogix/supabase/functions/ors-matrix/index.ts`
- Runtime: Deno Edge Runtime with CORS handling.
- Secret: `ORS_API_KEY` configured in Supabase Edge Secrets.
- Upstream Endpoint: `https://api.openrouteservice.org/v2/matrix/${profile}` (Default profile: `driving-car`).

### 15.2 Coordinate Ordering & Payload Format
- **CRITICAL GIS NOTATION**: OpenRouteService requires coordinates in `[longitude, latitude]` format.
- The Edge Function maps:
  ```typescript
  const coordinates = locations.map(l => [Number(l.longitude), Number(l.latitude)]);
  ```
- Request body sent to ORS:
  ```json
  {
    "locations": [[lon1, lat1], [lon2, lat2], ...],
    "metrics": ["distance", "duration"],
    "units": "m"
  }
  ```

### 15.3 Response Parsing & Persistence
- Distances received in meters are converted to kilometers rounded to two decimal places:
  ```typescript
  matrixKm[i][j] = parseFloat((meters / 1000).toFixed(2));
  ```
- Unreachable pairs (returns `null` in ORS matrix) are mapped to `NaN` and added to `unreachable_pairs`.
- In `DistanceMatrix.tsx` and `Planning.tsx`, generated pairs are batch-upserted into `location_distances` with `distance_source = 'ORS_ROAD'`.

---

## 16. LEAFLET / MAP SYSTEM

- **Libraries**: `leaflet` (`^1.9.4`) and `react-leaflet` (`^5.0.0`).
- **Base Tile Provider**: OpenStreetMap Standard Tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) with attribution.
- **Components**:
  1. `RouteMap.tsx`:
     - Displays depot warehouse marker (Emerald DivIcon with `WH` label).
     - Displays delivery stop markers (Amber DivIcons with sequence number labels $1, 2, 3\dots$).
     - Renders polyline connecting coordinates in tour order with directional dashes.
     - Auto-centers and fits bounding box using `map.fitBounds(latLngs, { padding: [50, 50] })`.
  2. `MapLocationPicker.tsx`:
     - Embedded in modals across Warehouses, Delivery Locations, and Map Workspace.
     - Handles map clicks to place draggable marker.
     - Automatically updates latitude/longitude inputs with 6 decimal places.
  3. `MapWorkspace.tsx`:
     - Fullscreen GIS logistics workstation.
     - Renders all active warehouses and customer delivery destinations simultaneously.
     - Allows toggling route layers, inspecting stock, and live drag-and-drop location coordinate updates.

---

## 17. DAA ALGORITHMS — ACTUAL IMPLEMENTATION AUDIT

An audit was performed across all directories (`src/algorithms/`, `src/services/`, `supabase/migrations/`).

| Algorithm Name | Status in Code | File Location | Code Reality & Notes |
| :--- | :--- | :--- | :--- |
| **Branch and Bound TSP** | **IMPLEMENTED** | `src/algorithms/tsp.ts` | Complete exact solver with Greedy upper bound initialization, admissible edge bounding, and recursive state-space pruning. |
| **Greedy Nearest Neighbor** | **IMPLEMENTED** | `src/algorithms/tsp.ts` | $O(n^2)$ heuristic finding the nearest unvisited node at each step and completing the round-trip tour. |
| **0/1 Knapsack Problem** | **NOT FOUND / NOT IMPLEMENTED** | N/A | Only a linear capacity sum-check ($\sum \le \text{capacity}$) exists in SQL RPC `assign_vehicle_to_delivery_plan`. Dynamic programming knapsack is not present. |
| **Dijkstra's Algorithm** | **NOT FOUND / NOT IMPLEMENTED** | N/A | Road distances are obtained externally via OpenRouteService Matrix API v2; no graph shortest-path algorithm is executed in client or backend code. |
| **Floyd-Warshall Algorithm** | **NOT FOUND / NOT IMPLEMENTED** | N/A | Distance matrix entries are either saved directly or fetched via ORS; no all-pairs shortest path matrix solver is implemented. |
| **Kruskal / Prim MST** | **NOT FOUND / NOT IMPLEMENTED** | N/A | Minimum Spanning Tree algorithms are not implemented. |
| **Bin Packing / Heuristics** | **NOT FOUND / NOT IMPLEMENTED** | N/A | Multi-vehicle load optimization or bin packing is not implemented; orders are assigned to plans manually. |

---

## 18. BRANCH AND BOUND TSP — COMPLETE CODE TRACE

Implemented in `src/algorithms/tsp.ts` via function `solveBranchAndBoundTSP(input: TSPInput): AlgorithmResult`:

- **Input Parameters**:
  - `locations: MatrixLocation[]`: List of nodes where index 0 is the starting warehouse depot.
  - `matrix: number[][]`: 2D asymmetric or symmetric distance matrix in kilometers ($n \times n$).
  - `maxLocationsLimit`: Configurable limit (default 12, clamped to 10 in UI).
- **Safety Gate**:
  - If $n < 2$, returns error `'At least 2 locations required.'`.
  - If $n > \text{maxLocationsLimit}$, aborts immediately with error message to protect browser UI thread from exponential freeze ($O(n!)$).
- **Upper Bound Initialization**:
  - Runs `solveGreedyNearestNeighbor(input)` first.
  - If a valid greedy tour exists, `bestDistance` is initialized to `greedyRes.totalDistance` and `bestTour` is set to `greedyRes.tourIndices`.
  - This provides a tight upper bound from iteration 0, enabling aggressive branch pruning.
- **Lower Bound Calculation (`calculateBound`)**:
  - Current cost so far: `bound = currentCost`.
  - Minimum edge from the current node `curr` to any unvisited node:
    $$\min_{j \in \text{unvisited}} \text{matrix}[\text{curr}][j]$$
  - Sum of minimum outgoing edges for every remaining unvisited node $i$ (considering edges to other unvisited nodes or returning to depot 0):
    $$\sum_{i \in \text{unvisited}} \min_{j \in \text{unvisited} \cup \{0\}, j \neq i} \text{matrix}[i][j]$$
  - Returns `bound`. This bound is **admissible** because any valid tour completing the path must traverse at least one outgoing edge from the current node and at least one outgoing edge from each unvisited node.
- **Search Strategy & Heuristic Node Ordering**:
  - Recursive depth-first search (`search(curr, count, visitedMask, currentCost, path)`).
  - Unvisited candidate nodes are dynamically sorted in ascending order of edge distance from `curr` before recursive expansion:
    ```typescript
    candidates.sort((a, b) => a.edgeCost - b.edgeCost);
    ```
  - This increases the likelihood of finding even lower cost tours early, further tightening the upper bound.
- **Pruning Condition**:
  - If `estimatedBound >= bestDistance`, `nodesPruned++` is incremented and the recursive branch is pruned immediately (`continue`).
- **Telemetry Returned**:
  - `tourIndices`, `tourLocations`, `totalDistance`, `executionTimeMs`, `nodesExplored`, `nodesPruned`, `isOptimal: true`, `hasTour: true`.
- **Complexity**:
  - Worst-case time: $O(n!)$.
  - Space complexity: $O(n)$ call stack depth + $O(2^n)$ bitmask representation.

---

## 19. GREEDY NEAREST NEIGHBOR — COMPLETE CODE TRACE

Implemented in `src/algorithms/tsp.ts` via function `solveGreedyNearestNeighbor(input: TSPInput): AlgorithmResult`:

- **Input Parameters**: `locations: MatrixLocation[]`, `matrix: number[][]`.
- **Algorithm Execution**:
  1. Starts at depot node 0 (`tour = [0]`, `visited[0] = true`, `curr = 0`).
  2. For step 1 to $n-1$:
     - Scans all unvisited candidate nodes $j \in [0, n-1]$.
     - Finds candidate node minimizing `matrix[curr][candidate]`.
     - Marks chosen node visited, appends to `tour`, adds distance to `totalDistance`, updates `curr = chosen`.
  3. Closes the tour by traversing back to depot node 0:
     - `totalDistance += matrix[curr][0]`.
     - `tour.push(0)`.
- **Complexity**:
  - Time Complexity: $O(n^2)$ (outer loop $n$ steps, inner scan $n$ candidates).
  - Space Complexity: $O(n)$ for `visited` array and `tour` indices.
- **Optimality**: Heuristic approximation (non-optimal, fast polynomial time).

---

## 20. REPORTS & CHARTS IMPLEMENTATION

- **View (`src/pages/Reports.tsx`)**:
  - Analytics and operational audit view built with Recharts.
- **Operational Metrics Calculated**:
  - Total Delivery Plans, Active Plans, Cancelled Plans.
  - Plan Fulfillment Rate ($\%$).
  - Total Dispatched Delivery Distance (km) and Average Route Distance (km).
  - Active Delivery Fleet Vehicles count.
- **Charts Implemented**:
  1. **Warehouse Distribution Bar Chart**: Compares total delivery plans created per warehouse facility (`BarChart`, `Bar`, `XAxis`, `YAxis`).
  2. **Route Algorithm Comparison Pie Chart**: Visualizes proportion of routes solved with Branch & Bound vs Greedy Nearest Neighbor (`PieChart`, `Pie`, `Cell`).
  3. **Order Status Distribution Chart**: Visualizes breakdown of orders across lifecycle states.
- **CSV Audit Export**:
  - Generates downloadable CSV (`smartlogix-plans-audit-YYYY-MM-DD.csv`) containing Plan Number, Status, Warehouse, Vehicle, Orders Count, Algorithm, Route Distance, and Date.
- **Data Source**: Fetches live database records directly via `api.plans.list()`, `api.orders.list()`, `api.vehicles.list()`, and `api.warehouses.list()`.

---

## 21. SETTINGS IMPLEMENTATION

- **View (`src/pages/Settings.tsx`)**:
  - Tabbed settings interface: Solver Configuration, Infrastructure Status, Security & Access, Interface Preferences.
- **LocalStorage Keys & Defaults**:
  - `smartlogix_default_algorithm`: `'BRANCH_AND_BOUND'` | `'GREEDY_NEAREST_NEIGHBOR'` (Default: `'BRANCH_AND_BOUND'`).
  - `smartlogix_bb_node_limit`: Numeric upper limit for Branch & Bound execution (Default: `10`, range 4–12).
  - `smartlogix_routing_profile`: ORS transit profile (Default: `'driving-car'`).
  - `smartlogix_auto_collapse_sidebar`: Persistent boolean for layout preference (Default: `false`).
- **Live Infrastructure Monitoring**:
  - Supabase connectivity check (`api.warehouses.list()`).
  - OpenRouteService health indicator.
  - Reset to Defaults action clearing localStorage keys.

---

## 22. SHARED UI ARCHITECTURE

Located in `src/components/ui/`:

1. **`Card.tsx`**:
   - Variants: `'default'` (soft-card), `'glass'` (glass-panel), `'elevated'` (soft-card-elevated), `'dense'` (surface-dense), `'floating'` (glass-floating), `'modal'` (glass-modal).
   - Props: `noPadding`, `glass`, `hoverable`.
   - Subcomponents: `CardHeader`, `CardTitle`.
2. **`Button.tsx`**:
   - Variants: `'primary'` (deep emerald/forest), `'secondary'` (frosted glass surface), `'outline'` (subtle border), `'danger'` (soft rose), `'lime'` (vibrant accent), `'ghost'` (transparent).
   - Sizes: `'sm'`, `'md'`, `'lg'`.
   - States: `loading` with animated spinner, `disabled`, `fullWidth`.
3. **`Badge.tsx`**:
   - Variants: `'success'`, `'warning'`, `'danger'`, `'info'`, `'lime'`, `'sage'`, `'purple'`, `'default'`.
   - Prop: `dot` (renders status pulse circle).
4. **`PageHeader.tsx`**:
   - Standardized page header with title, descriptive subtitle, and right-aligned actions slot.
5. **`Input.tsx`**:
   - Supports label, error feedback message, and optional leading icon.
6. **`Select.tsx`**:
   - Custom styled select with chevron SVG icon and error state styling.

---

## 23. ROUTES & NAVIGATION

Defined in `src/App.tsx` wrapped in `<BrowserRouter>` with master `<Layout>`:

| Path | Route Element | Navigation Label | Badge / Flag |
| :--- | :--- | :--- | :--- |
| `/` | `<Dashboard />` | Dashboard | — |
| `/map` | `<MapWorkspace />` | Logistics Map | — |
| `/products` | `<Products />` | Products | — |
| `/inventory` | `<InventoryPage />` | Inventory | — |
| `/warehouses` | `<Warehouses />` | Warehouses | — |
| `/orders` | `<Orders />` | Orders | — |
| `/orders/create` | `<CreateOrder />` | — | (Sub-route) |
| `/locations` | `<Locations />` | Delivery Locations | — |
| `/vehicles` | `<Vehicles />` | Vehicles | — |
| `/planning` | `<Planning />` | Delivery Planning | `DAA` |
| `/distance-matrix` | `<DistanceMatrix />` | Distance Matrix | `ORS` |
| `/reports` | `<Reports />` | Reports | — |
| `/settings` | `<Settings />` | Settings | Bottom pinned |
| `*` | `<Navigate to="/" replace />` | — | Catch-all redirect |

---

## 24. CURRENT DESIGN SYSTEM & DESIGN TOKENS

- **Color Palette (`tailwind.config.js` & `index.css`)**:
  - `brand-ivory`: `#FAF8F5` (Base background canvas)
  - `brand-cream`: `#F4F0E6` (Warm secondary background)
  - `brand-surface`: `#F6F3EB` (Inset container background)
  - `brand-sidebar`: `#133B2D` (Primary forest green for sidebar and header)
  - `brand-primary`: `#1E5644` (Main interactive brand button & accent green)
  - `brand-active`: `#276E57` (Active interactive state)
  - `brand-dark`: `#0E2E23` (Deep forest shadow base)
  - `brand-sage-light`: `#E8EFE9` (Muted surface tone)
  - `brand-sage`: `#C2D1C7` (Subtle boundary borders)
  - `brand-sage-deep`: `#5C7A6B` (Muted labels and icons)
  - `brand-border`: `#E2E4DC` (Card and panel border token)
  - `brand-text`: `#18241E` (High contrast charcoal text)
  - `brand-text-secondary`: `#5E6D65` (Muted description text)
  - `brand-lime`: `#84CC16` (Highlight accent green)
  - `brand-lime-soft`: `#F4FCE3` (Highlight accent background)
- **Glassmorphism & Surfaces**:
  - `.soft-card`: White at 92% opacity with 8px backdrop blur and soft shadow.
  - `.soft-card-elevated`: White at 95% opacity with 10px backdrop blur.
  - `.surface-dense`: White at 97% opacity for dense data grids and tables.
  - `.glass-floating`: White at 88% opacity with 12px blur for map floating panels.
- **Scenic Background Layering (`ScenicBackground.tsx`)**:
  - Layer 1: Ambient radial gradients (`#FAF8F5`, `#E8EFE9`, `#F4F0E6`).
  - Layer 2: Photographic 3D isometric logistics backdrop (`scenic-landscape.jpg` at 38% opacity).
  - Layer 3: Topographic vector contours with glowing route lines and pulsating nodes.

---

## 25. CURRENT DATA FLOW — END TO END

### Flow A: Product Creation
```
[User Form in Products.tsx]
          |
          v
[api.products.create()]
          |
          v
[INSERT INTO products (sku, name, category, unit_price, weight_kg)]
          |
          v
[Products Table Updated -> Triggers React State Refresh]
```

### Flow B: Warehouse Creation & GIS Geocoding
```
[User Form / MapLocationPicker in Warehouses.tsx]
          | (Capture Lat, Lon, Name, Code)
          v
[api.warehouses.create()]
          |
          v
[INSERT INTO warehouses (name, code, address, latitude, longitude, is_active)]
          |
          v
[Warehouse Map Pin Instantly Rendered in MapWorkspace.tsx]
```

### Flow C: Stock Inward / Adjustment
```
[User in Inventory.tsx]
          | (Select Warehouse, Product, Quantity, Reorder Level)
          v
[api.inventory.updateStock() / addStock()]
          |
          v
[RPC: update_inventory_stock(warehouse_id, product_id, quantity, reorder_level)]
          | (ON CONFLICT (warehouse_id, product_id) DO UPDATE)
          v
[Inventory Table Updated with High/Low Stock Badges in UI]
```

### Flow D: Order Creation Builder
```
[User in CreateOrder.tsx]
          |
          +---> Selects Destination Delivery Location
          +---> Selects Priority (LOW, MEDIUM, HIGH, URGENT)
          +---> Adds Items (Product ID, Quantity)
          |
          v
[api.orders.create({ delivery_location_id, priority, items, warehouse_id })]
          |
          v
[RPC: create_order_atomic]
          |
          +---> Validates Location Active Status
          +---> Checks Stock Availability
          +---> Generates Unique Order Number (ORD-YYYYMMDD-XXXXX)
          +---> Inserts row into orders
          +---> Inserts rows into order_items
          |
          v
[Order Appears in Orders.tsx Pipeline with Status PENDING]
```

### Flow E: Order Lifecycle State Progression
```
[User in Orders.tsx clicks Action Button]
          |
          v
[api.orders.updateStatus(order_id, target_status)]
          |
          v
[RPC: update_order_status]
          |
          +---> Validates Valid State Transition
          |     (PENDING -> PROCESSING -> DISPATCHED -> DELIVERED)
          +---> Blocks Invalid or Post-Terminal Transitions
          |
          v
[Orders Table Updated & Order Status Badge Reflected]
```

### Flow F: Road Distance Matrix Generation
```
[User clicks 'Generate Road Distances (ORS)' in DistanceMatrix.tsx or Planning.tsx]
          |
          v
[Collects [Lat, Lon] for Warehouse and All Selected Locations]
          |
          v
[supabase.functions.invoke('ors-matrix', { body: { locations, profile } })]
          |
          v
[Deno Edge Function calls https://api.openrouteservice.org/v2/matrix/driving-car]
          |
          v
[Parses meters -> km, maps nulls to unreachable NaN]
          |
          v
[api.distances.saveBatch()]
          |
          v
[UPSERT INTO location_distances (origin_id, destination_id, distance, distance_source = 'ORS_ROAD')]
```

### Flow G: Delivery Plan Creation
```
[User in Planning.tsx clicks 'Create Plan']
          |
          +---> Selects Starting Warehouse Depot
          +---> Selects Eligible Orders (Filtered to avoid active plan duplicates)
          |
          v
[api.plans.create({ warehouse_id, order_ids })]
          |
          v
[RPC: create_delivery_plan_atomic]
          |
          +---> Verifies Orders are not CANCELLED or DELIVERED
          +---> Verifies Orders are not in any existing PLANNED plan
          +---> Generates Sequential Plan Number (PLN-YYYY-XXXX)
          +---> Inserts delivery_plans
          +---> Inserts delivery_plan_orders junction rows
          |
          v
[New Plan Rendered in Planning.tsx]
```

### Flow H: Fleet Vehicle Capacity Assignment
```
[User selects Vehicle for Plan in Planning.tsx]
          |
          v
[api.plans.assignVehicle(planId, vehicleId)]
          |
          v
[RPC: assign_vehicle_to_delivery_plan]
          |
          +---> Validates Vehicle is AVAILABLE
          +---> Sums Total Order Weight: SUM(oi.quantity * p.weight_kg)
          +---> Checks: Total Weight <= vehicle.capacity (if kg)
          +---> Marks New Vehicle Status: ON_ROUTE
          +---> Updates Previous Vehicle (if any) to AVAILABLE
          +---> Sets delivery_plans.vehicle_id
          |
          v
[Enforces Unique Index: idx_delivery_plans_active_vehicle]
```

### Flow I: DAA Tour Optimization Execution
```
[User clicks 'Generate Optimized Route' in Planning.tsx]
          |
          +---> Gathers Unique Delivery Locations from Plan Orders
          +---> Assembles MatrixLocation Array (Index 0 = Depot)
          +---> Queries location_distances from DB to fill 2D matrix[i][j]
          +---> Validates Matrix via validateTSPMatrix()
          |
          v
[Dispatches to Selected DAA Solver in src/algorithms/tsp.ts]
          |
          +---> IF 'BRANCH_AND_BOUND': solveBranchAndBoundTSP()
          |     (Initializes Greedy bound, runs DFS with admissible bounding, prunes)
          |
          +---> IF 'GREEDY_NEAREST_NEIGHBOR': solveGreedyNearestNeighbor()
                (Selects min edge greedily, O(n^2))
          |
          v
[Returns AlgorithmResult { tourIndices, totalDistance, executionTimeMs, nodesPruned }]
          |
          v
[api.plans.saveRoute(planId, algorithm, routeStops, totalDistance, executionTimeMs)]
          |
          v
[RPC: save_delivery_plan_route updates delivery_plans table]
```

### Flow J: Route Map Visualization
```
[RouteStop Array passed to RouteMap.tsx]
          |
          +---> Renders Warehouse Depot Marker (WH DivIcon)
          +---> Renders Ordered Delivery Markers (1, 2, 3...)
          +---> Renders Leaflet Polyline connecting stops in tour order
          +---> Fits Bounds to fit all stops within viewport
```

---

## 26. CURRENT ALGORITHM FLOW DIAGRAM

```
                       [TSP Solver Invoked]
                                |
                                v
                     [validateTSPMatrix()]
                                |
                   +------------+------------+
                   |                         |
               [Invalid]                  [Valid]
                   |                         |
             [Return Error]                  v
                                  [Check Selected Solver]
                                             |
                  +--------------------------+--------------------------+
                  |                                                     |
                  v                                                     v
      [solveGreedyNearestNeighbor]                          [solveBranchAndBoundTSP]
                  |                                                     |
     [Start at Node 0 (Depot)]                               [Check n <= Safe Limit (10)]
                  |                                                     |
      [Loop step 1 to n-1]                                              v
                  |                                          [Run Greedy First for Initial Bound]
       [Find min unvisited edge]                                        |
                  |                                          [bestDistance = greedyDistance]
       [Mark visited, add cost]                                         |
                  |                                          [Precompute minOutgoing Edges]
                  v                                                     |
       [Return to Node 0]                                               v
                  |                                          [DFS Branching from Node 0]
                  v                                                     |
      [Return AlgorithmResult]                                          +---> [Sort candidates by edge cost]
                                                                        |
                                                                        +---> [Compute Admissible Lower Bound]
                                                                        |     (currentCost + minFromCurr + sumMinOut)
                                                                        |
                                                                        +---> [Is Lower Bound >= bestDistance?]
                                                                              |                 |
                                                                            [YES]              [NO]
                                                                              |                 |
                                                                        [Prune Branch]    [Recurse Deeper]
                                                                                                |
                                                                                          [All Visited?]
                                                                                                |
                                                                                          [Update bestTour]
                                                                                                |
                                                                                                v
                                                                                    [Return AlgorithmResult]
```

---

## 27. FUTURE FEATURE INTEGRATION POINTS

This section explicitly documents the planned integration points for the upcoming **Warehouse Optimization** features:

### 27.1 Restock Allocation (Optimization Algorithm)
- **Current State**: Restocks are entered manually in `Inventory.tsx` via `addStock()` without any optimization.
- **Integration Points**:
  - `src/pages/Inventory.tsx`: Can host a "Smart Restock Rebalancing" action modal.
  - `src/services/api.ts`: Add `api.inventory.optimizeRestockAllocation(input)`.
  - Database: Add warehouse capacity attributes (`storage_capacity`, `max_volume_m3`) to `warehouses` table.
  - Proposed Algorithm: Linear Programming, Greedy Knapsack Allocation, or Min-Cost Multi-Commodity Flow based on warehouse proximity and storage limits.

### 27.2 Customer Order Warehouse Fulfillment Allocation
- **Current State**: Order creation in `CreateOrder.tsx` allows optional warehouse selection, or lets `create_order_atomic` pick the first warehouse with available stock.
- **Integration Points**:
  - `src/pages/CreateOrder.tsx`: Automated "Find Optimal Fulfillment Warehouse" recommendation badge based on delivery location road proximity and stock levels.
  - Stored Procedure: Upgrade `create_order_atomic` or introduce `allocate_order_fulfillment(p_order_id)` evaluating road distance from `location_distances`.

---

## 28. FUTURE ALGORITHM ANALYSIS (DAA SYLLABUS SUITABILITY)

Audit of potential DAA syllabus algorithms for upcoming system enhancements:

| Candidate Algorithm | DAA Syllabus Category | Operational Logistics Problem | Suitability Score | Architecture Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **0/1 Knapsack Problem** | Dynamic Programming | Optimal item selection to maximize dispatch value under strict vehicle payload constraints. | **HIGH (9/10)** | Implement in `src/algorithms/knapsack.ts`. Upgrade `Planning.tsx` vehicle assignment to suggest the optimal subset of orders fitting a vehicle's capacity. |
| **Fractional Knapsack** | Greedy Technique | Bulk raw materials / fluid stock distribution across partitioned compartments. | **MEDIUM (6/10)** | Useful if products support fractional units (currently quantities are integers). |
| **Dijkstra's Algorithm** | Greedy Single-Source Shortest Path | Offline road network calculation or simulated warehouse internal aisle routing. | **HIGH (8/10)** | Can provide local shortest-path simulation between intra-warehouse bins or fallback if ORS API is unreachable. |
| **Floyd-Warshall** | Dynamic Programming All-Pairs | Generating complete all-pairs distance matrices for small node clusters without external API calls. | **HIGH (8.5/10)** | Ideal for computing dense intermediate transit matrices between distribution centers. |
| **Kruskal / Prim MST** | Greedy Minimum Spanning Tree | Designing regional warehouse replenishment networks and inter-hub trunking routes at minimum total infrastructure distance. | **HIGH (8/10)** | Implement in `src/algorithms/mst.ts` for supply chain network topology analysis. |
| **Bin Packing (FFD / BFD)** | Approximation Heuristics | Packing multiple customer orders across an entire multi-vehicle fleet simultaneously. | **VERY HIGH (9.5/10)** | Natural extension to `Planning.tsx` to automatically partition eligible orders into multiple delivery plans. |

---

## 29. COMPATIBILITY REQUIREMENTS (FROZEN FOUNDATION)

To ensure zero regressions when building future warehouse optimization extensions, the following components must remain strictly backward-compatible:

1. **Existing Database Schema & Types**:
   - `Product`, `Warehouse`, `Inventory`, `DeliveryLocation`, `Order`, `OrderItem`, `Vehicle`, `DeliveryPlan`, `LocationDistance`.
   - Never drop columns; only add nullable columns or columns with sensible defaults (e.g. `storage_capacity`).
2. **Existing RPC Stored Procedures**:
   - `create_order_atomic`, `update_order_status`, `create_delivery_plan_atomic`, `assign_vehicle_to_delivery_plan`, `save_delivery_plan_route`.
   - Function signatures must be preserved.
3. **Existing TSP Routing Engine (`src/algorithms/tsp.ts`)**:
   - `validateTSPMatrix`, `solveGreedyNearestNeighbor`, and `solveBranchAndBoundTSP` are verified working with zero bugs.
   - Do not modify or replace TSP bounding logic. Future algorithms must reside in dedicated files (e.g., `src/algorithms/knapsack.ts`, `src/algorithms/allocation.ts`).
4. **Existing ORS Matrix Edge Function**:
   - `supabase/functions/ors-matrix/index.ts` must maintain its request payload contract (`{ locations, profile }`).
5. **Existing Routes**:
   - All 13 URL paths configured in `src/App.tsx` must remain functional.

---

## 30. FILE IMPACT MAP

| File Path | Extensibility Role | Instructions for Future Work |
| :--- | :--- | :--- |
| `src/algorithms/tsp.ts` | **DO NOT MODIFY** | Frozen core DAA routing solver. |
| `src/algorithms/` | **NEW FILES ONLY** | Add new algorithms (e.g. `knapsack.ts`, `allocation.ts`) here. |
| `src/services/api.ts` | **EXTEND ONLY** | Add new API methods under existing namespaces or new namespaces. Preserve existing method contracts. |
| `src/types/database.types.ts` | **EXTEND ONLY** | Add new interfaces, types, and optional fields. Do not delete or rename existing types. |
| `supabase/migrations/` | **NEW MIGRATIONS ONLY** | Never edit historical migration files (000000 to 000007). Add new migrations with next timestamp prefix. |
| `src/components/ui/` | **REUSE AS-IS** | Use existing `Card`, `Button`, `Badge`, `PageHeader`, `Input`, `Select` design system tokens. |
| `src/pages/Planning.tsx` | **INTEGRATE** | Future multi-vehicle or knapsack packing hooks integrate into vehicle assignment step. |
| `src/pages/Inventory.tsx` | **INTEGRATE** | Future restock optimization hooks attach here. |
| `src/pages/CreateOrder.tsx` | **INTEGRATE** | Future warehouse fulfillment recommendation hooks attach here. |

---

## 31. CURRENT VERSION SNAPSHOT

- **Repository Root**: `c:\Users\NAVANEETH\Documents\Academic Projects\Smart Inventory & Delivery Optimization System`
- **Application Directory**: `smartlogix/`
- **Git Commit Hash**: `884becbb14eb4d2254e265498a4e35f4e387fae6`
- **TypeScript Verification**: `tsc -b` passed with **0 errors**.
- **Production Bundle**: `vite build` completed in **13.86s** with **0 build errors**.
- **Linter Status**: `oxlint` passed with **0 errors**.

---

## 32. FINAL ARCHITECTURAL TRUTH TABLE

| Component / Subsystem | Current Architectural Reality | Verified Status |
| :--- | :--- | :--- |
| **Backend Provider** | Supabase PostgreSQL (`tukysvupnqlypzjdcqwl.supabase.co`) | Verified |
| **Authentication** | None (Dev-permissive public RLS policies on all tables) | Verified |
| **Warehouse Capacity** | Not tracked in database schema or UI (Manual selection only) | Verified |
| **Stock Allocation** | Not automated (Manual selection in UI) | Verified |
| **Order Pipeline** | 5 states with strict transition validator in SQL | Verified |
| **Vehicle Assignment** | Linear weight/units sum check against capacity; unique index prevents collisions | Verified |
| **Knapsack Packing** | Not implemented (Strictly a linear $\sum \le \text{cap}$ check) | Verified |
| **Road Distances** | OpenRouteService Matrix API v2 via Deno Edge Function | Verified |
| **GIS Mapping** | React-Leaflet 5 + Leaflet 1.9 with OpenStreetMap tiles | Verified |
| **DAA Algorithms in Code** | Branch & Bound TSP ($O(n!)$) + Greedy Nearest Neighbor ($O(n^2)$) | Verified |
| **Other DAA Algorithms** | Dijkstra, Floyd-Warshall, Knapsack, MST, Bin Packing are NOT in code | Verified |
| **Reporting & Telemetry** | Recharts visualization + dynamic CSV export from live DB | Verified |
| **Settings** | LocalStorage keys for algorithm, node limits, routing profile | Verified |







