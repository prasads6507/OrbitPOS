'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier' | 'employee'>('employee');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Sign up the user in Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('No user data returned');

      // 2. Manually create the profile (Bypassing the database trigger)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          email: email,
          role: role,
        });

      // We ignore profile error if it's just a duplicate, but log others
      if (profileError && !profileError.message.includes('already exists')) {
        console.error('Profile creation error:', profileError);
      }

      toast.success('Registration successful! You can now sign in.');
      router.push('/login');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[460px] animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="bg-white p-12 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.08)] border border-gray-100">
        <div className="mb-10 text-center">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-xl">O</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-black mb-3">Create Workspace</h1>
          <p className="text-[#86868b] font-medium">Join thousands of modern retailers today.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-[13px] font-semibold text-black/60 ml-1">Full Name</Label>
            <Input 
              id="fullName" 
              placeholder="John Doe" 
              className="bg-[#f5f5f7] border-transparent h-14 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3] transition-all text-black font-medium"
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[13px] font-semibold text-black/60 ml-1">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="name@company.com" 
              className="bg-[#f5f5f7] border-transparent h-14 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3] transition-all text-black font-medium"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[13px] font-semibold text-black/60 ml-1">Password</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••"
              className="bg-[#f5f5f7] border-transparent h-14 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3] transition-all text-black font-medium"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-[13px] font-semibold text-black/60 ml-1">Work Role</Label>
            <Select onValueChange={(value: any) => setRole(value)} defaultValue="employee">
              <SelectTrigger className="bg-[#f5f5f7] border-transparent h-14 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3] transition-all text-black font-medium text-left">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-100 text-black rounded-2xl">
                <SelectItem value="admin">Store Admin</SelectItem>
                <SelectItem value="cashier">Store Cashier</SelectItem>
                <SelectItem value="employee">Staff Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full h-14 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-lg transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Create OrbitPOS Account'}
          </Button>
        </form>

        <p className="mt-10 text-center text-[#86868b] font-medium text-[13px]">
          Already have an account? <Link href="/login" className="text-[#0071e3] hover:underline transition-colors font-bold ml-1">Sign in</Link>
        </p>
      </div>
      
      <div className="mt-8 text-center">
        <Link href="/" className="inline-flex items-center text-gray-400 hover:text-black transition-colors text-[13px] font-semibold">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to OrbitPOS Home
        </Link>
      </div>
    </div>
  );
}
