import { NextRequest, NextResponse } from "next/server";
import { analyzeReport } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { title, description, target, category } = await req.json();
    if (!title || !description || !target || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await analyzeReport(title, description, target, category);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
