import { NextRequest, NextResponse } from "next/server";
import { analyzeReport } from "@/lib/gemini";
import { createServiceClient } from "@/lib/supabase-server";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // --- Rate limiting ---
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(
    `analyze:${clientIP}`,
    RATE_LIMITS.analyze
  );

  if (!rateLimitResult.allowed) {
    const retryAfterSecs = Math.ceil(
      (rateLimitResult.retryAfterMs || 60000) / 1000
    );
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please try again later.",
        retry_after_seconds: retryAfterSecs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSecs),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const body = await req.json();
    const { report_id, title, description, target, category } = body;

    // Validate required fields
    if (!title || !description || !target || !category) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, target, category" },
        { status: 400 }
      );
    }

    // Run AI analysis
    const analysis = await analyzeReport(title, description, target, category);

    // If a report_id was provided, update the report's AI columns server-side
    if (report_id && typeof report_id === "string") {
      try {
        const supabase = createServiceClient();
        const { error: updateError } = await supabase
          .from("reports")
          .update({
            ai_verdict: analysis.verdict,
            ai_confidence: analysis.confidence,
            ai_reasoning: analysis.reasoning,
          })
          .eq("id", report_id);

        if (updateError) {
          console.error(
            "[/api/analyze] Failed to update report AI columns:",
            updateError.message
          );
        }
      } catch (dbErr) {
        console.error(
          "[/api/analyze] Database error updating AI columns:",
          dbErr instanceof Error ? dbErr.message : dbErr
        );
        // Don't fail the request — the analysis result is still returned to the client
      }
    }

    return NextResponse.json(analysis, {
      headers: {
        "X-RateLimit-Remaining": String(rateLimitResult.remaining),
      },
    });
  } catch (err) {
    console.error(
      "[/api/analyze] Unexpected error:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
