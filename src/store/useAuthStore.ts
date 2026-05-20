import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useActiveStore } from '@/store/useActiveStore';
import { fetchProfileServer } from '@/app/actions/profile';

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
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('manually_selected_store');
    }
    set({ user: null, profile: null });
  },
  fetchProfile: async (userId) => {
    if (!userId) {
      console.warn('fetchProfile called without userId');
      set({ loading: false });
      return;
    }

    try {
      // Use server action to fetch profile (bypasses RLS via service role key)
      const { profile, store: storeData, error } = await fetchProfileServer(userId);

      if (error) {
        console.error('Profile fetch error:', error);
      }

      if (!profile) {
        console.warn('No profile found for user:', userId);
        set({ loading: false });
        return;
      }

      // Automatically align activeStore context to user's assigned store if not matching
      const currentActiveStore = useActiveStore.getState().activeStoreId;
      const isManual = typeof window !== 'undefined' && sessionStorage.getItem('manually_selected_store') === 'true';
      if (!isManual && profile.store_id && currentActiveStore !== profile.store_id) {
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
