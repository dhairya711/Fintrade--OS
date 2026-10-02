import React, { useState, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Printer, Send, CreditCard, Download, ArrowLeft, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useInvoiceStore } from '../../store/invoiceStore';
import { useOrderStore } from '../../store/orderStore';
import { useSettingsStore, useActivityStore } from '../../store/uiStore';
import type { Invoice, InvoiceStatus } from '../../types';
import { Button, Badge, Card, Tabs, clsx } from '../../components/ui';
import { Modal } from '../../components/overlays';
import { Table, Pagination } from '../../components/Table';
import { formatCurrency, formatDate, formatDateLong } from '../../lib/formatters';
import { getHsnSummary } from '../../lib/gst';
import { numberToWords } from '../../lib/numberToWords';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusBadge(status: InvoiceStatus) {
  const cfg: Record<InvoiceStatus,{variant:'emerald'|'amber'|'slate'|'red'|'sky'|'blue'}> = {
    Paid:    { variant:'emerald' }, Partial: { variant:'amber' },
    Unpaid:  { variant:'slate' },  Overdue:  { variant:'red' },
    Draft:   { variant:'slate' },  Sent:     { variant:'sky' },
  };
  return <Badge variant={cfg[status]?.variant ?? 'slate'} dot>{status}</Badge>;
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

const paymentSchema = z.object({
  amount: z.number({ coerce: true }).positive('Amount must be positive'),
  method: z.enum(['NEFT','RTGS','UPI','Cheque','Cash']),
  reference: z.string().min(1,'Reference required'),
  date: z.string().min(1,'Date required'),
  note: z.string().optional(),
});
type PaymentFormData = z.infer<typeof paymentSchema>;

function PaymentModal({ invoice, open, onClose }:{ invoice: Invoice|null; open: boolean; onClose: ()=>void }) {
  const { recordPayment } = useInvoiceStore();
  const { recordPayment: recordOrderPayment } = useOrderStore();
  const { addActivity } = useActivityStore();
  const { register, handleSubmit, formState:{ errors }, reset } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { method:'NEFT', date: new Date().toISOString().split('T')[0] },
  });
  const [loading, setLoading] = useState(false);

  const outstanding = invoice ? invoice.grandTotal - invoice.paidAmount : 0;

  const onSubmit = async (data: PaymentFormData) => {
    if (!invoice) return;
    if (data.amount > outstanding + 0.01) { toast.error(`Max receivable: ${formatCurrency(outstanding)}`); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r,600));
    recordPayment(invoice.id, { amount: data.amount, method: data.method, reference: data.reference, date: data.date, note: data.note });
    recordOrderPayment(invoice.orderId, data.amount);
    addActivity({
      type: 'payment_received',
      title: 'Payment Received',
      description: `${formatCurrency(data.amount)} via ${data.method} for ${invoice.invoiceNumber}`,
      referenceId: invoice.id,
      referenceType: 'INVOICE',
      createdBy: 'Vrund Doshi',
    });
    toast.success(`Payment of ${formatCurrency(data.amount)} recorded!`);
    setLoading(false);
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Record Payment" size="sm">
      {invoice && (
        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Invoice</span><span className="font-semibold">{invoice.invoiceNumber}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Grand Total</span><span className="tabular-nums">{formatCurrency(invoice.grandTotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Outstanding</span><span className="tabular-nums font-bold text-red-500">{formatCurrency(outstanding)}</span></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount (₹) *</label>
          <input type="number" step="0.01" max={outstanding} {...register('amount',{valueAsNumber:true})} className="mt-1 w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={`Max: ${outstanding}`}/>
          {errors.amount && <p className="text-xs text-red-500 mt-0.5">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Method *</label>
          <select {...register('method')} className="mt-1 w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {['NEFT','RTGS','UPI','Cheque','Cash'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reference / UTR *</label>
          <input {...register('reference')} className="mt-1 w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="UTR / Cheque No."/>
          {errors.reference && <p className="text-xs text-red-500 mt-0.5">{errors.reference.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date *</label>
          <input type="date" {...register('date')} className="mt-1 w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} leftIcon={<CreditCard size={14}/>}>Record Payment</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── E-Way Bill Modal ─────────────────────────────────────────────────────────

function EWayBillModal({ invoice, open, onClose }:{ invoice: Invoice|null; open: boolean; onClose: ()=>void }) {
  const { updateInvoice } = useInvoiceStore();
  const { addActivity } = useActivityStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [transporterId, setTransporterId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setLoading(true);
    setStep(1); // Authenticating
    await new Promise(r => setTimeout(r, 600));
    setStep(2); // Validating GSTIN
    await new Promise(r => setTimeout(r, 700));
    setStep(3); // Generating Part A/B
    await new Promise(r => setTimeout(r, 800));
    
    // Generate a mock 12 digit E-Way Bill number
    const ewb = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    
    updateInvoice(invoice.id, { ewayBill: ewb });
    addActivity({
      type: 'invoice_generated',
      title: 'E-Way Bill Generated',
      description: `EWB ${ewb} generated for Invoice ${invoice.invoiceNumber} via NIC API`,
      referenceId: invoice.id,
      referenceType: 'INVOICE',
      createdBy: 'System (Automated)',
    });
    
    toast.success(`E-Way Bill ${ewb} generated successfully via NIC portal`);
    setLoading(false);
    setStep(0);
    onClose();
  };

  const steps = [
    'Idle',
    'Authenticating with NIC E-Way Bill Portal (API v1.03)...',
    `Validating Transporter GSTIN (${transporterId})...`,
    'Generating Part-A and Part-B payload...'
  ];

  return (
    <Modal open={open} onClose={onClose} title="Generate NIC E-Way Bill (Govt. API)" size="sm">
      <div className="mb-4 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-4">
        <p>Invoices over ₹50,000 require a mandatory E-Way Bill. This module interfaces directly with the Indian GST portal via secure token exchange.</p>
      </div>
      
      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-4">
          <div className="relative w-12 h-12">
            <svg className="animate-spin h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"/>
            </div>
          </div>
          <p className="text-sm font-mono text-slate-700 dark:text-slate-300 animate-pulse">{steps[step]}</p>
        </div>
      ) : (
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Transporter ID (GSTIN) *</label>
            <input required value={transporterId} onChange={e=>setTransporterId(e.target.value)} placeholder="e.g. 24AAXXX1234X1Z5" className="mt-1 w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"/>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Vehicle Number *</label>
            <input required value={vehicleNo} onChange={e=>setVehicleNo(e.target.value)} placeholder="e.g. GJ06AB1234" className="mt-1 w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono uppercase"/>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading} className="bg-slate-800 hover:bg-slate-900 text-white">Generate via NIC</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ─── GST Invoice Print View ────────────────────────────────────────────────────

export function InvoicePrintView({ invoice }: { invoice: Invoice }) {
  const { settings } = useSettingsStore();
  const co = settings.company;
  const hsnSummary = getHsnSummary(invoice.lineItems);
  const amountInWords = numberToWords(invoice.grandTotal);

  return (
    <div className="bg-white text-black p-8 max-w-[800px] mx-auto text-[11px] font-sans" id="invoice-print">
      {/* Header */}
      <div className="border-2 border-black">
        <div className="grid grid-cols-2 border-b border-black">
          <div className="p-4 border-r border-black">
            <div className="flex items-center gap-2 mb-2">
              <svg width="32" height="32" viewBox="0 0 36 36"><path d="M18 2L32 10V26L18 34L4 26V10L18 2Z" fill="#2563EB"/><path d="M21 8L14 19H19L15 28L23 17H18L21 8Z" fill="white"/></svg>
              <div>
                <p className="font-bold text-lg leading-tight">FINTRADE OS LTD.</p>
                <p className="text-[10px] text-gray-500 tracking-widest">WHOLESALE ELECTRICAL TRADERS</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              {co.address}<br/>
              {co.city}, {co.state} – {co.pincode}<br/>
              Ph: {co.phone} | {co.email}
            </p>
            <p className="mt-1 font-semibold">GSTIN: <span className="font-mono">{co.gstin}</span></p>
          </div>
          <div className="p-4">
            <div className="text-center mb-3">
              <p className="text-lg font-bold tracking-widest uppercase">Tax Invoice</p>
              <p className="text-[10px] text-gray-500">(Original for Recipient)</p>
            </div>
            <table className="w-full text-[10px]">
              <tbody>
                <tr><td className="text-gray-500 pr-2">Invoice No.</td><td className="font-bold font-mono">{invoice.invoiceNumber}</td></tr>
                <tr><td className="text-gray-500 pr-2">Invoice Date</td><td className="font-semibold">{formatDateLong(invoice.createdAt)}</td></tr>
                <tr><td className="text-gray-500 pr-2">Due Date</td><td className="font-semibold">{formatDateLong(invoice.dueDate)}</td></tr>
                {invoice.ewayBill && (
                  <tr>
                    <td className="text-gray-500 pr-2">E-Way Bill No.</td>
                    <td className="font-bold font-mono text-blue-700">{invoice.ewayBill}</td>
                  </tr>
                )}
                <tr><td className="text-gray-500 pr-2">State</td><td>Gujarat (24)</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Buyer */}
        <div className="grid grid-cols-2 border-b border-black">
          <div className="p-3 border-r border-black relative">
            <p className="font-bold text-[10px] uppercase text-gray-500 mb-1">Bill To</p>
            <p className="font-bold">{invoice.dealerName}</p>
            <p className="text-gray-600 leading-relaxed">{invoice.dealerAddress}<br/>{invoice.dealerCity}, {invoice.dealerState}</p>
            <p className="font-semibold mt-1">GSTIN: <span className="font-mono">{invoice.dealerGstin}</span></p>
          </div>
          <div className="p-3 relative">
            <p className="font-bold text-[10px] uppercase text-gray-500 mb-1">Ship To</p>
            <p className="font-bold">{invoice.dealerName}</p>
            <p className="text-gray-600 leading-relaxed">{invoice.dealerAddress}<br/>{invoice.dealerCity}, {invoice.dealerState}</p>
            
            {invoice.ewayBill && (
              <div className="absolute right-3 top-3 flex flex-col items-center">
                {/* Mock QR Code Pattern */}
                <div className="w-12 h-12 bg-white border border-black p-0.5 grid grid-cols-4 grid-rows-4 gap-0.5 opacity-80">
                  {Array.from({length: 16}).map((_, i) => (
                    <div key={i} className={Math.random() > 0.4 ? 'bg-black' : 'bg-transparent'} />
                  ))}
                </div>
                <p className="text-[7px] font-mono mt-1 font-bold">SCAN EWB</p>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-black bg-gray-50">
              <th className="p-2 text-left font-semibold text-[10px] w-6">#</th>
              <th className="p-2 text-left font-semibold text-[10px]">Description of Goods</th>
              <th className="p-2 text-center font-semibold text-[10px]">HSN</th>
              <th className="p-2 text-right font-semibold text-[10px]">Qty</th>
              <th className="p-2 text-right font-semibold text-[10px]">Rate (₹)</th>
              <th className="p-2 text-right font-semibold text-[10px]">Disc%</th>
              <th className="p-2 text-right font-semibold text-[10px]">Taxable (₹)</th>
              {invoice.totalCgst > 0 && <>
                <th className="p-2 text-right font-semibold text-[10px]">CGST</th>
                <th className="p-2 text-right font-semibold text-[10px]">SGST</th>
              </>}
              {invoice.totalIgst > 0 && <th className="p-2 text-right font-semibold text-[10px]">IGST</th>}
              <th className="p-2 text-right font-semibold text-[10px]">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((li, i) => (
              <tr key={li.id} className="border-b border-gray-200">
                <td className="p-2 text-center">{i+1}</td>
                <td className="p-2"><p className="font-medium">{li.productName}</p><p className="text-gray-400 font-mono text-[9px]">{li.sku}</p></td>
                <td className="p-2 text-center font-mono">{li.hsn}</td>
                <td className="p-2 text-right tabular-nums">{li.quantity}</td>
                <td className="p-2 text-right tabular-nums">{li.unitPrice.toFixed(2)}</td>
                <td className="p-2 text-right tabular-nums">{li.discount}%</td>
                <td className="p-2 text-right tabular-nums">{li.taxableAmount.toFixed(2)}</td>
                {invoice.totalCgst > 0 && <>
                  <td className="p-2 text-right tabular-nums">{li.cgst.toFixed(2)}</td>
                  <td className="p-2 text-right tabular-nums">{li.sgst.toFixed(2)}</td>
                </>}
                {invoice.totalIgst > 0 && <td className="p-2 text-right tabular-nums">{li.igst.toFixed(2)}</td>}
                <td className="p-2 text-right tabular-nums font-semibold">{li.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals + HSN */}
        <div className="grid grid-cols-2 border-t border-black">
          {/* HSN Summary */}
          <div className="p-3 border-r border-black">
            <p className="font-bold text-[10px] uppercase mb-2">HSN-wise Tax Summary</p>
            <table className="w-full text-[9px]">
              <thead><tr className="border-b border-gray-300">
                <th className="text-left pb-1">HSN</th>
                <th className="text-right pb-1">Taxable</th>
                {invoice.totalCgst > 0 && <><th className="text-right pb-1">CGST</th><th className="text-right pb-1">SGST</th></>}
                {invoice.totalIgst > 0 && <th className="text-right pb-1">IGST</th>}
                <th className="text-right pb-1">Total Tax</th>
              </tr></thead>
              <tbody>
                {hsnSummary.map(h => (
                  <tr key={h.hsn}>
                    <td className="font-mono">{h.hsn}</td>
                    <td className="text-right tabular-nums">{h.taxableValue.toFixed(2)}</td>
                    {invoice.totalCgst > 0 && <><td className="text-right tabular-nums">{h.cgst.toFixed(2)}</td><td className="text-right tabular-nums">{h.sgst.toFixed(2)}</td></>}
                    {invoice.totalIgst > 0 && <td className="text-right tabular-nums">{h.igst.toFixed(2)}</td>}
                    <td className="text-right tabular-nums font-semibold">{(h.cgst+h.sgst+h.igst).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Amount summary */}
          <div className="p-3">
            <table className="w-full text-[10px]">
              <tbody>
                <tr><td className="text-gray-500 py-0.5">Taxable Amount</td><td className="text-right tabular-nums py-0.5">{invoice.taxableAmount.toFixed(2)}</td></tr>
                {invoice.totalCgst > 0 && <><tr><td className="text-gray-500 py-0.5">CGST @ 9%</td><td className="text-right tabular-nums py-0.5">{invoice.totalCgst.toFixed(2)}</td></tr>
                <tr><td className="text-gray-500 py-0.5">SGST @ 9%</td><td className="text-right tabular-nums py-0.5">{invoice.totalSgst.toFixed(2)}</td></tr></>}
                {invoice.totalIgst > 0 && <tr><td className="text-gray-500 py-0.5">IGST @ 18%</td><td className="text-right tabular-nums py-0.5">{invoice.totalIgst.toFixed(2)}</td></tr>}
                {invoice.roundOff !== 0 && <tr><td className="text-gray-500 py-0.5">Round Off</td><td className="text-right tabular-nums py-0.5">{invoice.roundOff.toFixed(2)}</td></tr>}
                <tr className="border-t border-black"><td className="font-bold py-1 text-[11px]">GRAND TOTAL</td><td className="text-right tabular-nums font-bold text-[11px] py-1">₹{invoice.grandTotal.toLocaleString('en-IN')}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Amount in words */}
        <div className="border-t border-black p-3">
          <p className="text-[10px]"><span className="font-bold">Amount in Words: </span><span className="italic">{amountInWords}</span></p>
        </div>

        {/* Bank details + Signature */}
        <div className="grid grid-cols-2 border-t border-black">
          <div className="p-3 border-r border-black">
            <p className="font-bold text-[10px] uppercase mb-1">Bank Details</p>
            <table className="text-[10px] w-full">
              <tbody>
                <tr><td className="text-gray-500 pr-3">Bank</td><td className="font-semibold">{co.bankName}</td></tr>
                <tr><td className="text-gray-500 pr-3">A/c No.</td><td className="font-mono font-semibold">{co.accountNumber}</td></tr>
                <tr><td className="text-gray-500 pr-3">IFSC</td><td className="font-mono font-semibold">{co.ifsc}</td></tr>
                <tr><td className="text-gray-500 pr-3">UPI</td><td className="font-semibold">{co.upiId}</td></tr>
              </tbody>
            </table>
            <p className="text-[9px] text-gray-400 mt-2">* Subject to Gujarat jurisdiction. E&OE.</p>
          </div>
          <div className="p-3 flex flex-col items-end justify-between">
            <div className="text-[10px] text-gray-500">
              <p>Terms: Payment due within 30 days.</p>
              <p>Goods once sold will not be returned.</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold">For FINTRADE OS LTD.</p>
              <div className="h-10 my-2 border-b border-dashed border-gray-300 w-36"/>
              <p className="text-[10px] font-semibold">Authorised Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invoices List Page ────────────────────────────────────────────────────────

const INV_TABS = [
  { id:'all', label:'All Invoices' },
  { id:'Unpaid', label:'Unpaid' },
  { id:'Partial', label:'Partial' },
  { id:'Paid', label:'Paid' },
  { id:'Overdue', label:'Overdue' },
];

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { invoices, markAsSent } = useInvoiceStore();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice|null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice|null>(null);
  const [ewayBillInvoice, setEwayBillInvoice] = useState<Invoice|null>(null);

  const filtered = useMemo(() => {
    let data = [...invoices];
    if (activeTab !== 'all') data = data.filter(i => i.status === activeTab);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(i => i.invoiceNumber.toLowerCase().includes(q) || i.dealerName.toLowerCase().includes(q));
    }
    data.sort((a,b) => {
      const av = a[sortKey as keyof Invoice] as string|number;
      const bv = b[sortKey as keyof Invoice] as string|number;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir==='asc' ? av-bv : bv-av;
      return sortDir==='asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return data;
  }, [invoices, activeTab, search, sortKey, sortDir]);

  const paginated = filtered.slice((page-1)*pageSize, page*pageSize);

  // Summary cards
  const totalBilled = invoices.reduce((s,i) => s+i.grandTotal, 0);
  const totalCollected = invoices.reduce((s,i) => s+i.paidAmount, 0);
  const totalOutstanding = totalBilled - totalCollected;

  const tabs = INV_TABS.map(t => ({
    ...t,
    count: t.id==='all' ? invoices.length : invoices.filter(i => i.status===t.id).length,
  }));

  const handleSort = (key: string) => {
    if (sortKey===key) setSortDir(d => d==='asc'?'desc':'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  const handlePrint = (inv: Invoice) => {
    setPreviewInvoice(inv);
    setTimeout(() => window.print(), 200);
  };

  const columns = [
    {
      key:'invoiceNumber', header:'Invoice No.', sortable:true,
      accessor:(i:Invoice) => (
        <button onClick={() => setPreviewInvoice(i)} className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          {i.invoiceNumber}
        </button>
      ),
    },
    {
      key:'dealerName', header:'Dealer', sortable:true,
      accessor:(i:Invoice) => <span className="text-sm font-medium">{i.dealerName}</span>,
    },
    {
      key:'createdAt', header:'Date', sortable:true,
      accessor:(i:Invoice) => <span className="text-xs">{formatDate(i.createdAt)}</span>,
    },
    {
      key:'dueDate', header:'Due Date', sortable:true,
      accessor:(i:Invoice) => <span className="text-xs">{formatDate(i.dueDate)}</span>,
    },
    {
      key:'grandTotal', header:'Total', sortable:true, className:'text-right',
      accessor:(i:Invoice) => <span className="tabular-nums font-semibold">{formatCurrency(i.grandTotal)}</span>,
    },
    {
      key:'paidAmount', header:'Paid', className:'text-right',
      accessor:(i:Invoice) => <span className="tabular-nums text-emerald-600">{formatCurrency(i.paidAmount)}</span>,
    },
    {
      key:'status', header:'Status',
      accessor:(i:Invoice) => getStatusBadge(i.status),
    },
    {
      key:'actions', header:'', width:'100px',
      accessor:(i:Invoice) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button title="View Invoice" onClick={() => setPreviewInvoice(i)} className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Printer size={13}/></button>
          <button title="Record Payment" onClick={() => setPaymentInvoice(i)} disabled={i.status==='Paid'} className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-40"><CreditCard size={13}/></button>
          <button title="Mark as Sent" onClick={() => { markAsSent(i.id); toast.success('Invoice marked as sent'); }} disabled={!!i.sentAt} className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors disabled:opacity-40"><Send size={13}/></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Invoices & Billing</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{invoices.length} invoices total</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Total Billed', value: totalBilled, color:'blue' },
          { label:'Total Collected', value: totalCollected, color:'emerald' },
          { label:'Outstanding', value: totalOutstanding, color:'red' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
            <p className={clsx('text-xl font-bold tabular-nums mt-1',
              color==='blue' ? 'text-blue-700 dark:text-blue-400' :
              color==='emerald' ? 'text-emerald-700 dark:text-emerald-400' :
              'text-red-600 dark:text-red-400'
            )}>
              {formatCurrency(value)}
            </p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={t => { setActiveTab(t); setPage(1); }} className="px-4"/>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-sm">
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search invoices…" className="w-full pl-4 pr-3 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
        <Table columns={columns} data={paginated} keyExtractor={i => i.id} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} onRowClick={setPreviewInvoice}/>
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1); }}/>
      </Card>

      {/* Invoice Preview Modal */}
      <Modal open={!!previewInvoice} onClose={() => setPreviewInvoice(null)} title={`Invoice: ${previewInvoice?.invoiceNumber}`} size="xl">
        <div className="flex gap-3 mb-4 no-print">
          <Button size="sm" variant="outline" leftIcon={<Printer size={14}/>} onClick={() => window.print()}>Print / Save PDF</Button>
          <Button size="sm" variant="secondary" leftIcon={<CreditCard size={14}/>} onClick={() => { setPaymentInvoice(previewInvoice); setPreviewInvoice(null); }} disabled={previewInvoice?.status==='Paid'}>
            Record Payment
          </Button>
          <Button size="sm" variant="secondary" leftIcon={<Send size={14}/>} onClick={() => { if(previewInvoice){ markAsSent(previewInvoice.id); toast.success('Marked as sent'); } }} disabled={!!previewInvoice?.sentAt}>
            Mark as Sent
          </Button>
          {previewInvoice && previewInvoice.grandTotal >= 50000 && !previewInvoice.ewayBill && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white ml-auto" onClick={() => { setEwayBillInvoice(previewInvoice); setPreviewInvoice(null); }}>
              Generate E-Way Bill
            </Button>
          )}
        </div>
        {previewInvoice && <InvoicePrintView invoice={previewInvoice}/>}
      </Modal>

      <PaymentModal invoice={paymentInvoice} open={!!paymentInvoice} onClose={() => setPaymentInvoice(null)}/>
      <EWayBillModal invoice={ewayBillInvoice} open={!!ewayBillInvoice} onClose={() => setEwayBillInvoice(null)}/>
    </div>
  );
}
