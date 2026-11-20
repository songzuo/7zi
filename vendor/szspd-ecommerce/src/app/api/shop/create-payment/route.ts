// src/app/api/shop/create-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { amount, currency, order_no } = await request.json();
    // TODO: Integrate with Stripe - create PaymentIntent
    // For now, return a mock client secret
    return NextResponse.json({
      success: true,
      client_secret: 'pi_mock_secret_placeholder',
      payment_intent_id: 'pi_mock',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
