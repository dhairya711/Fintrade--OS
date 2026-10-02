import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Invoice, Payment, InvoiceStatus } from '../types';
import { SEED_INVOICES } from '../data/seed';
import { generateId, generateInvoiceNumber } from '../lib/formatters';

interface InvoiceState {
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  recordPayment: (invoiceId: string, payment: Omit<Payment, 'id'>) => void;
  markAsSent: (invoiceId: string) => void;
  getNextInvoiceNumber: () => string;
  resetToSeed: () => void;
}

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      invoices: SEED_INVOICES,

      getNextInvoiceNumber: () => generateInvoiceNumber(get().invoices),

      addInvoice: (invoiceData) => {
        const invoice: Invoice = {
          ...invoiceData,
          id: generateId('inv'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ invoices: [invoice, ...s.invoices] }));
        return invoice;
      },

      updateInvoice: (id, updates) => {
        set((s) => ({
          invoices: s.invoices.map((inv) =>
            inv.id === id ? { ...inv, ...updates, updatedAt: new Date().toISOString() } : inv
          ),
        }));
      },

      recordPayment: (invoiceId, paymentData) => {
        const payment: Payment = { ...paymentData, id: generateId('pay') };
        set((s) => ({
          invoices: s.invoices.map((inv) => {
            if (inv.id !== invoiceId) return inv;
            const newPaid = inv.paidAmount + payment.amount;
            const status: InvoiceStatus =
              newPaid >= inv.grandTotal ? 'Paid' : newPaid > 0 ? 'Partial' : inv.status;
            return {
              ...inv,
              paidAmount: newPaid,
              status,
              payments: [...inv.payments, payment],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      markAsSent: (invoiceId) => {
        set((s) => ({
          invoices: s.invoices.map((inv) =>
            inv.id === invoiceId
              ? {
                  ...inv,
                  status: inv.status === 'Draft' ? 'Unpaid' : inv.status,
                  sentAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : inv
          ),
        }));
      },

      resetToSeed: () => {
        set({ invoices: SEED_INVOICES });
      },
    }),
    { name: 'git-erp-invoices' }
  )
);
