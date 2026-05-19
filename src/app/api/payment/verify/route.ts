import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { paymentId, orderId, signature } = await request.json();

    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const verified = generatedSignature === signature;

    return NextResponse.json({ verified });
  } catch (error: any) {
    return NextResponse.json(
      { verified: false, error: error.message },
      { status: 500 }
    );
  }
}
