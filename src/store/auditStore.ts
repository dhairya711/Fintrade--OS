import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../lib/formatters';

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  user: string;
  role: string;
  ipAddress: string;
  timestamp: string;
  hash: string;
}

interface AuditState {
  logs: AuditLog[];
  logAction: (action: string, entity: string, details: string, entityId?: string) => void;
  clearLogs: () => void;
}

// Generate some fake seed logs so it looks good for the resume
const SEED_LOGS: AuditLog[] = Array.from({ length: 45 }).map((_, i) => {
  const d = new Date();
  d.setHours(d.getHours() - (i * 2) - Math.floor(Math.random() * 5));
  return {
    id: `aud-${1000 - i}`,
    action: ['CREATED', 'UPDATED', 'DELETED', 'APPROVED', 'EXPORTED'][Math.floor(Math.random() * 5)],
    entity: ['INVOICE', 'ORDER', 'PRODUCT', 'DEALER', 'SYSTEM_SETTINGS'][Math.floor(Math.random() * 5)],
    details: 'System seeded event for audit demonstration',
    user: Math.random() > 0.5 ? 'Vrund Doshi' : 'Rikesh Patel',
    role: Math.random() > 0.5 ? 'Admin' : 'Manager',
    ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
    timestamp: d.toISOString(),
    hash: Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
  };
});

export const useAuditStore = create<AuditState>()(
  persist(
    (set) => ({
      logs: SEED_LOGS,
      logAction: (action, entity, details, entityId) => {
        // In a real app we'd get this from useSettingsStore, but we'll hardcode for simplicity
        // or just mock it here
        const log: AuditLog = {
          id: generateId('aud'),
          action,
          entity,
          entityId,
          details,
          user: 'Current User', // Will be overridden in components when needed
          role: 'Admin',
          ipAddress: '192.168.1.105', // Mock IP
          timestamp: new Date().toISOString(),
          hash: Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
        };
        set((s) => ({ logs: [log, ...s.logs] }));
      },
      clearLogs: () => set({ logs: [] }),
    }),
    { name: 'git-erp-audit' }
  )
);
