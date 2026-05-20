'use server';

import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export async function fetchProfileServer(userId: string) {
  try {
    if (!userId) {
      return { profile: null, store: null, error: 'No userId provided' };
    }

    const admin = getSupabaseAdmin();

    // 1. Fetch Profile (bypasses RLS)
    const { data: profile, error: pError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (pError) {
      console.error('Server profile fetch error:', pError);
      return { profile: null, store: null, error: pError.message };
    }

    if (!profile) {
      return { profile: null, store: null, error: 'No profile found' };
    }

    // 2. Fetch Store if exists
    let store = null;
    if (profile.store_id) {
      const { data: storeData, error: sError } = await admin
        .from('stores')
        .select('*')
        .eq('id', profile.store_id)
        .maybeSingle();

      if (sError) {
        console.error('Server store fetch error:', sError);
      }
      store = storeData;
    }

    return { profile, store, error: null };
  } catch (err: any) {
    console.error('Unexpected error in fetchProfileServer:', err);
    return { profile: null, store: null, error: err.message };
  }
}

export async function createProfileServer(profileData: {
  id: string;
  full_name: string;
  email: string;
  role: string;
  store_id: string;
}) {
  try {
    const admin = getSupabaseAdmin();
    const { data: profile, error } = await admin
      .from('profiles')
      .insert(profileData)
      .select('*')
      .single();

    if (error) {
      console.error('Server create profile error:', error);
      return { profile: null, error: error.message };
    }

    return { profile, error: null };
  } catch (err: any) {
    console.error('Unexpected error in createProfileServer:', err);
    return { profile: null, error: err.message };
  }
}
