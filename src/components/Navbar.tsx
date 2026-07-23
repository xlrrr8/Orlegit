"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ShieldCheck, Menu, X, Flag, User, LogOut, ChevronDown, Shield } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, profile, loading, signOut } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = (profile?.username?.[0] || user?.email?.[0] || "?").toUpperCase();
  const avatarColor = "#4c63d2";

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          <ShieldCheck size={20} strokeWidth={2} color="var(--accent)" />
          <span className={styles.logoText}>
            OR<span className={styles.logoAccent}>legit</span>
          </span>
        </Link>

        <div className={`${styles.links} ${mobileOpen ? styles.open : ""}`}>
          <Link href="/reports" className={styles.link} onClick={() => setMobileOpen(false)}>
            Reports
          </Link>
          <Link href="/feed" className={styles.link} onClick={() => setMobileOpen(false)}>
            Feed
          </Link>
          <Link href="/search" className={styles.link} onClick={() => setMobileOpen(false)}>
            Search
          </Link>
          {!loading && profile && ["moderator", "admin"].includes(profile.role) && (
            <Link href="/moderate" className={styles.link} onClick={() => setMobileOpen(false)} style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--accent)" }}>
              <Shield size={13} strokeWidth={2} />
              Moderate
            </Link>
          )}
          <Link href="/submit" className={`btn btn-danger btn-sm ${styles.ctaBtn}`} onClick={() => setMobileOpen(false)}>
            <Flag size={13} strokeWidth={2} />
            Report
          </Link>

          {/* Auth section */}
          {!loading && (
            user ? (
              /* Signed in — avatar dropdown */
              <div ref={dropdownRef} style={{ position: "relative", marginLeft: "0.375rem" }}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    background: "none", border: "1.5px solid var(--border)",
                    borderRadius: "999px", padding: "0.25rem 0.625rem 0.25rem 0.25rem",
                    cursor: "pointer", transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-accent)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-section)"; }}
                  onMouseLeave={(e) => { if (!dropdownOpen) { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "none"; }}}
                  aria-label="Account menu"
                >
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: avatarColor + "18",
                    border: `1.5px solid ${avatarColor}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: avatarColor }}>
                      {initial}
                    </span>
                  </div>
                  <ChevronDown
                    size={13} strokeWidth={1.75} color="var(--text-muted)"
                    style={{
                      transition: "transform 0.2s ease",
                      transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div style={{
                    position: "absolute", right: 0, top: "calc(100% + 6px)",
                    background: "var(--bg-surface)",
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-lg)",
                    minWidth: "200px", overflow: "hidden",
                    animation: "fadeInUp 0.15s ease both",
                    zIndex: 200,
                  }}>
                    {/* User info */}
                    <div style={{
                      padding: "0.875rem 1rem",
                      borderBottom: "1px solid var(--border)",
                    }}>
                      <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                        {profile?.username || "User"}
                      </p>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                        {user.email}
                      </p>
                    </div>

                    {/* Menu items */}
                    <div style={{ padding: "0.375rem" }}>
                      <Link
                        href="/account"
                        onClick={() => setDropdownOpen(false)}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.5rem",
                          padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)",
                          fontSize: "0.82rem", color: "var(--text-secondary)",
                          textDecoration: "none", transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-section)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                      >
                        <User size={14} strokeWidth={1.75} />
                        My Account
                      </Link>

                      <button
                        onClick={async () => {
                          setDropdownOpen(false);
                          await signOut();
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.5rem",
                          padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)",
                          fontSize: "0.82rem", color: "var(--scam)", width: "100%",
                          background: "none", border: "none", cursor: "pointer",
                          textAlign: "left", transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--scam-dim)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                      >
                        <LogOut size={14} strokeWidth={1.75} />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Signed out — sign in button */
              <Link
                href="/login"
                className={`btn btn-ghost btn-sm`}
                style={{ marginLeft: "0.375rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
                onClick={() => setMobileOpen(false)}
              >
                <User size={14} strokeWidth={1.75} />
                Sign in
              </Link>
            )
          )}
        </div>

        <button
          className={styles.hamburger}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} color="var(--text-secondary)" /> : <Menu size={20} color="var(--text-secondary)" />}
        </button>
      </nav>
    </header>
  );
}
