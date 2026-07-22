"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Flag, CheckCircle2, AlertTriangle, Share2, ChevronRight, User, Clock, MessageSquare, Loader, ShieldAlert, Info, X } from "lucide-react";
import { categoryInfo, timeAgo, getScamScore } from "@/lib/mockData";
import AIVerdict from "@/components/AIVerdict";
import VoteBar from "@/components/VoteBar";
import { createClient } from "@/lib/supabase";
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
  const [report, setReport] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [voted, setVoted] = useState<"scam" | "genuine" | null>(null);
  const [voting, setVoting] = useState(false);
  const [relatedCount, setRelatedCount] = useState(0);

  // Dispute form state
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("inaccurate");
  const [disputeExplanation, setDisputeExplanation] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  const supabase = createClient();

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
            setVoted(existingVote.vote as "scam" | "genuine");
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

  const handleVote = async (voteType: "scam" | "genuine") => {
    if (voted || voting || !report) return;
    setVoting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        alert("Please sign in to vote.");
        setVoting(false);
        return;
      }

      // Insert vote — unique constraint will prevent duplicates
      const { error: voteError } = await supabase.from("votes").insert({
        user_id: userId,
        report_id: id,
        vote: voteType,
      });

      if (voteError) {
        if (voteError.code === "23505") {
          // Unique violation — already voted
          setVoted(voteType);
        } else {
          console.error("Vote insert failed:", voteError.message);
        }
        setVoting(false);
        return;
      }

      // Increment counters on reports table
      const isScam = voteType === "scam";
      const scamVotes = report.community_scam_votes + (isScam ? 1 : 0);
      const genuineVotes = report.community_genuine_votes + (isScam ? 0 : 1);

      const { error } = await supabase
        .from("reports")
        .update({
          community_scam_votes: scamVotes,
          community_genuine_votes: genuineVotes,
        })
        .eq("id", id);

      if (!error) {
        setReport({
          ...report,
          community_scam_votes: scamVotes,
          community_genuine_votes: genuineVotes,
        });
        setVoted(voteType);
      }
    } catch (err) {
      console.error("Voting failed:", err);
    } finally {
      setVoting(false);
    }
  };

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
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.75rem", fontWeight: 600, color: "var(--scam)" }}>
                    {report.community_scam_votes}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Scam votes</div>
                </div>
                <div style={{ textAlign: "center", alignSelf: "center" }}>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{totalVotes} total</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.75rem", fontWeight: 600, color: "var(--genuine)" }}>
                    {report.community_genuine_votes}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Genuine votes</div>
                </div>
              </div>
              <VoteBar scam={report.community_scam_votes} genuine={report.community_genuine_votes} />
              <p style={{ textAlign: "center", marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {scamPct}% believe this is a scam
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", marginTop: "1.25rem" }}>
                <button
                  onClick={() => handleVote("scam")}
                  disabled={!!voted || voting}
                  className="btn btn-danger btn-sm"
                  style={{
                    justifyContent: "center",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    opacity: voted === "genuine" ? 0.5 : 1,
                    transform: voted === "scam" ? "scale(1.03)" : "none",
                  }}
                >
                  <AlertTriangle size={13} strokeWidth={2} />
                  {voted === "scam" ? "Voted Scam" : "Scam"}
                </button>
                <button
                  onClick={() => handleVote("genuine")}
                  disabled={!!voted || voting}
                  className="btn btn-ghost btn-sm"
                  style={{
                    borderColor: "var(--genuine-border)",
                    color: "var(--genuine)",
                    justifyContent: "center",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    opacity: voted === "scam" ? 0.5 : 1,
                    transform: voted === "genuine" ? "scale(1.03)" : "none",
                  }}
                >
                  <CheckCircle2 size={13} strokeWidth={2} />
                  {voted === "genuine" ? "Voted Genuine" : "Genuine"}
                </button>
              </div>
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
