import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { RefreshCw, Sun, Moon, Shield, Building2, Bell, Database, Lock } from 'lucide-react';
import { useSettingsStore } from '../../store/uiStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useOrderStore } from '../../store/orderStore';
import { useInvoiceStore } from '../../store/invoiceStore';
import { useDealerStore } from '../../store/dealerStore';
import { useActivityStore } from '../../store/uiStore';
import { Button, Card, Tabs } from '../../components/ui';
import { ConfirmDialog } from '../../components/overlays';
import type { AppSettings } from '../../types';

// ─── Company Profile Form ─────────────────────────────────────────────────────

const companySchema = z.object({
  name: z.string().min(3),
  gstin: z.string().min(15,'Valid GSTIN required'),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().length(6),
  phone: z.string().min(10),
  email: z.string().email(),
  bankName: z.string().min(3),
  accountNumber: z.string().min(8),
  ifsc: z.string().min(11).max(11),
  upiId: z.string().min(3),
  defaultGstRate: z.number({ coerce: true }).min(0).max(28),
  lowStockThreshold: z.number({ coerce: true }).min(1),
});
type CompanyFormData = z.infer<typeof companySchema>;

function CompanyProfileTab() {
  const { settings, updateCompanySettings } = useSettingsStore();
  const { register, handleSubmit, formState:{ errors, isDirty } } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: settings.company,
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: CompanyFormData) => {
    setLoading(true);
    await new Promise(r => setTimeout(r,500));
    updateCompanySettings(data);
    toast.success('Company profile updated');
    setLoading(false);
  };

  const Field = ({ label, name, type='text', mono=false, placeholder='' }: { label:string; name:keyof CompanyFormData; type?:string; mono?:boolean; placeholder?:string }) => (
    <div>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input type={type} {...register(name, type==='number' ? {valueAsNumber:true} : {})} placeholder={placeholder}
        className={`mt-1 w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${mono?'font-mono':''}`}/>
      {errors[name] && <p className="text-xs text-red-500 mt-0.5">{(errors[name] as {message?:string})?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><Building2 size={16} className="text-blue-500"/> Company Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Company Name" name="name"/></div>
          <div className="col-span-2"><Field label="GSTIN" name="gstin" mono placeholder="24AAXXX1234X1Z5"/></div>
          <div className="col-span-2"><Field label="Registered Address" name="address"/></div>
          <Field label="City" name="city"/>
          <Field label="State" name="state"/>
          <Field label="Pincode" name="pincode" mono/>
          <Field label="Phone" name="phone"/>
          <div className="col-span-2"><Field label="Email" name="email" type="email"/></div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Bank Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Bank Name" name="bankName"/></div>
          <Field label="Account Number" name="accountNumber" mono/>
          <Field label="IFSC Code" name="ifsc" mono/>
          <div className="col-span-2"><Field label="UPI ID" name="upiId"/></div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><Bell size={16} className="text-amber-500"/> Default Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Default GST Rate (%)" name="defaultGstRate" type="number"/>
          <Field label="Low Stock Threshold (units)" name="lowStockThreshold" type="number"/>
        </div>
      </Card>

      <Button type="submit" loading={loading} disabled={!isDirty && !loading}>Save Changes</Button>
    </form>
  );
}

// ─── Users & Roles ────────────────────────────────────────────────────────────

function UsersTab() {
  const { settings, setRole } = useSettingsStore();
  const users = [
    { id:'usr-001', name:'Vrund Doshi', email:'vrund@gitelectric.in', role:'Admin', active:true },
    { id:'usr-002', name:'Rikesh Patel', email:'rikesh@gitelectric.in', role:'Manager', active:true },
    { id:'usr-003', name:'Priya Shah', email:'priya@gitelectric.in', role:'Manager', active:false },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Shield size={16} className="text-blue-500"/> Users & Permissions</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Name</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Email</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Role</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {u.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                    u.role==='Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                  }`}>{u.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${u.active?'bg-emerald-500':'bg-slate-300'}`}/>
                  <span className="text-xs text-slate-500">{u.active?'Active':'Inactive'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Active Session Role</h3>
        <p className="text-xs text-slate-500 mb-3">Current user: <strong>{settings.currentUser.name}</strong> ({settings.currentUser.role})</p>
        <div className="flex gap-2">
          {(['Admin','Manager'] as const).map(role => (
            <button key={role} onClick={() => { setRole(role); toast.success(`Switched to ${role} role`); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                settings.currentUser.role===role
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}>
              {role}
            </button>
          ))}
        </div>
        <div className="mt-4 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
          <p className="font-semibold mb-1.5">Permission Matrix:</p>
          <ul className="space-y-0.5">
            <li>✅ Admin: Full access — create, edit, delete, view settings</li>
            <li>✅ Manager: Create & edit orders/invoices, view reports</li>
            <li>🚫 Manager: Cannot delete products or access System Settings</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

// ─── Security ─────────────────────────────────────────────────────────────────

function SecurityTab() {
  const { settings, updateSettings } = useSettingsStore();
  const [pin, setPin] = useState(settings.systemPin || '1234');
  
  const handleSave = () => {
    if (pin.length < 4) {
      toast.error('PIN must be at least 4 digits');
      return;
    }
    updateSettings({ systemPin: pin });
    toast.success('System PIN updated successfully');
  };

  return (
    <div className="space-y-4 max-w-lg">
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Lock size={16} className="text-blue-500"/> System Access PIN</h3>
        <p className="text-xs text-slate-500 mb-4">This PIN is required to access the ERP system. Make sure to remember it.</p>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New System PIN</label>
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={10}
              className="mt-1 w-full h-9 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono tracking-widest"
            />
          </div>
          <Button onClick={handleSave} disabled={pin === settings.systemPin}>Update PIN</Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Appearance ───────────────────────────────────────────────────────────────

function AppearanceTab() {
  const { settings, toggleTheme } = useSettingsStore();
  return (
    <div className="space-y-4 max-w-lg">
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Theme</h3>
        <div className="grid grid-cols-2 gap-3">
          {(['light','dark'] as const).map(theme => (
            <button key={theme} onClick={() => { if(settings.theme !== theme) toggleTheme(); }}
              className={`p-4 rounded-xl border-2 transition-colors flex flex-col items-center gap-2 ${
                settings.theme === theme
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}>
              {theme === 'light' ? <Sun size={24} className="text-amber-500"/> : <Moon size={24} className="text-blue-500"/>}
              <span className="text-sm font-medium capitalize">{theme} Mode</span>
              {settings.theme === theme && <span className="text-xs text-blue-600 dark:text-blue-400">Active</span>}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Data Management ──────────────────────────────────────────────────────────

function DataTab() {
  const { resetToSeed: resetInventory } = useInventoryStore();
  const { resetToSeed: resetOrders } = useOrderStore();
  const { resetToSeed: resetInvoices } = useInvoiceStore();
  const { resetToSeed: resetDealers } = useDealerStore();
  const { resetActivities } = useActivityStore();
  const { resetToSeed: resetSettings } = useSettingsStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = async () => {
    resetInventory(); resetOrders(); resetInvoices(); resetDealers(); resetActivities(); resetSettings();
    toast.success('Demo data restored to seed state');
    setShowConfirm(false);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Database size={16} className="text-red-500"/> Data Management</h3>
        <p className="text-xs text-slate-500 mb-4">Reset all application data back to the original demo seed. This action cannot be undone.</p>
        <Button variant="danger" leftIcon={<RefreshCw size={14}/>} onClick={() => setShowConfirm(true)}>
          Reset Demo Data
        </Button>
      </Card>
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleReset}
        title="Reset Demo Data"
        description="This will erase all changes and restore the original seed data. All custom products, orders, invoices, and dealers will be lost. Continue?"
        confirmLabel="Yes, Reset Everything"
      />
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

const SETTINGS_TABS = [
  { id:'company', label:'Company Profile' },
  { id:'users', label:'Users & Roles' },
  { id:'security', label:'Security' },
  { id:'appearance', label:'Appearance' },
  { id:'data', label:'Data' },
];

export default function SettingsPage() {
  const { settings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('company');

  if (settings.currentUser.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Shield size={48} className="text-slate-300 dark:text-slate-600 mb-4"/>
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-2">Only Admins can access System Settings. Switch your role to Admin to continue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">System Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage company profile, users, and application preferences</p>
      </div>

      <Card className="overflow-visible">
        <Tabs tabs={SETTINGS_TABS} activeTab={activeTab} onChange={setActiveTab} className="px-4"/>
        <div className="p-6">
          {activeTab === 'company' && <CompanyProfileTab/>}
          {activeTab === 'users' && <UsersTab/>}
          {activeTab === 'security' && <SecurityTab/>}
          {activeTab === 'appearance' && <AppearanceTab/>}
          {activeTab === 'data' && <DataTab/>}
        </div>
      </Card>
    </div>
  );
}
