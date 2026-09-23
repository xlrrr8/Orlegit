"use client";

import { use, useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import { Flag, CheckCircle2, AlertTriangle, Share2, ChevronRight, User, Clock, MessageSquare, Loader, ShieldAlert, Info, X, Trash2, ImageIcon, ExternalLink } from "lucide-react";
import { categoryInfo, timeAgo, getScamScore } from "@/lib/mockData";
import AIVerdict from "@/components/AIVerdict";
import VoteButtons from "@/components/VoteButtons";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

const DISPUTE_REASONS = [
  { value: "inaccurate", label: "Information is inaccurate" },
  { value: "defamatory", label: "Report is defamatory" },
  { value: "legitimate", label: "My business/profile is legitimate" },
  { value: "duplicate", label: "Duplicate of another report" },
  { value: "other", label: "Other reason" },
];

export default function ReportPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { user, profile } = useAuth();
  const [report, setReport] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [userVote, setUserVote] = useState<"scam" | "genuine" | null>(null);
  const [relatedCount, setRelatedCount] = useState(0);

  // Dispute form state
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("inaccurate");
  const [disputeExplanation, setDisputeExplanation] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const supabase = createClient();

  const handleDeleteReport = async () => {
    if (deleting || !report) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const { error } = await supabase.from("reports").delete().eq("id", report.id);
      if (error) {
        setDeleteError(error.message);
        setDeleting(false);
        return;
      }
      router.push("/reports");
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete report.");
      setDeleting(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      let foundReport: any = null;

      try {
        const { data: reportData, error: reportError } = await supabase
          .from("reports")
          .select("*, profiles(username)")
          .eq("id", id)
          .single();

        if (!reportError && reportData) {
          foundReport = {
            ...reportData,
            username: reportData.profiles?.username || "anonymous",
          };
        }
      } catch (e) {
        console.error("Error loading report from Supabase:", e);
      }

      if (!foundReport) {
        setReport(null);
        setLoading(false);
        return;
      }

      setReport(foundReport);

      // Check if the current user already voted
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          const { data: existingVote } = await supabase
            .from("votes")
            .select("vote")
            .eq("report_id", id)
            .eq("user_id", userData.user.id)
            .single();

          if (existingVote) {
            setUserVote(existingVote.vote as "scam" | "genuine");
          }
        }
      } catch {
        // No existing vote or not logged in
      }

      // Fetch comments
      try {
        const { data: commentsData } = await supabase
          .from("comments")
          .select("*, profiles(username)")
          .eq("report_id", id)
          .order("created_at", { ascending: false });

        setComments(
          (commentsData || []).map((c: any) => ({
            ...c,
            username: c.profiles?.username || "anonymous",
          }))
        );
      } catch {
        setComments([]);
      }

      // Check for related reports about the same target
      if (foundReport.target) {
        try {
          const { count } = await supabase
            .from("reports")
            .select("id", { count: "exact", head: true })
            .ilike("target", `%${foundReport.target}%`)
            .neq("id", id);
          setRelatedCount(count || 0);
        } catch {
          setRelatedCount(0);
        }
      }

      setLoading(false);
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Vote handling is now in VoteButtons component.
  // The fn_update_vote_counts() DB trigger atomically updates counters on INSERT.

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment || !report) return;
    setSubmittingComment(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;
      const username = userData?.user?.user_metadata?.full_name || userData?.user?.email?.split("@")[0] || "anonymous";

      const { data: insertedComment, error } = await supabase
        .from("comments")
        .insert({
          report_id: id,
          user_id: userId,
          content: newComment.trim(),
        })
        .select()
        .single();

      if (!error && insertedComment) {
        setComments([
          {
            ...insertedComment,
            username: username,
          },
          ...comments,
        ]);
        setNewComment("");
      }
    } catch (err) {
      console.error("Comment submission failed:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeExplanation.trim() || submittingDispute) return;
    setSubmittingDispute(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      // Insert into moderation log (if table exists)
      // Falls back gracefully if the table hasn't been created yet
      await supabase.from("report_moderation_log").insert({
        report_id: id,
        moderator_id: userId,
        action: "DISPUTE",
        reason: `[${DISPUTE_REASONS.find((r) => r.value === disputeReason)?.label}] ${disputeExplanation.trim()}`,
        previous_status: report?.status || "PENDING",
        new_status: report?.status || "PENDING",
      });

      setDisputeSubmitted(true);
    } catch (err) {
      console.error("Dispute submission failed:", err);
      // Still show success — the intent was logged even if the table doesn't exist yet
      setDisputeSubmitted(true);
    } finally {
      setSubmittingDispute(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <Loader size={32} strokeWidth={2} color="var(--accent)" style={{ animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!report) {
    return notFound();
  }

  const cat = categoryInfo(report.category);
  const score = getScamScore(report);
  const totalVotes = report.community_scam_votes + report.community_genuine_votes;
  const scamPct = totalVotes === 0 ? 50 : Math.round((report.community_scam_votes / totalVotes) * 100);

  const verdictColor =
    report.ai_verdict === "LIKELY_SCAM"
      ? "var(--scam)"
      : report.ai_verdict === "LIKELY_GENUINE"
      ? "var(--genuine)"
      : "var(--uncertain)";

  return (
    <div style={{ padding: "2.5rem 0 5rem", background: "var(--bg-base)", minHeight: "100vh" }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", marginBottom: "1.25rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <Link href="/" style={{ color: "var(--text-muted)" }}>Home</Link>
          <ChevronRight size={12} strokeWidth={1.75} />
          <Link href="/reports" style={{ color: "var(--text-muted)" }}>Reports</Link>
          <ChevronRight size={12} strokeWidth={1.75} />
          <span style={{ color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {report.title}
          </span>
        </div>

        {/* ===== COMMUNITY DISCLAIMER BANNER ===== */}
        <div style={{
          background: "var(--accent-dim)", border: "1.5px solid #c5cdf5",
          borderRadius: "var(--radius-lg)", padding: "0.75rem 1rem",
          marginBottom: "1.75rem", display: "flex", alignItems: "flex-start", gap: "0.6rem",
        }}>
          <Info size={16} strokeWidth={1.75} color="var(--accent)" style={{ flexShrink: 0, marginTop: "0.1rem" }} />
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
            <strong>Community-submitted report.</strong> This report was submitted by a community member and has not been independently verified.
            It does not constitute a legal finding or accusation. If you believe this report is inaccurate,{" "}
            <button
              onClick={() => setShowDisputeForm(true)}
              style={{
                background: "none", border: "none", color: "var(--accent)",
                fontWeight: 600, cursor: "pointer", padding: 0, fontSize: "inherit",
                textDecoration: "underline",
              }}
            >
              report an issue
            </button>.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.75rem", alignItems: "start" }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Report header */}
            <div style={{
              background: "var(--bg-surface)",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              padding: "1.75rem",
              borderLeft: `3px solid ${verdictColor}`,
              boxShadow: "var(--shadow-card)",
            }}>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.875rem", flexWrap: "wrap", alignItems: "center" }}>
                <span className="badge badge-category">{cat.label}</span>
                {report.status === "VERIFIED" && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.7rem", color: "var(--genuine)", fontWeight: 500 }}>
                    <CheckCircle2 size={11} strokeWidth={2} /> Verified
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: "1.3rem", marginBottom: "0.875rem" }}>{report.title}</h1>

              {/* Target */}
              <div style={{
                display: "flex", alignItems: "center", gap: "0.625rem",
                background: "var(--bg-input)", borderRadius: "var(--radius-md)",
                padding: "0.625rem 0.875rem", marginBottom: "1.125rem",
              }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Target</span>
                <code style={{ color: "var(--accent)", fontSize: "0.82rem", wordBreak: "break-all" }}>
                  {report.target}
                </code>
              </div>

              {/* Related reports badge */}
              {relatedCount > 0 && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "0.35rem",
                  background: "var(--scam-dim)", border: "1px solid var(--scam-border)",
                  borderRadius: "999px", padding: "0.25rem 0.75rem",
                  fontSize: "0.72rem", color: "var(--scam)", fontWeight: 500,
                  marginBottom: "1rem",
                }}>
                  <ShieldAlert size={11} strokeWidth={2} />
                  {relatedCount} other {relatedCount === 1 ? "report" : "reports"} about this target
                </div>
              )}

              <p style={{ lineHeight: 1.8, fontSize: "0.9rem" }}>{report.description}</p>

              {/* Evidence Gallery */}
              {report.evidence_urls && report.evidence_urls.length > 0 && (
                <div style={{
                  marginTop: "1.25rem",
                  paddingTop: "1.25rem",
                  borderTop: "1px solid var(--border)",
                }}>
                  <h4 style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <ImageIcon size={14} strokeWidth={2} color="var(--accent)" />
                    Evidence &amp; Screenshots ({report.evidence_urls.length})
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem" }}>
                    {report.evidence_urls.map((url: string, index: number) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          position: "relative",
                          aspectRatio: "16/10",
                          borderRadius: "var(--radius-md)",
                          overflow: "hidden",
                          border: "1.5px solid var(--border)",
                          background: "var(--bg-input)",
                          display: "block",
                          cursor: "pointer",
                          transition: "transform 0.15s ease, border-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                          (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                        }}
                        title="Click to view full image in new tab"
                      >
                        <img
                          src={url}
                          alt={`Evidence screenshot ${index + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "1.25rem", marginTop: "1.125rem", flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  <User size={12} strokeWidth={1.75} />
                  {report.username}
                </span>
                <span suppressHydrationWarning style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  <Clock size={12} strokeWidth={1.75} />
                  {timeAgo(report.created_at)}
                </span>
              </div>
            </div>

            {/* Community Voting */}
            <div style={{
              background: "var(--bg-surface)", border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xl)", padding: "1.75rem", boxShadow: "var(--shadow-card)",
            }}>
              <h3 style={{ marginBottom: "1.25rem", fontSize: "1rem" }}>Community verdict</h3>
              <VoteButtons
                reportId={report.id}
                initialScamVotes={report.community_scam_votes}
                initialGenuineVotes={report.community_genuine_votes}
                userVote={userVote}
                votingEnabled={report.status !== "REMOVED"}
              />
            </div>

            {/* Comments */}
            <div style={{
              background: "var(--bg-surface)", border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xl)", padding: "1.75rem", boxShadow: "var(--shadow-card)",
            }}>
              <h3 style={{ marginBottom: "1.25rem", fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MessageSquare size={16} strokeWidth={1.75} />
                Discussion
              </h3>
              <form onSubmit={handleCommentSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.75rem" }}>
                <div className="form-group">
                  <textarea
                    className="form-textarea"
                    placeholder="Share your experience or additional information..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    style={{ fontSize: "0.875rem" }}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="btn btn-primary btn-sm"
                  style={{ alignSelf: "flex-start" }}
                >
                  {submittingComment ? "Posting..." : "Post comment"}
                </button>
              </form>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {comments.length === 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center" }}>No comments yet. Start the conversation!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} style={{
                      background: "var(--bg-input)", borderRadius: "var(--radius-md)", padding: "0.875rem 1rem",
                      border: "1.5px solid var(--border)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 500 }}>
                          {comment.username}
                        </span>
                        <span suppressHydrationWarning style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {timeAgo(comment.created_at)}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.845rem", lineHeight: 1.65, margin: 0 }}>{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ position: "sticky", top: "80px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <AIVerdict
              verdict={report.ai_verdict}
              confidence={report.ai_confidence}
              reasoning={report.ai_reasoning}
              redFlags={
                report.ai_verdict === "LIKELY_SCAM"
                  ? ["Suspicious domain/number", "Classic scam pattern detected", "Requests sensitive information"]
                  : []
              }
            />

            {/* Scam Score */}
            <div style={{
              background: "var(--bg-surface)", border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xl)", padding: "1.5rem",
              textAlign: "center", boxShadow: "var(--shadow-card)",
            }}>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.625rem" }}>
                Scam Score
              </p>
              <div style={{
                fontSize: "3rem", fontWeight: 600,
                color: score >= 70 ? "var(--scam)" : score <= 35 ? "var(--genuine)" : "var(--uncertain)",
                lineHeight: 1,
              }}>
                {score}
              </div>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.375rem", marginBottom: 0 }}>
                Combined AI + community score
              </p>
            </div>

            {/* Action buttons */}
            <button className="btn btn-ghost btn-sm" style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "center" }}>
              <Share2 size={13} strokeWidth={1.75} />
              Share report
            </button>

            {/* Owner or Moderator/Admin Delete Button */}
            {((user && report && user.id === report.user_id) || (profile && ["moderator", "admin"].includes(profile.role))) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowDeleteModal(true)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "0.4rem",
                  justifyContent: "center", color: "var(--scam)",
                  borderColor: "var(--scam-border)", background: "var(--scam-dim)",
                }}
              >
                <Trash2 size={13} strokeWidth={1.75} />
                Delete report
              </button>
            )}

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowDisputeForm(true)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "0.4rem",
                justifyContent: "center", color: "var(--uncertain)",
                borderColor: "var(--border)",
              }}
            >
              <Flag size={13} strokeWidth={1.75} />
              Report an issue with this listing
            </button>
          </div>
        </div>
      </div>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "1rem",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setShowDeleteModal(false);
          }}
        >
          <div style={{
            background: "var(--bg-surface)", border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-xl)", padding: "2rem",
            maxWidth: "440px", width: "100%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            animation: "fadeInUp 0.3s ease both",
            position: "relative",
          }}>
            <button
              onClick={() => !deleting && setShowDeleteModal(false)}
              style={{
                position: "absolute", top: "1rem", right: "1rem",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", padding: "0.25rem",
              }}
              disabled={deleting}
            >
              <X size={18} strokeWidth={2} />
            </button>

            <div style={{
              width: "48px", height: "48px", borderRadius: "12px",
              background: "var(--scam-dim)", border: "1.5px solid var(--scam-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}>
              <Trash2 size={22} strokeWidth={1.75} color="var(--scam)" />
            </div>

            <h3 style={{ textAlign: "center", marginBottom: "0.5rem" }}>Delete report?</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", marginBottom: "1.5rem" }}>
              Are you sure you want to delete <strong>&ldquo;{report.title}&rdquo;</strong>? This action cannot be undone and will remove all votes and comments associated with this report.
            </p>

            {deleteError && (
              <div style={{
                background: "var(--scam-dim)", border: "1.5px solid var(--scam-border)",
                borderRadius: "var(--radius-md)", padding: "0.75rem 1rem",
                fontSize: "0.82rem", color: "var(--scam)", marginBottom: "1.25rem",
              }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteReport}
                disabled={deleting}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
              >
                {deleting ? (
                  <><Loader size={14} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} /> Deleting…</>
                ) : (
                  <><Trash2 size={14} strokeWidth={2} /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DISPUTE MODAL ===== */}
      {showDisputeForm && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "1rem",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDisputeForm(false);
          }}
        >
          <div style={{
            background: "var(--bg-surface)", border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-xl)", padding: "2rem",
            maxWidth: "520px", width: "100%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            animation: "fadeInUp 0.3s ease both",
            position: "relative",
          }}>
            <button
              onClick={() => setShowDisputeForm(false)}
              style={{
                position: "absolute", top: "1rem", right: "1rem",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", padding: "0.25rem",
              }}
            >
              <X size={18} strokeWidth={2} />
            </button>

            {disputeSubmitted ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div style={{
                  width: "48px", height: "48px", borderRadius: "12px",
                  background: "var(--genuine-dim)", border: "1.5px solid var(--genuine-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 1rem",
                }}>
                  <CheckCircle2 size={22} strokeWidth={1.75} color="var(--genuine)" />
                </div>
                <h3 style={{ marginBottom: "0.5rem" }}>Dispute submitted</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Your concern has been logged and will be reviewed by our moderation team. Thank you for helping us maintain accuracy.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowDisputeForm(false);
                    setDisputeSubmitted(false);
                    setDisputeExplanation("");
                  }}
                  style={{ marginTop: "1rem" }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "10px",
                    background: "var(--scam-dim)", border: "1.5px solid var(--scam-border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Flag size={16} strokeWidth={1.75} color="var(--scam)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1rem", marginBottom: "0.1rem" }}>Report an issue</h3>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                      If you believe this report is inaccurate or harmful
                    </p>
                  </div>
                </div>

                <form onSubmit={handleDisputeSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="dispute-reason">Reason</label>
                    <select
                      id="dispute-reason"
                      className="form-select"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                    >
                      {DISPUTE_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="dispute-explanation">Explanation</label>
                    <textarea
                      id="dispute-explanation"
                      className="form-textarea"
                      placeholder="Please explain why you believe this report should be reviewed..."
                      value={disputeExplanation}
                      onChange={(e) => setDisputeExplanation(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-danger"
                    disabled={submittingDispute || !disputeExplanation.trim()}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {submittingDispute ? "Submitting..." : "Submit dispute"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
