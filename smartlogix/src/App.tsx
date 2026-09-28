import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Warehouses } from './pages/Warehouses';
import { InventoryPage } from './pages/Inventory';
import { Locations } from './pages/Locations';
import { Orders } from './pages/Orders';
import { CreateOrder } from './pages/CreateOrder';
import { Vehicles } from './pages/Vehicles';
import { DistanceMatrix } from './pages/DistanceMatrix';
import { Planning } from './pages/Planning';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { MapWorkspace } from './pages/MapWorkspace';
import 'leaflet/dist/leaflet.css';

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
