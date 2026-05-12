'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { ShieldAlert, Loader2, ArrowLeft, Lock } from 'lucide-react';

export function SuperAdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 2. Verify Super Admin Role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || profile?.role !== 'super_admin') {
        // Not a super admin - sign them out and show error
        await supabase.auth.signOut();
        throw new Error('Access Denied: This portal is reserved for Super Administrators only.');
      }

      toast.success('Access Granted. Welcome back, Administrator.');
      router.push('/super-admin');
      
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[13px] font-medium ml-1 text-gray-300">Admin Email</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="admin@orbitpos.system" 
            className="bg-white/10 border-white/10 h-12 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder:text-gray-500 font-normal text-[15px]"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <Label htmlFor="password" className="text-[13px] font-medium text-gray-300">Secret Key</Label>
          </div>
          <div className="relative">
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••"
              className="bg-white/10 border-white/10 h-12 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder:text-gray-500 font-normal text-[15px] pl-10"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          </div>
        </div>

        <div className="pt-2">
          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl bg-white hover:bg-gray-200 text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] font-semibold text-[15px] transition-all active:scale-[0.98] disabled:opacity-50" 
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Enter Portal'}
          </Button>
        </div>
      </form>
    </div>
  );
}
