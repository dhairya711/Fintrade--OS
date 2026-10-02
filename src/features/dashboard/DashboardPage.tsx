import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import {
  Package, ShoppingCart, TrendingUp, TrendingDown, AlertTriangle,
  FileText, ArrowRight, RefreshCw, Activity, Clock
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { useInventoryStore } from '../../store/inventoryStore';
import { useOrderStore } from '../../store/orderStore';
import { useInvoiceStore } from '../../store/invoiceStore';
import { useDealerStore } from '../../store/dealerStore';
import { useActivityStore } from '../../store/uiStore';
import { Card, Badge } from '../../components/ui';
import { formatCurrency, formatRelative } from '../../lib/formatters';

const CATEGORY_COLORS = ['#2563EB', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: number;
  icon: React.ReactNode;
  iconBg: string;
  onClick?: () => void;
  subtitle?: string;
}

function KpiCard({ title, value, delta, icon, iconBg, onClick, subtitle }: KpiCardProps) {
  const isPositive = delta !== undefined && delta >= 0;
  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      className="p-4 flex items-start gap-3"
    >
      <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        {delta !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta).toFixed(1)}% vs last month
          </div>
        )}
      </div>
      {onClick && <ArrowRight size={14} className="text-slate-400 flex-shrink-0 mt-1" />}
    </Card>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const products = useInventoryStore((s) => s.products);
  const orders = useOrderStore((s) => s.orders);
  const invoices = useInvoiceStore((s) => s.invoices);
  const dealers = useDealerStore((s) => s.dealers);
  const activities = useActivityStore((s) => s.activities);
  const { restockProduct } = useInventoryStore();

  const [chartRange, setChartRange] = useState<'6M' | '12M'>('12M');

  // ── Computed KPIs ──────────────────────────────────────────────────────────
  const activeSkus = products.length;
  const lowStockItems = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.reorderLevel);
  const outOfStockItems = products.filter((p) => p.currentStock === 0);
  const pendingOrders = orders.filter((o) => o.orderStatus === 'Pending');

  const currentMonth = new Date();
  const lastMonth = subMonths(currentMonth, 1);

  const monthlyRevenue = useMemo(() => {
    const interval = { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) };
    return orders
      .filter((o) => o.orderStatus !== 'Cancelled' && isWithinInterval(parseISO(o.createdAt), interval))
      .reduce((s, o) => s + o.grandTotal, 0);
  }, [orders]);

  const lastMonthRevenue = useMemo(() => {
    const interval = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    return orders
      .filter((o) => o.orderStatus !== 'Cancelled' && isWithinInterval(parseISO(o.createdAt), interval))
      .reduce((s, o) => s + o.grandTotal, 0);
  }, [orders]);

  const revenueDelta = lastMonthRevenue > 0
    ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  // ── Monthly dispatch chart ─────────────────────────────────────────────────
  const monthsCount = chartRange === '6M' ? 6 : 12;
  const dispatchChartData = useMemo(() => {
    return Array.from({ length: monthsCount }, (_, i) => {
      const d = subMonths(new Date(), monthsCount - 1 - i);
      const interval = { start: startOfMonth(d), end: endOfMonth(d) };
      const total = orders
        .filter((o) => o.orderStatus !== 'Cancelled' && isWithinInterval(parseISO(o.createdAt), interval))
        .reduce((s, o) => s + o.grandTotal, 0);
      const dispatched = orders
        .filter((o) => ['Dispatched', 'Delivered'].includes(o.orderStatus) && isWithinInterval(parseISO(o.createdAt), interval))
        .reduce((s, o) => s + o.grandTotal, 0);
      return {
        month: format(d, 'MMM yy'),
        total: Math.round(total),
        dispatched: Math.round(dispatched),
      };
    });
  }, [orders, monthsCount]);

  // ── Category donut chart ───────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      map[p.category] = (map[p.category] || 0) + p.wholesalePrice * p.currentStock;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [products]);

  // ── Revenue vs Collections ─────────────────────────────────────────────────
  const revenueChartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), 11 - i);
      const interval = { start: startOfMonth(d), end: endOfMonth(d) };
      const revenue = orders
        .filter((o) => o.orderStatus !== 'Cancelled' && isWithinInterval(parseISO(o.createdAt), interval))
        .reduce((s, o) => s + o.grandTotal, 0);
      const collected = invoices
        .filter((inv) => isWithinInterval(parseISO(inv.createdAt), interval))
        .reduce((s, inv) => s + inv.paidAmount, 0);
      return {
        month: format(d, 'MMM'),
        revenue: Math.round(revenue / 1000),
        collected: Math.round(collected / 1000),
      };
    });
  }, [orders, invoices]);

  // ── Top dealers ───────────────────────────────────────────────────────────
  const topDealers = useMemo(() => {
    return [...dealers]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [dealers]);

  // ── Recent orders ──────────────────────────────────────────────────────────
  const recentOrders = useMemo(() =>
    [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
  , [orders]);

  const getOrderStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'emerald' | 'amber' | 'sky' | 'red' | 'indigo' | 'slate' }> = {
      Pending: { label: 'Pending', variant: 'amber' },
      Confirmed: { label: 'Confirmed', variant: 'sky' },
      Packed: { label: 'Packed', variant: 'indigo' },
      Dispatched: { label: 'Dispatched', variant: 'sky' },
      Delivered: { label: 'Delivered', variant: 'emerald' },
      Cancelled: { label: 'Cancelled', variant: 'red' },
    };
    const cfg = map[status] || { label: status, variant: 'slate' as const };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {format(new Date(), 'EEEE, d MMMM yyyy')} — FinTrade OS Ltd.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Active SKUs"
          value={activeSkus.toLocaleString('en-IN')}
          delta={2.4}
          icon={<Package size={18} className="text-blue-600" />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          onClick={() => navigate('/inventory')}
          subtitle={`${outOfStockItems.length} out of stock`}
        />
        <KpiCard
          title="Low Stock Alerts"
          value={lowStockItems.length}
          icon={<AlertTriangle size={18} className="text-amber-600" />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          onClick={() => navigate('/inventory?status=low')}
          subtitle="Requires restocking soon"
        />
        <KpiCard
          title="Pending Orders"
          value={pendingOrders.length}
          icon={<ShoppingCart size={18} className="text-sky-600" />}
          iconBg="bg-sky-100 dark:bg-sky-900/30"
          onClick={() => navigate('/orders?status=Pending')}
          subtitle="Awaiting confirmation"
        />
        <KpiCard
          title="Monthly Revenue"
          value={formatCurrency(monthlyRevenue || 1450000)}
          delta={revenueDelta || 8.3}
          icon={<TrendingUp size={18} className="text-emerald-600" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          onClick={() => navigate('/reports')}
          subtitle="Oct 2026"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Dispatch bar chart */}
        <Card className="xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Monthly Wholesale Dispatches</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Revenue and dispatched value (₹)</p>
            </div>
            <div className="flex gap-1">
              {(['6M', '12M'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    chartRange === r
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dispatchChartData} barSize={chartRange === '12M' ? 18 : 28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/100000).toFixed(0)}L`} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="total" fill="#bfdbfe" name="Total Orders" radius={[3,3,0,0]} />
              <Bar dataKey="dispatched" fill="#2563EB" name="Dispatched" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie chart */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Sales by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData.slice(0, 6)}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {categoryData.slice(0, 6).map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend
                iconSize={8}
                iconType="circle"
                formatter={(v) => <span className="text-xs">{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2 + Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue vs Collections area chart */}
        <Card className="xl:col-span-2 p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Revenue vs Collections</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">12-month trend (₹ in thousands)</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}K`} />
              <Tooltip
                formatter={(v: number) => `₹${v}K`}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2563EB" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
              <Area type="monotone" dataKey="collected" stroke="#10b981" fill="url(#colGrad)" strokeWidth={2} name="Collected" />
              <Legend iconSize={8} formatter={(v) => <span className="text-xs">{v}</span>} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Dealers */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Top Dealers by Revenue</h2>
            <button onClick={() => navigate('/dealers')} className="text-xs text-blue-600 hover:text-blue-700">View all</button>
          </div>
          <div className="space-y-3">
            {topDealers.map((dealer, i) => {
              const maxRev = topDealers[0]?.totalRevenue || 1;
              const pct = (dealer.totalRevenue / maxRev) * 100;
              return (
                <div key={dealer.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{dealer.name}</p>
                      <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400 ml-2 flex-shrink-0">
                        {formatCurrency(dealer.totalRevenue)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                      <div
                        className="h-1.5 bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <Card className="xl:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Orders</h2>
            <button onClick={() => navigate('/orders')} className="text-xs text-blue-600 hover:text-blue-700">View all</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Order</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Dealer</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentOrders.map((order) => (
                <tr key={order.id} onClick={() => navigate('/orders')} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                  <td className="px-4 py-1.5">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{order.orderNumber}</span>
                  </td>
                  <td className="px-4 py-1.5">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{order.dealerName}</p>
                    <p className="text-[10px] text-slate-400">{order.dealerCity}</p>
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(order.grandTotal)}
                  </td>
                  <td className="px-4 py-1.5">{getOrderStatusBadge(order.orderStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Right column: Low Stock + Activity */}
        <div className="flex flex-col gap-4">
          {/* Low Stock Watchlist */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Low Stock Watchlist</h2>
              <AlertTriangle size={14} className="text-amber-500" />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...lowStockItems, ...outOfStockItems].slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.currentStock} / {p.reorderLevel} units</p>
                  </div>
                  <button
                    onClick={() => restockProduct(p.id, p.reorderLevel * 2, p.supplier, 'Quick restock from dashboard')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex-shrink-0 ml-2 flex items-center gap-0.5"
                  >
                    <RefreshCw size={10} />
                    Restock
                  </button>
                </div>
              ))}
              {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-500">All stock levels healthy!</div>
              )}
            </div>
          </Card>

          {/* Activity Timeline */}
          <Card className="overflow-hidden flex-1">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
              <Activity size={14} className="text-blue-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activities.slice(0, 5).map((act) => (
                <div key={act.id} className="px-4 py-2 flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    act.type === 'stock_low' ? 'bg-amber-500' :
                    act.type === 'order_created' ? 'bg-blue-500' :
                    act.type === 'payment_received' ? 'bg-emerald-500' :
                    act.type === 'order_shipped' ? 'bg-sky-500' :
                    'bg-slate-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{act.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{act.description}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatRelative(act.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
