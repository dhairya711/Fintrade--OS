import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, StockMovement, Godown } from '../types';
import { SEED_PRODUCTS, SEED_STOCK_MOVEMENTS } from '../data/seed';
import { generateId } from '../lib/formatters';

interface InventoryState {
  products: Product[];
  stockMovements: StockMovement[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  deleteProducts: (ids: string[]) => void;
  addStockMovement: (movement: Omit<StockMovement, 'id' | 'createdAt'>) => void;
  restockProduct: (productId: string, qty: number, supplier: string, note: string) => void;
  adjustStock: (productId: string, qty: number, note: string) => void;
  reserveStock: (productId: string, qty: number, orderId: string) => boolean;
  releaseStock: (productId: string, qty: number, orderId: string) => void;
  deductStock: (productId: string, qty: number, orderId: string) => void;
  godowns: Godown[];
  transferStock: (productId: string, fromGodownId: string, toGodownId: string, qty: number) => void;
  bulkImportProducts: (products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  resetToSeed: () => void;
}

const DEFAULT_GODOWNS: Godown[] = [
  { id: 'g1', name: 'Main Warehouse (Makarpura)', type: 'Warehouse' },
  { id: 'g2', name: 'City Showroom (Alkapuri)', type: 'Showroom' },
  { id: 'g3', name: 'Transit / Dispatch', type: 'Transit' },
];

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      products: SEED_PRODUCTS.map(p => ({
        ...p,
        locationStock: { 'g1': p.currentStock },
        trackSerialNumbers: ['Switchgears', 'Transformers'].includes(p.category),
        serialNumbers: ['Switchgears', 'Transformers'].includes(p.category) ? 
          Array.from({length: Math.min(p.currentStock, 10)}).map((_, i) => `${p.sku.split('-')[1]}-${1000 + i}`) : [],
      })),
      stockMovements: SEED_STOCK_MOVEMENTS,
      godowns: DEFAULT_GODOWNS,

      addProduct: (productData) => {
        const product: Product = {
          ...productData,
          id: generateId('prod'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ products: [...s.products, product] }));
        return product;
      },

      updateProduct: (id, updates) => {
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deleteProduct: (id) => {
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
      },

      deleteProducts: (ids) => {
        set((s) => ({ products: s.products.filter((p) => !ids.includes(p.id)) }));
      },

      addStockMovement: (movementData) => {
        const movement: StockMovement = {
          ...movementData,
          id: generateId('sm'),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ stockMovements: [...s.stockMovements, movement] }));
      },

      restockProduct: (productId, qty, supplier, note) => {
        set((s) => ({
          products: s.products.map((p) =>
            p.id === productId
              ? { ...p, currentStock: p.currentStock + qty, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        get().addStockMovement({
          productId,
          type: 'IN',
          quantity: qty,
          referenceType: 'RESTOCK',
          supplier,
          note,
          createdBy: 'Vrund Doshi',
        });
      },

      adjustStock: (productId, qty, note) => {
        set((s) => ({
          products: s.products.map((p) =>
            p.id === productId
              ? { ...p, currentStock: Math.max(0, p.currentStock + qty), updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        get().addStockMovement({
          productId,
          type: 'ADJUSTMENT',
          quantity: Math.abs(qty),
          referenceType: 'ADJUSTMENT',
          note,
          createdBy: 'Vrund Doshi',
        });
      },

      reserveStock: (productId, qty, orderId) => {
        const prod = get().products.find((p) => p.id === productId);
        if (!prod || prod.currentStock < qty) return false;
        set((s) => ({
          products: s.products.map((p) =>
            p.id === productId
              ? { ...p, currentStock: p.currentStock - qty, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        get().addStockMovement({
          productId,
          type: 'RESERVED',
          quantity: qty,
          referenceId: orderId,
          referenceType: 'ORDER',
          note: `Reserved for order ${orderId}`,
          createdBy: 'System',
        });
        return true;
      },

      releaseStock: (productId, qty, orderId) => {
        set((s) => ({
          products: s.products.map((p) =>
            p.id === productId
              ? { ...p, currentStock: p.currentStock + qty, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        get().addStockMovement({
          productId,
          type: 'RELEASED',
          quantity: qty,
          referenceId: orderId,
          referenceType: 'ORDER',
          note: `Released from cancelled order ${orderId}`,
          createdBy: 'System',
        });
      },

      transferStock: (productId, fromGodownId, toGodownId, qty) => {
        set((s) => ({
          products: s.products.map((p) => {
            if (p.id !== productId) return p;
            const fromStock = p.locationStock?.[fromGodownId] || 0;
            if (fromStock < qty) return p; // prevent negative
            
            const newLocationStock = { ...p.locationStock };
            newLocationStock[fromGodownId] = fromStock - qty;
            newLocationStock[toGodownId] = (newLocationStock[toGodownId] || 0) + qty;
            
            return { ...p, locationStock: newLocationStock, updatedAt: new Date().toISOString() };
          })
        }));
        get().addStockMovement({
          productId,
          type: 'ADJUSTMENT', // Using adjustment as transfer for simplicity
          quantity: qty,
          note: `Transferred from ${fromGodownId} to ${toGodownId}`,
          createdBy: 'Vrund Doshi'
        });
      },

      deductStock: (productId, qty, orderId) => {
        get().addStockMovement({
          productId,
          type: 'OUT',
          quantity: qty,
          referenceId: orderId,
          referenceType: 'ORDER',
          note: `Dispatched for order ${orderId}`,
          createdBy: 'System',
        });
      },

      bulkImportProducts: (newProductsData) => {
        const newProducts: Product[] = newProductsData.map(data => ({
          ...data,
          id: generateId('prod'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        set((s) => ({ products: [...s.products, ...newProducts] }));
      },

      resetToSeed: () => {
        set({ products: SEED_PRODUCTS, stockMovements: SEED_STOCK_MOVEMENTS });
      },
    }),
    { name: 'git-erp-inventory' }
  )
);
