import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import 'leaflet/dist/leaflet.css';

// Route-level code splitting for performance and bundle size optimization
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const MapWorkspace = lazy(() => import('./pages/MapWorkspace').then(m => ({ default: m.MapWorkspace })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const InventoryPage = lazy(() => import('./pages/Inventory').then(m => ({ default: m.InventoryPage })));
const Warehouses = lazy(() => import('./pages/Warehouses').then(m => ({ default: m.Warehouses })));
const Locations = lazy(() => import('./pages/Locations').then(m => ({ default: m.Locations })));
const Orders = lazy(() => import('./pages/Orders').then(m => ({ default: m.Orders })));
const CreateOrder = lazy(() => import('./pages/CreateOrder').then(m => ({ default: m.CreateOrder })));
const Vehicles = lazy(() => import('./pages/Vehicles').then(m => ({ default: m.Vehicles })));
const Planning = lazy(() => import('./pages/Planning').then(m => ({ default: m.Planning })));
const DistanceMatrix = lazy(() => import('./pages/DistanceMatrix').then(m => ({ default: m.DistanceMatrix })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<MapWorkspace />} />
          <Route path="products" element={<Products />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="warehouses" element={<Warehouses />} />
          <Route path="locations" element={<Locations />} />
          <Route path="delivery-locations" element={<Navigate to="/locations" replace />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/create" element={<CreateOrder />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="planning" element={<Planning />} />
          <Route path="distance-matrix" element={<DistanceMatrix />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
