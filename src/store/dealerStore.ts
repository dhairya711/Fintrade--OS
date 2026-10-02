import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Dealer } from '../types';
import { SEED_DEALERS } from '../data/seed';
import { generateId } from '../lib/formatters';

interface DealerState {
  dealers: Dealer[];
  addDealer: (dealer: Omit<Dealer, 'id' | 'createdAt' | 'totalOrders' | 'totalRevenue'>) => Dealer;
  updateDealer: (id: string, updates: Partial<Dealer>) => void;
  deleteDealer: (id: string) => void;
  updateDealerStats: (id: string, orderTotal: number, delta: number) => void;
  resetToSeed: () => void;
}

export const useDealerStore = create<DealerState>()(
  persist(
    (set) => ({
      dealers: SEED_DEALERS,

      addDealer: (dealerData) => {
        const dealer: Dealer = {
          ...dealerData,
          id: generateId('dlr'),
          totalOrders: 0,
          totalRevenue: 0,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ dealers: [...s.dealers, dealer] }));
        return dealer;
      },

      updateDealer: (id, updates) => {
        set((s) => ({
          dealers: s.dealers.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        }));
      },

      deleteDealer: (id) => {
        set((s) => ({ dealers: s.dealers.filter((d) => d.id !== id) }));
      },

      updateDealerStats: (id, orderTotal, delta) => {
        set((s) => ({
          dealers: s.dealers.map((d) =>
            d.id === id
              ? {
                  ...d,
                  totalOrders: d.totalOrders + delta,
                  totalRevenue: d.totalRevenue + orderTotal,
                  outstandingBalance: Math.max(0, d.outstandingBalance + orderTotal),
                }
              : d
          ),
        }));
      },

      resetToSeed: () => {
        set({ dealers: SEED_DEALERS });
      },
    }),
    { name: 'git-erp-dealers' }
  )
);
