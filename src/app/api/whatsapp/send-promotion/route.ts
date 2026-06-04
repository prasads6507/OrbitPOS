import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to add a delay between messages to avoid rate limits
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { storeId, message } = await req.json();
    if (!storeId || !message) {
      return NextResponse.json({ error: 'storeId and message are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch all customers for the store
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, full_name, phone')
      .eq('store_id', storeId);

    if (customersError || !customers) {
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }

    // 2. Filter customers with valid phone numbers
    const targetCustomers = customers.filter(c => c.phone && c.phone.trim().length >= 10);
    
    if (targetCustomers.length === 0) {
      return NextResponse.json({ error: 'No customers with valid phone numbers found.' }, { status: 400 });
    }

    const openWaUrl = process.env.WHATSAPP_API_URL || 'http://localhost:8080';
    let successCount = 0;
    let failureCount = 0;

    // 3. Send message to each customer
    for (const customer of targetCustomers) {
      let phone = customer.phone!.replace(/\D/g, '');
      if (phone.length === 10) {
        phone = `91${phone}`; // default to Indian country code
      }
      const recipientChatId = `${phone}@c.us`;

      try {
        const response = await fetch(`${openWaUrl}/sendText`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WHATSAPP_SESSION_KEY || ''}`,
          },
          body: JSON.stringify({
            to: recipientChatId,
            content: message,
            // Support generic wa-automate format keys:
            chatId: recipientChatId,
            body: message,
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          failureCount++;
          console.error(`Failed to send to ${phone}`);
        }
      } catch (waErr: any) {
        failureCount++;
        console.error(`Error sending to ${phone}:`, waErr.message);
      }

      // Add a 500ms delay to prevent rate limiting / spam blocks
      await delay(500);
    }

    return NextResponse.json({ 
      success: true, 
      successCount, 
      failureCount,
      totalAttempted: targetCustomers.length 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
