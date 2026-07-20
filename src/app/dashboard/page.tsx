import { MOCK_REPORTS, MOCK_STATS, getScamScore } from "@/lib/mockData";
import Link from "next/link";

export const metadata = {
  title: "Dashboard — ORlegit",
};

export default function DashboardPage() {
  const myReports = MOCK_REPORTS.slice(0, 3);

  return (
    <div style={{ padding: "3rem 0 6rem" }}>
      <div className="container">
        {/* Profile header */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)", padding: "2rem", marginBottom: "2rem",
          display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap",
        }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), var(--scam))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2rem", flexShrink: 0,
          }}>
            👤
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ marginBottom: "0.25rem" }}>@demo_user</h2>
            <p style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>Member since July 2026</p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600 }}>
                🏆 Trust Score: 847
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--genuine)", fontWeight: 600 }}>
                ✅ Verified Reporter
              </span>
            </div>
          </div>
          <Link href="/submit" className="btn btn-danger">
            🚨 New Report
          </Link>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: "2rem" }}>
          {[
            { icon: "📋", label: "Reports Filed", value: "3", color: "var(--accent)" },
            { icon: "🎯", label: "Scams Confirmed", value: "3", color: "var(--scam)" },
            { icon: "🗳️", label: "Votes Cast", value: "12", color: "var(--uncertain)" },
            { icon: "🏆", label: "Trust Score", value: "847", color: "var(--genuine)" },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{stat.icon}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: stat.color, marginBottom: "0.25rem" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* My Reports */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)", padding: "1.75rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3>My Reports</h3>
            <Link href="/reports" className="btn btn-ghost btn-sm">View All →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {myReports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  padding: "0.875rem 1rem", background: "var(--bg-input)",
                  borderRadius: "var(--radius-md)", textDecoration: "none",
                  transition: "all var(--duration) var(--ease)", cursor: "pointer",
                }}
                className="card"
              >
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                  background: report.ai_verdict === "LIKELY_SCAM" ? "var(--scam)" : report.ai_verdict === "LIKELY_GENUINE" ? "var(--genuine)" : "var(--uncertain)",
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {report.title}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {report.community_scam_votes + report.community_genuine_votes} votes · ScamScore {getScamScore(report)}
                  </p>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
