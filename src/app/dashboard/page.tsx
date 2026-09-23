"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { createClient } from "@/lib/supabase";
import { Loader, ShieldCheck, Flag, Trash2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [myReports, setMyReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;

    setDeletingId(reportId);
    const supabase = createClient();
    const { error } = await supabase.from("reports").delete().eq("id", reportId);
    if (!error) {
      setMyReports((prev) => prev.filter((r) => r.id !== reportId));
    } else {
      alert("Failed to delete report: " + error.message);
    }
    setDeletingId(null);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    async function loadMyReports() {
      if (!user) return;
      setReportsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setMyReports(data);
      }
      setReportsLoading(false);
    }

    if (user) {
      loadMyReports();
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader size={28} strokeWidth={2} color="var(--accent)" style={{ animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!user) return null;

  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <div style={{ padding: "3rem 0 6rem", background: "var(--bg-base)", minHeight: "100vh" }}>
      <div className="container">
        {/* Profile header */}
        <div style={{
          background: "var(--bg-surface)", border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-xl)", padding: "2rem", marginBottom: "2rem",
          display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap",
          boxShadow: "var(--shadow-card)",
        }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "var(--accent-dim)", border: "2px solid var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.75rem", fontWeight: 700, color: "var(--accent)", flexShrink: 0,
          }}>
            {(profile?.username?.[0] || user.email?.[0] || "?").toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ marginBottom: "0.25rem" }}>@{profile?.username || "user"}</h2>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              Member since {memberSince}
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600 }}>
                🏆 Trust Score: {profile?.trust_score ?? 100}
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--genuine)", fontWeight: 600 }}>
                ✅ Verified Account
              </span>
            </div>
          </div>
          <Link href="/submit" className="btn btn-danger" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Flag size={14} strokeWidth={2} /> New Report
          </Link>
        </div>

        {/* Stats */}
        <div className="grid-3" style={{ marginBottom: "2rem" }}>
          {[
            { label: "Reports Filed", value: myReports.length.toString(), color: "var(--accent)" },
            { label: "Trust Score", value: (profile?.trust_score ?? 100).toString(), color: "var(--genuine)" },
            { label: "Account Status", value: "Active", color: "var(--text-primary)" },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ textAlign: "center", background: "var(--bg-surface)" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: stat.color, marginBottom: "0.25rem" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* My Reports */}
        <div style={{
          background: "var(--bg-surface)", border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-xl)", padding: "1.75rem", boxShadow: "var(--shadow-card)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0 }}>My Reports</h3>
            <Link href="/reports" className="btn btn-ghost btn-sm">View All Reports →</Link>
          </div>
          {reportsLoading ? (
            <div className="skeleton" style={{ height: "100px", borderRadius: "var(--radius-md)" }} />
          ) : myReports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
              <p style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>You haven&apos;t filed any reports yet.</p>
              <Link href="/submit" className="btn btn-primary btn-sm">
                Submit your first report
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {myReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: "1rem",
                    padding: "0.875rem 1rem", background: "var(--bg-base)",
                    borderRadius: "var(--radius-md)", textDecoration: "none",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                    background: report.ai_verdict === "LIKELY_SCAM" ? "var(--scam)" : report.ai_verdict === "LIKELY_GENUINE" ? "var(--genuine)" : "var(--uncertain)",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {report.title}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
                      {report.category} · {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteReport(report.id, e)}
                      disabled={deletingId === report.id}
                      style={{
                        background: "var(--scam-dim)", border: "1px solid var(--scam-border)",
                        borderRadius: "var(--radius-sm)", padding: "0.35rem",
                        color: "var(--scam)", cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center",
                      }}
                      title="Delete report"
                    >
                      {deletingId === report.id ? (
                        <Loader size={13} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
                      ) : (
                        <Trash2 size={13} strokeWidth={1.75} />
                      )}
                    </button>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
