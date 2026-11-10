import { NextResponse } from "next/server";
import { getSearchSuggestions } from "@/server/public/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  if (q.trim().length < 2) {
    return NextResponse.json({ products: [], matchingCategories: [] });
  }

  const results = await getSearchSuggestions(q);
  return NextResponse.json(results);
}

