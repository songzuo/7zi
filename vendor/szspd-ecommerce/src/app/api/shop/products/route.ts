import { NextRequest, NextResponse } from 'next/server';
import { getProducts, createProduct, getProductCount } from '@/lib/shop-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') ?? undefined;
    const size = parseInt(searchParams.get('size') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * size;
    const status = searchParams.get('status') || 'active';

    const [products, total] = await Promise.all([
      getProducts({ category, limit: size, offset, status }),
      getProductCount({ category, status }),
    ]);

    const totalPages = Math.ceil(total / size);
    return NextResponse.json({ success: true, products, total, totalPages, page, size });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const product = await createProduct(body);
    return NextResponse.json({ success: true, product });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
