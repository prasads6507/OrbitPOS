'use server';

import { Resend } from 'resend';

export async function sendContactEmail(formData: FormData) {
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const company = formData.get('company') as string;
  const message = formData.get('message') as string;

  console.log('Form submission attempt:', { firstName, lastName, email });

  if (!firstName || !lastName || !email || !message) {
    return { error: 'Please fill in all required fields.' };
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is missing from environment variables');
    return { error: 'Email service is not configured. Please contact support.' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // For Resend free tier/onboarding, you can only send to your own email address
    // and from onboarding@resend.dev.
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ['orbitpossales@gmail.com'],
      subject: `OrbitPOS: New Lead - ${firstName} ${lastName}`,
      replyTo: email,
      text: `
        New contact form submission:
        
        Name: ${firstName} ${lastName}
        Email: ${email}
        Company: ${company || 'N/A'}
        
        Message:
        ${message}
      `,
    });

    if (error) {
      console.error('Resend delivery error:', error);
      return { error: `Failed to send message: ${error.message}` };
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected contact form error:', err);
    return { error: `An unexpected error occurred: ${err.message || 'Please try again.'}` };
  }
}
