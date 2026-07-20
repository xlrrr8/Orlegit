import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import type { Verdict } from "@/lib/mockData";

interface AIVerdictProps {
  verdict: Verdict;
  confidence: number;
  reasoning?: string;
  redFlags?: string[];
  compact?: boolean;
}

const VERDICT_CONFIG = {
  LIKELY_SCAM: {
    label: "Likely Scam",
    shortLabel: "Scam",
    Icon: AlertTriangle,
    color: "var(--scam)",
    bg: "var(--scam-dim)",
    border: "var(--scam-border)",
    glow: "var(--scam-glow)",
    glowAnim: "glow-scam",
    description: "This appears to be fraudulent",
    barColor: "linear-gradient(90deg, #ffadad, var(--scam))",
  },
  LIKELY_GENUINE: {
    label: "Likely Genuine",
    shortLabel: "Genuine",
    Icon: CheckCircle2,
    color: "var(--genuine)",
    bg: "var(--genuine-dim)",
    border: "var(--genuine-border)",
    glow: "var(--genuine-glow)",
    glowAnim: "glow-genuine",
    description: "This appears to be legitimate",
    barColor: "linear-gradient(90deg, #a3f0c8, var(--genuine))",
  },
  UNCERTAIN: {
    label: "Uncertain",
    shortLabel: "Uncertain",
    Icon: HelpCircle,
    color: "var(--uncertain)",
    bg: "var(--uncertain-dim)",
    border: "var(--uncertain-border)",
    glow: "none",
    glowAnim: "",
    description: "More evidence needed",
    barColor: "linear-gradient(90deg, #ffd8a8, var(--uncertain))",
  },
};

export default function AIVerdict({ verdict, confidence, reasoning, redFlags, compact }: AIVerdictProps) {
  const config = VERDICT_CONFIG[verdict];
  const { Icon } = config;

  if (compact) {
    return (
      <div style={{
        background: config.bg,
        border: `1.5px solid ${config.border}`,
        borderRadius: "var(--radius-md)",
        padding: "0.4rem 0.75rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.15rem",
        flexShrink: 0,
      }}>
        <Icon size={13} strokeWidth={2} color={config.color} />
        <div style={{ fontSize: "0.65rem", color: config.color, fontWeight: 600 }}>
          {config.shortLabel}
        </div>
        <div style={{ fontSize: "0.63rem", color: "var(--text-muted)" }}>
          {confidence}%
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: config.bg,
      border: `1.5px solid ${config.border}`,
      borderRadius: "var(--radius-xl)",
      padding: "1.75rem",
      boxShadow: config.glow !== "none" ? config.glow : "var(--shadow-card)",
    }}>
      {/* AI label */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        marginBottom: "1.25rem",
        fontSize: "0.7rem",
        color: "var(--text-muted)",
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}>
        <span style={{
          width: "6px", height: "6px", borderRadius: "50%", background: config.color,
          animation: "pulse 2s ease-in-out infinite", display: "inline-block",
        }} />
        AI Verdict · Gemini
      </div>

      {/* Main verdict */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{
          width: "52px", height: "52px", borderRadius: "14px",
          background: "white", border: `1.5px solid ${config.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 0.875rem",
          boxShadow: "var(--shadow-sm)",
        }}>
          <Icon size={24} strokeWidth={1.75} color={config.color} />
        </div>
        <div style={{
          fontSize: "1.35rem",
          fontWeight: 600,
          color: config.color,
          letterSpacing: "-0.01em",
          marginBottom: "0.3rem",
        }}>
          {config.label}
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
          {config.description}
        </div>
      </div>

      {/* Confidence meter */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.45rem" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>
            Confidence
          </span>
          <span style={{ fontSize: "0.85rem", color: config.color, fontWeight: 600 }}>
            {confidence}%
          </span>
        </div>
        <div style={{ height: "6px", background: "var(--neutral-200)", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${confidence}%`,
            background: config.barColor,
            borderRadius: "999px",
            transition: "width 1s var(--ease)",
          }} />
        </div>
      </div>

      {/* Reasoning */}
      {reasoning && (
        <div style={{
          background: "rgba(255,255,255,0.8)",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "0.875rem 1rem",
          marginBottom: redFlags && redFlags.length > 0 ? "1rem" : 0,
        }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.75 }}>
            {reasoning}
          </p>
        </div>
      )}

      {/* Red flags */}
      {redFlags && redFlags.length > 0 && (
        <div>
          <p style={{
            fontSize: "0.7rem", fontWeight: 600, color: "var(--scam)",
            marginBottom: "0.5rem", letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            Red flags
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {redFlags.map((flag, i) => (
              <div key={i} style={{
                fontSize: "0.78rem",
                color: "var(--scam)",
                padding: "0.35rem 0.65rem",
                background: "white",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--scam-border)",
                fontWeight: 400,
              }}>
                {flag}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
