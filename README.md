# Smart Inventory & Delivery Optimization System

A web-based inventory management and delivery planning system designed to simulate logistics operations and demonstrate the practical application of Design and Analysis of Algorithms (DAA) concepts.

**Academic Context:** B.Tech Computer Science Engineering — DAA Course Project.

---

## 1. Problem Being Solved

When managing a logistics network, operators need to balance inventory availability, vehicle constraints, and routing efficiency. This system provides a centralized dashboard to answer:
*   Do we have enough stock to fulfill these orders?
*   Do the selected orders fit in the available vehicle?
*   What is the most efficient sequence to visit the delivery locations?

The application visualizes these entities and utilizes algorithms (Branch and Bound, Greedy) to optimize delivery routes based on a configurable distance matrix.

---

## 2. Core Features

*   **Inventory & Order Management:** Full CRUD operations for Products, Warehouses, Delivery Locations, Vehicles, and Customer Orders.
*   **Stock Validation:** Prevents dispatching orders with insufficient inventory.
*   **Capacity Validation:** Prevents overloading vehicles based on product weights.
*   **Algorithmic Route Optimization:**
    *   **Branch and Bound:** Exact solver for small Travelling Salesperson Problem (TSP) instances to find the mathematically optimal route.
    *   **Greedy Heuristic:** Nearest-neighbor baseline algorithm for fast, non-optimal route estimation.
*   **Algorithm Comparison:** Compare distance and efficiency between exact and heuristic approaches.
*   **Map Visualization:** Interactive React Leaflet map displaying facilities and route polylines.
*   **Dispatch System:** Atomic transaction system ensuring inventory is deducted consistently upon dispatch.

---

## 3. Confirmed Technology Stack

*   **Frontend:** React, Vite, TypeScript, Tailwind CSS.
*   **Map UI:** React Leaflet, OpenStreetMap tiles.
*   **Backend & Database:** Supabase (PostgreSQL, PostgREST API).
*   **Deployment:** Vercel (Frontend), Supabase Cloud (Backend).

---

## 4. High-Level Architecture

The application runs as a Single Page Application (SPA) in the browser. All DAA algorithms execute client-side to allow visualization of the problem-solving process. Data persistence, integrity rules, and atomic dispatch transactions are handled by the Supabase PostgreSQL database via REST APIs.

---

## 5. Setup Instructions (Planned)

> **Note:** The application is currently in the documentation phase. These setup instructions are planned and will be verified during implementation.

### Prerequisites
*   Node.js (v18+)
*   npm or yarn
*   A Supabase account (Free tier)

### Environment Configuration
1.  Create a Supabase project.
2.  Execute the provided SQL schema in the Supabase SQL editor.
3.  Clone the repository.
4.  Copy `.env.example` to `.env.local` and populate:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
5.  Run `npm install`
6.  Run `npm run dev`

---

## 6. Limitations and Exclusions

*   **Simulation Only:** This is a simulated environment using fictional data. It does not integrate with live GPS, external inventory feeds, or real-world traffic data.
*   **Algorithmic Constraints:** The exact TSP algorithm (Branch and Bound) has factorial time complexity $O(n!)$. The UI restricts its use to small datasets ($\le 10$ locations) to prevent browser freezing.
*   **Distance Matrix vs. Map:** Map coordinates are for visual representation only. Route optimization utilizes a manually configured distance matrix, NOT calculated road distances.
*   **No Commercial Features:** Excludes payment processing, driver mobile apps, customer portals, and multi-day fleet scheduling.
