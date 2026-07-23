import { NextRequest, NextResponse } from "next/server";
import { analyzeReport } from "@/lib/gemini";
import { createServiceClient } from "@/lib/supabase-server";
import { checkRateLimitAsync } from "@/lib/rateLimitRedis";
import { getClientIP, RATE_LIMITS } from "@/lib/rateLimit";

/** Normalizes a target string for dedup matching (strip protocol/www, lowercase, strip phone formatting) */
function normalizeTarget(target: string): string {
  return target
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/[\s\-\(\)\.]/g, "")
    .replace(/^\+91/, "")   // strip India country code
    .replace(/^0/, "");     // strip leading zero for phone
}

export async function POST(req: NextRequest) {
  // --- Rate limiting: by authenticated user ID when available, else by IP ---
  let rateLimitKey: string;
  let userId: string | null = null;

  try {
    // Check if there's a valid session via the Authorization header or cookie
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      // Use the user ID from the service client for the rate limit key
      const token = authHeader.slice(7);
      const supabase = createServiceClient();
      const { data } = await supabase.auth.getUser(token);
      userId = data?.user?.id ?? null;
    }
  } catch {
    // No auth — use IP-based limiting
  }

  const clientIP = getClientIP(req);
  rateLimitKey = userId ? `analyze:user:${userId}` : `analyze:ip:${clientIP}`;

  const rateLimitResult = await checkRateLimitAsync(rateLimitKey, RATE_LIMITS.analyze);

  if (!rateLimitResult.allowed) {
    const retryAfterSecs = Math.ceil((rateLimitResult.retryAfterMs || 60000) / 1000);
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please wait before submitting another report.",
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

    if (!title || !description || !target || !category) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, target, category" },
        { status: 400 }
      );
    }

    // Run AI analysis
    const analysis = await analyzeReport(title, description, target, category);

    // Update AI columns and target_normalized server-side via service role
    if (report_id && typeof report_id === "string") {
      try {
        const supabase = createServiceClient();
        const targetNorm = normalizeTarget(target);

        const { error: updateError } = await supabase
          .from("reports")
          .update({
            ai_verdict: analysis.verdict,
            ai_confidence: analysis.confidence,
            ai_reasoning: analysis.reasoning,
            ai_red_flags: analysis.red_flags,
            target_normalized: targetNorm,
          })
          .eq("id", report_id);

        if (updateError) {
          console.error("[/api/analyze] Failed to update report AI columns:", updateError.message);
        }
      } catch (dbErr) {
        console.error(
          "[/api/analyze] Database error updating AI columns:",
          dbErr instanceof Error ? dbErr.message : dbErr
        );
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
