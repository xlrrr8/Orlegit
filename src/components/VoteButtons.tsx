"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Loader } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface VoteButtonsProps {
  reportId: string;
  initialScamVotes: number;
  initialGenuineVotes: number;
  /** The user's existing vote for this report, if any */
  userVote?: "scam" | "genuine" | null;
  /** Whether the report accepts votes (PENDING or VERIFIED reports do; REMOVED does not) */
  votingEnabled?: boolean;
}

export default function VoteButtons({
  reportId,
  initialScamVotes,
  initialGenuineVotes,
  userVote: initialUserVote = null,
  votingEnabled = true,
}: VoteButtonsProps) {
  const [scamVotes, setScamVotes] = useState(initialScamVotes);
  const [genuineVotes, setGenuineVotes] = useState(initialGenuineVotes);
  const [userVote, setUserVote] = useState<"scam" | "genuine" | null>(initialUserVote);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = scamVotes + genuineVotes;
  const scamPct = total > 0 ? Math.round((scamVotes / total) * 100) : 50;
  const genuinePct = 100 - scamPct;

  const handleVote = async (vote: "scam" | "genuine") => {
    if (!votingEnabled || userVote !== null || loading) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("Sign in to vote on reports");
      setLoading(false);
      return;
    }

    // Optimistic UI update
    if (vote === "scam") setScamVotes((v) => v + 1);
    else setGenuineVotes((v) => v + 1);
    setUserVote(vote);

    const { error: voteError } = await supabase
      .from("votes")
      .insert({ user_id: user.id, report_id: reportId, vote });

    if (voteError) {
      // Roll back optimistic update
      if (vote === "scam") setScamVotes((v) => v - 1);
      else setGenuineVotes((v) => v - 1);
      setUserVote(null);

      if (voteError.code === "23505") {
        setError("You've already voted on this report");
      } else {
        setError("Failed to save vote. Please try again.");
      }
    }

    setLoading(false);
  };

  return (
    <div>
      {/* Vote bar */}
      <div className="vote-bar-container" style={{ marginBottom: "0.75rem" }}>
        <div className="vote-bar-scam" style={{ width: `${scamPct}%` }} />
        <div className="vote-bar-genuine" style={{ width: `${genuinePct}%` }} />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        {/* Scam vote button */}
        <button
          onClick={() => handleVote("scam")}
          disabled={!votingEnabled || userVote !== null || loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.5rem 1rem",
            borderRadius: "var(--radius-md)",
            border: `1.5px solid ${userVote === "scam" ? "var(--scam)" : "var(--scam-border)"}`,
            background: userVote === "scam" ? "var(--scam)" : "var(--scam-dim)",
            color: userVote === "scam" ? "#fff" : "var(--scam)",
            cursor: votingEnabled && userVote === null && !loading ? "pointer" : "default",
            fontWeight: 600,
            fontSize: "0.82rem",
            fontFamily: "inherit",
            transition: "all var(--duration) var(--ease)",
            opacity: !votingEnabled ? 0.5 : 1,
          }}
          aria-label={`Vote scam (${scamVotes} votes)`}
        >
          {loading ? (
            <Loader size={13} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
          ) : (
            <ThumbsDown size={13} strokeWidth={2} />
          )}
          Scam · {scamVotes}
        </button>

        {/* Genuine vote button */}
        <button
          onClick={() => handleVote("genuine")}
          disabled={!votingEnabled || userVote !== null || loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.5rem 1rem",
            borderRadius: "var(--radius-md)",
            border: `1.5px solid ${userVote === "genuine" ? "var(--genuine)" : "var(--genuine-border)"}`,
            background: userVote === "genuine" ? "var(--genuine)" : "var(--genuine-dim)",
            color: userVote === "genuine" ? "#fff" : "var(--genuine)",
            cursor: votingEnabled && userVote === null && !loading ? "pointer" : "default",
            fontWeight: 600,
            fontSize: "0.82rem",
            fontFamily: "inherit",
            transition: "all var(--duration) var(--ease)",
            opacity: !votingEnabled ? 0.5 : 1,
          }}
          aria-label={`Vote genuine (${genuineVotes} votes)`}
        >
          {loading ? (
            <Loader size={13} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
          ) : (
            <ThumbsUp size={13} strokeWidth={2} />
          )}
          Genuine · {genuineVotes}
        </button>

        {userVote && (
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            You voted · {userVote}
          </span>
        )}
      </div>

      {!votingEnabled && (
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
          Voting is closed for this report
        </p>
      )}

      {error && (
        <p style={{ fontSize: "0.78rem", color: "var(--scam)", marginTop: "0.5rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
