import Link from "next/link";
import { ShieldCheck, ChevronRight, FileText, Scale, AlertTriangle, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Terms of Service — ORlegit",
  description: "Terms and conditions for using the ORlegit platform.",
};

export default function TermsPage() {
  return (
    <div style={{ padding: "3rem 0 6rem", background: "var(--bg-base)", minHeight: "100vh" }}>
      <div className="container" style={{ maxWidth: "800px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", marginBottom: "1.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <Link href="/" style={{ color: "var(--text-muted)" }}>Home</Link>
          <ChevronRight size={12} strokeWidth={1.75} />
          <span style={{ color: "var(--text-secondary)" }}>Terms of Service</span>
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
            <Scale size={12} strokeWidth={2} /> User Agreement
          </div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Terms of Service</h1>
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
              <FileText size={18} strokeWidth={2} color="var(--accent)" />
              1. Platform Purpose &amp; Nature of Content
            </h2>
            <p>
              ORlegit is a community-driven scam awareness and crowdsourced verification platform. All reports, comments, and votes published on this platform reflect user submissions and automated AI indicators. <strong>They do not constitute judicial rulings, official law enforcement findings, or conclusive legal determinations.</strong>
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckCircle2 size={18} strokeWidth={2} color="var(--accent)" />
              2. User Obligations &amp; Accurate Reporting
            </h2>
            <p>
              By submitting content to ORlegit, you warrant and agree that:
            </p>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <li>All information submitted is truthful, accurate, and based on real-world experiences or verifiable evidence.</li>
              <li>You will not submit defamatory, retaliatory, fraudulent, or bad-faith reports targeting legitimate businesses or private individuals.</li>
              <li>You will not attempt to tamper with AI analysis, automate voting scripts, or artificially inflate scam/genuine metrics.</li>
              <li>You will not upload evidence containing private financial data (passwords, PINs, bank account OTPs) or illicit material.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={18} strokeWidth={2} color="var(--accent)" />
              3. Dispute &amp; Moderation Procedure
            </h2>
            <p>
              Any individual or business entity that believes a listing on ORlegit is inaccurate, defamatory, or outdated has the right to dispute the listing. Each report includes an issue reporting form where you can submit evidence of legitimacy. Our moderation team reviews disputes and updates or removes inaccurate listings accordingly.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Scale size={18} strokeWidth={2} color="var(--accent)" />
              4. Limitation of Liability
            </h2>
            <p>
              ORlegit is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. To the maximum extent permitted by applicable law, ORlegit and its contributors shall not be liable for any direct, indirect, incidental, or consequential damages arising from reliance upon community submissions, AI verdicts, or external links reported on the platform.
            </p>
          </section>

          <section style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Acceptance of Terms</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
              By registering an account, submitting a report, casting a vote, or continuing to browse ORlegit, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
