import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<div className="p-8"><h1 className="text-2xl font-bold">Products</h1></div>} />
          <Route path="inventory" element={<div className="p-8"><h1 className="text-2xl font-bold">Inventory</h1></div>} />
          <Route path="warehouses" element={<div className="p-8"><h1 className="text-2xl font-bold">Warehouses</h1></div>} />
          <Route path="orders" element={<div className="p-8"><h1 className="text-2xl font-bold">Orders</h1></div>} />
          <Route path="locations" element={<div className="p-8"><h1 className="text-2xl font-bold">Delivery Locations</h1></div>} />
          <Route path="vehicles" element={<div className="p-8"><h1 className="text-2xl font-bold">Vehicles</h1></div>} />
          <Route path="planning" element={<div className="p-8"><h1 className="text-2xl font-bold">Delivery Planning</h1></div>} />
          <Route path="distance-matrix" element={<div className="p-8"><h1 className="text-2xl font-bold">Distance Matrix</h1></div>} />
          <Route path="reports" element={<div className="p-8"><h1 className="text-2xl font-bold">Reports</h1></div>} />
          <Route path="settings" element={<div className="p-8"><h1 className="text-2xl font-bold">Settings</h1></div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
