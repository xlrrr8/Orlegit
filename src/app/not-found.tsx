import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
      <div className="card" style={{ maxWidth: "480px", padding: "3rem 2rem" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--scam-dim)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
          <AlertCircle size={24} color="var(--scam)" />
        </div>
        <h2 style={{ marginBottom: "0.5rem" }}>Page not found</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          The page or report you are looking for does not exist or may have been removed.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
