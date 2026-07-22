import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rateLimit";

/**
 * Public read API for checking if a target has been reported.
 *
 * GET /api/lookup?target=example.com
 *
 * Returns aggregate data about reports for the given target.
 * Rate limited: 60 requests per minute per IP.
 */
export async function GET(req: NextRequest) {
  // CORS headers for third-party integration
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=60", // Cache for 1 minute
  };

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(
    `lookup:${clientIP}`,
    RATE_LIMITS.lookup
  );

  if (!rateLimitResult.allowed) {
    const retryAfterSecs = Math.ceil(
      (rateLimitResult.retryAfterMs || 60000) / 1000
    );
    return NextResponse.json(
      { error: "Rate limit exceeded", retry_after_seconds: retryAfterSecs },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(retryAfterSecs),
        },
      }
    );
  }

  const { searchParams } = new URL(req.url);
  const target = searchParams.get("target");

  if (!target || target.trim().length < 3) {
    return NextResponse.json(
      { error: "Query parameter 'target' is required (min 3 characters)" },
      { status: 400, headers }
    );
  }

  try {
    const supabase = createServiceClient();

    // Search by target (case-insensitive, substring match)
    const { data: reports, error } = await supabase
      .from("reports")
      .select(
        "id, title, target, category, ai_verdict, ai_confidence, community_scam_votes, community_genuine_votes, status, created_at"
      )
      .ilike("target", `%${target.trim()}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[/api/lookup] Supabase error:", error.message);
      return NextResponse.json(
        { error: "Internal error" },
        { status: 500, headers }
      );
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json(
        {
          found: false,
          target: target.trim(),
          report_count: 0,
          message: "No reports found for this target",
        },
        { status: 200, headers }
      );
    }

    // Aggregate stats
    const totalReports = reports.length;
    const avgConfidence = Math.round(
      reports.reduce((sum, r) => sum + (r.ai_confidence || 0), 0) / totalReports
    );
    const totalScamVotes = reports.reduce(
      (sum, r) => sum + (r.community_scam_votes || 0),
      0
    );
    const totalGenuineVotes = reports.reduce(
      (sum, r) => sum + (r.community_genuine_votes || 0),
      0
    );

    // Count verdicts
    const verdicts = {
      LIKELY_SCAM: reports.filter((r) => r.ai_verdict === "LIKELY_SCAM").length,
      LIKELY_GENUINE: reports.filter((r) => r.ai_verdict === "LIKELY_GENUINE").length,
      UNCERTAIN: reports.filter((r) => r.ai_verdict === "UNCERTAIN").length,
    };

    return NextResponse.json(
      {
        found: true,
        target: target.trim(),
        report_count: totalReports,
        avg_confidence: avgConfidence,
        total_scam_votes: totalScamVotes,
        total_genuine_votes: totalGenuineVotes,
        verdicts,
        latest_reports: reports.slice(0, 5).map((r) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          ai_verdict: r.ai_verdict,
          ai_confidence: r.ai_confidence,
          status: r.status,
          created_at: r.created_at,
        })),
      },
      {
        status: 200,
        headers: {
          ...headers,
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      }
    );
  } catch (err) {
    console.error("[/api/lookup] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500, headers }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
