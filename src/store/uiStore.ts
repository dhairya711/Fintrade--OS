import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActivityFeedItem, Notification, AppSettings, AppUser, UserRole } from '../types';
import { SEED_ACTIVITY } from '../data/seed';
import { generateId } from '../lib/formatters';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  company: {
    name: 'FinTrade OS Ltd.',
    gstin: '24AACFG1234A1Z5',
    address: '6, Loha Bhuvan, Old Lakkad Pitha Road, Sultanpura',
    city: 'Vadodara',
    state: 'Gujarat',
    pincode: '390001',
    phone: '+91 265 123 4567',
    email: 'info@fintrade-os.com',
    bankName: 'State Bank of India',
    accountNumber: '38012345678',
    ifsc: 'SBIN0001234',
    upiId: 'fintrade@sbi',
    defaultGstRate: 18,
    lowStockThreshold: 20,
    currency: 'INR',
  },
  currentUser: {
    id: 'usr-001',
    name: 'Vrund Doshi',
    email: 'vrund@fintrade-os.com',
    role: 'Admin',
  },
  systemPin: '1234',
};

interface UiState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  notificationsOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (val: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleNotifications: () => void;
  closeNotifications: () => void;
  isAuthenticated: boolean;
  setAuthenticated: (val: boolean) => void;
}

interface SettingsState {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateCompanySettings: (updates: Partial<AppSettings['company']>) => void;
  setCurrentUser: (user: AppUser) => void;
  setRole: (role: UserRole) => void;
  toggleTheme: () => void;
  resetToSeed: () => void;
}

interface ActivityState {
  activities: ActivityFeedItem[];
  notifications: Notification[];
  addActivity: (item: Omit<ActivityFeedItem, 'id' | 'createdAt'>) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  resetActivities: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  notificationsOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleNotifications: () => set((s) => ({ notificationsOpen: !s.notificationsOpen })),
  closeNotifications: () => set({ notificationsOpen: false }),
  isAuthenticated: false,
  setAuthenticated: (val) => set({ isAuthenticated: val }),
}));

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (updates) =>
        set((s) => ({ settings: { ...s.settings, ...updates } })),
      updateCompanySettings: (updates) =>
        set((s) => ({
          settings: { ...s.settings, company: { ...s.settings.company, ...updates } },
        })),
      setCurrentUser: (user) =>
        set((s) => ({ settings: { ...s.settings, currentUser: user } })),
      setRole: (role) =>
        set((s) => ({
          settings: {
            ...s.settings,
            currentUser: { ...s.settings.currentUser, role },
          },
        })),
      toggleTheme: () =>
        set((s) => ({
          settings: {
            ...s.settings,
            theme: s.settings.theme === 'light' ? 'dark' : 'light',
          },
        })),
      resetToSeed: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    { name: 'git-erp-settings' }
  )
);

const SEED_NOTIFICATIONS: Notification[] = [
  { id: 'notif-001', type: 'low_stock', title: 'Low Stock Alert', message: 'Compact On Load By Pass Switch: 15 units left (reorder at 25)', read: false, referenceId: 'prod-003', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'notif-002', type: 'low_stock', title: 'Low Stock Alert', message: 'Digital Timer Relay 0-60s: 7 units left (reorder at 20)', read: false, referenceId: 'prod-014', createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
  { id: 'notif-003', type: 'new_order', title: 'New Order Received', message: 'ORD-2026-917 from Dwarkesh Switchgears – ₹42,300', read: false, referenceId: 'ord-029', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'notif-004', type: 'new_order', title: 'New Order Received', message: 'ORD-2026-918 from Patel Power House – ₹28,100', read: true, referenceId: 'ord-030', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'notif-005', type: 'order_overdue', title: 'Invoice Overdue', message: 'INV-2026-014 for Capital Electricals Gandhinagar is overdue', read: false, referenceId: 'inv-014', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
];

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      activities: SEED_ACTIVITY,
      notifications: SEED_NOTIFICATIONS,

      addActivity: (itemData) => {
        const item: ActivityFeedItem = {
          ...itemData,
          id: generateId('act'),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ activities: [item, ...s.activities] }));
      },

      addNotification: (notifData) => {
        const notif: Notification = {
          ...notifData,
          id: generateId('notif'),
          createdAt: new Date().toISOString(),
          read: false,
        };
        set((s) => ({ notifications: [notif, ...s.notifications] }));
      },

      markNotificationRead: (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },

      markAllRead: () => {
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      resetActivities: () => {
        set({ activities: SEED_ACTIVITY, notifications: SEED_NOTIFICATIONS });
      },
    }),
    { name: 'git-erp-activity' }
  )
);
