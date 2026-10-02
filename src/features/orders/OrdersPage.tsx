import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Download, Eye, FileText, Truck, X,
  CheckCircle, Circle, Package, ChevronRight, RefreshCw
} from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useOrderStore } from '../../store/orderStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useDealerStore } from '../../store/dealerStore';
import { useInvoiceStore } from '../../store/invoiceStore';
import { useActivityStore } from '../../store/uiStore';
import type { Order, OrderStatus, OrderLineItem } from '../../types';
import { Button, Badge, Card, Tabs, clsx } from '../../components/ui';
import { Modal, Drawer, ConfirmDialog } from '../../components/overlays';
import { Table, Pagination } from '../../components/Table';
import { formatCurrency, formatDate, generateId, generateInvoiceNumber } from '../../lib/formatters';
import { isIntraState, calcLineItemTaxable } from '../../lib/gst';

// ─── Status helpers ────────────────────────────────────────────────────────────

const ORDER_STATUSES: OrderStatus[] = ['Pending','Confirmed','Packed','Dispatched','Delivered','Cancelled'];

function getOrderBadge(status: OrderStatus) {
  const cfg: Record<OrderStatus, { variant: 'amber'|'sky'|'indigo'|'emerald'|'red'|'slate'; }> = {
    Pending:   { variant: 'amber' },
    Confirmed: { variant: 'sky' },
    Packed:    { variant: 'indigo' },
    Dispatched:{ variant: 'sky' },
    Delivered: { variant: 'emerald' },
    Cancelled: { variant: 'red' },
  };
  return <Badge variant={cfg[status]?.variant ?? 'slate'} dot>{status}</Badge>;
}

function getPaymentBadge(status: string) {
  const cfg: Record<string,string> = { Paid:'emerald', Partial:'amber', Unpaid:'slate', Overdue:'red' };
  return <Badge variant={(cfg[status] ?? 'slate') as 'emerald'|'amber'|'slate'|'red'} dot>{status}</Badge>;
}

// ─── Fulfillment Stepper ───────────────────────────────────────────────────────

function FulfillmentStepper({ current }: { current: OrderStatus }) {
  const steps: OrderStatus[] = ['Pending','Confirmed','Packed','Dispatched','Delivered'];
  const currentIdx = steps.indexOf(current);
  if (current === 'Cancelled') return (
    <div className="flex items-center gap-2 py-3">
      <Badge variant="red" dot>Order Cancelled</Badge>
    </div>
  );
  return (
    <div className="flex items-center gap-1 py-3">
      {steps.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center gap-1 text-center">
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
              i < currentIdx ? 'bg-emerald-500 text-white' :
              i === currentIdx ? 'bg-blue-600 text-white ring-2 ring-blue-200' :
              'bg-slate-200 dark:bg-slate-700 text-slate-400'
            )}>
              {i < currentIdx ? <CheckCircle size={14}/> : i+1}
            </div>
            <span className={clsx('text-[10px] font-medium whitespace-nowrap',
              i === currentIdx ? 'text-blue-600' :
              i < currentIdx ? 'text-emerald-600' : 'text-slate-400'
            )}>{step}</span>
          </div>
          {i < steps.length-1 && (
            <div className={clsx('flex-1 h-0.5 mb-4',
              i < currentIdx ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'
            )}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Order Detail Drawer ───────────────────────────────────────────────────────

function OrderDetailDrawer({ order, open, onClose, onGenerateInvoice, onUpdateShipping }:
  { order: Order|null; open: boolean; onClose: ()=>void; onGenerateInvoice: (o: Order)=>void; onUpdateShipping: (o: Order)=>void }) {
  if (!order) return null;
  return (
    <Drawer open={open} onClose={onClose} title={`Order: ${order.orderNumber}`} width="580px">
      <div className="space-y-5">
        <FulfillmentStepper current={order.orderStatus} />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-slate-500">Dealer</p><p className="font-semibold text-slate-900 dark:text-slate-100">{order.dealerName}</p></div>
          <div><p className="text-xs text-slate-500">City</p><p className="font-medium">{order.dealerCity}, {order.dealerState}</p></div>
          <div><p className="text-xs text-slate-500">Order Date</p><p className="font-medium">{formatDate(order.createdAt)}</p></div>
          <div><p className="text-xs text-slate-500">Payment</p><div className="mt-0.5">{getPaymentBadge(order.paymentStatus)}</div></div>
          {order.shippingInfo?.transporter && <>
            <div><p className="text-xs text-slate-500">Transporter</p><p className="font-medium">{order.shippingInfo.transporter}</p></div>
            <div><p className="text-xs text-slate-500">LR Number</p><p className="font-mono font-medium">{order.shippingInfo.lrNumber}</p></div>
          </>}
          {order.notes && <div className="col-span-2"><p className="text-xs text-slate-500">Notes</p><p className="text-sm">{order.notes}</p></div>}
        </div>

        {/* Line items */}
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Line Items</h3>
          <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Product</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">Rate</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">Disc%</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">GST</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.lineItems.map((li) => (
                  <tr key={li.id} className="bg-white dark:bg-slate-900">
                    <td className="px-3 py-2 max-w-[180px]">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{li.productName}</p>
                      <p className="text-slate-400 font-mono">{li.sku}</p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{li.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(li.unitPrice)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{li.discount}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{li.gstRate}%</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatCurrency(li.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="tabular-nums">{formatCurrency(order.subtotal)}</span></div>
          {order.totalDiscount > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span className="tabular-nums">−{formatCurrency(order.totalDiscount)}</span></div>}
          <div className="flex justify-between"><span className="text-slate-500">Taxable Amount</span><span className="tabular-nums">{formatCurrency(order.taxableAmount)}</span></div>
          {order.totalCgst > 0 && <><div className="flex justify-between"><span className="text-slate-500">CGST (9%)</span><span className="tabular-nums">{formatCurrency(order.totalCgst)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">SGST (9%)</span><span className="tabular-nums">{formatCurrency(order.totalSgst)}</span></div></>}
          {order.totalIgst > 0 && <div className="flex justify-between"><span className="text-slate-500">IGST (18%)</span><span className="tabular-nums">{formatCurrency(order.totalIgst)}</span></div>}
          <div className="h-px bg-slate-200 dark:bg-slate-700 my-1"/>
          <div className="flex justify-between font-bold text-base"><span>Grand Total</span><span className="tabular-nums text-blue-700 dark:text-blue-400">{formatCurrency(order.grandTotal)}</span></div>
          <div className="flex justify-between text-emerald-600"><span className="text-sm">Paid</span><span className="tabular-nums text-sm">{formatCurrency(order.paidAmount)}</span></div>
          {order.grandTotal - order.paidAmount > 0 && (
            <div className="flex justify-between text-red-500"><span className="text-sm">Outstanding</span><span className="tabular-nums text-sm">{formatCurrency(order.grandTotal - order.paidAmount)}</span></div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FileText size={14}/>}
            onClick={() => onGenerateInvoice(order)}
            disabled={!!order.invoiceId}
            className="flex-1"
          >
            {order.invoiceId ? 'Invoice Generated' : 'Generate GST Invoice'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Truck size={14}/>}
            onClick={() => onUpdateShipping(order)}
            disabled={order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled'}
            className="flex-1"
          >
            Update Shipping
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

// ─── Shipping Update Modal ────────────────────────────────────────────────────

const shippingSchema = z.object({
  status: z.string().min(1),
  transporter: z.string().min(1,'Transporter required'),
  lrNumber: z.string().min(1,'LR Number required'),
  expectedDelivery: z.string().min(1,'Expected delivery required'),
  trackingNote: z.string().optional(),
});
type ShippingFormData = z.infer<typeof shippingSchema>;

function ShippingModal({ order, open, onClose }:{ order: Order|null; open: boolean; onClose: ()=>void }) {
  const { updateOrderStatus } = useOrderStore();
  const { addActivity } = useActivityStore();
  const { register, handleSubmit, formState:{ errors } } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      status: order?.orderStatus || 'Confirmed',
      transporter: order?.shippingInfo?.transporter || '',
      lrNumber: order?.shippingInfo?.lrNumber || '',
      expectedDelivery: order?.shippingInfo?.expectedDelivery || '',
      trackingNote: '',
    },
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: ShippingFormData) => {
    if (!order) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    updateOrderStatus(order.id, data.status as OrderStatus, {
      transporter: data.transporter,
      lrNumber: data.lrNumber,
      expectedDelivery: data.expectedDelivery,
      trackingNote: data.trackingNote,
      updatedAt: new Date().toISOString(),
    });
    addActivity({
      type: 'order_shipped',
      title: 'Shipping Updated',
      description: `${order.orderNumber} → ${data.status} via ${data.transporter} LR#${data.lrNumber}`,
      referenceId: order.id,
      referenceType: 'ORDER',
      createdBy: 'Vrund Doshi',
    });
    toast.success(`Order ${order.orderNumber} updated to ${data.status}`);
    setLoading(false);
    onClose();
  };

  const statusOpts = ORDER_STATUSES.filter(s => s !== 'Cancelled').map(s => ({ value: s, label: s }));

  return (
    <Modal open={open} onClose={onClose} title="Update Shipping Status" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fulfillment Status *</label>
          <select {...register('status')} className="mt-1 w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Transporter *</label>
          <input {...register('transporter')} className="mt-1 w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. VRL Logistics"/>
          {errors.transporter && <p className="text-xs text-red-500 mt-0.5">{errors.transporter.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">LR Number *</label>
          <input {...register('lrNumber')} className="mt-1 w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="LR20261234"/>
          {errors.lrNumber && <p className="text-xs text-red-500 mt-0.5">{errors.lrNumber.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Expected Delivery *</label>
          <input type="date" {...register('expectedDelivery')} className="mt-1 w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Note</label>
          <textarea {...register('trackingNote')} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} placeholder="Optional tracking note..."/>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} leftIcon={<Truck size={14}/>}>Update Status</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── New Order Modal ──────────────────────────────────────────────────────────

const newOrderSchema = z.object({
  dealerId: z.string().min(1, 'Select a dealer'),
  notes: z.string().optional(),
  lineItems: z.array(z.object({
    productId: z.string().min(1,'Select product'),
    quantity: z.number({ coerce: true }).min(1,'Min 1'),
    discount: z.number({ coerce: true }).min(0).max(100),
  })).min(1,'Add at least one item'),
});
type NewOrderFormData = z.infer<typeof newOrderSchema>;

function NewOrderModal({ open, onClose }: { open: boolean; onClose: ()=>void }) {
  const { addOrder, getNextOrderNumber } = useOrderStore();
  const { products, reserveStock } = useInventoryStore();
  const { dealers } = useDealerStore();
  const { addActivity, addNotification } = useActivityStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, watch, formState:{ errors } } = useForm<NewOrderFormData>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: { dealerId: '', lineItems: [{ productId:'', quantity:1, discount:0 }], notes:'' },
  });
  const { fields, append, remove } = useFieldArray({ control, name:'lineItems' });
  const watched = watch();

  const dealer = dealers.find(d => d.id === watched.dealerId);
  const intraState = dealer ? isIntraState(dealer.state) : true;

  const computedItems = watched.lineItems.map(li => {
    const prod = products.find(p => p.id === li.productId);
    if (!prod) return null;
    const taxable = calcLineItemTaxable(li.quantity || 0, prod.wholesalePrice, li.discount || 0);
    const gstAmt = taxable * 0.18;
    return { ...li, prod, taxable, gstAmt, total: taxable + gstAmt };
  });

  const grandTotal = computedItems.reduce((s, ci) => s + (ci?.total || 0), 0);

  const onSubmit = async (data: NewOrderFormData) => {
    const d = dealers.find(d => d.id === data.dealerId)!;
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));

    const intra = isIntraState(d.state);
    const lineItems: OrderLineItem[] = data.lineItems.map(li => {
      const prod = products.find(p => p.id === li.productId)!;
      const taxable = calcLineItemTaxable(li.quantity, prod.wholesalePrice, li.discount);
      const gstAmt = taxable * 0.18;
      return {
        id: generateId('li'),
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        hsn: prod.hsn,
        quantity: li.quantity,
        unitPrice: prod.wholesalePrice,
        discount: li.discount,
        taxableAmount: taxable,
        gstRate: 18,
        cgst: intra ? gstAmt/2 : 0,
        sgst: intra ? gstAmt/2 : 0,
        igst: intra ? 0 : gstAmt,
        lineTotal: taxable + gstAmt,
      };
    });

    // Reserve stock
    for (const li of data.lineItems) {
      reserveStock(li.productId, li.quantity, 'new-order');
    }

    const subtotal = lineItems.reduce((s,l) => s + l.quantity*l.unitPrice, 0);
    const totalDiscount = lineItems.reduce((s,l) => s + (l.quantity*l.unitPrice*l.discount/100), 0);
    const taxableAmount = lineItems.reduce((s,l) => s + l.taxableAmount, 0);
    const totalCgst = lineItems.reduce((s,l) => s + l.cgst, 0);
    const totalSgst = lineItems.reduce((s,l) => s + l.sgst, 0);
    const totalIgst = lineItems.reduce((s,l) => s + l.igst, 0);
    const grandTotal = taxableAmount + totalCgst + totalSgst + totalIgst;

    const orderNum = getNextOrderNumber();
    const order = addOrder({
      orderNumber: orderNum,
      dealerId: d.id,
      dealerName: d.name,
      dealerCity: d.city,
      dealerState: d.state,
      lineItems,
      subtotal,
      totalDiscount,
      taxableAmount,
      totalCgst,
      totalSgst,
      totalIgst,
      grandTotal,
      orderStatus: 'Pending',
      paymentStatus: 'Unpaid',
      paidAmount: 0,
      notes: data.notes,
    });

    addActivity({
      type: 'order_created',
      title: 'New Order Created',
      description: `${orderNum} placed for ${d.name} – ${formatCurrency(grandTotal)}`,
      referenceId: order.id,
      referenceType: 'ORDER',
      createdBy: 'Vrund Doshi',
    });
    addNotification({
      type: 'new_order',
      title: 'New Order Placed',
      message: `${orderNum} from ${d.name} – ${formatCurrency(grandTotal)}`,
      referenceId: order.id,
    });

    toast.success(`Order ${orderNum} created successfully!`);
    setLoading(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New B2B Order" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Dealer selection */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Dealer *</label>
          <select {...register('dealerId')} className="mt-1 w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Select Dealer —</option>
            {dealers.filter(d => d.active).map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.city})</option>
            ))}
          </select>
          {errors.dealerId && <p className="text-xs text-red-500 mt-0.5">{errors.dealerId.message}</p>}
          {dealer && (
            <p className="text-xs text-slate-500 mt-1">
              GST: {intraState ? 'Intra-State (CGST+SGST 9%+9%)' : 'Inter-State (IGST 18%)'}
              &nbsp;| Credit Limit: {formatCurrency(dealer.creditLimit)}
            </p>
          )}
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Line Items *</label>
            <Button type="button" variant="outline" size="xs" leftIcon={<Plus size={12}/>} onClick={() => append({ productId:'', quantity:1, discount:0 })}>
              Add Item
            </Button>
          </div>
          {errors.lineItems && <p className="text-xs text-red-500 mb-2">{errors.lineItems.message as string}</p>}

          <div className="space-y-2">
            {fields.map((field, i) => {
              const ci = computedItems[i];
              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="col-span-5">
                    <select {...register(`lineItems.${i}.productId`)} className="w-full h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— Product —</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stock: {p.currentStock})</option>
                      ))}
                    </select>
                    {ci?.prod && <p className="text-[10px] text-slate-400 mt-0.5">MOQ: {ci.prod.moq} | Price: {formatCurrency(ci.prod.wholesalePrice)}</p>}
                  </div>
                  <div className="col-span-2">
                    <input type="number" min={1} {...register(`lineItems.${i}.quantity`, { valueAsNumber: true })} className="w-full h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Qty"/>
                  </div>
                  <div className="col-span-2">
                    <input type="number" min={0} max={100} step={0.5} {...register(`lineItems.${i}.discount`, { valueAsNumber: true })} className="w-full h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Disc%"/>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                      {ci ? formatCurrency(ci.total) : '—'}
                    </span>
                    {ci && <p className="text-[10px] text-slate-400">GST: {formatCurrency(ci.gstAmt)}</p>}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button type="button" onClick={() => remove(i)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                      <X size={14}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grand total preview */}
        {grandTotal > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Order Total (incl. GST)</span>
            <span className="text-lg font-bold tabular-nums text-blue-700 dark:text-blue-400">{formatCurrency(grandTotal)}</span>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
          <textarea {...register('notes')} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} placeholder="Optional notes..."/>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} leftIcon={<Plus size={14}/>}>Create Order</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Orders Page ──────────────────────────────────────────────────────────────

const TABS = [
  { id:'all', label:'All Orders' },
  { id:'Pending', label:'Pending' },
  { id:'Dispatched', label:'Dispatched' },
  { id:'Delivered', label:'Delivered' },
  { id:'Cancelled', label:'Cancelled' },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { orders, cancelOrder } = useOrderStore();
  const { addOrder } = useOrderStore();
  const { invoices, addInvoice, getNextInvoiceNumber } = useInvoiceStore();
  const { dealers } = useDealerStore();
  const { addActivity } = useActivityStore();
  const { updateOrder } = useOrderStore();

  const [activeTab, setActiveTab] = useState(searchParams.get('status') || 'all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [detailOrder, setDetailOrder] = useState<Order|null>(null);
  const [shippingOrder, setShippingOrder] = useState<Order|null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order|null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);

  const filtered = useMemo(() => {
    let data = [...orders];
    if (activeTab !== 'all') data = data.filter(o => o.orderStatus === activeTab);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.dealerName.toLowerCase().includes(q) ||
        o.dealerCity.toLowerCase().includes(q)
      );
    }
    data.sort((a,b) => {
      const av = a[sortKey as keyof Order] as string|number;
      const bv = b[sortKey as keyof Order] as string|number;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir==='asc' ? av-bv : bv-av;
      return sortDir==='asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return data;
  }, [orders, activeTab, search, sortKey, sortDir]);

  const paginated = filtered.slice((page-1)*pageSize, page*pageSize);

  const tabs = TABS.map(t => ({
    ...t,
    count: t.id === 'all' ? orders.length : orders.filter(o => o.orderStatus === t.id).length,
  }));

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d==='asc'?'desc':'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  const handleGenerateInvoice = async (order: Order) => {
    if (order.invoiceId) { toast.error('Invoice already exists'); return; }
    const dealer = dealers.find(d => d.id === order.dealerId);
    if (!dealer) return;
    const invNum = getNextInvoiceNumber();
    const invoice = addInvoice({
      invoiceNumber: invNum,
      orderId: order.id,
      dealerId: dealer.id,
      dealerName: dealer.name,
      dealerGstin: dealer.gstin,
      dealerAddress: dealer.address,
      dealerCity: dealer.city,
      dealerState: dealer.state,
      lineItems: order.lineItems,
      subtotal: order.subtotal,
      totalDiscount: order.totalDiscount,
      taxableAmount: order.taxableAmount,
      totalCgst: order.totalCgst,
      totalSgst: order.totalSgst,
      totalIgst: order.totalIgst,
      roundOff: parseFloat((Math.round(order.grandTotal) - order.grandTotal).toFixed(2)),
      grandTotal: Math.round(order.grandTotal),
      paidAmount: order.paidAmount,
      status: order.paidAmount >= order.grandTotal ? 'Paid' : order.paidAmount > 0 ? 'Partial' : 'Unpaid',
      payments: [],
      dueDate: format(new Date(new Date(order.createdAt).getTime() + 30*86400000), 'yyyy-MM-dd'),
    });
    updateOrder(order.id, { invoiceId: invoice.id });
    addActivity({
      type: 'invoice_generated',
      title: 'Invoice Generated',
      description: `${invNum} generated for ${order.orderNumber} – ${formatCurrency(invoice.grandTotal)}`,
      referenceId: invoice.id,
      referenceType: 'INVOICE',
      createdBy: 'Vrund Doshi',
    });
    toast.success(`Invoice ${invNum} generated!`);
    setDetailOrder(null);
    navigate('/invoices');
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    cancelOrder(cancelTarget.id);
    toast.success(`Order ${cancelTarget.orderNumber} cancelled`);
    setCancelTarget(null);
    setDetailOrder(null);
  };

  const exportCsv = () => {
    const rows = [
      ['Order No','Dealer','City','Date','Total','Payment','Status'],
      ...filtered.map(o => [o.orderNumber, o.dealerName, o.dealerCity, formatDate(o.createdAt), o.grandTotal, o.paymentStatus, o.orderStatus]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='orders.csv'; a.click();
    toast.success('Orders exported');
  };

  const columns = [
    {
      key: 'orderNumber', header: 'Order ID', sortable: true,
      accessor: (o: Order) => (
        <button onClick={e => { e.stopPropagation(); setDetailOrder(o); }} className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          {o.orderNumber}
        </button>
      ),
    },
    {
      key: 'dealerName', header: 'Dealer', sortable: true,
      accessor: (o: Order) => (
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{o.dealerName}</p>
          <p className="text-xs text-slate-400">{o.dealerCity}</p>
        </div>
      ),
    },
    {
      key: 'createdAt', header: 'Date', sortable: true,
      accessor: (o: Order) => <span className="text-xs">{formatDate(o.createdAt)}</span>,
    },
    {
      key: 'grandTotal', header: 'Amount', sortable: true, className: 'text-right',
      accessor: (o: Order) => <span className="tabular-nums font-semibold">{formatCurrency(o.grandTotal)}</span>,
    },
    {
      key: 'paymentStatus', header: 'Payment',
      accessor: (o: Order) => getPaymentBadge(o.paymentStatus),
    },
    {
      key: 'orderStatus', header: 'Fulfillment',
      accessor: (o: Order) => getOrderBadge(o.orderStatus),
    },
    {
      key: 'actions', header: 'Actions', width: '120px',
      accessor: (o: Order) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button title="View" onClick={() => setDetailOrder(o)} className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Eye size={13}/></button>
          <button title="Generate Invoice" onClick={() => handleGenerateInvoice(o)} disabled={!!o.invoiceId} className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-40"><FileText size={13}/></button>
          <button title="Update Shipping" onClick={() => setShippingOrder(o)} disabled={o.orderStatus==='Delivered'||o.orderStatus==='Cancelled'} className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors disabled:opacity-40"><Truck size={13}/></button>
          <button title="Cancel" onClick={() => setCancelTarget(o)} disabled={o.orderStatus==='Delivered'||o.orderStatus==='Cancelled'} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"><X size={13}/></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">B2B Dealer Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{orders.length} total orders</p>
        </div>
        <Button leftIcon={<Plus size={14}/>} onClick={() => setShowNewOrder(true)}>New Order</Button>
      </div>

      <Card className="overflow-hidden">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={t => { setActiveTab(t); setPage(1); }} className="px-4" />

        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} placeholder="Search orders…" className="w-full pl-9 pr-3 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" leftIcon={<Download size={13}/>} onClick={exportCsv}>Export CSV</Button>
          </div>
        </div>

        <Table
          columns={columns}
          data={paginated}
          keyExtractor={o => o.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={setDetailOrder}
        />
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={s=>{ setPageSize(s); setPage(1); }}/>
      </Card>

      <OrderDetailDrawer order={detailOrder} open={!!detailOrder} onClose={() => setDetailOrder(null)}
        onGenerateInvoice={handleGenerateInvoice} onUpdateShipping={setShippingOrder} />
      <ShippingModal order={shippingOrder} open={!!shippingOrder} onClose={() => setShippingOrder(null)} />
      <NewOrderModal open={showNewOrder} onClose={() => setShowNewOrder(false)} />
      <ConfirmDialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancel}
        title="Cancel Order" description={`Cancel ${cancelTarget?.orderNumber}? This will release reserved stock.`} confirmLabel="Cancel Order" />
    </div>
  );
}
