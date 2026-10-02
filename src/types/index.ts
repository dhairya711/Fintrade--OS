// ─── Core Domain Types ────────────────────────────────────────────────────────

export interface Godown {
  id: string;
  name: string;
  type: 'Warehouse' | 'Showroom' | 'Transit';
}


export type ProductCategory =
  | 'Switchgears'
  | 'Fuses'
  | 'Transformers'
  | 'MCBs'
  | 'MCCBs'
  | 'Components'
  | 'Contactors'
  | 'Relays'
  | 'Bus Bars'
  | 'Cable Lugs'
  | 'Timers'
  | 'Meters';

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  hsn: string;
  wholesalePrice: number;
  mrp: number;
  currentStock: number;
  reorderLevel: number;
  moq: number;
  unit: string;
  supplier: string;
  description: string;
  locationStock?: Record<string, number>; // godownId -> quantity
  trackSerialNumbers?: boolean;
  serialNumbers?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RESERVED' | 'RELEASED';
  quantity: number;
  referenceId?: string;
  referenceType?: 'ORDER' | 'INVOICE' | 'RESTOCK' | 'ADJUSTMENT';
  supplier?: string;
  note: string;
  createdAt: string;
  createdBy: string;
}

export type DealerTier = 'Platinum' | 'Gold' | 'Silver' | 'Standard';

export interface Dealer {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  tier: DealerTier;
  creditLimit: number;
  outstandingBalance: number;
  totalOrders: number;
  totalRevenue: number;
  createdAt: string;
  active: boolean;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Packed'
  | 'Dispatched'
  | 'Delivered'
  | 'Cancelled';

export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Overdue';

export interface OrderLineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  hsn: string;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export interface ShippingInfo {
  transporter?: string;
  lrNumber?: string;
  expectedDelivery?: string;
  trackingNote?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  dealerId: string;
  dealerName: string;
  dealerCity: string;
  dealerState: string;
  lineItems: OrderLineItem[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  grandTotal: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  invoiceId?: string;
  shippingInfo?: ShippingInfo;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';

export interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string;
  date: string;
  note?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  dealerId: string;
  dealerName: string;
  dealerGstin: string;
  dealerAddress: string;
  dealerCity: string;
  dealerState: string;
  lineItems: OrderLineItem[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  status: InvoiceStatus;
  payments: Payment[];
  dueDate: string;
  sentAt?: string;
  ewayBill?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityFeedItem {
  id: string;
  type:
    | 'order_created'
    | 'order_updated'
    | 'order_shipped'
    | 'invoice_generated'
    | 'payment_received'
    | 'stock_restocked'
    | 'stock_low'
    | 'dealer_added';
  title: string;
  description: string;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
  createdBy: string;
}

export interface Notification {
  id: string;
  type: 'low_stock' | 'new_order' | 'payment_received' | 'order_overdue';
  title: string;
  message: string;
  read: boolean;
  referenceId?: string;
  createdAt: string;
}

export type UserRole = 'Admin' | 'Manager';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface CompanySettings {
  name: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  defaultGstRate: number;
  lowStockThreshold: number;
  currency: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  company: CompanySettings;
  currentUser: AppUser;
  systemPin: string;
}

// ─── Table / Filter Types ──────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
  key: keyof T;
  direction: SortDirection;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

export interface DateRange {
  from: string;
  to: string;
}
