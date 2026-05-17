import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveStoreState {
  activeStoreId: string | null;
  activeStoreName: string | null;
  setActiveStore: (id: string | null, name: string | null) => void;
}

export const useActiveStore = create<ActiveStoreState>()(
  persist(
    (set) => ({
      activeStoreId: null,
      activeStoreName: null,
      setActiveStore: (activeStoreId, activeStoreName) => set({ activeStoreId, activeStoreName }),
    }),
    {
      name: 'active-store-storage',
    }
  )
);
