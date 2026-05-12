'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendContactEmail(formData: FormData) {
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const company = formData.get('company') as string;
  const message = formData.get('message') as string;

  if (!firstName || !lastName || !email || !message) {
    return { error: 'Please fill in all required fields.' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'OrbitPOS Contact <onboarding@resend.dev>', // Resend free tier requires using their domain for testing if not verified
      to: ['orbitpossales@gmail.com'],
      subject: `New Contact Form Submission from ${firstName} ${lastName}`,
      replyTo: email,
      text: `
        Name: ${firstName} ${lastName}
        Email: ${email}
        Company: ${company || 'N/A'}
        
        Message:
        ${message}
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return { error: 'Failed to send email. Please try again later.' };
    }

    return { success: true };
  } catch (err) {
    console.error('Contact form error:', err);
    return { error: 'An unexpected error occurred.' };
  }
}
