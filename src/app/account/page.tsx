"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Mail, Shield, Calendar, Award, Edit3,
  LogOut, Loader, Check, FileText, MessageCircle,
  ChevronRight, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { createClient } from "@/lib/supabase";

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-base)",
      }}>
        <Loader size={28} strokeWidth={2} color="var(--accent)" style={{ animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!user) return null;

  const initial = (profile?.username?.[0] || user.email?.[0] || "?").toUpperCase();
  const avatarColor = "#4c63d2";
  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const handleSaveUsername = async () => {
    if (!newUsername.trim() || newUsername.trim() === profile?.username) {
      setEditingUsername(false);
      return;
    }

    setSaving(true);
    setSaveError("");
    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername.trim() })
      .eq("id", user.id);

    if (error) {
      setSaveError(error.message.includes("duplicate")
        ? "That username is already taken."
        : error.message
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditingUsername(false);
    setSaveSuccess(true);
    await refreshProfile();
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", padding: "2.5rem 0 5rem" }}>
      <div className="container" style={{ maxWidth: "740px" }}>

        {/* Breadcrumb */}
        <div style={{
          display: "flex", gap: "0.35rem", alignItems: "center",
          marginBottom: "2rem", fontSize: "0.8rem", color: "var(--text-muted)",
        }}>
          <Link href="/" style={{ color: "var(--text-muted)" }}>Home</Link>
          <ChevronRight size={12} strokeWidth={1.75} />
          <span style={{ color: "var(--text-secondary)" }}>Account</span>
        </div>

        {/* Success toast */}
        {saveSuccess && (
          <div style={{
            position: "fixed", top: "80px", left: "50%", transform: "translateX(-50%)",
            background: "var(--genuine)", color: "white", borderRadius: "999px",
            padding: "0.5rem 1.25rem", fontSize: "0.82rem", fontWeight: 500,
            zIndex: 1000, boxShadow: "0 4px 20px rgba(13,158,92,0.3)",
            animation: "fadeInUp 0.3s ease both",
            display: "flex", alignItems: "center", gap: "0.35rem",
          }}>
            <Check size={14} strokeWidth={2.5} /> Profile updated!
          </div>
        )}

        {/* Profile header card */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "2.5rem 2rem",
          boxShadow: "var(--shadow-card)",
          marginBottom: "1.5rem",
          animation: "fadeInUp 0.4s ease both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: avatarColor + "18",
              border: `2.5px solid ${avatarColor}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: "2rem", fontWeight: 700, color: avatarColor }}>
                {initial}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Username row */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem", flexWrap: "wrap" }}>
                {editingUsername ? (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", animation: "fadeInUp 0.2s ease both" }}>
                    <input
                      className="form-input"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      style={{ height: "36px", fontSize: "0.875rem", width: "200px" }}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveUsername(); if (e.key === "Escape") setEditingUsername(false); }}
                      suppressHydrationWarning
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveUsername}
                      disabled={saving}
                      style={{ height: "36px" }}
                    >
                      {saving ? <Loader size={12} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} /> : <Check size={14} strokeWidth={2} />}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setEditingUsername(false); setSaveError(""); }}
                      style={{ height: "36px" }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
                      {profile?.username || "User"}
                    </h1>
                    <button
                      onClick={() => { setEditingUsername(true); setNewUsername(profile?.username || ""); }}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-muted)", padding: "0.25rem",
                        display: "flex", alignItems: "center",
                      }}
                      title="Edit username"
                    >
                      <Edit3 size={14} strokeWidth={1.75} />
                    </button>
                  </>
                )}
              </div>

              {saveError && (
                <p style={{ fontSize: "0.78rem", color: "var(--scam)", marginBottom: "0.375rem" }}>{saveError}</p>
              )}

              {/* Email */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                <Mail size={13} strokeWidth={1.75} />
                {user.email}
              </div>

              {/* Member since */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                <Calendar size={12} strokeWidth={1.75} />
                Member since {memberSince}
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem",
          marginBottom: "1.5rem", animation: "fadeInUp 0.4s 0.1s ease both",
        }}>
          {[
            { icon: <Shield size={18} strokeWidth={1.75} />, label: "Trust Score", value: profile?.trust_score?.toString() || "0", color: "var(--accent)" },
            { icon: <FileText size={18} strokeWidth={1.75} />, label: "Reports", value: "0", color: "var(--scam)" },
            { icon: <MessageCircle size={18} strokeWidth={1.75} />, label: "Posts", value: "0", color: "var(--genuine)" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "var(--bg-surface)", border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xl)", padding: "1.375rem",
              boxShadow: "var(--shadow-card)", textAlign: "center",
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem", color: stat.color }}>
                {stat.icon}
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div style={{
          background: "var(--bg-surface)", border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-xl)", padding: "1.5rem",
          boxShadow: "var(--shadow-card)", marginBottom: "1.5rem",
          animation: "fadeInUp 0.4s 0.2s ease both",
        }}>
          <h3 style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>Quick actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {[
              { href: "/submit", icon: <ShieldCheck size={16} strokeWidth={1.75} />, label: "Submit a report", desc: "Report a scam or verify something" },
              { href: "/feed", icon: <MessageCircle size={16} strokeWidth={1.75} />, label: "Go to feed", desc: "Share and read experiences" },
              { href: "/reports", icon: <FileText size={16} strokeWidth={1.75} />, label: "Browse reports", desc: "View all community reports" },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  padding: "0.875rem", borderRadius: "var(--radius-md)",
                  border: "1.5px solid transparent", transition: "all 0.15s ease",
                  cursor: "pointer",
                }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-base)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
                >
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "var(--radius-md)",
                    background: "var(--accent-dim)", border: "1.5px solid #c5cdf5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--accent)", flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRight size={14} strokeWidth={1.75} color="var(--text-muted)" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div style={{ animation: "fadeInUp 0.4s 0.3s ease both" }}>
          <button
            className="btn btn-ghost"
            onClick={handleSignOut}
            style={{
              width: "100%", justifyContent: "center",
              color: "var(--scam)", borderColor: "var(--scam-border)",
              display: "flex", alignItems: "center", gap: "0.4rem",
            }}
          >
            <LogOut size={15} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
