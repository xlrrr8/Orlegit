import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimitAsync } from "@/lib/rateLimitRedis";
import { getClientIP, RATE_LIMITS } from "@/lib/rateLimit";

/**
 * GET /api/lookup?q=<query>
 *
 * Public endpoint: aggregates report data for a given target/query.
 * Uses the ANON client (not service role) — RLS already grants SELECT access.
 * Rate limited by IP (public), with future API-key tier for partners.
 *
 * Spec: Phase 7
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required (min 2 chars)" },
      { status: 400 }
    );
  }

  // Rate limit by IP for public access
  const clientIP = getClientIP(req);

  // Check for API key header for partner tier (higher limit)
  const apiKey = req.headers.get("x-api-key");
  const rateLimitKey = apiKey
    ? `lookup:key:${apiKey}`
    : `lookup:ip:${clientIP}`;

  const config = apiKey
    ? { maxRequests: 600, windowMs: 60 * 1000 }  // Partner: 600/min
    : RATE_LIMITS.lookup;                          // Public: 60/min

  const rateLimitResult = await checkRateLimitAsync(rateLimitKey, config);

  if (!rateLimitResult.allowed) {
    const retryAfterSecs = Math.ceil((rateLimitResult.retryAfterMs || 60000) / 1000);
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSecs),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // Use ANON client — not service role. RLS already permits these SELECTs.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data: reports, error } = await supabase
      .from("reports")
      .select(
        "id, title, target, category, ai_verdict, ai_confidence, ai_reasoning, ai_red_flags, " +
        "community_scam_votes, community_genuine_votes, status, created_at"
      )
      .or(`target.ilike.%${query}%,title.ilike.%${query}%,target_normalized.ilike.%${query.toLowerCase()}%`)
      .neq("status", "REMOVED")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[/api/lookup] Supabase error:", error.message);
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }

    const totalScamVotes = ((reports ?? []) as any[]).reduce(
      (sum: number, r: any) => sum + (r.community_scam_votes ?? 0), 0
    );
    const totalGenuineVotes = ((reports ?? []) as any[]).reduce(
      (sum: number, r: any) => sum + (r.community_genuine_votes ?? 0), 0
    );
    const scamReports = ((reports ?? []) as any[]).filter((r: any) => r.ai_verdict === "LIKELY_SCAM").length;
    const verifiedReports = ((reports ?? []) as any[]).filter((r: any) => r.status === "VERIFIED").length;

    return NextResponse.json(
      {
        query,
        total: reports?.length ?? 0,
        reports: reports ?? [],
        summary: {
          scam_reports: scamReports,
          verified_reports: verifiedReports,
          total_scam_votes: totalScamVotes,
          total_genuine_votes: totalGenuineVotes,
          risk_level:
            scamReports > 2 ? "HIGH" : scamReports > 0 ? "MEDIUM" : "LOW",
        },
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    console.error("[/api/lookup] Unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
