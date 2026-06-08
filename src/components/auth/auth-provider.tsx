'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, fetchProfile } = useAuthStore();
  const router = useRouter();

  // Handle Authentication State
  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        useAuthStore.getState().setLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') return; // Handled by getSession()

        if (session) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          useAuthStore.getState().setProfile(null);
          useAuthStore.getState().setLoading(false);
          router.push('/login');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, fetchProfile, router]);

  // Handle Inactivity Timeout (15 minutes)
  useEffect(() => {
    if (!user) return; // Only track inactivity if user is logged in

    let timeoutId: NodeJS.Timeout;
    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

    const handleActivity = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Auto logout
        supabase.auth.signOut().then(() => {
          toast.error('You have been logged out due to inactivity.');
        });
      }, INACTIVITY_LIMIT_MS);
    };

    // Initialize timer
    handleActivity();

    // Listen for user activity
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user]);

  return <>{children}</>;
}
