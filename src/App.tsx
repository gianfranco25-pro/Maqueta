import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";

import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Attendance from "./pages/Attendance";
import Catalog from "./pages/Catalog";
import Inventory from "./pages/Inventory";
import InventoryEntry from "./pages/InventoryEntry";
import InventoryTransfers from "./pages/InventoryTransfers";
import InventoryDeliveries from "./pages/InventoryDeliveries";
import InventoryFaults from "./pages/InventoryFaults";
import InventorySamples from "./pages/InventorySamples";
import ScanPage from "./pages/ScanPage";
import Sales from "./pages/Sales";
import NewSale from "./pages/NewSale";
import AfterSales from "./pages/AfterSales";
import Authorizations from "./pages/Authorizations";
import Reports from "./pages/Reports";
import Commissions from "./pages/Commissions";
import MyIncome from "./pages/MyIncome";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/usuarios" element={<Users />} />
            <Route path="/asistencia" element={<Attendance />} />
            <Route path="/catalogo" element={<Catalog />} />
            <Route path="/inventario" element={<Inventory />} />
            <Route path="/inventario/ingreso" element={<InventoryEntry />} />
            <Route path="/inventario/traslados" element={<InventoryTransfers />} />
            <Route path="/inventario/entregas" element={<InventoryDeliveries />} />
            <Route path="/inventario/fallas" element={<InventoryFaults />} />
            <Route path="/inventario/muestras" element={<InventorySamples />} />
            <Route path="/escanear" element={<ScanPage />} />
            <Route path="/ventas" element={<Sales />} />
            <Route path="/ventas/nueva" element={<NewSale />} />
            <Route path="/postventa" element={<AfterSales />} />
            <Route path="/autorizaciones" element={<Authorizations />} />
            <Route path="/reportes" element={<Reports />} />
            <Route path="/comisiones" element={<Commissions />} />
            <Route path="/mis-ingresos" element={<MyIncome />} />
            <Route path="/configuracion" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
