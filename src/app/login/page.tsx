"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, User, Loader, ArrowRight, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // If already logged in, redirect
  if (user) {
    router.replace("/account");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const supabase = createClient();

    if (mode === "signup") {
      if (!username.trim()) {
        setError("Username is required.");
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Create profile row
      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          username: username.trim(),
        });

        if (profileError && !profileError.message.includes("duplicate")) {
          setError("Account created but profile setup failed. Please try signing in.");
          setLoading(false);
          return;
        }
      }

      setSuccess("Account created! Redirecting…");
      setTimeout(() => router.push("/account"), 1000);
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/account");
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/account`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #eef1ff 0%, #ffffff 55%, #f5f6fa 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem 1rem",
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: "fixed", top: "-120px", right: "-120px",
        width: "500px", height: "500px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(76,99,210,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: "-80px", left: "-80px",
        width: "350px", height: "350px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(13,158,92,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%",
        maxWidth: "440px",
        animation: "fadeInUp 0.5s ease both",
        position: "relative",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
            <ShieldCheck size={28} strokeWidth={2} color="var(--accent)" />
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              OR<span style={{ color: "var(--accent)" }}>legit</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "2.5rem 2rem",
          boxShadow: "0 8px 40px rgba(30, 35, 80, 0.1), 0 2px 10px rgba(30, 35, 80, 0.06)",
        }}>
          {/* Header */}
          <h1 style={{ fontSize: "1.5rem", textAlign: "center", marginBottom: "0.3rem" }}>
            {mode === "login" ? "Welcome back" : "Create an account"}
          </h1>
          <p style={{ textAlign: "center", fontSize: "0.85rem", marginBottom: "2rem" }}>
            {mode === "login"
              ? "Sign in to access your account and reports"
              : "Join the community and help protect others"}
          </p>

          {/* Error / success */}
          {error && (
            <div style={{
              background: "var(--scam-dim)", border: "1.5px solid var(--scam-border)",
              borderRadius: "var(--radius-md)", padding: "0.75rem 1rem",
              fontSize: "0.82rem", color: "var(--scam)", marginBottom: "1.25rem",
              animation: "fadeInUp 0.2s ease both",
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              background: "var(--genuine-dim)", border: "1.5px solid var(--genuine-border)",
              borderRadius: "var(--radius-md)", padding: "0.75rem 1rem",
              fontSize: "0.82rem", color: "var(--genuine)", marginBottom: "1.25rem",
              animation: "fadeInUp 0.2s ease both",
            }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            {/* Username — signup only */}
            {mode === "signup" && (
              <div className="form-group" style={{ animation: "fadeInUp 0.25s ease both" }}>
                <label className="form-label" htmlFor="username">
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <User size={13} strokeWidth={1.75} color="var(--text-muted)" />
                    Username
                  </span>
                </label>
                <input
                  id="username"
                  className="form-input"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  suppressHydrationWarning
                />
              </div>
            )}

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Mail size={13} strokeWidth={1.75} color="var(--text-muted)" />
                  Email
                </span>
              </label>
              <input
                id="email"
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                suppressHydrationWarning
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Lock size={13} strokeWidth={1.75} color="var(--text-muted)" />
                  Password
                </span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  style={{ paddingRight: "2.75rem" }}
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: "0.25rem",
                    color: "var(--text-muted)",
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: "100%", justifyContent: "center", height: "48px",
                fontSize: "0.95rem", marginTop: "0.25rem",
              }}
            >
              {loading ? (
                <><Loader size={16} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} /> {mode === "login" ? "Signing in…" : "Creating account…"}</>
              ) : (
                <>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={16} strokeWidth={2} /></>
              )}
            </button>

            {/* Divider */}
            <div style={{
              display: "flex",
              alignItems: "center",
              margin: "0.5rem 0",
              color: "var(--text-muted)",
              fontSize: "0.75rem",
            }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span style={{ padding: "0 0.75rem", fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="btn btn-ghost"
              style={{
                width: "100%",
                justifyContent: "center",
                height: "48px",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                background: "#fff",
                border: "1.5px solid var(--border)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.707a5.416 5.416 0 010-3.414V4.961H.957a8.997 8.997 0 000 8.078l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.896 11.426 0 9 0A8.997 8.997 0 00.957 4.961l3.007 2.332c.708-2.127 2.692-3.712 5.036-3.712z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </form>

          {/* Toggle mode */}
          <div style={{
            textAlign: "center", marginTop: "1.75rem", paddingTop: "1.5rem",
            borderTop: "1.5px solid var(--border)",
          }}>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSuccess(""); }}
                style={{
                  background: "none", border: "none", color: "var(--accent)",
                  fontWeight: 600, cursor: "pointer", fontSize: "0.82rem",
                  textDecoration: "underline", textUnderlineOffset: "2px",
                }}
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p style={{
          textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)",
          marginTop: "1.5rem", lineHeight: 1.6,
        }}>
          By continuing, you agree to ORlegit&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
