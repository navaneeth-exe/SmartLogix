# Smart Inventory & Delivery Optimization System — Product Overview

## 1. Project Identity

| Field | Value |
|---|---|
| **Project Name** | Smart Inventory & Delivery Optimization System |
| **Project Type** | Web-based inventory management and delivery planning system with algorithmic optimization |
| **Academic Purpose** | Demonstrate Design and Analysis of Algorithms (DAA) concepts through a working software application |
| **University Context** | B.Tech Computer Science Engineering — DAA course project |

---

## 2. Problem Statement

When managing inventory and deliveries, an operator needs answers to:

1. Which products are available in stock?
2. Which orders can be fulfilled with current inventory?
3. Which orders have insufficient stock, and what are the shortages?
4. Which warehouses hold the required products?
5. Which vehicles are available, and do they have enough capacity for the planned deliveries?
6. In what sequence should delivery locations be visited to minimize total distance?
7. How does a route-planning algorithm arrive at its proposed sequence?
8. What is the total distance or estimated cost of a delivery plan?

This project provides a single, centralized web interface where one operator can manage all of these concerns using simulated, fictional data — and can observe how DAA algorithms solve the route-optimization sub-problem.

---

## 3. Target Users

The application has **one primary user type**: an administrator or logistics operator.

This single user can:

- Manage products, warehouses, inventory, and vehicles.
- Create and track customer orders.
- Configure delivery locations and distances.
- Create delivery plans and run route-optimization algorithms.
- Dispatch plans and update delivery statuses.

There are **no** separate portals for customers, drivers, warehouse staff, suppliers, or super-administrators.

Customer information is stored as part of an order record; no customer-facing application exists.

---

## 4. Goals

### 4.1 Primary Goals

| # | Goal |
|---|---|
| G1 | Provide CRUD operations for products, warehouses, inventory, delivery locations, vehicles, and orders. |
| G2 | Enforce inventory, order-lifecycle, and vehicle-capacity business rules consistently. |
| G3 | Implement Branch and Bound to solve small Travelling Salesperson Problem (TSP) instances for delivery route optimization. |
| G4 | Optionally implement a Greedy nearest-neighbor heuristic as a baseline for algorithm comparison. |
| G5 | Visualize warehouses, delivery locations, and planned routes on an interactive map using React Leaflet and OpenStreetMap. |
| G6 | Maintain a clear separation between map coordinates (visualization) and the distance matrix (algorithm input). |
| G7 | Provide a dashboard with live operational metrics derived from application data. |
| G8 | Align the project with the official DAA syllabus, demonstrating relevant algorithmic concepts. |

### 4.2 Non-Goals

- Building a commercial-grade logistics platform.
- Handling real-time fleet management, live GPS, or traffic-aware routing.
- Providing AI-powered demand prediction or forecasting.
- Implementing paid third-party API integrations.

---

## 5. Core Capabilities

### 5.1 Inventory & Order Management

| Capability | Description |
|---|---|
| Product Management | Create, view, edit, search, and safely delete products. View cross-warehouse stock. |
| Warehouse Management | Create and manage warehouses with configurable coordinates. View warehouse inventory. |
| Inventory Management | Record and update stock per product per warehouse. Prevent negative stock. Identify shortages. |
| Order Management | Create orders with multiple items. Validate against inventory. Enforce order lifecycle. |
| Vehicle Management | Create vehicles with capacity limits. Track availability and assignments. |
| Delivery Location Management | Create fictional delivery points with coordinates. Associate with orders. |

### 5.2 Delivery Planning & Optimization

| Capability | Description |
|---|---|
| Delivery Plan Creation | Select eligible orders, an origin warehouse, and a vehicle. Validate capacity. |
| Route Optimization (Branch and Bound) | Solve small TSP instances to find an optimal delivery sequence under the configured distance matrix. |
| Route Optimization (Greedy Baseline) | Nearest-neighbor heuristic producing a fast but non-optimal route. |
| Algorithm Comparison | Compare route distance, execution time, nodes explored, and optimality guarantee. |
| Distance Matrix | Manually configurable matrix of inter-location distances, independent of map coordinates. |
| Map Visualization | Display warehouses, locations, and route polylines on a 2D Leaflet map. |

### 5.3 Dispatch & Tracking

| Capability | Description |
|---|---|
| Dispatch | Confirm a reviewed plan, update order/vehicle/inventory records atomically. |
| Delivery Status Tracking | Manually update simulated delivery statuses (no live GPS). |

### 5.4 Dashboard & Reporting

| Capability | Description |
|---|---|
| Dashboard | Consolidated live metrics: product counts, inventory totals, order statuses, vehicle availability, delivery distances. |
| Reports | Operational summaries including algorithm results, plan details, and shortage lists. |

---

## 6. Scope Boundaries

### 6.1 In Scope (Required)

- All 12 modules listed in the specification (Dashboard, Products, Inventory, Warehouses, Orders, Delivery Locations, Vehicles, Delivery Planning, Dispatch, Delivery Status, Algorithm Execution, Reports).
- Branch and Bound TSP implementation with pseudocode, complexity analysis, and correctness discussion.
- Greedy nearest-neighbor heuristic (optional but recommended for comparison).
- React + Vite + TypeScript frontend.
- Tailwind CSS for styling.
- Supabase (PostgreSQL) backend.
- React Leaflet + OpenStreetMap map.
- Vercel deployment.

### 6.2 Optional / Future Enhancements (Not Required for Initial Delivery)

- Dijkstra's algorithm — only if a clearly defined shortest-path feature is added.
- Order splitting across warehouses or vehicles.
- Inter-warehouse stock transfers.
- Data export (CSV, PDF).
- Advanced cost models.

### 6.3 Explicitly Out of Scope

See Section 8 below.

---

## 7. Intended User Workflow

```
Step 1 ─ Configure System
   │  Create warehouses, delivery locations, products, vehicles.
   ▼
Step 2 ─ Configure Inventory
   │  Record stock quantities per product per warehouse.
   ▼
Step 3 ─ Configure Distances
   │  Enter/update the distance matrix (independent of map coordinates).
   ▼
Step 4 ─ Create Orders
   │  Add orders with products, quantities, and a delivery location.
   ▼
Step 5 ─ Validate Orders
   │  System checks product existence, stock availability, shortages.
   ▼
Step 6 ─ Prepare Delivery Plan
   │  Select eligible orders, origin warehouse, vehicle.
   │  System checks capacity constraints.
   ▼
Step 7 ─ Run Route Optimization
   │  Branch and Bound (exact) and/or Greedy (heuristic).
   ▼
Step 8 ─ Review Result
   │  View route, distance, algorithm stats, vehicle, orders.
   ▼
Step 9 ─ Dispatch
   │  Confirm dispatch → update orders, vehicle, inventory atomically.
   ▼
Step 10 ─ Complete Deliveries
      Manually update statuses until all orders are marked Delivered.
```

> **Note:** The workflow is simulated. No actual vehicle is controlled or tracked.

---

## 8. Explicit Exclusions

The following must **not** be implemented unless explicitly approved:

| Category | Excluded Features |
|---|---|
| AI / ML | Demand prediction, AI recommendations, AI chatbot, predictive inventory |
| Real-time | Live GPS, traffic data, turn-by-turn navigation, real-time tracking |
| Maps | Google Maps, paid routing APIs, automatic road-distance calculations |
| Mobile | Driver apps, customer apps |
| Notifications | SMS, email, push notifications |
| Finance | Payment processing, billing, invoicing |
| Procurement | Supplier management, purchase orders, auto-replenishment |
| Advanced logistics | Multi-day scheduling, driver shifts, time-windows, fuel optimization, fleet telematics |
| Infrastructure | Microservices, Kubernetes, blockchain, separate backend server |
| Portals | Customer portal, driver portal, supplier portal, multi-role portals |
| Misc | Auto inter-warehouse transfers, complex order splitting, vehicle maintenance |

---

## 9. Important Distinctions

| Distinction | Explanation |
|---|---|
| Inventory Management vs. Route Optimization | Inventory decides *whether* orders can be fulfilled; routing decides *in what order* to visit delivery locations. |
| TSP vs. Vehicle Routing Problem (VRP) | This project solves small TSP instances, not the general multi-vehicle VRP. |
| Route Distance vs. Map Coordinates | The algorithm uses the configured distance matrix; the map uses lat/lng for visualization. These are independent. |
| Exact Algorithm vs. Heuristic | Branch and Bound finds optimal solutions (given sufficient time); Greedy does not guarantee optimality. |
| Capacity Validation vs. Knapsack | Checking weight fits a vehicle ≠ solving a Knapsack optimization. |
| Simulation vs. Real-World | All data is fictional and simulated; no real fleet management occurs. |
