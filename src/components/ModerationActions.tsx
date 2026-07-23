"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, EyeOff, RotateCcw, Loader } from "lucide-react";
import { createClient } from "@/lib/supabase";

type Action = "VERIFY" | "REMOVE" | "DISPUTE" | "HIDE" | "RESTORE" | "PUBLISH";

interface ModerationActionsProps {
  reportId: string;
  currentStatus: string;
  onActionComplete?: (newStatus: string) => void;
}

const ACTIONS: {
  action: Action;
  label: string;
  icon: React.ReactNode;
  style: React.CSSProperties;
  visibleStatuses: string[];
}[] = [
  {
    action: "VERIFY",
    label: "Verify",
    icon: <CheckCircle2 size={14} strokeWidth={2} />,
    style: {
      background: "var(--genuine-dim)",
      color: "var(--genuine)",
      border: "1.5px solid var(--genuine-border)",
    },
    visibleStatuses: ["PENDING", "DISPUTED"],
  },
  {
    action: "REMOVE",
    label: "Remove",
    icon: <XCircle size={14} strokeWidth={2} />,
    style: {
      background: "var(--scam-dim)",
      color: "var(--scam)",
      border: "1.5px solid var(--scam-border)",
    },
    visibleStatuses: ["PENDING", "VERIFIED", "DISPUTED"],
  },
  {
    action: "DISPUTE",
    label: "Dispute",
    icon: <AlertTriangle size={14} strokeWidth={2} />,
    style: {
      background: "var(--uncertain-dim)",
      color: "var(--uncertain)",
      border: "1.5px solid var(--uncertain-border)",
    },
    visibleStatuses: ["PENDING", "VERIFIED"],
  },
  {
    action: "HIDE",
    label: "Hide",
    icon: <EyeOff size={14} strokeWidth={2} />,
    style: {
      background: "var(--bg-section)",
      color: "var(--text-secondary)",
      border: "1.5px solid var(--border)",
    },
    visibleStatuses: ["PENDING", "VERIFIED"],
  },
  {
    action: "RESTORE",
    label: "Restore",
    icon: <RotateCcw size={14} strokeWidth={2} />,
    style: {
      background: "var(--accent-dim)",
      color: "var(--accent)",
      border: "1.5px solid #c5cdf5",
    },
    visibleStatuses: ["REMOVED", "DISPUTED"],
  },
];

export default function ModerationActions({
  reportId,
  currentStatus,
  onActionComplete,
}: ModerationActionsProps) {
  const [loading, setLoading] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [showReasonFor, setShowReasonFor] = useState<Action | null>(null);

  const handleAction = async (action: Action) => {
    // Actions that need a reason — prompt first
    if (["REMOVE", "DISPUTE"].includes(action) && showReasonFor !== action) {
      setShowReasonFor(action);
      return;
    }

    setLoading(action);
    setError(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("Session expired — please sign in again");
      setLoading(null);
      return;
    }

    try {
      const res = await fetch(`/api/moderate/${action.toLowerCase()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          report_id: reportId,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Action failed");
      } else {
        setShowReasonFor(null);
        setReason("");
        onActionComplete?.(data.new_status);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(null);
    }
  };

  const visibleActions = ACTIONS.filter((a) =>
    a.visibleStatuses.includes(currentStatus)
  );

  if (visibleActions.length === 0) return null;

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1.5px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: "1.25rem",
    }}>
      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Moderator Actions
      </p>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {visibleActions.map(({ action, label, icon, style }) => (
          <button
            key={action}
            onClick={() => handleAction(action)}
            disabled={loading !== null}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.9rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8rem",
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: loading !== null ? "not-allowed" : "pointer",
              transition: "all var(--duration) var(--ease)",
              opacity: loading !== null && loading !== action ? 0.5 : 1,
              ...style,
            }}
          >
            {loading === action ? (
              <Loader size={13} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
            ) : icon}
            {label}
          </button>
        ))}
      </div>

      {/* Reason input for REMOVE / DISPUTE */}
      {showReasonFor && (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <textarea
            className="form-textarea"
            placeholder={`Reason for ${showReasonFor.toLowerCase()} (optional but recommended)…`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            style={{ minHeight: "60px" }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => { setShowReasonFor(null); setReason(""); }}
            >
              Cancel
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleAction(showReasonFor)}
            >
              Confirm {showReasonFor.charAt(0) + showReasonFor.slice(1).toLowerCase()}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p style={{ fontSize: "0.78rem", color: "var(--scam)", marginTop: "0.75rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
