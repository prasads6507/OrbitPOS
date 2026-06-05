import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { storeId, message } = await req.json();
    if (!storeId || !message) {
      return NextResponse.json({ error: 'storeId and message are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch store email configuration
    const { data: storeConfig, error: storeError } = await supabase
      .from('stores')
      .select('email_provider, email_api_key, sender_email, smtp_host, smtp_port, smtp_user, smtp_pass, name')
      .eq('id', storeId)
      .single();

    if (storeError || !storeConfig) {
      return NextResponse.json({ error: 'Failed to fetch store configuration' }, { status: 500 });
    }

    // 2. Fetch all customers for the store
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, full_name, email')
      .eq('store_id', storeId);

    if (customersError || !customers) {
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }

    // 3. Filter customers with valid email
    const targetCustomers = customers.filter(c => c.email && c.email.includes('@'));
    
    if (targetCustomers.length === 0) {
      return NextResponse.json({ error: 'No customers with valid email addresses found.' }, { status: 400 });
    }

    let successCount = 0;
    let failureCount = 0;
    let lastErrorMsg = '';

    const provider = storeConfig.email_provider || 'resend';
    const senderEmail = storeConfig.sender_email || 'onboarding@resend.dev';
    const storeName = storeConfig.name || 'OrbitPOS';
    const fromString = `${storeName} <${senderEmail}>`;

    if (provider === 'resend') {
      // --- RESEND LOGIC ---
      const apiKey = storeConfig.email_api_key || process.env.RESEND_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'Resend API key not configured for this store.' }, { status: 400 });
      }
      const resend = new Resend(apiKey);

      for (const customer of targetCustomers) {
        try {
          const { error } = await resend.emails.send({
            from: fromString,
            to: customer.email!,
            subject: `Special Offer from ${storeName}`,
            text: message,
            html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                     <h2>Special Offer for You, ${customer.full_name || 'Valued Customer'}!</h2>
                     <p style="white-space: pre-wrap;">${message}</p>
                   </div>`,
          });

          if (error) throw new Error(error.message);
          successCount++;
        } catch (emailErr: any) {
          failureCount++;
          lastErrorMsg = emailErr.message;
          console.error(`Error sending email to ${customer.email}:`, emailErr.message);
        }
        await delay(500);
      }

    } else if (provider === 'smtp') {
      // --- SMTP LOGIC ---
      if (!storeConfig.smtp_host || !storeConfig.smtp_user || !storeConfig.smtp_pass) {
        return NextResponse.json({ error: 'SMTP credentials missing for this store.' }, { status: 400 });
      }

      const transporter = nodemailer.createTransport({
        host: storeConfig.smtp_host,
        port: parseInt(storeConfig.smtp_port) || 465,
        secure: (parseInt(storeConfig.smtp_port) || 465) === 465, 
        auth: {
          user: storeConfig.smtp_user,
          pass: storeConfig.smtp_pass,
        },
      });

      for (const customer of targetCustomers) {
        try {
          await transporter.sendMail({
            from: fromString,
            to: customer.email!,
            subject: `Special Offer from ${storeName}`,
            text: message,
            html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                     <h2>Special Offer for You, ${customer.full_name || 'Valued Customer'}!</h2>
                     <p style="white-space: pre-wrap;">${message}</p>
                   </div>`,
          });
          successCount++;
        } catch (emailErr: any) {
          failureCount++;
          lastErrorMsg = emailErr.message;
          console.error(`Error sending email to ${customer.email}:`, emailErr.message);
        }
        await delay(500); // Respect SMTP limits
      }
    } else {
      return NextResponse.json({ error: 'Invalid email provider configured' }, { status: 400 });
    }

    if (failureCount > 0 && successCount === 0) {
      return NextResponse.json({ 
        error: `All emails failed. Provider Error: ${lastErrorMsg}` 
      }, { status: 400 });
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
