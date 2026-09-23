import Link from "next/link";
import { ShieldCheck, ChevronRight, Lock, Eye, FileText, Server, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — ORlegit",
  description: "How ORlegit collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <div style={{ padding: "3rem 0 6rem", background: "var(--bg-base)", minHeight: "100vh" }}>
      <div className="container" style={{ maxWidth: "800px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", marginBottom: "1.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <Link href="/" style={{ color: "var(--text-muted)" }}>Home</Link>
          <ChevronRight size={12} strokeWidth={1.75} />
          <span style={{ color: "var(--text-secondary)" }}>Privacy Policy</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            background: "var(--accent-dim)", border: "1.5px solid #c5cdf5",
            borderRadius: "999px", padding: "0.25rem 0.75rem",
            fontSize: "0.75rem", color: "var(--accent)", fontWeight: 500,
            marginBottom: "0.75rem",
          }}>
            <Lock size={12} strokeWidth={2} /> Legal &amp; Transparency
          </div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Privacy Policy</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Last updated: September 2026 · Effective immediately
          </p>
        </div>

        {/* Content Card */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "2.5rem",
          boxShadow: "var(--shadow-card)",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
          fontSize: "0.9rem",
          lineHeight: 1.8,
        }}>
          <section>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Eye size={18} strokeWidth={2} color="var(--accent)" />
              1. Information We Collect
            </h2>
            <p>
              ORlegit is designed to protect users from fraudulent schemes. To provide this service, we collect:
            </p>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <li><strong>Account Information:</strong> When you register, we collect your email address and username via Supabase Auth.</li>
              <li><strong>Report Submissions:</strong> Scam titles, targets (URLs, phone numbers, or account handles), descriptions, and uploaded evidence screenshots.</li>
              <li><strong>Community Activity:</strong> Votes on scam reports, comments, community feed posts, and dispute filings.</li>
              <li><strong>Technical Metadata:</strong> IP addresses are temporarily processed strictly for sliding-window rate limiting to prevent automated abuse and DoS attacks.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Server size={18} strokeWidth={2} color="var(--accent)" />
              2. How AI Analysis Works
            </h2>
            <p>
              When a scam report is submitted, the target, title, category, and description are processed by Google Gemini AI to generate an initial verification verdict. We wrap all user input in isolated text blocks to defend against prompt injection. AI analysis is an automated tool intended to assist human judgment, not a definitive legal finding.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Lock size={18} strokeWidth={2} color="var(--accent)" />
              3. Evidence &amp; Storage Security
            </h2>
            <p>
              Uploaded evidence screenshots and documents are stored in private cloud storage buckets. We generate time-limited signed URLs to display these images securely. Please do not upload personal identification documents (such as passwords, credit card numbers, or government IDs) when filing reports.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertCircle size={18} strokeWidth={2} color="var(--accent)" />
              4. Data Retention &amp; Deletion
            </h2>
            <p>
              You have the right to delete your reports and account at any time via your user dashboard. When a report is deleted, all associated community comments and votes are permanently purged or detached.
            </p>
          </section>

          <section style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Questions or Concerns?</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
              If you have any questions about this Privacy Policy or wish to dispute any report or data listed on ORlegit, please use the dispute feature on the relevant report or contact the moderation team.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
