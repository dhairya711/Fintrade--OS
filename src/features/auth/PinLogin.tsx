import React, { useState } from 'react';
import { useUiStore, useSettingsStore } from '../../store/uiStore';
import { Button, Input, Card } from '../../components/ui';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function PinLogin() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuthenticated } = useUiStore();
  const { settings } = useSettingsStore();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      const activePin = settings.systemPin || '1234';
      if (pin === activePin) {
        setAuthenticated(true);
        toast.success('Access granted');
      } else {
        toast.error('Invalid System PIN');
        setPin('');
      }
      setLoading(false);
    }, 400); // Artificial delay to simulate processing
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4">
      <Card className="w-full max-w-sm p-6 bg-slate-950 border-slate-800 shadow-xl text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-600/10 flex items-center justify-center border border-blue-600/20">
            <Lock className="text-blue-500" size={32} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">{settings.company.name}</h1>
        <p className="text-sm text-slate-400 mb-8">Enter the System PIN to access the ERP</p>
        
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <Input
            type="password"
            placeholder="Enter 4-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="text-center text-lg tracking-widest bg-slate-900 border-slate-700 text-white placeholder-slate-600"
            maxLength={10} // Just in case they changed it
            autoFocus
          />
          <Button 
            type="submit" 
            className="w-full h-10 text-base" 
            loading={loading}
            disabled={!pin || loading}
          >
            Access System
          </Button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500">
          <p>Protected by GIT ERP Secure Access</p>
          <p className="mt-1">Default PIN is 1234 (Can be changed in settings)</p>
        </div>
      </Card>
    </div>
  );
}
