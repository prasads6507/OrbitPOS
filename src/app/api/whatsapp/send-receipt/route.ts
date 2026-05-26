import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch Order details along with Store, Customer, and Items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        stores(*),
        customers(*),
        order_items(*, products(*))
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const customer = order.customers;
    const store = order.stores;
    const items = order.order_items || [];

    // Ensure we have a customer phone number to send to
    const rawPhone = customer?.phone || order.phone_number; // fallback if order directly has a phone
    if (!rawPhone) {
      return NextResponse.json({ message: 'Order has no attached phone number for WhatsApp' });
    }

    // Clean phone number (remove +, spaces, dashes, ensure country code)
    let phone = rawPhone.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = `91${phone}`; // default to Indian country code if 10-digit number
    }
    const recipientChatId = `${phone}@c.us`;

    // 2. Format a premium, elegant text receipt template
    const dateStr = new Date(order.created_at).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    let itemsText = '';
    items.forEach((item: any, i: number) => {
      const pName = item.products?.name || 'Item';
      const variantStr = item.variant_name ? ` (${item.variant_name})` : '';
      itemsText += `${i + 1}. *${pName}${variantStr}*\n   ${item.quantity} x ₹${item.unit_price} = *₹${item.total_price}*\n`;
    });

    const paymentMethodLabel = order.is_split_payment 
      ? `Split (Cash: ₹${order.split_cash_amount} · Card: ₹${order.split_card_amount} · UPI: ₹${order.split_upi_amount})`
      : order.payment_method.toUpperCase();

    const loyaltyEarnedText = order.points_earned ? `✨ Points Earned: *+${order.points_earned}*\n` : '';
    const loyaltyRedeemedText = order.points_redeemed ? `🎁 Points Redeemed: *-${order.points_redeemed}*\n` : '';
    const loyaltyBalanceText = customer ? `📊 Balance: *${customer.loyalty_points} points*\n` : '';
    const loyaltyBlock = customer ? `\n--- *Loyalty Rewards* ---\n${loyaltyEarnedText}${loyaltyRedeemedText}${loyaltyBalanceText}` : '';

    const message = `🛍️ *RECEIPT — ${store?.name || 'OrbitPOS'}* 🛍️\n\n` +
      `*Order ID:* #${order.id.slice(0, 8).toUpperCase()}\n` +
      `*Date:* ${dateStr}\n` +
      `*Cashier:* System\n` +
      `*Customer:* ${customer?.full_name || 'Walk-in'}\n\n` +
      `--- *Items Purchased* ---\n` +
      `${itemsText}\n` +
      `--- *Payment breakdown* ---\n` +
      `💰 Subtotal: *₹${(order.total_amount - order.tax_amount + order.discount_amount).toFixed(2)}*\n` +
      `🧾 Taxes: *₹${order.tax_amount.toFixed(2)}*\n` +
      `🎁 Discount: *-₹${order.discount_amount.toFixed(2)}*\n` +
      `⭐ *Total Paid: ₹${order.total_amount.toFixed(2)}*\n\n` +
      `💳 *Payment Method:* ${paymentMethodLabel}\n` +
      `${loyaltyBlock}\n` +
      `Thank you for shopping with us! Join us again soon. 💫\n` +
      `_OrbitPOS — Premium Multi-Tenant Retail Engine_`;

    // 3. Make HTTP request to OpenWA Docker container REST API
    const openWaUrl = process.env.WHATSAPP_API_URL || 'http://localhost:8080';
    let status = 'failed';

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
        status = 'sent';
      } else {
        const errorText = await response.text();
        console.error('OpenWA container response error:', errorText);
      }
    } catch (waErr: any) {
      console.error('Failed to dispatch request to OpenWA Docker container:', waErr.message);
    }

    // 4. Log in public.whatsapp_logs
    await supabase.from('whatsapp_logs').insert({
      order_id: order.id,
      phone_number: rawPhone,
      status: status,
    });

    return NextResponse.json({ success: status === 'sent', status, phone: rawPhone });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
