import { NextResponse } from "next/server";
import { getCategoryTree, isCatalogReady } from "@/lib/catalog-db";

export async function GET() {
  try {
    if (!isCatalogReady()) {
      return NextResponse.json({ success: true, categories: [], _source: "sqlite-empty" });
    }

    const tree = getCategoryTree();
    const categories = tree.map((l1) => ({
      id: l1.id,
      name: l1.name,
      subcategories: (l1.children || []).map((l2) => ({
        id: l2.id,
        name: l2.name,
        categories: (l2.children || []).map((l3) => ({
          id: l3.id,
          name: l3.name,
        })),
      })),
    }));

    return NextResponse.json({ success: true, categories, _source: "sqlite" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 });
  }
}
