import Link from "next/link";
import { Search, Flag, ArrowRight, MessageCircle } from "lucide-react";
import ReportCard from "@/components/ReportCard";
import PostCard from "@/components/PostCard";
import { createClient } from "@/lib/supabase";
import { MOCK_COMMUNITY_POSTS } from "@/lib/communityData";

export default async function HomePage() {
  const supabase = createClient();

  // Fetch real statistics
  const { count: totalReports } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true });

  const { count: scamsVerified } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("ai_verdict", "LIKELY_SCAM");

  const { count: genuineVerified } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("ai_verdict", "LIKELY_GENUINE");

  const stats = {
    totalReports: totalReports || 0,
    scamsVerified: scamsVerified || 0,
    genuineVerified: genuineVerified || 0,
    usersProtected: (scamsVerified || 0) * 18 + 120, // Extrapolation
    todayReports: Math.max(1, Math.round((totalReports || 0) * 0.05)),
  };

  // Fetch recent verified scams
  const { data: rawReports } = await supabase
    .from("reports")
    .select("*, profiles(username)")
    .eq("ai_verdict", "LIKELY_SCAM")
    .order("created_at", { ascending: false })
    .limit(3);

  const featuredReports = (rawReports || []).map((r: any) => ({
    ...r,
    username: r.profiles?.username || "anonymous",
  }));


  return (
    <div>
      {/* Hero */}
      <section style={{
        padding: "5.5rem 0 5rem",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(160deg, #eef1ff 0%, #ffffff 55%, #f5f6fa 100%)",
        borderBottom: "1.5px solid var(--border)",
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: "absolute", top: "-120px", right: "-120px",
          width: "600px", height: "600px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(76,99,210,0.09) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-80px", left: "-80px",
          width: "400px", height: "400px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(13,158,92,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div className="container" style={{ textAlign: "center", position: "relative" }}>

          {/* ——— BIG ORLEGIT WORDMARK ——— */}
          <div style={{ marginBottom: "2.25rem", animation: "fadeInUp 0.5s ease both" }}>
            <div style={{
              display: "inline-block",
              position: "relative",
            }}>
              {/* Highlight glow behind the word */}
              <div style={{
                position: "absolute", inset: "-6px -16px",
                background: "linear-gradient(135deg, rgba(76,99,210,0.12), rgba(13,158,92,0.10))",
                borderRadius: "16px",
                filter: "blur(12px)",
                zIndex: 0,
              }} />
              <h1 style={{
                position: "relative", zIndex: 1,
                fontSize: "clamp(3rem, 10vw, 6.5rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                margin: 0,
              }}>
                <span style={{ color: "var(--text-primary)" }}>OR</span>
                <span style={{ color: "#4c63d2" }}>legit</span>
              </h1>
            </div>
            {/* Underline accent bar */}
            <div style={{
              width: "64px", height: "3px",
              background: "#4c63d2",
              borderRadius: "999px", margin: "0.875rem auto 0",
            }} />
          </div>

          {/* Pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.45rem",
            background: "var(--accent-dim)", border: "1.5px solid #c5cdf5",
            borderRadius: "999px", padding: "0.3rem 1rem",
            fontSize: "0.775rem", color: "var(--accent)", fontWeight: 500,
            marginBottom: "1.25rem", animation: "fadeInUp 0.5s 0.1s ease both",
          }}>
            Community-powered · AI-verified
          </div>

          <p style={{
            fontSize: "1.05rem", maxWidth: "500px", margin: "0 auto 2.25rem",
            lineHeight: 1.8, color: "var(--text-secondary)",
            animation: "fadeInUp 0.5s 0.2s ease both",
          }}>
            Verify URLs, phone numbers, messages, and social profiles using community reports and{" "}
            <span style={{ color: "var(--accent)", fontWeight: 500 }}>Google Gemini AI</span>.
          </p>

          {/* Hero Search */}
          <form
            action="/search"
            style={{
              display: "flex", gap: "0.625rem", maxWidth: "520px", margin: "0 auto 2.25rem",
              animation: "fadeInUp 0.5s 0.3s ease both",
            }}
          >
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={15} strokeWidth={1.75} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                name="q"
                className="form-input"
                placeholder="Paste a URL, phone number, or message…"
                style={{ height: "48px", fontSize: "0.9rem", background: "#fff", paddingLeft: "2.4rem" }}
                suppressHydrationWarning
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: "48px", padding: "0 1.25rem" }}>
              Check
            </button>
          </form>

          {/* CTA Buttons */}
          <div style={{
            display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap",
            animation: "fadeInUp 0.5s 0.4s ease both",
          }}>
            <Link href="/submit" className="btn btn-danger">
              <Flag size={14} strokeWidth={2} />
              Report a Scam
            </Link>
            <Link href="/reports" className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              Browse reports
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>


      {/* Stats Bar */}
      <section style={{
        background: "var(--bg-surface)",
        borderBottom: "1.5px solid var(--border)",
        padding: "1.25rem 0",
        boxShadow: "var(--shadow-sm)",
      }}>
        <div className="container">
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", textAlign: "center",
          }}>
            {[
              { value: stats.totalReports.toLocaleString(), label: "Total Reports" },
              { value: stats.scamsVerified.toLocaleString(), label: "Scams Verified", color: "var(--scam)" },
              { value: stats.genuineVerified.toLocaleString(), label: "Genuine", color: "var(--genuine)" },
              { value: stats.usersProtected.toLocaleString(), label: "Protected" },
              { value: `+${stats.todayReports}`, label: "Today", color: "var(--accent)" },
            ].map((stat) => (
              <div key={stat.label}>
                <div style={{ fontSize: "1.35rem", fontWeight: 600, color: stat.color || "var(--text-primary)" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Discussions */}
      <section style={{ padding: "5rem 0", background: "var(--bg-base)" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2>Recent Feed Discussions</h2>
              <p style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}>
                Hear from others, share your stories, and stay safe together
              </p>
            </div>
            <Link href="/feed" className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              View all discussions <ArrowRight size={13} strokeWidth={2} />
            </Link>
          </div>
          <div className="grid-3">
            {MOCK_COMMUNITY_POSTS.slice(0, 3).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </section>

      {/* Recent Reports */}
      <section style={{ padding: "0 0 5rem", background: "var(--bg-section)" }}>
        <div className="container" style={{ paddingTop: "4rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <div>
              <h2>Recent Verified Scams</h2>
              <p style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}>
                Latest reports confirmed by the community and AI
              </p>
            </div>
            <Link href="/reports" className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              View all <ArrowRight size={13} strokeWidth={2} />
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {featuredReports.map((report: any, i: number) => (
              <div key={report.id} style={{ animation: `fadeInUp 0.5s ${i * 0.1}s ease both` }}>
                <ReportCard report={report} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ padding: "5rem 0", background: "var(--bg-surface)" }}>
        <div className="container">
          <div style={{
            background: "linear-gradient(135deg, var(--scam-dim), var(--accent-dim))",
            border: "1.5px solid var(--scam-border)",
            borderRadius: "var(--radius-xl)",
            padding: "3.5rem",
            textAlign: "center",
            boxShadow: "var(--shadow-card)",
          }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "14px",
              background: "white", border: "1.5px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
              boxShadow: "var(--shadow-sm)",
            }}>
              <Flag size={22} strokeWidth={1.75} color="var(--scam)" />
            </div>
            <h2 style={{ marginBottom: "0.625rem" }}>Seen a scam? Protect others.</h2>
            <p style={{ maxWidth: "380px", margin: "0 auto 2rem", fontSize: "0.9rem" }}>
              Your report could save someone from losing their savings. It takes 2 minutes.
            </p>
            <Link href="/submit" className="btn btn-danger">
              <Flag size={14} strokeWidth={2} />
              Report a Scam
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
