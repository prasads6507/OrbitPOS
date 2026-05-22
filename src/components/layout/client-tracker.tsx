'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';

export function ClientTracker() {
  const pathname = usePathname();
  const { profile } = useAuthStore();

  useEffect(() => {
    if (!profile?.id || !pathname) return;

    // We avoid logging some very common passive actions if we want, 
    // but for now we log every pathname change.
    
    // Format the pathname to be more readable
    const readablePath = pathname.replace('/admin', 'Admin').replace('/', ' ').trim() || 'Dashboard';
    const action = 'page_visit';
    const description = `Visited ${readablePath} page`;

    supabase.from('activity_logs').insert({
      employee_id: profile.id,
      store_id: profile.store_id || '00000000-0000-0000-0000-000000000000',
      action: action,
      description: description
    }).then(({ error }) => {
      if (error) {
        // Silently ignore if table doesn't exist yet
      }
    });
  }, [pathname, profile]);

  return null;
}
