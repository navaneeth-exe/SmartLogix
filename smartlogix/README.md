# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
# SmartLogix - Smart Inventory & Delivery Optimization System

## Phase 3 Database Foundation Complete

### Supabase Setup Requirements
1. **Create a Supabase Project:** Ensure you have a Supabase project set up.
2. **Environment Variables:** Copy .env.example to .env and fill in:
   - VITE_SUPABASE_URL: Your Supabase Project URL.
   - VITE_SUPABASE_PUBLISHABLE_KEY: Your Supabase Anon Key.
   *Note: Never expose your service_role key to the frontend.*
3. **Database Migration:** 
   - Apply the SQL migration found at supabase/migrations/20260927000000_initial_schema.sql by pasting it into the Supabase SQL Editor.
   - This sets up the warehouses, products, inventory, delivery_locations, orders, order_items, and ehicles tables.

### How to Start the Application
1. Run 
pm install to install all dependencies.
2. Run 
pm run dev to start the Vite development server.
3. Access the dashboard via http://localhost:5173.

### Verifying Database Connection
A simple test script is provided in 	est_db.js. You can run:
\\\ash
node test_db.js
\\\
If successful, it will connect to Supabase and query the warehouses table without errors.

### RLS Configuration
- Row Level Security (RLS) is enabled on all tables.
- Currently, permissive policies are applied for developmental reading/writing since full authentication has not yet been implemented.
- These dev-policies allow anon connections to insert/update demo data in orders and order_items. Production environments must lock these down to authenticated roles.

### Not Implemented Yet
- Full Product & Inventory CRUD operations.
- Full Delivery Optimization (Branch and Bound / Dijkstra algorithm integrations).
- Authentication and advanced RLS per-user.
- Vehicle dispatch assignments.

