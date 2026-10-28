import { NextResponse } from "next/server";
import { journalArticles } from "@/data/journal";

export function GET() {
  return NextResponse.json(
    { articles: journalArticles },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
