'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Mail, 
  CreditCard,
  Loader2,
  Camera,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { profile, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    hourly_rate: 0,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        hourly_rate: profile.hourly_rate || 0,
      });
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          ...(profile.role === 'admin' && { hourly_rate: formData.hourly_rate }),
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      await fetchProfile(profile.id);
      toast.success('Settings updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">Settings</h1>
        <p className="text-[#86868b] font-medium mt-1">Manage your account and workspace preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-1">
          <SettingsNavItem icon={User} label="Profile" active />
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-8">
          {/* Profile Section */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-10 border-b border-gray-50 bg-[#fbfbfd]">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-[2rem] bg-[#0071e3] text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-500/20">
                    {profile?.full_name?.charAt(0)}
                  </div>
                  <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">{profile?.full_name}</h3>
                  <p className="text-[13px] text-gray-400 font-medium capitalize">{profile?.role} Account</p>
                </div>
              </div>
            </div>

            <div className="p-10">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</Label>
                    <Input 
                      id="full_name"
                      className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</Label>
                    <Input 
                      id="email"
                      disabled
                      className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl opacity-50 font-bold"
                      value={formData.email}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Hourly Rate ($)</Label>
                    <Input 
                      id="hourly_rate"
                      type="number"
                      step="0.01"
                      disabled={profile?.role !== 'admin'}
                      className={`h-14 bg-[#f5f5f7] rounded-2xl font-bold ${profile?.role !== 'admin' ? 'opacity-50 cursor-not-allowed border-transparent' : 'border-transparent focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10'}`}
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50 flex justify-end">
                  <Button 
                    type="submit"
                    disabled={loading}
                    className="bg-black text-white px-8 h-14 rounded-2xl font-bold shadow-xl shadow-black/10 hover:bg-gray-800 transition-all"
                  >
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Danger Zone */}
          {profile?.role === 'admin' && (
            <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 flex items-center justify-between">
              <div>
                <h4 className="text-rose-900 font-bold">Delete Account</h4>
                <p className="text-[13px] text-rose-600 mt-1">Permanently remove your workspace and all data.</p>
              </div>
              <Button variant="ghost" className="text-rose-600 font-bold hover:bg-rose-100 rounded-xl">
                Deactivate Account
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsNavItem({ icon: Icon, label, active }: any) {
  return (
    <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-bold transition-all ${active ? 'bg-white text-[#0071e3] shadow-sm border border-gray-100' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}>
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}
