// ─── Formatters ────────────────────────────────────────────────────────────────

/**
 * Format a number as Indian currency (₹14,50,000)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number as Indian number with commas
 */
export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Format a date string to DD/MM/YYYY
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Format a date string to "2 Oct 2026"
 */
export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Format relative time (e.g., "3 days ago")
 */
export function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Generate a unique ID with prefix
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Generate next order number
 */
export function generateOrderNumber(existingOrders: { orderNumber: string }[]): string {
  const nums = existingOrders
    .map((o) => parseInt(o.orderNumber.replace('ORD-2026-', ''), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 888;
  return `ORD-2026-${max + 1}`;
}

/**
 * Generate next invoice number
 */
export function generateInvoiceNumber(existingInvoices: { invoiceNumber: string }[]): string {
  const nums = existingInvoices
    .map((i) => parseInt(i.invoiceNumber.replace('INV-2026-', ''), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `INV-2026-${String(max + 1).padStart(3, '0')}`;
}

/**
 * Generate next SKU
 */
export function generateSku(category: string, existingSkus: string[]): string {
  const prefixes: Record<string, string> = {
    Switchgears: 'GIT-SW',
    Fuses: 'GIT-FS',
    Transformers: 'GIT-TR',
    MCBs: 'GIT-MC',
    MCCBs: 'GIT-MB',
    Components: 'GIT-CP',
    Contactors: 'GIT-CT',
    Relays: 'GIT-RL',
    'Bus Bars': 'GIT-BB',
    'Cable Lugs': 'GIT-CL',
    Timers: 'GIT-TM',
    Meters: 'GIT-MT',
  };
  const prefix = prefixes[category] || 'GIT-XX';
  const existing = existingSkus
    .filter((s) => s.startsWith(prefix))
    .map((s) => parseInt(s.replace(`${prefix}-`, ''), 10))
    .filter((n) => !isNaN(n));
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

/**
 * Clamp a number between min and max
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Compute percentage change
 */
export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
