import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

type Action = "PUBLISH" | "HIDE" | "DISPUTE" | "REMOVE" | "RESTORE" | "VERIFY";

const VALID_ACTIONS: Action[] = ["PUBLISH", "HIDE", "DISPUTE", "REMOVE", "RESTORE", "VERIFY"];

// Which new report_status does each action result in?
const ACTION_STATUS_MAP: Record<Action, string> = {
  PUBLISH: "PENDING",
  HIDE: "PENDING",
  DISPUTE: "DISPUTED",
  REMOVE: "REMOVED",
  RESTORE: "PENDING",
  VERIFY: "VERIFIED",
};

// Which roles can perform each action?
const ACTION_ROLE_MAP: Record<Action, string[]> = {
  PUBLISH: ["moderator", "admin"],
  HIDE: ["moderator", "admin"],
  DISPUTE: ["user", "moderator", "admin"],
  REMOVE: ["moderator", "admin"],
  RESTORE: ["moderator", "admin"],
  VERIFY: ["moderator", "admin"],
};

/**
 * POST /api/moderate/:action
 *
 * Body: { report_id: string; reason?: string }
 * Headers: Authorization: Bearer <supabase_access_token>
 *
 * Server-side role check via service-role client (profiles.role).
 * Never trust a client-hidden button — the role MUST be verified here.
 *
 * On success, inserts a row into report_moderation_log and updates reports.status.
 * The DB trigger fn_resolve_trust_score() fires on the log insert for VERIFIED/REMOVED.
 *
 * Spec: Phase 5
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ action: string }> }
) {
  const { action: rawAction } = await context.params;
  const action = rawAction.toUpperCase() as Action;

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Invalid action. Valid actions: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  // Extract access token
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  // Verify the token and get the caller's identity
  const supabase = createServiceClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Fetch caller's role from profiles table (server-side — never trust client)
  const { data: callerProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !callerProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  }

  const callerRole = callerProfile.role as string;
  const allowedRoles = ACTION_ROLE_MAP[action];

  if (!allowedRoles.includes(callerRole)) {
    return NextResponse.json(
      { error: `Action '${action}' requires role: ${allowedRoles.join(" or ")}` },
      { status: 403 }
    );
  }

  // Parse body
  let body: { report_id?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { report_id, reason } = body;
  if (!report_id) {
    return NextResponse.json({ error: "report_id is required" }, { status: 400 });
  }

  // Fetch current report status
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, status")
    .eq("id", report_id)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const previousStatus = report.status;
  const newStatus = ACTION_STATUS_MAP[action];

  // Insert moderation log row — the DB trigger fn_resolve_trust_score()
  // will fire automatically on this insert for VERIFIED and REMOVED transitions.
  const { error: logError } = await supabase
    .from("report_moderation_log")
    .insert({
      report_id,
      moderator_id: user.id,
      action,
      reason: reason ?? null,
      previous_status: previousStatus,
      new_status: newStatus,
    });

  if (logError) {
    console.error("[/api/moderate] Failed to insert moderation log:", logError.message);
    return NextResponse.json({ error: "Failed to log moderation action" }, { status: 500 });
  }

  // Update report status
  const { error: updateError } = await supabase
    .from("reports")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", report_id);

  if (updateError) {
    console.error("[/api/moderate] Failed to update report status:", updateError.message);
    return NextResponse.json({ error: "Failed to update report status" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    action,
    report_id,
    previous_status: previousStatus,
    new_status: newStatus,
  });
}
