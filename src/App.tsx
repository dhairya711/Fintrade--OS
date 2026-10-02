import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { Spinner } from './components/ui';
import { useUiStore } from './store/uiStore';
import PinLogin from './features/auth/PinLogin';

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────

const DashboardPage  = lazy(() => import('./features/dashboard/DashboardPage'));
const InventoryPage  = lazy(() => import('./features/inventory/InventoryPage'));
const OrdersPage     = lazy(() => import('./features/orders/OrdersPage'));
const InvoicesPage   = lazy(() => import('./features/invoices/InvoicesPage'));
const DealersPage    = lazy(() => import('./features/dealers/DealersPage'));
const ReportsPage    = lazy(() => import('./features/reports/ReportsPage'));
const SettingsPage   = lazy(() => import('./features/settings/SettingsPage'));

// ─── Loading fallback ─────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={32} />
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { isAuthenticated } = useUiStore();

  if (!isAuthenticated) {
    return <PinLogin />;
  }

  return (
    <AppShell>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"          element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/orders"    element={<OrdersPage />} />
          <Route path="/invoices"  element={<InvoicesPage />} />
          <Route path="/dealers"   element={<DealersPage />} />
          <Route path="/reports"   element={<ReportsPage />} />
          <Route path="/settings"  element={<SettingsPage />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
