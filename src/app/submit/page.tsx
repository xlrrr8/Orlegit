"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Flag, Bot, CheckCircle2, ArrowRight, Loader, ImageIcon } from "lucide-react";
import { CATEGORIES } from "@/lib/mockData";
import AIVerdict from "@/components/AIVerdict";
import DropZone from "@/components/DropZone";
import { createClient } from "@/lib/supabase";
import type { AIAnalysisResult } from "@/lib/gemini";
import type { Verdict } from "@/lib/mockData";

export default function SubmitPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    target: "",
    category: "phishing",
    description: "",
  });
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImagesChange = useCallback((files: File[]) => {
    setEvidenceFiles(files);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.target || !form.description) return;

    setLoading(true);
    setAnalysis(null);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: AIAnalysisResult = await res.json();

      // Write to live Supabase reports table
      await supabase.from("reports").insert({
        title: form.title,
        target: form.target,
        category: form.category,
        description: form.description,
        ai_verdict: data.verdict,
        ai_confidence: data.confidence,
        ai_reasoning: data.reasoning,
        user_id: userId,
      });

      setAnalysis(data);
      setSubmitted(true);
    } catch (err) {
      const fallbackAnalysis: AIAnalysisResult = {
        verdict: "UNCERTAIN" as Verdict,
        confidence: 60,
        reasoning: "Could not reach AI service. Your report has been saved for manual review.",
        red_flags: [],
      };

      await supabase.from("reports").insert({
        title: form.title,
        target: form.target,
        category: form.category,
        description: form.description,
        ai_verdict: fallbackAnalysis.verdict,
        ai_confidence: fallbackAnalysis.confidence,
        ai_reasoning: fallbackAnalysis.reasoning,
        user_id: userId,
      });

      setAnalysis(fallbackAnalysis);
      setSubmitted(true);
    } finally {
      setLoading(false);
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
                suppressHydrationWarning
              />
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
              <DropZone onImagesChange={handleImagesChange} maxFiles={5} />
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
