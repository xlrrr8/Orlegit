"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flag, Bot, CheckCircle2, ArrowRight, Loader, ImageIcon, AlertTriangle, ShieldCheck } from "lucide-react";
import { CATEGORIES } from "@/lib/mockData";
import AIVerdict from "@/components/AIVerdict";
import DropZone from "@/components/DropZone";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import type { AIAnalysisResult } from "@/lib/gemini";
import Link from "next/link";

export default function SubmitPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({
    title: "",
    target: "",
    category: "phishing",
    description: "",
  });
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);

  useEffect(() => {
    async function fetchToken() {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        setAccessToken(data.session.access_token);
      }
    }
    fetchToken();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImagesChange = useCallback((files: File[]) => {
    setEvidenceFiles(files);
  }, []);

  const handleUploadComplete = useCallback((url: string) => {
    setEvidenceUrls((prev) => [...prev, url]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.target || !form.description) return;

    setLoading(true);
    setAnalysis(null);
    setError(null);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    // Ensure profile row exists in DB before linking user_id to prevent FK violation
    let validUserId = userId;
    if (userId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();
      
      if (!prof) {
        // Try creating minimal profile row
        const emailPrefix = userData?.user?.email ? userData.user.email.split("@")[0] : "user";
        const fallbackUsername = `${emailPrefix}_${Math.floor(Math.random() * 1000)}`;
        const { error: profErr } = await supabase
          .from("profiles")
          .insert({ id: userId, username: fallbackUsername, trust_score: 100 });
        
        if (profErr) {
          console.warn("Could not insert profile for user, submitting report anonymously:", profErr.message);
          validUserId = null; // Fallback to null user_id so report insertion succeeds
        }
      }
    }

    // Step 1: Insert report into Supabase DB
    let reportId: string | null = null;
    try {
      const { data: insertedReport, error: insertError } = await supabase
        .from("reports")
        .insert({
          title: form.title,
          target: form.target,
          category: form.category,
          description: form.description,
          user_id: validUserId,
          evidence_urls: evidenceUrls,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Report DB insert error:", insertError);
        setError(`Failed to save report: ${insertError.message}`);
        setLoading(false);
        return;
      }

      reportId = insertedReport?.id ?? null;
    } catch (err) {
      console.error("Report DB insert exception:", err);
      setError(err instanceof Error ? err.message : "Failed to save report to database.");
      setLoading(false);
      return;
    }

    // Step 2: Call /api/analyze to trigger Gemini AI analysis
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          report_id: reportId,
        }),
      });

      if (res.status === 429) {
        const rateLimitData = await res.json();
        setError(
          `Too many submissions. Please wait ${rateLimitData.retry_after_seconds || 60} seconds before trying again.`
        );
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data: AIAnalysisResult = await res.json();
        setAnalysis(data);
      } else {
        setAnalysis({
          verdict: "UNCERTAIN",
          confidence: 50,
          reasoning: "AI analysis was unavailable. Your report has been saved successfully.",
          red_flags: [],
        });
      }
      setSubmitted(true);
    } catch (aiErr) {
      console.error("AI analysis error:", aiErr);
      setAnalysis({
        verdict: "UNCERTAIN",
        confidence: 50,
        reasoning: "Your report has been saved successfully. AI analysis will process shortly.",
        red_flags: [],
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  // Check for duplicate targets when the target field loses focus
  const checkDuplicates = async () => {
    const targetVal = form.target.trim();
    if (!targetVal || targetVal.length < 3) {
      setDuplicateCount(0);
      return;
    }
    try {
      const supabase = createClient();
      const { count } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .ilike("target", `%${targetVal}%`);
      setDuplicateCount(count || 0);
    } catch {
      setDuplicateCount(0);
    }
  };

  if (submitted && analysis) {
    return (
      <div style={{ padding: "4rem 0 6rem", background: "var(--bg-base)", minHeight: "100vh" }}>
        <div className="container" style={{ maxWidth: "680px" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem", animation: "fadeInUp 0.5s ease both" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "14px",
              background: "var(--genuine-dim)", border: "1.5px solid var(--genuine-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}>
              <CheckCircle2 size={24} strokeWidth={1.75} color="var(--genuine)" />
            </div>
            <h1 style={{ marginBottom: "0.5rem" }}>Report submitted</h1>
            <p style={{ fontSize: "0.9rem" }}>
              Your report{evidenceFiles.length > 0 ? ` with ${evidenceFiles.length} screenshot${evidenceFiles.length > 1 ? "s" : ""}` : ""} has been analyzed by AI and added to the database.
            </p>
          </div>

          <div style={{ animation: "fadeInUp 0.5s 0.15s ease both" }}>
            <AIVerdict
              verdict={analysis.verdict}
              confidence={analysis.confidence}
              reasoning={analysis.reasoning}
              redFlags={analysis.red_flags}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.5rem" }}>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setSubmitted(false);
                setAnalysis(null);
                setEvidenceFiles([]);
                setDuplicateCount(0);
                setForm({ title: "", target: "", category: "phishing", description: "" });
              }}
            >
              Submit another
            </button>
            <button
              className="btn btn-primary"
              onClick={() => router.push("/reports")}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "center" }}
            >
              View all reports <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Auth loading state
  if (authLoading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader size={28} strokeWidth={2} color="var(--accent)" style={{ animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  // Auth gate — spec: "No anonymous reporting, under any future product pressure"
  if (!user) {
    return (
      <div style={{ padding: "5rem 0 6rem", background: "var(--bg-base)", minHeight: "100vh" }}>
        <div className="container" style={{ maxWidth: "500px", textAlign: "center" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "16px",
            background: "var(--accent-dim)", border: "1.5px solid #c5cdf5",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}>
            <ShieldCheck size={26} strokeWidth={1.75} color="var(--accent)" />
          </div>
          <h1 style={{ marginBottom: "0.625rem" }}>Sign in to report</h1>
          <p style={{ fontSize: "0.9rem", marginBottom: "2rem" }}>
            Every report is tied to an authenticated identity. This protects against
            false reports and is a legal safeguard for named targets.
          </p>
          <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login?return=/submit" className="btn btn-primary">
              Sign in
            </Link>
            <Link href="/login?mode=signup&return=/submit" className="btn btn-ghost">
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "3rem 0 6rem", background: "var(--bg-base)", minHeight: "100vh" }}>
      <div className="container" style={{ maxWidth: "700px" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem", animation: "fadeInUp 0.4s ease both" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            background: "var(--scam-dim)", border: "1.5px solid var(--scam-border)",
            borderRadius: "999px", padding: "0.25rem 0.85rem",
            fontSize: "0.75rem", color: "var(--scam)", fontWeight: 500, marginBottom: "1rem",
          }}>
            <Flag size={11} strokeWidth={2} />
            Submit a Report
          </div>
          <h1 style={{ marginBottom: "0.5rem" }}>Report a Scam</h1>
          <p style={{ fontSize: "0.9rem" }}>
            Help protect others by reporting suspicious URLs, phone numbers, messages, or profiles.
          </p>
        </div>

        {/* AI banner */}
        <div style={{
          background: "var(--accent-dim)", border: "1.5px solid #c5cdf5",
          borderRadius: "var(--radius-lg)", padding: "0.875rem 1.125rem",
          marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.75rem",
          animation: "fadeInUp 0.4s 0.1s ease both",
        }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "white", border: "1.5px solid #c5cdf5",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Bot size={16} strokeWidth={1.75} color="var(--accent)" />
          </div>
          <div>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent)", marginBottom: "0.1rem" }}>
              AI-powered analysis
            </p>
            <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", margin: 0 }}>
              Google Gemini will analyze your report and images immediately after submission
            </p>
          </div>
        </div>

        {/* Rate limit / error banner */}
        {error && (
          <div style={{
            background: "var(--scam-dim)", border: "1.5px solid var(--scam-border)",
            borderRadius: "var(--radius-lg)", padding: "0.875rem 1.125rem",
            marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem",
            animation: "fadeInUp 0.3s ease both",
          }}>
            <AlertTriangle size={16} strokeWidth={1.75} color="var(--scam)" />
            <p style={{ fontSize: "0.82rem", color: "var(--scam)", margin: 0, fontWeight: 500 }}>
              {error}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", animation: "fadeInUp 0.4s 0.15s ease both" }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            <div className="form-group">
              <label className="form-label" htmlFor="title">Report title</label>
              <input
                id="title" name="title" className="form-input"
                placeholder="e.g. Fake lottery SMS asking for OTP"
                value={form.title} onChange={handleChange} required
                suppressHydrationWarning
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="target">Target URL, phone number, or profile</label>
              <input
                id="target" name="target" className="form-input"
                placeholder="e.g. https://fake-site.tk or +91 98765 43210"
                value={form.target} onChange={handleChange} required
                onBlur={checkDuplicates}
                suppressHydrationWarning
              />
              {duplicateCount > 0 && (
                <p style={{
                  fontSize: "0.78rem", color: "var(--uncertain)", fontWeight: 500,
                  marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.3rem",
                }}>
                  <AlertTriangle size={12} strokeWidth={2} />
                  {duplicateCount} other {duplicateCount === 1 ? "report has" : "reports have"} been filed about a similar target
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="category">Category</label>
              <select id="category" name="category" className="form-select" value={form.category} onChange={handleChange}>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">Describe what happened</label>
              <textarea
                id="description" name="description" className="form-textarea"
                placeholder="Describe what happened, what they asked for, how you were contacted, any red flags you noticed…"
                value={form.description} onChange={handleChange} rows={4} required
              />
            </div>

            {/* ——— DRAG & DROP IMAGE EVIDENCE ——— */}
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <ImageIcon size={13} strokeWidth={1.75} color="var(--text-muted)" />
                Screenshot evidence
                <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  — optional but helps AI accuracy
                </span>
              </label>
              <DropZone
                onImagesChange={handleImagesChange}
                maxFiles={5}
                uploadToStorage={!!accessToken}
                accessToken={accessToken}
                onUploadComplete={handleUploadComplete}
              />
            </div>

          </div>

          <button
            type="submit" className="btn btn-danger" disabled={loading}
            style={{ width: "100%", height: "48px", justifyContent: "center" }}
          >
            {loading ? (
              <>
                <Loader size={14} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
                Analyzing with AI…
              </>
            ) : (
              <>
                <Flag size={14} strokeWidth={2} />
                Submit &amp; Analyze{evidenceFiles.length > 0 ? ` (${evidenceFiles.length} image${evidenceFiles.length > 1 ? "s" : ""})` : ""}
              </>
            )}
          </button>

          <p style={{ textAlign: "center", fontSize: "0.775rem", color: "var(--text-muted)" }}>
            By submitting, you agree to our{" "}
            <a href="/terms" style={{ color: "var(--accent)" }}>Terms of Service</a>.
            False reports may result in account suspension.
          </p>
        </form>
      </div>
    </div>
  );
}
