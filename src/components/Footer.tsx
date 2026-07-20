import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer style={{
      borderTop: "1.5px solid var(--border)",
      background: "var(--bg-surface)",
      padding: "3rem 0 1.5rem",
    }}>
      <div className="container">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "3rem", marginBottom: "2.5rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
              <ShieldCheck size={18} strokeWidth={2} color="var(--accent)" />
              <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                OR<span style={{ color: "var(--accent)" }}>legit</span>
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", maxWidth: "260px", lineHeight: 1.75, color: "var(--text-secondary)" }}>
              Community-powered and AI-backed verification. Protecting people from fraud, one report at a time.
            </p>
          </div>
          <div>
            <p style={{ fontWeight: 600, marginBottom: "0.875rem", color: "var(--text-primary)", fontSize: "0.8rem" }}>
              Platform
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[["Reports", "/reports"], ["Search", "/search"], ["Submit Report", "/submit"]].map(([label, href]) => (
                <Link key={href} href={href} style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontWeight: 600, marginBottom: "0.875rem", color: "var(--text-primary)", fontSize: "0.8rem" }}>
              About
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[["Feed", "/feed"], ["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"]].map(([label, href]) => (
                <Link key={href} href={href} style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div style={{
          borderTop: "1.5px solid var(--border)", paddingTop: "1.5rem",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem",
        }}>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            © 2026 ORlegit. Community-driven fraud protection.
          </p>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Powered by <span style={{ color: "var(--accent)", fontWeight: 500 }}>Google Gemini</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
