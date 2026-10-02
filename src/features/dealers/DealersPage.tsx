import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Phone, Mail, TrendingUp, ShoppingCart, CreditCard, Star, Edit2, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useDealerStore } from '../../store/dealerStore';
import { useOrderStore } from '../../store/orderStore';
import type { Dealer, DealerTier } from '../../types';
import { Button, Badge, Card, clsx } from '../../components/ui';
import { Modal, Drawer, ConfirmDialog } from '../../components/overlays';
import { formatCurrency, formatDate } from '../../lib/formatters';

const TIER_COLORS: Record<DealerTier, string> = {
  Platinum: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Gold:     'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Silver:   'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  Standard: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

function TierBadge({ tier }: { tier: DealerTier }) {
  return <span className={clsx('px-2 py-0.5 rounded-md text-xs font-semibold', TIER_COLORS[tier])}>{tier}</span>;
}

// ─── Dealer Form Schema ────────────────────────────────────────────────────────

const dealerSchema = z.object({
  name: z.string().min(3, 'Name required'),
  contactPerson: z.string().min(2, 'Contact person required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Phone required'),
  gstin: z.string().min(15, 'Valid 15-char GSTIN required'),
  address: z.string().min(5, 'Address required'),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  pincode: z.string().length(6, '6-digit pincode'),
  tier: z.enum(['Platinum','Gold','Silver','Standard']),
  creditLimit: z.number({ coerce: true }).positive(),
  active: z.boolean().optional(),
});
type DealerFormData = z.infer<typeof dealerSchema>;

function DealerForm({ dealer, onSubmit, loading }: { dealer?: Dealer; onSubmit: (d: DealerFormData)=>void; loading: boolean }) {
  const { register, handleSubmit, formState:{ errors } } = useForm<DealerFormData>({
    resolver: zodResolver(dealerSchema),
    defaultValues: dealer ? {
      name: dealer.name, contactPerson: dealer.contactPerson, email: dealer.email,
      phone: dealer.phone, gstin: dealer.gstin, address: dealer.address,
      city: dealer.city, state: dealer.state, pincode: dealer.pincode,
      tier: dealer.tier, creditLimit: dealer.creditLimit,
    } : { state: 'Gujarat', tier: 'Standard', creditLimit: 300000 },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Name *</label>
          <input {...register('name')} className="mt-1 w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
          {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contact Person *</label>
          <input {...register('contactPerson')} className="mt-1 w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
          {errors.contactPerson && <p className="text-xs text-red-500 mt-0.5">{errors.contactPerson.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone *</label>
          <input {...register('phone')} className="mt-1 w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email *</label>
          <input type="email" {...register('email')} className="mt-1 w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
          {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email.message}</p>}
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">GSTIN *</label>
          <input {...register('gstin')} placeholder="24AAXXX1234X1Z5" className="mt-1 w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"/>
          {errors.gstin && <p className="text-xs text-red-500 mt-0.5">{errors.gstin.message}</p>}
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Address *</label>
          <input {...register('address')} className="mt-1 w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">City *</label>
          <input {...register('city')} className="mt-1 w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">State *</label>
          <input {...register('state')} className="mt-1 w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pincode *</label>
          <input {...register('pincode')} maxLength={6} className="mt-1 w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"/>
          {errors.pincode && <p className="text-xs text-red-500 mt-0.5">{errors.pincode.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tier</label>
          <select {...register('tier')} className="mt-1 w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
            {['Platinum','Gold','Silver','Standard'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Credit Limit (₹) *</label>
          <input type="number" {...register('creditLimit',{valueAsNumber:true})} className="mt-1 w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
          {errors.creditLimit && <p className="text-xs text-red-500 mt-0.5">{errors.creditLimit.message}</p>}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>{dealer ? 'Update Dealer' : 'Add Dealer'}</Button>
      </div>
    </form>
  );
}

// ─── Dealer Detail Drawer ─────────────────────────────────────────────────────

function DealerDetailDrawer({ dealer, open, onClose }: { dealer: Dealer|null; open: boolean; onClose: ()=>void }) {
  const orders = useOrderStore(s => s.orders);
  const dealerOrders = useMemo(() => orders.filter(o => o.dealerId === dealer?.id).slice(0,10), [orders, dealer]);
  if (!dealer) return null;
  const outstanding = dealer.creditLimit - dealer.outstandingBalance;
  const utilization = dealer.creditLimit > 0 ? (dealer.outstandingBalance / dealer.creditLimit) * 100 : 0;

  return (
    <Drawer open={open} onClose={onClose} title={dealer.name} width="560px">
      <div className="space-y-5">
        {/* Header info */}
        <div className="flex items-start justify-between">
          <div>
            <TierBadge tier={dealer.tier}/>
            <p className="text-sm text-slate-500 mt-1">{dealer.contactPerson}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${dealer.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {dealer.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-slate-500">Phone</p><p className="font-medium">{dealer.phone}</p></div>
          <div><p className="text-xs text-slate-500">Email</p><p className="font-medium truncate">{dealer.email}</p></div>
          <div className="col-span-2"><p className="text-xs text-slate-500">Address</p><p className="font-medium">{dealer.address}, {dealer.city}, {dealer.state} – {dealer.pincode}</p></div>
          <div className="col-span-2"><p className="text-xs text-slate-500">GSTIN</p><p className="font-mono font-semibold text-blue-600 dark:text-blue-400">{dealer.gstin}</p></div>
        </div>

        {/* Credit */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Credit & Financial</h3>
          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div><p className="text-xs text-slate-500">Credit Limit</p><p className="font-bold tabular-nums">{formatCurrency(dealer.creditLimit)}</p></div>
            <div><p className="text-xs text-slate-500">Outstanding</p><p className="font-bold text-red-500 tabular-nums">{formatCurrency(dealer.outstandingBalance)}</p></div>
            <div><p className="text-xs text-slate-500">Available</p><p className="font-bold text-emerald-600 tabular-nums">{formatCurrency(outstanding)}</p></div>
            <div><p className="text-xs text-slate-500">Total Revenue</p><p className="font-bold text-blue-600 tabular-nums">{formatCurrency(dealer.totalRevenue)}</p></div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Credit Utilization</span>
              <span>{utilization.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full">
              <div className={clsx('h-2 rounded-full transition-all', utilization>80?'bg-red-500':utilization>50?'bg-amber-500':'bg-emerald-500')} style={{width:`${Math.min(100,utilization)}%`}}/>
            </div>
          </div>
        </div>

        {/* Recent orders */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Order History</h3>
          {dealerOrders.length === 0 ? <p className="text-xs text-slate-500 text-center py-4">No orders yet</p> : (
            <div className="space-y-2">
              {dealerOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{o.orderNumber}</p>
                    <p className="text-[10px] text-slate-400">{formatDate(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold tabular-nums">{formatCurrency(o.grandTotal)}</p>
                    <Badge variant={o.orderStatus==='Delivered'?'emerald':o.orderStatus==='Cancelled'?'red':'amber'} size="sm">{o.orderStatus}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

// ─── Dealers Page ─────────────────────────────────────────────────────────────

export default function DealersPage() {
  const { dealers, addDealer, updateDealer, deleteDealer } = useDealerStore();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editDealer, setEditDealer] = useState<Dealer|null>(null);
  const [detailDealer, setDetailDealer] = useState<Dealer|null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Dealer|null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return dealers;
    const q = search.toLowerCase();
    return dealers.filter(d =>
      d.name.toLowerCase().includes(q) || d.city.toLowerCase().includes(q) ||
      d.contactPerson.toLowerCase().includes(q)
    );
  }, [dealers, search]);

  const handleAdd = async (data: DealerFormData) => {
    setFormLoading(true);
    await new Promise(r => setTimeout(r,500));
    addDealer({ ...data, active: true, outstandingBalance: 0 });
    toast.success('Dealer added successfully');
    setFormLoading(false);
    setShowAdd(false);
  };

  const handleEdit = async (data: DealerFormData) => {
    if (!editDealer) return;
    setFormLoading(true);
    await new Promise(r => setTimeout(r,500));
    updateDealer(editDealer.id, data);
    toast.success('Dealer updated');
    setFormLoading(false);
    setEditDealer(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    deleteDealer(deleteTarget.id);
    toast.success('Dealer removed');
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Dealers Directory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{dealers.length} registered dealers across Gujarat</p>
        </div>
        <Button leftIcon={<Plus size={14}/>} onClick={() => setShowAdd(true)}>Add Dealer</Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dealers…" className="w-full pl-9 pr-3 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(dealer => {
          const utilization = dealer.creditLimit > 0 ? (dealer.outstandingBalance / dealer.creditLimit) * 100 : 0;
          return (
            <Card key={dealer.id} hoverable onClick={() => setDetailDealer(dealer)} className={clsx("p-4", utilization >= 90 && "border-red-400 dark:border-red-500/50")}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{dealer.name}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={11} className="text-slate-400"/>
                    <p className="text-xs text-slate-500">{dealer.city}, {dealer.state}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <TierBadge tier={dealer.tier}/>
                  {utilization >= 90 && <Badge variant="red" size="sm">Credit Risk</Badge>}
                </div>
              </div>

              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Phone size={11}/> {dealer.phone}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Mail size={11}/> {dealer.email}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Orders</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{dealer.totalOrders}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Revenue</p>
                  <p className="text-xs font-bold tabular-nums text-blue-600">{formatCurrency(dealer.totalRevenue)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Outstanding</p>
                  <p className="text-xs font-bold tabular-nums text-red-500">{formatCurrency(dealer.outstandingBalance)}</p>
                </div>
              </div>

              {/* Credit bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Credit: {formatCurrency(dealer.outstandingBalance)} / {formatCurrency(dealer.creditLimit)}</span>
                  <span>{utilization.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <div className={clsx('h-1.5 rounded-full', utilization>80?'bg-red-500':utilization>50?'bg-amber-500':'bg-emerald-500')} style={{width:`${Math.min(100,utilization)}%`}}/>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="xs" leftIcon={<Edit2 size={11}/>} onClick={() => setEditDealer(dealer)}>Edit</Button>
                <Button variant="ghost" size="xs" leftIcon={<Trash2 size={11}/>} onClick={() => setDeleteTarget(dealer)} className="text-red-500 hover:text-red-600 hover:bg-red-50">Delete</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Dealer" size="lg">
        <DealerForm onSubmit={handleAdd} loading={formLoading}/>
      </Modal>
      <Modal open={!!editDealer} onClose={() => setEditDealer(null)} title="Edit Dealer" size="lg">
        {editDealer && <DealerForm dealer={editDealer} onSubmit={handleEdit} loading={formLoading}/>}
      </Modal>
      <DealerDetailDrawer dealer={detailDealer} open={!!detailDealer} onClose={() => setDetailDealer(null)}/>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Remove Dealer" description={`Remove ${deleteTarget?.name} from dealer network?`} confirmLabel="Remove Dealer"/>
    </div>
  );
}
