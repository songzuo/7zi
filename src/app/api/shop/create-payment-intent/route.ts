// src/app/api/shop/create-payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // TODO: Integrate with Stripe Elements
    return NextResponse.json({ clientSecret: '' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
