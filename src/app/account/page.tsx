"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Mail, Shield, Calendar, Award, Edit3,
  LogOut, Loader, Check, FileText, MessageCircle,
  ChevronRight, ShieldCheck, Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { createClient } from "@/lib/supabase";

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Real user reports & posts state
  const [myReports, setMyReports] = useState<any[]>([]);
  const [postCount, setPostCount] = useState<number>(0);
  const [dataLoading, setDataLoading] = useState(true);
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

    async function loadUserData() {
      if (!user) return;
      setDataLoading(true);
      const supabase = createClient();

      try {
        // Fetch reports filed by user
        const { data: reportsData } = await supabase
          .from("reports")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (reportsData) {
          setMyReports(reportsData);
        }

        // Fetch count of posts by user
        const { count } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (count !== null) {
          setPostCount(count);
        }
      } catch (err) {
        console.error("Error loading user account data:", err);
      } finally {
        setDataLoading(false);
      }
    }

    if (user) {
      loadUserData();
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-base)",
      }}>
        <Loader size={28} strokeWidth={2} color="var(--accent)" style={{ animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!user) return null;

  const initial = (profile?.username?.[0] || user.email?.[0] || "?").toUpperCase();
  const avatarColor = "#4c63d2";
  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const handleSaveUsername = async () => {
    if (!newUsername.trim() || newUsername.trim() === profile?.username) {
      setEditingUsername(false);
      return;
    }

    setSaving(true);
    setSaveError("");
    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername.trim() })
      .eq("id", user.id);

    if (error) {
      setSaveError(error.message.includes("duplicate")
        ? "That username is already taken."
        : error.message
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditingUsername(false);
    setSaveSuccess(true);
    await refreshProfile();
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", padding: "2.5rem 0 5rem" }}>
      <div className="container" style={{ maxWidth: "740px" }}>

        {/* Breadcrumb */}
        <div style={{
          display: "flex", gap: "0.35rem", alignItems: "center",
          marginBottom: "2rem", fontSize: "0.8rem", color: "var(--text-muted)",
        }}>
          <Link href="/" style={{ color: "var(--text-muted)" }}>Home</Link>
          <ChevronRight size={12} strokeWidth={1.75} />
          <span style={{ color: "var(--text-secondary)" }}>Account</span>
        </div>

        {/* Success toast */}
        {saveSuccess && (
          <div style={{
            position: "fixed", top: "80px", left: "50%", transform: "translateX(-50%)",
            background: "var(--genuine)", color: "white", borderRadius: "999px",
            padding: "0.5rem 1.25rem", fontSize: "0.82rem", fontWeight: 500,
            zIndex: 1000, boxShadow: "0 4px 20px rgba(13,158,92,0.3)",
            animation: "fadeInUp 0.3s ease both",
            display: "flex", alignItems: "center", gap: "0.35rem",
          }}>
            <Check size={14} strokeWidth={2.5} /> Profile updated!
          </div>
        )}

        {/* Profile header card */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "2.5rem 2rem",
          boxShadow: "var(--shadow-card)",
          marginBottom: "1.5rem",
          animation: "fadeInUp 0.4s ease both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: avatarColor + "18",
              border: `2.5px solid ${avatarColor}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: "2rem", fontWeight: 700, color: avatarColor }}>
                {initial}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Username row */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem", flexWrap: "wrap" }}>
                {editingUsername ? (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", animation: "fadeInUp 0.2s ease both" }}>
                    <input
                      className="form-input"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      style={{ height: "36px", fontSize: "0.875rem", width: "200px" }}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveUsername(); if (e.key === "Escape") setEditingUsername(false); }}
                      suppressHydrationWarning
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveUsername}
                      disabled={saving}
                      style={{ height: "36px" }}
                    >
                      {saving ? <Loader size={12} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} /> : <Check size={14} strokeWidth={2} />}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setEditingUsername(false); setSaveError(""); }}
                      style={{ height: "36px" }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
                      {profile?.username || "User"}
                    </h1>
                    <button
                      onClick={() => { setEditingUsername(true); setNewUsername(profile?.username || ""); }}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-muted)", padding: "0.25rem",
                        display: "flex", alignItems: "center",
                      }}
                      title="Edit username"
                    >
                      <Edit3 size={14} strokeWidth={1.75} />
                    </button>
                  </>
                )}
              </div>

              {saveError && (
                <p style={{ fontSize: "0.78rem", color: "var(--scam)", marginBottom: "0.375rem" }}>{saveError}</p>
              )}

              {/* Email */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                <Mail size={13} strokeWidth={1.75} />
                {user.email}
              </div>

              {/* Member since */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: "var(--text-muted)" }} suppressHydrationWarning>
                <Calendar size={12} strokeWidth={1.75} />
                Member since {memberSince}
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem",
          marginBottom: "1.5rem", animation: "fadeInUp 0.4s 0.1s ease both",
        }}>
          {[
            { icon: <Shield size={18} strokeWidth={1.75} />, label: "Trust Score", value: (profile?.trust_score ?? 100).toString(), color: "var(--accent)" },
            { icon: <FileText size={18} strokeWidth={1.75} />, label: "Reports Filed", value: dataLoading ? "..." : myReports.length.toString(), color: "var(--scam)" },
            { icon: <MessageCircle size={18} strokeWidth={1.75} />, label: "Community Posts", value: dataLoading ? "..." : postCount.toString(), color: "var(--genuine)" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "var(--bg-surface)", border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xl)", padding: "1.375rem",
              boxShadow: "var(--shadow-card)", textAlign: "center",
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem", color: stat.color }}>
                {stat.icon}
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* My Filed Reports Section */}
        <div style={{
          background: "var(--bg-surface)", border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-xl)", padding: "1.5rem",
          boxShadow: "var(--shadow-card)", marginBottom: "1.5rem",
          animation: "fadeInUp 0.4s 0.15s ease both",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1rem", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <FileText size={16} strokeWidth={1.75} color="var(--scam)" />
              My Filed Reports ({myReports.length})
            </h3>
            <Link href="/submit" className="btn btn-primary btn-sm" style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>
              + Report Scam
            </Link>
          </div>

          {dataLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div className="skeleton" style={{ height: "60px", borderRadius: "var(--radius-md)" }} />
              <div className="skeleton" style={{ height: "60px", borderRadius: "var(--radius-md)" }} />
            </div>
          ) : myReports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-muted)" }}>
              <p style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>You haven&apos;t filed any scam reports yet.</p>
              <Link href="/submit" className="btn btn-ghost btn-sm" style={{ fontSize: "0.8rem" }}>
                Submit a report now
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {myReports.map((report) => {
                const isScam = report.ai_verdict === "LIKELY_SCAM";
                const isGenuine = report.ai_verdict === "LIKELY_GENUINE";
                const badgeBg = isScam ? "var(--scam-dim)" : isGenuine ? "var(--genuine-dim)" : "var(--uncertain-dim)";
                const badgeColor = isScam ? "var(--scam)" : isGenuine ? "var(--genuine)" : "var(--uncertain)";
                const badgeBorder = isScam ? "var(--scam-border)" : isGenuine ? "var(--genuine-border)" : "var(--uncertain-border)";

                return (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
                      padding: "0.875rem 1rem", background: "var(--bg-base)",
                      borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)",
                      transition: "all 0.15s ease",
                    }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-accent)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                          <span style={{
                            padding: "0.1rem 0.5rem", borderRadius: "999px",
                            fontSize: "0.65rem", fontWeight: 700,
                            background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}`,
                            textTransform: "uppercase",
                          }}>
                            {report.ai_verdict ? report.ai_verdict.replace("_", " ") : "PENDING"}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {report.title}
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.15rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          Target: <code style={{ fontSize: "0.72rem" }}>{report.target}</code>
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
                        <ChevronRight size={16} strokeWidth={1.75} color="var(--text-muted)" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div style={{
          background: "var(--bg-surface)", border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-xl)", padding: "1.5rem",
          boxShadow: "var(--shadow-card)", marginBottom: "1.5rem",
          animation: "fadeInUp 0.4s 0.2s ease both",
        }}>
          <h3 style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>Quick actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {[
              { href: "/submit", icon: <ShieldCheck size={16} strokeWidth={1.75} />, label: "Submit a report", desc: "Report a scam or verify something" },
              { href: "/feed", icon: <MessageCircle size={16} strokeWidth={1.75} />, label: "Go to feed", desc: "Share and read experiences" },
              { href: "/reports", icon: <FileText size={16} strokeWidth={1.75} />, label: "Browse reports", desc: "View all community reports" },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  padding: "0.875rem", borderRadius: "var(--radius-md)",
                  border: "1.5px solid transparent", transition: "all 0.15s ease",
                  cursor: "pointer",
                }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-base)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
                >
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "var(--radius-md)",
                    background: "var(--accent-dim)", border: "1.5px solid #c5cdf5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--accent)", flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRight size={14} strokeWidth={1.75} color="var(--text-muted)" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div style={{ animation: "fadeInUp 0.4s 0.3s ease both" }}>
          <button
            className="btn btn-ghost"
            onClick={handleSignOut}
            style={{
              width: "100%", justifyContent: "center",
              color: "var(--scam)", borderColor: "var(--scam-border)",
              display: "flex", alignItems: "center", gap: "0.4rem",
            }}
          >
            <LogOut size={15} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
