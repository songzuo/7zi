import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const DATA_FILE = join(process.cwd(), "data", "cj-local-data.json");

export async function GET() {
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    
    // If data has categories field (nested CJ format)
    if (data.categories && Array.isArray(data.categories)) {
      const cats = data.categories.map((c: any) => ({
        id: c.categoryFirstId || c.id,
        name: c.categoryFirstName || c.name,
        subcategories: (c.categoryFirstList || c.subcategories || []).map((sub: any) => ({
          id: sub.categorySecondId || sub.id,
          name: sub.categorySecondName || sub.name,
          categories: (sub.categorySecondList || sub.categories || []).map((sc: any) => ({
            id: sc.categoryId || sc.id,
            name: sc.categoryName || sc.name,
          })),
        })),
      }));
      return NextResponse.json({ success: true, categories: cats, _source: "local" });
    }
    
    // If data only has products, build categories from unique categoryIds
    if (data.products && Array.isArray(data.products)) {
      // Get unique category IDs with a sample product for each
      const catMap = new Map<string, string>();
      for (const p of data.products) {
        if (p.categoryId && !catMap.has(p.categoryId)) {
          catMap.set(p.categoryId, p.name || p.categoryId);
        }
      }
      
      const categories = Array.from(catMap.entries()).map(([id, name]) => ({
        id,
        name: name.substring(0, 50),
        subcategories: [],
      }));
      
      return NextResponse.json({ success: true, categories, _source: "local" });
    }
    
    return NextResponse.json({ success: true, categories: [], _source: "local" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 });
  }
}
