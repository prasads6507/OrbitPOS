import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useActiveStore } from '@/store/useActiveStore';

interface AuthState {
  user: any | null;
  profile: any | null;
  loading: boolean;
  setUser: (user: any) => void;
  setProfile: (profile: any | null) => void;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  signOut: async () => {
    await supabase.auth.signOut();
    useActiveStore.getState().setActiveStore(null, null);
    set({ user: null, profile: null });
  },
  fetchProfile: async (userId) => {
    if (!userId) {
      console.warn('fetchProfile called without userId');
      set({ loading: false });
      return;
    }

    try {
      // 1. Fetch Profile
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (pError) {
        console.error('Profile fetch error:', JSON.stringify(pError, null, 2));
      }

      if (!profile) {
        console.warn('No profile found for user:', userId);
        set({ loading: false });
        return;
      }

      // 2. Fetch Store if exists
      let storeData = null;
      if ((profile as any).store_id) {
        const { data: store, error: sError } = await supabase
          .from('stores' as any)
          .select('*')
          .eq('id', (profile as any).store_id)
          .maybeSingle();
        
        if (sError) {
          console.error('Store fetch error:', JSON.stringify(sError, null, 2));
        }
        storeData = store;
      }

      // Automatically align activeStore context to user's assigned store if not matching
      const currentActiveStore = useActiveStore.getState().activeStoreId;
      if (profile.store_id && currentActiveStore !== profile.store_id) {
        useActiveStore.getState().setActiveStore(
          profile.store_id, 
          storeData ? storeData.name : 'Primary Store'
        );
      }

      set({ 
        profile: { 
          ...profile, 
          stores: storeData || { name: 'OrbitPOS (Default)', branding_logo: null } 
        } 
      });

    } catch (err: any) {
      console.error('Unexpected error in fetchProfile:', err);
    } finally {
      set({ loading: false });
    }
  },
  setLoading: (loading) => set({ loading }),
}));
