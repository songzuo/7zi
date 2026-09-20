import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'cj-local-data.json');

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

    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    const products = data.products || [];

    const found = products.find((p: any) => p.id === pid || p.sku === pid);

    if (!found) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        pid: found.id,
        sku: found.sku,
        productName: found.name,
        price: found.price,
        image: found.image,
        hasVideo: found.hasVideo,
        categoryId: found.categoryId,
      },
      _source: 'local',
      _filterVersion: data.filterVersion || 'unknown',
    });
  } catch (error: any) {
    console.error('Product API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load product' },
      { status: 500 }
    );
  }
}
