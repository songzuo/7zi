import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.SHOP_DB_HOST || '127.0.0.1',
  port: parseInt(process.env.SHOP_DB_PORT || '5432'),
  database: process.env.SHOP_DB_NAME || 'sevenzi_shop',
  user: process.env.SHOP_DB_USER || 'postgres',
  password: process.env.SHOP_DB_PASSWORD || 'shop2024',
});

export async function GET() {
  try {
    const res = await pool.query(
      'SELECT category, COUNT(*)::int as count FROM shop_products WHERE status = \'active\' GROUP BY category ORDER BY count DESC'
    );
    const categories = res.rows.map((r: { category: string; count: number }) => ({
      name: r.category,
      count: r.count,
    }));
    return NextResponse.json({ success: true, categories });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
