'use server';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const getSupabaseAdmin = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in Vercel Environment Variables');
  }
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export async function createEmployee(formData: {
  email: string;
  full_name: string;
  role: 'admin' | 'cashier' | 'employee';
  hourly_rate: number;
  store_id: string;
  password?: string;
}) {
  try {
    // 1. Create user in Auth
    const { data: authData, error: authError } = await getSupabaseAdmin().auth.admin.createUser({
      email: formData.email,
      password: formData.password || 'OrbitPOS123!', // Default password if not provided
      email_confirm: true,
      user_metadata: {
        full_name: formData.full_name,
        role: formData.role,
        store_id: formData.store_id
      }
    });

    if (authError) throw authError;

    // 2. Create profile entry
    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        hourly_rate: formData.hourly_rate,
        store_id: formData.store_id,
      });

    if (profileError) {
      // Cleanup auth user if profile creation fails
      await getSupabaseAdmin().auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return { error: error.message || 'Failed to create employee' };
  }
}

export async function updateEmployeeRole(id: string, role: string) {
  try {
    const { error } = await getSupabaseAdmin()
      .from('profiles')
      .update({ role: role as any })
      .eq('id', id);

    if (error) throw error;
    
    await getSupabaseAdmin().auth.admin.updateUserById(id, { user_metadata: { role } });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating role:', error);
    return { error: error.message || 'Failed to update role' };
  }
}

export async function updateEmployeePayRate(id: string, hourly_rate: number) {
  try {
    const { error } = await getSupabaseAdmin()
      .from('profiles')
      .update({ hourly_rate })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating pay rate:', error);
    return { error: error.message || 'Failed to update pay rate' };
  }
}

export async function deleteEmployee(id: string) {
  try {
    // 1. Delete from auth.users (this will cascade to profiles if foreign key is set to cascade)
    // If not set to cascade, we delete from profiles first.
    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .delete()
      .eq('id', id);
      
    if (profileError) throw profileError;

    const { error: authError } = await getSupabaseAdmin().auth.admin.deleteUser(id);
    
    if (authError) throw authError;
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return { error: error.message || 'Failed to delete employee' };
  }
}
