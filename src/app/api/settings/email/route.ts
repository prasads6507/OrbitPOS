import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('stores')
      .select('email_provider, email_api_key, sender_email, smtp_host, smtp_port, smtp_user, smtp_pass')
      .eq('id', storeId)
      .single();

    if (error) throw error;
    
    // Mask passwords/keys for security in GET
    const maskedData = {
      ...data,
      email_api_key: data?.email_api_key ? '••••••••••••••••' : '',
      smtp_pass: data?.smtp_pass ? '••••••••••••••••' : '',
    };

    return NextResponse.json(maskedData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storeId, ...settings } = body;
    
    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    // Do not update with masked values
    if (settings.email_api_key === '••••••••••••••••') delete settings.email_api_key;
    if (settings.smtp_pass === '••••••••••••••••') delete settings.smtp_pass;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('stores')
      .update(settings)
      .eq('id', storeId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
