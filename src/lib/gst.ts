// ─── GST Calculation Library ──────────────────────────────────────────────────

export const GST_RATES = {
  5: { cgst: 2.5, sgst: 2.5, igst: 5 },
  12: { cgst: 6, sgst: 6, igst: 12 },
  18: { cgst: 9, sgst: 9, igst: 18 },
  28: { cgst: 14, sgst: 14, igst: 28 },
} as const;

export type GstRate = keyof typeof GST_RATES;

export interface GstBreakdown {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalWithTax: number;
  isInterState: boolean;
}

/**
 * Calculate GST for a given taxable amount.
 * For intra-state (Gujarat to Gujarat): CGST + SGST
 * For inter-state: IGST only
 */
export function calculateGst(
  taxableAmount: number,
  gstRate: GstRate,
  isInterState: boolean
): GstBreakdown {
  const rates = GST_RATES[gstRate];
  const cgst = isInterState ? 0 : (taxableAmount * rates.cgst) / 100;
  const sgst = isInterState ? 0 : (taxableAmount * rates.sgst) / 100;
  const igst = isInterState ? (taxableAmount * rates.igst) / 100 : 0;
  const totalTax = cgst + sgst + igst;
  return {
    taxableAmount,
    cgst,
    sgst,
    igst,
    totalTax,
    totalWithTax: taxableAmount + totalTax,
    isInterState,
  };
}

/**
 * Calculate line item taxable amount after discount.
 */
export function calcLineItemTaxable(qty: number, unitPrice: number, discountPct: number): number {
  const gross = qty * unitPrice;
  const discount = (gross * discountPct) / 100;
  return gross - discount;
}

/**
 * Calculate round-off for invoice total.
 * Standard practice: round to nearest rupee.
 */
export function calcRoundOff(amount: number): number {
  return parseFloat((Math.round(amount) - amount).toFixed(2));
}

/**
 * Determine if a state is intra-Gujarat transaction.
 */
export function isIntraState(dealerState: string): boolean {
  return dealerState.toLowerCase() === 'gujarat';
}

/**
 * Get HSN-wise GST summary for GSTR filing.
 */
export interface HsnSummary {
  hsn: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export function getHsnSummary(
  lineItems: Array<{
    hsn: string;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
  }>
): HsnSummary[] {
  const map = new Map<string, HsnSummary>();
  for (const item of lineItems) {
    const existing = map.get(item.hsn);
    if (existing) {
      existing.taxableValue += item.taxableAmount;
      existing.cgst += item.cgst;
      existing.sgst += item.sgst;
      existing.igst += item.igst;
      existing.total += item.taxableAmount + item.cgst + item.sgst + item.igst;
    } else {
      map.set(item.hsn, {
        hsn: item.hsn,
        taxableValue: item.taxableAmount,
        cgst: item.cgst,
        sgst: item.sgst,
        igst: item.igst,
        total: item.taxableAmount + item.cgst + item.sgst + item.igst,
      });
    }
  }
  return Array.from(map.values());
}
