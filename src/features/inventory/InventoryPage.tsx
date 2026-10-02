import React, { useState, useMemo, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Filter, Download, Eye, Edit2, Trash2, RefreshCw,
  EyeOff, Package, MoreVertical, TrendingUp, ScanBarcode
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useInventoryStore } from '../../store/inventoryStore';
import { useActivityStore } from '../../store/uiStore';
import type { Product, ProductCategory, StockStatus } from '../../types';
import { Button, Badge, Card, Input, Select, Tabs, EmptyState, clsx } from '../../components/ui';
import { Modal, Drawer, ConfirmDialog } from '../../components/overlays';
import { Table, Pagination } from '../../components/Table';
import { formatCurrency, formatDate, generateSku, generateId } from '../../lib/formatters';

// ─── Status helpers ────────────────────────────────────────────────────────────

function getStatus(p: Product): StockStatus {
  if (p.currentStock === 0) return 'Out of Stock';
  if (p.currentStock <= p.reorderLevel) return 'Low Stock';
  return 'In Stock';
}

function StatusBadge({ status }: { status: StockStatus }) {
  return (
    <Badge variant={status === 'In Stock' ? 'emerald' : status === 'Low Stock' ? 'amber' : 'red'} dot>
      {status}
    </Badge>
  );
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  category: z.string().min(1, 'Category is required'),
  hsn: z.string().min(4, 'Valid HSN required'),
  wholesalePrice: z.number({ coerce: true }).positive('Price must be positive'),
  mrp: z.number({ coerce: true }).positive('MRP must be positive'),
  currentStock: z.number({ coerce: true }).min(0),
  reorderLevel: z.number({ coerce: true }).min(0),
  moq: z.number({ coerce: true }).min(1),
  unit: z.string().min(1, 'Unit required'),
  supplier: z.string().min(2, 'Supplier required'),
  description: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

const restockSchema = z.object({
  quantity: z.number({ coerce: true }).min(1, 'Minimum 1 unit'),
  supplier: z.string().min(2, 'Supplier required'),
  note: z.string().optional(),
});
type RestockFormData = z.infer<typeof restockSchema>;

const CATEGORIES: ProductCategory[] = [
  'Switchgears', 'Fuses', 'Transformers', 'MCBs', 'MCCBs', 'Components',
  'Contactors', 'Relays', 'Bus Bars', 'Cable Lugs', 'Timers', 'Meters',
];

const CATEGORY_OPTIONS = [{ value: '', label: 'All Categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))];
const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'In Stock', label: 'In Stock' },
  { value: 'Low Stock', label: 'Low Stock' },
  { value: 'Out of Stock', label: 'Out of Stock' },
];

// ─── Product Form ─────────────────────────────────────────────────────────────

function ProductForm({
  product,
  onSubmit,
  loading,
  existingSkus,
}: {
  product?: Product;
  onSubmit: (data: ProductFormData) => void;
  loading: boolean;
  existingSkus: string[];
}) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      name: product.name,
      category: product.category,
      hsn: product.hsn,
      wholesalePrice: product.wholesalePrice,
      mrp: product.mrp,
      currentStock: product.currentStock,
      reorderLevel: product.reorderLevel,
      moq: product.moq,
      unit: product.unit,
      supplier: product.supplier,
      description: product.description,
    } : {
      unit: 'Nos',
      reorderLevel: 10,
      moq: 5,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Product Name *" error={errors.name?.message} {...register('name')} />
        </div>
        <Select
          label="Category *"
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          error={errors.category?.message}
          {...register('category')}
        />
        <Input label="HSN Code *" error={errors.hsn?.message} {...register('hsn')} placeholder="e.g. 8536" />
        <Input label="Wholesale Price (₹) *" type="number" step="0.01" error={errors.wholesalePrice?.message} {...register('wholesalePrice', { valueAsNumber: true })} />
        <Input label="MRP (₹) *" type="number" step="0.01" error={errors.mrp?.message} {...register('mrp', { valueAsNumber: true })} />
        <Input label="Current Stock *" type="number" error={errors.currentStock?.message} {...register('currentStock', { valueAsNumber: true })} />
        <Input label="Reorder Level *" type="number" error={errors.reorderLevel?.message} {...register('reorderLevel', { valueAsNumber: true })} />
        <Input label="MOQ *" type="number" error={errors.moq?.message} {...register('moq', { valueAsNumber: true })} />
        <Select
          label="Unit *"
          options={['Nos', 'Set', 'Meter', 'Kg', 'Box', 'Roll'].map((u) => ({ value: u, label: u }))}
          error={errors.unit?.message}
          {...register('unit')}
        />
        <div className="col-span-2">
          <Input label="Supplier *" error={errors.supplier?.message} {...register('supplier')} />
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            {...register('description')}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {product ? 'Update Product' : 'Add Product'}
        </Button>
      </div>
    </form>
  );
}

// ─── Restock Modal ─────────────────────────────────────────────────────────────

function RestockModal({
  product,
  open,
  onClose,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}) {
  const { restockProduct } = useInventoryStore();
  const { addActivity } = useActivityStore();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<RestockFormData>({
    resolver: zodResolver(restockSchema),
    defaultValues: { supplier: product?.supplier || '', note: '' },
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: RestockFormData) => {
    if (!product) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    restockProduct(product.id, data.quantity, data.supplier, data.note || 'Manual restock');
    addActivity({
      type: 'stock_restocked',
      title: 'Stock Restocked',
      description: `${product.name} restocked +${data.quantity} units from ${data.supplier}`,
      referenceId: product.id,
      referenceType: 'PRODUCT',
      createdBy: 'Vrund Doshi',
    });
    toast.success(`Restocked ${data.quantity} units of ${product.name}`);
    setLoading(false);
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Restock: ${product?.name || ''}`} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Quantity *"
          type="number"
          error={errors.quantity?.message}
          {...register('quantity', { valueAsNumber: true })}
        />
        <Input
          label="Supplier *"
          defaultValue={product?.supplier}
          error={errors.supplier?.message}
          {...register('supplier')}
        />
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Note</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            placeholder="Optional note..."
            {...register('note')}
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} leftIcon={<RefreshCw size={14} />}>Restock</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Stock Transfer Modal ──────────────────────────────────────────────────────

function StockTransferModal({
  product,
  open,
  onClose,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}) {
  const { godowns, transferStock } = useInventoryStore();
  const { addActivity } = useActivityStore();
  const [loading, setLoading] = useState(false);
  const [fromGodown, setFromGodown] = useState('');
  const [toGodown, setToGodown] = useState('');
  const [qty, setQty] = useState(1);

  const maxQty = product?.locationStock?.[fromGodown] || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !fromGodown || !toGodown || qty <= 0 || qty > maxQty) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    transferStock(product.id, fromGodown, toGodown, qty);
    addActivity({
      type: 'stock_adjusted',
      title: 'Stock Transferred',
      description: `Moved ${qty} ${product.unit} of ${product.name} to ${godowns.find(g=>g.id===toGodown)?.name}`,
      referenceId: product.id,
      referenceType: 'PRODUCT',
      createdBy: 'Vrund Doshi'
    });
    toast.success('Stock transferred successfully');
    setLoading(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Transfer Stock: ${product?.name || ''}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">From Godown *</label>
          <select required value={fromGodown} onChange={e => setFromGodown(e.target.value)} className="mt-1 w-full h-9 rounded-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-slate-500">
            <option value="">Select source...</option>
            {godowns.map(g => (
              <option key={g.id} value={g.id} disabled={!(product?.locationStock?.[g.id] > 0)}>
                {g.name} ({product?.locationStock?.[g.id] || 0} in stock)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">To Godown *</label>
          <select required value={toGodown} onChange={e => setToGodown(e.target.value)} className="mt-1 w-full h-9 rounded-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-slate-500">
            <option value="">Select destination...</option>
            {godowns.filter(g => g.id !== fromGodown).map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantity (Max: {maxQty}) *</label>
          <input type="number" required min={1} max={maxQty} value={qty} onChange={e => setQty(Number(e.target.value))} className="mt-1 w-full h-9 rounded-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-2.5 focus:outline-none focus:ring-1 focus:ring-slate-500"/>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} disabled={!fromGodown || !toGodown || qty > maxQty}>Transfer</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Product Detail Drawer ─────────────────────────────────────────────────────

function ProductDetailDrawer({ product, open, onClose, onTransfer }: { product: Product | null; open: boolean; onClose: () => void; onTransfer: () => void }) {
  const [scanning, setScanning] = useState(false);
  const { stockMovements, godowns } = useInventoryStore();
  const movements = useMemo(
    () => stockMovements.filter((m) => m.productId === product?.id).slice(-10).reverse(),
    [stockMovements, product]
  );
  if (!product) return null;
  const status = getStatus(product);

  return (
    <Drawer open={open} onClose={onClose} title={product.name}>
      <div className="space-y-6">
        {/* Product info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2 flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">SKU</p>
              <p className="font-mono font-semibold text-blue-600 dark:text-blue-400">{product.sku}</p>
            </div>
            <StatusBadge status={status} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Category</p>
            <p className="font-medium text-slate-800 dark:text-slate-200">{product.category}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">HSN Code</p>
            <p className="font-medium text-slate-800 dark:text-slate-200">{product.hsn}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Wholesale Price</p>
            <p className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(product.wholesalePrice)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">MRP</p>
            <p className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">{formatCurrency(product.mrp)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Current Stock</p>
            <p className={clsx('font-bold tabular-nums text-lg', status === 'Low Stock' ? 'text-amber-600' : status === 'Out of Stock' ? 'text-red-500' : 'text-emerald-600')}>
              {product.currentStock.toLocaleString('en-IN')} {product.unit}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Reorder Level</p>
            <p className="font-medium text-slate-800 dark:text-slate-200">{product.reorderLevel} {product.unit}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">MOQ</p>
            <p className="font-medium text-slate-800 dark:text-slate-200">{product.moq} {product.unit}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Supplier</p>
            <p className="font-medium text-slate-800 dark:text-slate-200">{product.supplier}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500">Stock Value</p>
            <p className="font-bold text-emerald-600 tabular-nums">{formatCurrency(product.wholesalePrice * product.currentStock)}</p>
          </div>
          {product.description && (
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Description</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{product.description}</p>
            </div>
          )}
        </div>

        {/* Godown Stock Breakdown */}
        {product.locationStock && Object.keys(product.locationStock).length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Stock by Warehouse / Godown</h3>
              <Button size="xs" variant="outline" onClick={onTransfer}>Transfer</Button>
            </div>
            <div className="space-y-2">
              {godowns.map(g => {
                const qty = product.locationStock?.[g.id] || 0;
                if (qty === 0) return null;
                return (
                  <div key={g.id} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{g.name}</span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{qty.toLocaleString()} {product.unit}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Serial Numbers */}
        {product.trackSerialNumbers && product.serialNumbers && product.serialNumbers.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Active Serial/Batch Numbers</h3>
              <div className="flex items-center gap-2">
                <Badge variant="slate">{product.serialNumbers.length} tracking</Badge>
                <Button size="xs" variant={scanning ? 'primary' : 'outline'} leftIcon={<ScanBarcode size={13}/>} onClick={() => {
                  setScanning(!scanning);
                  if (!scanning) toast('Scanner activated. Ready for input.', { icon: <ScanBarcode size={14} className="text-blue-500" />});
                }}>
                  {scanning ? 'Scanning...' : 'Scan RFID'}
                </Button>
              </div>
            </div>
            
            {scanning && (
              <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded animate-pulse flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"/>
                <p className="text-xs text-blue-700 dark:text-blue-400 font-mono">WAITING FOR HARDWARE SCANNER INPUT...</p>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-1">
              {product.serialNumbers.map((sn, idx) => {
                // Mock status: First 2 are "reserved", rest are "available"
                const isReserved = idx < 2;
                return (
                  <span key={sn} className={clsx(
                    "font-mono text-xs px-2 py-1 border rounded flex items-center gap-1.5",
                    isReserved 
                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400"
                      : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  )}>
                    {isReserved && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Reserved for Order" />}
                    {!isReserved && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Available in Stock" />}
                    {sn}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Stock movement history */}
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Stock Movement History</h3>
          {movements.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No movements recorded</p>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div key={m.id} className="flex items-start gap-3 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                    m.type === 'IN' || m.type === 'RELEASED' ? 'bg-emerald-100 text-emerald-600' :
                    m.type === 'OUT' || m.type === 'RESERVED' ? 'bg-red-100 text-red-600' :
                    'bg-slate-200 text-slate-600'
                  )}>
                    {m.type === 'IN' || m.type === 'RELEASED' ? '+' : m.type === 'OUT' || m.type === 'RESERVED' ? '-' : '~'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{m.type} · {m.quantity} {product.unit}</p>
                      <span className="text-[10px] text-slate-400">{formatDate(m.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.note}</p>
                    {m.supplier && <p className="text-[10px] text-slate-400">Supplier: {m.supplier}</p>}
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

// ─── Inventory Page ────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { products, addProduct, updateProduct, deleteProduct, deleteProducts, bulkImportProducts } = useInventoryStore();
  const { addActivity } = useActivityStore();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') === 'low' ? 'Low Stock' : '');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [transferProduct, setTransferProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedProducts = results.data.map((row: any) => ({
          sku: row.SKU || generateSku(row.Category || 'Components'),
          name: row.Name || 'Imported Product',
          category: row.Category || 'Components',
          hsn: row.HSN || '0000',
          wholesalePrice: parseFloat(row['Wholesale Price']) || 0,
          mrp: parseFloat(row.MRP) || 0,
          currentStock: parseInt(row.Stock, 10) || 0,
          reorderLevel: parseInt(row['Reorder Level'], 10) || 10,
          moq: parseInt(row.MOQ, 10) || 5,
          unit: row.Unit || 'Nos',
          supplier: row.Supplier || 'Unknown Supplier',
        }));
        
        bulkImportProducts(parsedProducts as any);
        toast.success(`Successfully imported ${parsedProducts.length} products`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: () => {
        toast.error('Failed to parse CSV file');
      }
    });
  };

  // ── Filter / sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...products];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.supplier.toLowerCase().includes(q)
      );
    }
    if (category) data = data.filter((p) => p.category === category);
    if (statusFilter) data = data.filter((p) => getStatus(p) === statusFilter);

    data.sort((a, b) => {
      const av = a[sortKey as keyof Product];
      const bv = b[sortKey as keyof Product];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return data;
  }, [products, search, category, statusFilter, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalStockValue = products.reduce((s, p) => s + p.wholesalePrice * p.currentStock, 0);
  const itemsBelowMoq = products.filter((p) => p.currentStock < p.moq && p.currentStock > 0).length;
  const categoryCount = new Set(products.map((p) => p.category)).size;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleAddProduct = async (data: ProductFormData) => {
    setFormLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const sku = generateSku(data.category, products.map((p) => p.sku));
    addProduct({ ...data, sku, description: data.description || '' });
    addActivity({ type: 'stock_restocked', title: 'Product Added', description: `New product: ${data.name}`, createdBy: 'Vrund Doshi' });
    toast.success(`Product "${data.name}" added successfully`);
    setFormLoading(false);
    setShowAddModal(false);
  };

  const handleEditProduct = async (data: ProductFormData) => {
    if (!editProduct) return;
    setFormLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    updateProduct(editProduct.id, data);
    toast.success('Product updated successfully');
    setFormLoading(false);
    setEditProduct(null);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    deleteProduct(deleteTargetId);
    toast.success('Product deleted');
    setDeleteTargetId(null);
  };

  const handleBulkDelete = async () => {
    deleteProducts(Array.from(selectedIds));
    toast.success(`${selectedIds.size} products deleted`);
    setSelectedIds(new Set());
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(paginated.map((p) => p.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const exportCsv = () => {
    const rows = [
      ['SKU', 'Name', 'Category', 'HSN', 'Wholesale Price', 'MRP', 'Stock', 'Reorder Level', 'MOQ', 'Unit', 'Status', 'Supplier'],
      ...filtered.map((p) => [
        p.sku, p.name, p.category, p.hsn, p.wholesalePrice, p.mrp,
        p.currentStock, p.reorderLevel, p.moq, p.unit, getStatus(p), p.supplier,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'git-erp-inventory.csv';
    a.click();
    toast.success('Inventory exported to CSV');
  };

  const columns = [
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      width: '120px',
      accessor: (p: Product) => (
        <span
          className="font-mono text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
          onClick={(e) => { e.stopPropagation(); setDetailProduct(p); }}
        >
          {p.sku}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Product Name',
      sortable: true,
      accessor: (p: Product) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDetailProduct(p); }}
          className="text-left font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm"
        >
          {p.name}
        </button>
      ),
    },
    { key: 'category', header: 'Category', sortable: true, accessor: (p: Product) => <span className="text-xs">{p.category}</span> },
    { key: 'hsn', header: 'HSN', width: '80px', accessor: (p: Product) => <span className="font-mono text-xs">{p.hsn}</span> },
    {
      key: 'wholesalePrice',
      header: 'Wholesale (₹)',
      sortable: true,
      className: 'text-right',
      accessor: (p: Product) => <span className="tabular-nums font-semibold">{formatCurrency(p.wholesalePrice)}</span>,
    },
    {
      key: 'currentStock',
      header: 'Stock',
      sortable: true,
      className: 'text-right',
      accessor: (p: Product) => {
        const st = getStatus(p);
        return (
          <span className={clsx('tabular-nums font-bold', st === 'Out of Stock' ? 'text-red-500' : st === 'Low Stock' ? 'text-amber-600' : 'text-slate-800 dark:text-slate-200')}>
            {p.currentStock.toLocaleString('en-IN')}
          </span>
        );
      },
    },
    {
      key: 'moq',
      header: 'MOQ',
      width: '70px',
      className: 'text-right',
      accessor: (p: Product) => <span className="tabular-nums text-xs">{p.moq}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (p: Product) => <StatusBadge status={getStatus(p)} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '120px',
      accessor: (p: Product) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            title="View Details"
            onClick={() => setDetailProduct(p)}
            className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Eye size={13} />
          </button>
          <button
            title="Edit"
            onClick={() => setEditProduct(p)}
            className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
          >
            <Edit2 size={13} />
          </button>
          <button
            title="Restock"
            onClick={() => setRestockProduct(p)}
            className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
          >
            <RefreshCw size={13} />
          </button>
          <button
            title="Delete"
            onClick={() => setDeleteTargetId(p.id)}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Inventory Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {products.length} products across {categoryCount} categories
          </p>
        </div>
        <Button leftIcon={<Plus size={14} />} onClick={() => setShowAddModal(true)}>
          Add Product
        </Button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Package size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Stock Value</p>
            <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(totalStockValue)}</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <TrendingUp size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Below MOQ</p>
            <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{itemsBelowMoq} items</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
            <Filter size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Categories</p>
            <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{categoryCount}</p>
          </div>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search inventory…"
              className="w-full pl-9 pr-3 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex gap-1">
            {['', 'In Stock', 'Low Stock', 'Out of Stock'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={clsx(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {selectedIds.size > 0 && (
              <Button variant="danger" size="sm" onClick={handleBulkDelete}>
                Delete {selectedIds.size}
              </Button>
            )}
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCsv} />
            <Button variant="outline" size="sm" leftIcon={<Download size={13} />} onClick={() => fileInputRef.current?.click()}>
              Import CSV
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Download size={13} />} onClick={exportCsv}>
              Export CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={paginated}
          keyExtractor={(p) => p.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          selectable
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          rowClassName={(p) => {
            const st = getStatus(p);
            return st === 'Low Stock' ? 'table-row-low-stock' : st === 'Out of Stock' ? 'table-row-out-of-stock' : '';
          }}
        />

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </Card>

      {/* Modals */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Product" size="lg">
        <ProductForm onSubmit={handleAddProduct} loading={formLoading} existingSkus={products.map((p) => p.sku)} />
      </Modal>

      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title="Edit Product" size="lg">
        {editProduct && (
          <ProductForm product={editProduct} onSubmit={handleEditProduct} loading={formLoading} existingSkus={products.map((p) => p.sku)} />
        )}
      </Modal>

      <RestockModal product={restockProduct} open={!!restockProduct} onClose={() => setRestockProduct(null)} />
      <StockTransferModal product={transferProduct} open={!!transferProduct} onClose={() => setTransferProduct(null)} />

      <ConfirmDialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete Product"
      />

      <ProductDetailDrawer product={detailProduct} open={!!detailProduct} onClose={() => setDetailProduct(null)} onTransfer={() => setTransferProduct(detailProduct)} />
    </div>
  );
}
