import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: NextRequest) {
  try {
    const { paymentId, amount } = await req.json();

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Razorpay API keys not configured' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
    });
    return NextResponse.json({ refundId: refund.id });
  } catch (err: any) {
    console.error("Razorpay refund error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
