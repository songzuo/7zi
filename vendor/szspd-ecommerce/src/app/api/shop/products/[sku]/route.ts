// src/app/api/shop/products/[sku]/route.ts
import { NextResponse } from 'next/server';
import { getProductBySku } from '@/lib/shop-db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sku: string }> }
) {
  try {
    const { sku } = await params; const product = await getProductBySku(sku);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, product });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
