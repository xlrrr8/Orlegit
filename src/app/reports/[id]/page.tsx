"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Flag, CheckCircle2, AlertTriangle, Share2, ChevronRight, User, Clock, MessageSquare, Loader } from "lucide-react";
import { categoryInfo, timeAgo, getScamScore } from "@/lib/mockData";
import AIVerdict from "@/components/AIVerdict";
import VoteBar from "@/components/VoteBar";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ReportPage({ params }: Props) {
  const { id } = use(params);
  const [report, setReport] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [voted, setVoted] = useState<"scam" | "genuine" | null>(null);
  const [voting, setVoting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      // Fetch report
      const { data: reportData, error: reportError } = await supabase
        .from("reports")
        .select("*, profiles(username)")
        .eq("id", id)
        .single();

      if (reportError || !reportData) {
        setLoading(false);
        return;
      }

      // Fetch comments
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*, profiles(username)")
        .eq("report_id", id)
        .order("created_at", { ascending: false });

      setReport({
        ...reportData,
        username: reportData.profiles?.username || "anonymous",
      });

      setComments(
        (commentsData || []).map((c: any) => ({
          ...c,
          username: c.profiles?.username || "anonymous",
        }))
      );
      setLoading(false);
    }

    loadData();
  }, [id]);

  const handleVote = async (voteType: "scam" | "genuine") => {
    if (voted || voting || !report) return;
    setVoting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      // 1. Insert vote log if userId exists (optional tracking)
      if (userId) {
        await supabase.from("votes").insert({
          user_id: userId,
          report_id: id,
          vote: voteType,
        });
      }

      // 2. Increment counters on reports table
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
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", marginBottom: "2rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <Link href="/" style={{ color: "var(--text-muted)" }}>Home</Link>
          <ChevronRight size={12} strokeWidth={1.75} />
          <Link href="/reports" style={{ color: "var(--text-muted)" }}>Reports</Link>
          <ChevronRight size={12} strokeWidth={1.75} />
          <span style={{ color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {report.title}
          </span>
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

            <button className="btn btn-ghost btn-sm" style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "center" }}>
              <Share2 size={13} strokeWidth={1.75} />
              Share report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
