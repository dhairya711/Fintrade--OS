import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, FileText, Users, BarChart3,
  Settings, Menu, X, ChevronLeft, Bell, Search, Sun, Moon, LogOut,
  Zap, AlertTriangle, Clock, ChevronDown, User
} from 'lucide-react';
import { useInventoryStore } from '../store/inventoryStore';
import { useOrderStore } from '../store/orderStore';
import { useSettingsStore, useUiStore, useActivityStore } from '../store/uiStore';
import { clsx } from '../components/ui';
import { formatRelative } from '../lib/formatters';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/inventory', icon: Package, label: 'Inventory' },
  { path: '/orders', icon: ShoppingCart, label: 'B2B Orders' },
  { path: '/invoices', icon: FileText, label: 'Invoices & Billing' },
  { path: '/dealers', icon: Users, label: 'Dealers' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/settings', icon: Settings, label: 'System Settings' },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={clsx('flex items-center gap-3 px-4 py-3', collapsed && 'justify-center px-2')}>
      {/* SVG Lightning bolt in hexagon */}
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
        <path d="M18 2L32 10V26L18 34L4 26V10L18 2Z" fill="#2563EB" />
        <path d="M18 2L32 10V26L18 34L4 26V10L18 2Z" stroke="#3b82f6" strokeWidth="1" />
        <path d="M21 8L14 19H19L15 28L23 17H18L21 8Z" fill="white" />
      </svg>
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="text-white font-bold text-base tracking-tight">GIT Electric</span>
          <span className="text-blue-300 text-[10px] font-semibold uppercase tracking-widest">ERP System</span>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const products = useInventoryStore((s) => s.products);
  const orders = useOrderStore((s) => s.orders);

  const lowStockCount = products.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.reorderLevel
  ).length;
  const pendingOrdersCount = orders.filter((o) => o.orderStatus === 'Pending').length;

  const getBadge = (path: string) => {
    if (path === '/inventory' && lowStockCount > 0) return lowStockCount;
    if (path === '/orders' && pendingOrdersCount > 0) return pendingOrdersCount;
    return null;
  };

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-200',
        'bg-[#0B1F3A] border-r border-[#14325C]',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      <Logo collapsed={sidebarCollapsed} />

      <div className="h-px bg-[#14325C] mx-3 mb-2" />

      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const badge = getBadge(path);
          return (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded mb-0.5 transition-all duration-150 group relative',
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-[#14325C] hover:text-white',
                  sidebarCollapsed && 'justify-center px-2'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className="flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="text-sm font-medium flex-1">{label}</span>
                  )}
                  {!sidebarCollapsed && badge && (
                    <span className={clsx(
                      'px-1.5 py-0.5 rounded-full text-xs font-bold',
                      isActive ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
                    )}>
                      {badge}
                    </span>
                  )}
                  {sidebarCollapsed && badge && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                      {label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle & Logout */}
      <div className="p-3 border-t border-[#14325C] flex flex-col gap-1">
        <button
          onClick={toggleSidebar}
          className={clsx(
            'flex items-center gap-2 w-full px-3 py-2 rounded text-slate-400 hover:text-white hover:bg-[#14325C] transition-colors text-sm',
            sidebarCollapsed && 'justify-center px-2'
          )}
        >
          {sidebarCollapsed ? <ChevronLeft size={16} className="rotate-180" /> : <ChevronLeft size={16} />}
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={() => useUiStore.getState().setAuthenticated(false)}
          className={clsx(
            'flex items-center gap-2 w-full px-3 py-2 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-sm mt-1',
            sidebarCollapsed && 'justify-center px-2'
          )}
        >
          <LogOut size={16} />
          {!sidebarCollapsed && <span>System Lock</span>}
        </button>
      </div>
    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function Topbar() {
  const { sidebarCollapsed, openCommandPalette, toggleNotifications, notificationsOpen, closeNotifications } = useUiStore();
  const { settings, toggleTheme, setRole } = useSettingsStore();
  const { notifications, markAllRead } = useActivityStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        closeNotifications();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeNotifications]);

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 z-30 h-14 flex items-center gap-3 px-4 transition-all duration-200',
        'bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm',
        sidebarCollapsed ? 'left-16' : 'left-60'
      )}
    >
      {/* Search trigger */}
      <button
        onClick={openCommandPalette}
        className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-1 max-w-sm"
      >
        <Search size={14} />
        <span>Search products, orders, dealers…</span>
        <kbd className="ml-auto text-xs px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 font-mono">⌘K</kbd>
      </button>

      <div className="flex items-center gap-1 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={toggleNotifications}
            className="relative p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 animate-scale-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notifications</span>
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700">Mark all read</button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">All caught up!</div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div key={n.id} className={clsx(
                      'px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer',
                      !n.read && 'bg-blue-50/40 dark:bg-blue-900/10'
                    )}>
                      <div className="flex items-start gap-2">
                        <span className={clsx(
                          'mt-1 w-2 h-2 rounded-full flex-shrink-0',
                          n.type === 'low_stock' ? 'bg-amber-500' :
                          n.type === 'new_order' ? 'bg-emerald-500' :
                          n.type === 'order_overdue' ? 'bg-red-500' : 'bg-blue-500'
                        )} />
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{formatRelative(n.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              VD
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">Vrund Doshi</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{settings.currentUser.role}</p>
            </div>
            <ChevronDown size={12} className="text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 animate-scale-in">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Vrund Doshi</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">vrund@gitelectric.in</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">GIT Electric Pvt. Ltd.</p>
              </div>
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Switch Role</p>
                <div className="flex gap-2">
                  {(['Admin', 'Manager'] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => { setRole(role); setProfileOpen(false); }}
                      className={clsx(
                        'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                        settings.currentUser.role === role
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-2 py-2">
                <button
                  onClick={() => { navigate('/settings'); setProfileOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Settings size={14} />
                  System Settings
                </button>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {settings.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                  {settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ collapsed }: { collapsed: boolean }) {
  return (
    <footer
      className={clsx(
        'fixed bottom-0 right-0 z-20 transition-all duration-200',
        'bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800',
        'px-4 py-2 flex items-center',
        collapsed ? 'left-16' : 'left-60'
      )}
    >
      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        GIT Electric Pvt. Ltd. &nbsp;|&nbsp; 6, Loha Bhuvan, Old Lakkad Pitha Road, Sultanpura, Vadodara, Gujarat, 390001
        &nbsp;|&nbsp; Est. 2017 &nbsp;|&nbsp; Manager: Rikesh Patel &nbsp;|&nbsp; Admin: Vrund Doshi
      </p>
    </footer>
  );
}

// ─── Command Palette ──────────────────────────────────────────────────────────

function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette } = useUiStore();
  const [query, setQuery] = useState('');
  const products = useInventoryStore((s) => s.products);
  const orders = useOrderStore((s) => s.orders);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        commandPaletteOpen ? closeCommandPalette() : useUiStore.getState().openCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, closeCommandPalette]);

  if (!commandPaletteOpen) return null;

  const q = query.toLowerCase();
  const matchedProducts = q ? products.filter((p) =>
    p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  ).slice(0, 4) : [];
  const matchedOrders = q ? orders.filter((o) =>
    o.orderNumber.toLowerCase().includes(q) || o.dealerName.toLowerCase().includes(q)
  ).slice(0, 3) : [];

  const hasResults = matchedProducts.length > 0 || matchedOrders.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeCommandPalette} />
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search size={16} className="text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, orders, dealers, invoices…"
            className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
          <kbd className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">ESC</kbd>
        </div>

        {q && (
          <div className="p-2 max-h-80 overflow-y-auto">
            {!hasResults && (
              <div className="py-6 text-center text-sm text-slate-500">No results for "{query}"</div>
            )}
            {matchedProducts.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Products</div>
                {matchedProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { navigate('/inventory'); closeCommandPalette(); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
                  >
                    <Package size={14} className="text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.sku} · {p.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {matchedOrders.length > 0 && (
              <div className="mt-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Orders</div>
                {matchedOrders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => { navigate('/orders'); closeCommandPalette(); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
                  >
                    <ShoppingCart size={14} className="text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{o.orderNumber}</p>
                      <p className="text-xs text-slate-500">{o.dealerName} · {o.orderStatus}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!q && (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            Start typing to search across products, orders, dealers and invoices
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { sidebarCollapsed } = useUiStore();
  const { settings } = useSettingsStore();

  // Apply dark mode to html element
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <Topbar />
      <CommandPalette />
      <main
        className={clsx(
          'transition-all duration-200 pt-14 pb-10',
          sidebarCollapsed ? 'pl-16' : 'pl-60'
        )}
      >
        <div className="p-6 min-h-[calc(100vh-96px)]">
          {children}
        </div>
      </main>
      <Footer collapsed={sidebarCollapsed} />
    </div>
  );
}
