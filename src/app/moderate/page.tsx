import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase-server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Flag } from "lucide-react";
import ModerationActions from "@/components/ModerationActions";

export const metadata = {
  title: "Moderation Dashboard — ORlegit",
  description: "Review and moderate community-submitted scam reports",
};

async function getCallerProfile() {
  // Get the current user's session from cookies (server-side)
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch role via service client
  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("username, role, trust_score")
    .eq("id", user.id)
    .single();

  return profile;
}

async function getPendingReports() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("reports")
    .select("*, profiles(username)")
    .in("status", ["PENDING", "DISPUTED"])
    .order("created_at", { ascending: true })
    .limit(50);
  return data ?? [];
}

async function getRecentModLog() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("report_moderation_log")
    .select("*, profiles(username), reports(title)")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  PENDING:  { bg: "var(--uncertain-dim)", color: "var(--uncertain)", border: "var(--uncertain-border)" },
  VERIFIED: { bg: "var(--genuine-dim)",   color: "var(--genuine)",   border: "var(--genuine-border)" },
  DISPUTED: { bg: "var(--scam-dim)",      color: "var(--scam)",      border: "var(--scam-border)" },
  REMOVED:  { bg: "var(--bg-section)",    color: "var(--text-muted)", border: "var(--border)" },
};

export default async function ModeratePage() {
  const profile = await getCallerProfile();

  // Server-side role check — redirect non-moderators
  if (!profile || !["moderator", "admin"].includes(profile.role)) {
    redirect("/");
  }

  const [pendingReports, modLog] = await Promise.all([
    getPendingReports(),
    getRecentModLog(),
  ]);

  return (
    <div style={{ padding: "3rem 0 6rem", background: "var(--bg-base)", minHeight: "100vh" }}>
      <div className="container">

        {/* Header */}
        <div style={{ marginBottom: "2.5rem", animation: "fadeInUp 0.4s ease both" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "var(--accent-dim)", border: "1.5px solid #c5cdf5",
            borderRadius: "999px", padding: "0.3rem 0.9rem",
            fontSize: "0.75rem", color: "var(--accent)", fontWeight: 500,
            marginBottom: "1rem",
          }}>
            <ShieldCheck size={12} strokeWidth={2} />
            {profile.role === "admin" ? "Admin" : "Moderator"} Dashboard
          </div>
          <h1 style={{ marginBottom: "0.375rem" }}>Moderation Dashboard</h1>
          <p style={{ fontSize: "0.875rem" }}>
            Signed in as <strong>{profile.username}</strong> · Trust score: {profile.trust_score}
          </p>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: "2.5rem", animation: "fadeInUp 0.4s 0.1s ease both" }}>
          {[
            { label: "Pending Review", value: pendingReports.filter(r => r.status === "PENDING").length, icon: <Clock size={18} />, color: "var(--uncertain)" },
            { label: "Disputed", value: pendingReports.filter(r => r.status === "DISPUTED").length, icon: <AlertTriangle size={18} />, color: "var(--scam)" },
            { label: "Actions Today", value: modLog.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length, icon: <CheckCircle2 size={18} />, color: "var(--genuine)" },
            { label: "Total in Queue", value: pendingReports.length, icon: <Flag size={18} />, color: "var(--accent)" },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ textAlign: "center" }}>
              <div style={{ color: stat.color, marginBottom: "0.5rem" }}>{stat.icon}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "2rem", alignItems: "start" }}>

          {/* Reports Queue */}
          <div style={{ animation: "fadeInUp 0.4s 0.15s ease both" }}>
            <h2 style={{ marginBottom: "1.25rem", fontSize: "1.1rem" }}>
              Reports Awaiting Review ({pendingReports.length})
            </h2>

            {pendingReports.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                <CheckCircle2 size={32} strokeWidth={1.5} color="var(--genuine)" style={{ margin: "0 auto 1rem" }} />
                <p style={{ color: "var(--text-muted)" }}>Queue is clear! All reports have been reviewed.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {pendingReports.map((report: any) => {
                  const statusStyle = STATUS_STYLES[report.status] ?? STATUS_STYLES.PENDING;
                  return (
                    <div key={report.id} className="card" style={{ padding: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.875rem" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center",
                              padding: "0.15rem 0.55rem", borderRadius: "999px",
                              fontSize: "0.68rem", fontWeight: 600,
                              background: statusStyle.bg, color: statusStyle.color,
                              border: `1px solid ${statusStyle.border}`,
                            }}>
                              {report.status}
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              {report.category?.replace(/_/g, " ")}
                            </span>
                          </div>
                          <Link
                            href={`/reports/${report.id}`}
                            style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            {report.title}
                            <ArrowRight size={12} strokeWidth={2} color="var(--text-muted)" />
                          </Link>
                          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                            Target: <code style={{ fontSize: "0.75rem" }}>{report.target}</code>
                          </p>
                          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.35rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {report.description}
                          </p>
                        </div>

                        <div style={{ flexShrink: 0, textAlign: "right", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          <div>AI: <strong style={{ color: report.ai_verdict === "LIKELY_SCAM" ? "var(--scam)" : report.ai_verdict === "LIKELY_GENUINE" ? "var(--genuine)" : "var(--uncertain)" }}>{report.ai_verdict?.replace(/_/g, " ")}</strong></div>
                          <div>Confidence: {report.ai_confidence}%</div>
                          <div style={{ marginTop: "0.25rem" }}>
                            🔴 {report.community_scam_votes} · 🟢 {report.community_genuine_votes}
                          </div>
                          <div style={{ marginTop: "0.25rem" }}>
                            by {report.profiles?.username || "unknown"}
                          </div>
                          <div style={{ marginTop: "0.1rem" }}>
                            {new Date(report.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <ModerationActions
                        reportId={report.id}
                        currentStatus={report.status}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity Log */}
          <div style={{ animation: "fadeInUp 0.4s 0.2s ease both" }}>
            <h2 style={{ marginBottom: "1.25rem", fontSize: "1.1rem" }}>Recent Activity</h2>
            <div className="card" style={{ padding: "0" }}>
              {modLog.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No moderation activity yet</p>
                </div>
              ) : (
                <div>
                  {modLog.map((log: any, i: number) => {
                    const actionColors: Record<string, string> = {
                      VERIFY: "var(--genuine)",
                      REMOVE: "var(--scam)",
                      DISPUTE: "var(--uncertain)",
                      HIDE: "var(--text-muted)",
                      RESTORE: "var(--accent)",
                      PUBLISH: "var(--accent)",
                    };
                    return (
                      <div
                        key={log.id}
                        style={{
                          padding: "0.875rem 1.125rem",
                          borderBottom: i < modLog.length - 1 ? "1px solid var(--border)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                              <span style={{
                                fontSize: "0.68rem", fontWeight: 700,
                                color: actionColors[log.action] || "var(--text-primary)",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}>
                                {log.action}
                              </span>
                              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                by {log.profiles?.username || "system"}
                              </span>
                            </div>
                            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {(log.reports as any)?.title || "Unknown report"}
                            </p>
                            {log.reason && (
                              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.2rem 0 0", fontStyle: "italic" }}>
                                "{log.reason}"
                              </p>
                            )}
                          </div>
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", flexShrink: 0 }}>
                            {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
