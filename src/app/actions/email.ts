'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SubmissionData {
  type: 'contact' | 'support';
  firstName?: string;
  lastName?: string;
  email: string;
  company?: string;
  storeName?: string;
  issueType?: string;
  message: string;
}

export async function sendSubmissionEmail(data: SubmissionData) {
  try {
    const timestamp = new Date().toLocaleString();
    const subject = data.type === 'contact' 
      ? `[OrbitPOS Lead] ${data.firstName} ${data.lastName} - ${timestamp}`
      : `[OrbitPOS Support] ${data.storeName} - ${timestamp}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0071e3; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">OrbitPOS</h1>
          <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">New ${data.type === 'contact' ? 'Contact Inquiry' : 'Support Ticket'}</p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
          <table style="width: 100%; border-collapse: collapse;">
            ${data.firstName ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 40%;">First Name</td><td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px;">${data.firstName}</td></tr>` : ''}
            ${data.lastName ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Last Name</td><td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px;">${data.lastName}</td></tr>` : ''}
            ${data.storeName ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Store Name</td><td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px;">${data.storeName}</td></tr>` : ''}
            <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Email Address</td><td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px;">${data.email}</td></tr>
            ${data.company ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Company</td><td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px;">${data.company}</td></tr>` : ''}
            ${data.issueType ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Issue Type</td><td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px;">${data.issueType}</td></tr>` : ''}
          </table>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #111827; font-size: 16px; margin-bottom: 15px;">Message Details</h3>
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; color: #374151; line-height: 1.6; font-size: 15px;">
            ${data.message.replace(/\n/g, '<br>')}
          </div>
        </div>
        
        <div style="text-align: center; border-top: 1px solid #f3f4f6; pt: 30px; margin-top: 30px;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">
            This is an automated notification from your OrbitPOS Platform.<br>
            Sent on ${timestamp}
          </p>
        </div>
      </div>
    `;

    const { data: resData, error } = await resend.emails.send({
      from: 'OrbitPOS <onboarding@resend.dev>',
      to: 'orbitpossales@gmail.com',
      replyTo: data.email,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: resData };
  } catch (error: any) {
    console.error('Email Action Error:', error);
    return { success: false, error: error.message };
  }
}
