import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order, OrderStatus, ShippingInfo } from '../types';
import { SEED_ORDERS } from '../data/seed';
import { generateId, generateOrderNumber } from '../lib/formatters';

interface OrderState {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Order;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  updateOrderStatus: (id: string, status: OrderStatus, shippingInfo?: ShippingInfo) => void;
  cancelOrder: (id: string) => void;
  linkInvoice: (orderId: string, invoiceId: string) => void;
  recordPayment: (orderId: string, amount: number) => void;
  getNextOrderNumber: () => string;
  resetToSeed: () => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: SEED_ORDERS,

      getNextOrderNumber: () => generateOrderNumber(get().orders),

      addOrder: (orderData) => {
        const order: Order = {
          ...orderData,
          id: generateId('ord'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ orders: [order, ...s.orders] }));
        return order;
      },

      updateOrder: (id, updates) => {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
          ),
        }));
      },

      updateOrderStatus: (id, status, shippingInfo) => {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  orderStatus: status,
                  shippingInfo: shippingInfo ?? o.shippingInfo,
                  updatedAt: new Date().toISOString(),
                }
              : o
          ),
        }));
      },

      cancelOrder: (id) => {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id
              ? { ...o, orderStatus: 'Cancelled', updatedAt: new Date().toISOString() }
              : o
          ),
        }));
      },

      linkInvoice: (orderId, invoiceId) => {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId ? { ...o, invoiceId, updatedAt: new Date().toISOString() } : o
          ),
        }));
      },

      recordPayment: (orderId, amount) => {
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== orderId) return o;
            const newPaid = o.paidAmount + amount;
            const paymentStatus =
              newPaid >= o.grandTotal ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';
            return { ...o, paidAmount: newPaid, paymentStatus, updatedAt: new Date().toISOString() };
          }),
        }));
      },

      resetToSeed: () => {
        set({ orders: SEED_ORDERS });
      },
    }),
    { name: 'git-erp-orders' }
  )
);
