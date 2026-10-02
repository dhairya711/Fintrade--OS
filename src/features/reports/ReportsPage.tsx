import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryStore } from '../../store/inventoryStore';
import { useOrderStore } from '../../store/orderStore';
import { useDealerStore } from '../../store/dealerStore';
import { useInvoiceStore } from '../../store/invoiceStore';
import { Card, Tabs, clsx } from '../../components/ui';
import { Button } from '../../components/ui';
import { Table } from '../../components/Table';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { useAuditStore } from '../../store/auditStore';
import { Shield, Eye } from 'lucide-react';

const COLORS = ['#2563EB','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

function exportCSV(rows: (string|number)[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
  toast.success(`${filename} exported`);
}

// ─── Sales by Category ─────────────────────────────────────────────────────────

function CategoryReport() {
  const orders = useOrderStore(s => s.orders);
  const data = useMemo(() => {
    const map: Record<string, number> = {};
    orders.filter(o => o.orderStatus !== 'Cancelled').forEach(o => {
      o.lineItems.forEach(li => {
        // Get category from product name approximation
        const parts = li.sku.split('-');
        const cat = parts[1] || 'Other';
        const catMap: Record<string,string> = { SW:'Switchgears', FS:'Fuses', TR:'Transformers', MC:'MCBs', MB:'MCCBs', CP:'Components', CT:'Contactors', RL:'Relays', BB:'Bus Bars', CL:'Cable Lugs', TM:'Timers', MT:'Meters' };
        const label = catMap[cat] || cat;
        map[label] = (map[label] || 0) + li.lineTotal;
      });
    });
    return Object.entries(map).sort((a,b) => b[1]-a[1]).map(([name,value]) => ({ name, value: Math.round(value) }));
  }, [orders]);

  const exportFn = () => exportCSV(
    [['Category','Revenue'], ...data.map(d => [d.name, d.value])],
    'sales-by-category.csv'
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="outline" size="sm" leftIcon={<Download size={13}/>} onClick={exportFn}>Export CSV</Button></div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" barSize={18}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
              <XAxis type="number" tick={{fontSize:10}} tickFormatter={v => `${(v/100000).toFixed(0)}L`}/>
              <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={80}/>
              <Tooltip formatter={(v:number) => formatCurrency(v)} contentStyle={{fontSize:12,borderRadius:8}}/>
              <Bar dataKey="value" radius={[0,4,4,0]}>
                {data.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Category</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Revenue</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((d,i) => {
                const total = data.reduce((s,x) => s+x.value, 0);
                return (
                  <tr key={d.name} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-4 py-2.5 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{background: COLORS[i%COLORS.length]}}/>
                      <span className="text-sm">{d.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatCurrency(d.value)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{((d.value/total)*100).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// ─── Sales by Dealer ──────────────────────────────────────────────────────────

function DealerReport() {
  const orders = useOrderStore(s => s.orders);
  const dealers = useDealerStore(s => s.dealers);
  const data = useMemo(() => {
    return dealers.map(d => ({
      name: d.name,
      city: d.city,
      orders: orders.filter(o => o.dealerId === d.id && o.orderStatus !== 'Cancelled').length,
      revenue: orders.filter(o => o.dealerId === d.id && o.orderStatus !== 'Cancelled').reduce((s,o) => s+o.grandTotal, 0),
      outstanding: d.outstandingBalance,
    })).sort((a,b) => b.revenue - a.revenue);
  }, [orders, dealers]);

  const exportFn = () => exportCSV(
    [['Dealer','City','Orders','Revenue','Outstanding'], ...data.map(d => [d.name,d.city,d.orders,d.revenue,d.outstanding])],
    'sales-by-dealer.csv'
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="outline" size="sm" leftIcon={<Download size={13}/>} onClick={exportFn}>Export CSV</Button></div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Top Dealers by Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.slice(0,8)} layout="vertical" barSize={18}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
              <XAxis type="number" tick={{fontSize:10}} tickFormatter={v => `${(v/100000).toFixed(0)}L`}/>
              <YAxis type="category" dataKey="name" tick={{fontSize:9}} width={120}/>
              <Tooltip formatter={(v:number) => formatCurrency(v)} contentStyle={{fontSize:12,borderRadius:8}}/>
              <Bar dataKey="revenue" fill="#2563EB" radius={[0,4,4,0]} name="Revenue"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Dealer</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Orders</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Revenue</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map(d => (
                <tr key={d.name} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-2.5"><p className="text-sm font-medium">{d.name}</p><p className="text-xs text-slate-400">{d.city}</p></td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{d.orders}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatCurrency(d.revenue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-red-500">{formatCurrency(d.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// ─── Stock Valuation ──────────────────────────────────────────────────────────

function StockValuationReport() {
  const products = useInventoryStore(s => s.products);
  const data = useMemo(() =>
    products.map(p => ({
      sku: p.sku, name: p.name, category: p.category,
      stock: p.currentStock, price: p.wholesalePrice,
      value: p.currentStock * p.wholesalePrice,
    })).sort((a,b) => b.value-a.value)
  , [products]);

  const total = data.reduce((s,d) => s+d.value, 0);
  const exportFn = () => exportCSV(
    [['SKU','Product','Category','Stock','Rate','Value'], ...data.map(d => [d.sku,d.name,d.category,d.stock,d.price,d.value])],
    'stock-valuation.csv'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <p className="text-xs text-slate-500">Total Stock Value</p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400 tabular-nums">{formatCurrency(total)}</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Download size={13}/>} onClick={exportFn}>Export CSV</Button>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
            <tr>
              {['SKU','Product','Category','Stock','Rate','Value'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 first:rounded-tl-xl last:rounded-tr-xl">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map(d => (
              <tr key={d.sku} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                <td className="px-4 py-2.5 font-mono text-xs text-blue-600 dark:text-blue-400">{d.sku}</td>
                <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">{d.name}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{d.category}</td>
                <td className="px-4 py-2.5 tabular-nums text-right">{d.stock.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 tabular-nums text-right">{formatCurrency(d.price)}</td>
                <td className="px-4 py-2.5 tabular-nums text-right font-bold text-emerald-600">{formatCurrency(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── GST Summary ──────────────────────────────────────────────────────────────

function GstSummaryReport() {
  const invoices = useInvoiceStore(s => s.invoices);
  const months = useMemo(() => {
    return Array.from({length:6},(_,i) => {
      const d = subMonths(new Date(), 5-i);
      const interval = { start: startOfMonth(d), end: endOfMonth(d) };
      const monthInvoices = invoices.filter(inv => isWithinInterval(parseISO(inv.createdAt), interval));
      const taxable = monthInvoices.reduce((s,inv) => s+inv.taxableAmount, 0);
      const cgst = monthInvoices.reduce((s,inv) => s+inv.totalCgst, 0);
      const sgst = monthInvoices.reduce((s,inv) => s+inv.totalSgst, 0);
      const igst = monthInvoices.reduce((s,inv) => s+inv.totalIgst, 0);
      return { month: format(d,'MMM yy'), taxable, cgst, sgst, igst, total: cgst+sgst+igst };
    });
  }, [invoices]);

  const exportFn = () => exportCSV(
    [['Month','Taxable','CGST','SGST','IGST','Total Tax'], ...months.map(m => [m.month,m.taxable,m.cgst,m.sgst,m.igst,m.total])],
    'gst-summary.csv'
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="outline" size="sm" leftIcon={<Download size={13}/>} onClick={exportFn}>Export CSV</Button></div>
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Monthly GST Summary</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={months} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="month" tick={{fontSize:11}}/>
            <YAxis tick={{fontSize:10}} tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
            <Tooltip formatter={(v:number) => formatCurrency(v)} contentStyle={{fontSize:12,borderRadius:8}}/>
            <Bar dataKey="cgst" fill="#2563EB" name="CGST" stackId="tax"/>
            <Bar dataKey="sgst" fill="#10b981" name="SGST" stackId="tax"/>
            <Bar dataKey="igst" fill="#f59e0b" name="IGST" stackId="tax" radius={[3,3,0,0]}/>
            <Legend iconSize={8} formatter={v => <span className="text-xs">{v}</span>}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {['Month','Taxable Value','CGST 9%','SGST 9%','IGST 18%','Total Tax'].map(h => (
                <th key={h} className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 first:text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {months.map(m => (
              <tr key={m.month} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                <td className="px-4 py-2.5 font-semibold">{m.month}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(m.taxable)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(m.cgst)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(m.sgst)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(m.igst)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-blue-700 dark:text-blue-400">{formatCurrency(m.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

function AuditLogReport() {
  const logs = useAuditStore(s => s.logs);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;
    const q = searchTerm.toLowerCase();
    return logs.filter(l => 
      l.user.toLowerCase().includes(q) || 
      l.action.toLowerCase().includes(q) || 
      l.entity.toLowerCase().includes(q) ||
      l.hash.toLowerCase().includes(q)
    );
  }, [logs, searchTerm]);
  
  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATED': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
      case 'UPDATED': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'DELETED': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'APPROVED': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      default: return 'text-slate-600 bg-slate-50 dark:bg-slate-800';
    }
  };

  const exportFn = () => exportCSV(
    [['ID','Timestamp','User','Role','Action','Entity','IP Address','Details'], ...logs.map(l => [l.id, l.timestamp, l.user, l.role, l.action, l.entity, l.ipAddress, l.details])],
    'system-audit-log.csv'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Shield size={16} className="text-blue-600" />
          <span>Immutable System Audit Trail</span>
        </div>
        <div className="flex items-center gap-3">
          <input 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filter by user, action, hash..." 
            className="h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-slate-500 w-64"
          />
          <Button variant="outline" size="sm" leftIcon={<Download size={13}/>} onClick={exportFn}>Export Log</Button>
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Timestamp</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">User / IP</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Action</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Entity</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Checksum (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.slice(0, 100).map(l => (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <p className="font-medium text-slate-700 dark:text-slate-300">{format(parseISO(l.timestamp), 'dd MMM yyyy')}</p>
                    <p className="text-xs text-slate-400">{format(parseISO(l.timestamp), 'HH:mm:ss')}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium flex items-center gap-1.5">{l.user} <span className="text-[10px] px-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">{l.role}</span></p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{l.ipAddress}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={clsx('px-2 py-0.5 rounded text-xs font-bold', getActionColor(l.action))}>
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium">{l.entity}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col">
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded truncate max-w-[150px]" title={l.hash}>
                        0x{l.hash.substring(0, 16)}...
                      </span>
                      <span className="text-xs text-slate-500 truncate max-w-[150px]" title={l.details}>
                        {l.details}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Reports Page ─────────────────────────────────────────────────────────────

const REPORT_TABS = [
  { id:'category', label:'Sales by Category' },
  { id:'dealer', label:'Sales by Dealer' },
  { id:'stock', label:'Stock Valuation' },
  { id:'gst', label:'GST Summary' },
  { id:'audit', label:'System Audit Log' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('category');

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Business intelligence for FinTrade OS Ltd.</p>
      </div>

      <Card className="overflow-visible">
        <Tabs tabs={REPORT_TABS} activeTab={activeTab} onChange={setActiveTab} className="px-4"/>
        <div className="p-5">
          {activeTab === 'category' && <CategoryReport/>}
          {activeTab === 'dealer' && <DealerReport/>}
          {activeTab === 'stock' && <StockValuationReport/>}
          {activeTab === 'gst' && <GstSummaryReport/>}
          {activeTab === 'audit' && <AuditLogReport/>}
        </div>
      </Card>
    </div>
  );
}
