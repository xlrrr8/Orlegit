import Link from "next/link";
import { AlertTriangle, CheckCircle2, HelpCircle, Clock, User } from "lucide-react";
import type { Report } from "@/lib/mockData";
import { timeAgo, categoryInfo } from "@/lib/mockData";
import VoteBar from "./VoteBar";
import AIVerdict from "./AIVerdict";

interface ReportCardProps {
  report: Report;
}

export default function ReportCard({ report }: ReportCardProps) {
  const cat = categoryInfo(report.category);
  const totalVotes = report.community_scam_votes + report.community_genuine_votes;

  const VerdictIcon =
    report.ai_verdict === "LIKELY_SCAM"
      ? AlertTriangle
      : report.ai_verdict === "LIKELY_GENUINE"
      ? CheckCircle2
      : HelpCircle;

  const verdictColor =
    report.ai_verdict === "LIKELY_SCAM"
      ? "var(--scam)"
      : report.ai_verdict === "LIKELY_GENUINE"
      ? "var(--genuine)"
      : "var(--uncertain)";

  return (
    <Link href={`/reports/${report.id}`} style={{ textDecoration: "none" }}>
      <article
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          cursor: "pointer",
          borderLeft: `3px solid ${verdictColor}`,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem", flexWrap: "wrap" }}>
              <span className="badge badge-category">
                {cat.label}
              </span>
              {report.status === "VERIFIED" && (
                <span style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.7rem", color: "var(--genuine)", fontWeight: 500 }}>
                  <CheckCircle2 size={11} strokeWidth={2} />
                  Verified
                </span>
              )}
            </div>
            <h3 style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "0.2rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {report.title}
            </h3>
            <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", fontFamily: "monospace", marginTop: 0 }}>
              {report.target}
            </p>
          </div>
          <AIVerdict verdict={report.ai_verdict} confidence={report.ai_confidence} compact />
        </div>

        {/* Description snippet */}
        <p style={{
          fontSize: "0.845rem",
          color: "var(--text-secondary)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          lineHeight: 1.65,
          margin: 0,
        }}>
          {report.description}
        </p>

        {/* Vote bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--scam)", fontWeight: 500 }}>
              {report.community_scam_votes} scam
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {totalVotes} votes
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--genuine)", fontWeight: 500 }}>
              {report.community_genuine_votes} genuine
            </span>
          </div>
          <VoteBar
            scam={report.community_scam_votes}
            genuine={report.community_genuine_votes}
          />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
            <User size={11} strokeWidth={1.75} />
            {report.username}
          </span>
          <span suppressHydrationWarning style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
            <Clock size={11} strokeWidth={1.75} />
            {timeAgo(report.created_at)}
          </span>
        </div>
      </article>
    </Link>
  );
}
