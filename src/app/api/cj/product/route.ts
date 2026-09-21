import { NextRequest, NextResponse } from 'next/server';
import { getProductBySku, isCatalogReady } from "@/lib/catalog-db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pid = searchParams.get('pid') || '';

    if (!pid) {
      return NextResponse.json(
        { success: false, error: 'Missing pid parameter' },
        { status: 400 }
      );
    }

    if (!isCatalogReady()) {
      return NextResponse.json(
        { success: false, error: 'Catalog not ready' },
        { status: 503 }
      );
    }

    const found = getProductBySku(pid);

    if (!found) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        pid: found.pid || found.sku,
        sku: found.sku,
        productName: found.name,
        price: found.price,
        image: found.image,
        hasVideo: found.hasVideo,
        categoryId: found.categoryId,
      },
      _source: 'sqlite',
      _filterVersion: 'sqlite-fts5',
    });
  } catch (error: any) {
    console.error('Product API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load product' },
      { status: 500 }
    );
  }
}
