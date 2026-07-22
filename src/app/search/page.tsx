"use client";

import { useState, Suspense, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, Flag, Loader, ShieldAlert, CheckCircle2 } from "lucide-react";
import { CATEGORIES, MOCK_REPORTS } from "@/lib/mockData";
import ReportCard from "@/components/ReportCard";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

function extractDomain(text: string): string {
  try {
    const raw = text.trim();
    if (/^(https?:\/\/|[a-z0-9-]+\.[a-z]{2,})/i.test(raw)) {
      const urlStr = raw.startsWith("http") ? raw : `http://${raw}`;
      const parsed = new URL(urlStr);
      return parsed.hostname.replace(/^www\./i, "");
    }
  } catch {
    // fallback
  }
  return text.trim().replace(/^(https?:\/\/)?(www\.)?/i, "").split("/")[0];
}

function cleanPhone(text: string): string {
  return text.replace(/[\s\-\(\)\.]/g, "");
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams ? searchParams.get("q") || "" : "";
  const [query, setQuery] = useState(initialQuery);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(async (searchQuery: string, catFilter = "all") => {
    const q = searchQuery.trim();
    if (!q && catFilter === "all") {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const qLower = q.toLowerCase();

    // Domain & phone extraction
    const domain = extractDomain(qLower);
    const cleanedPhoneQuery = cleanPhone(qLower);

    // Tokenize query into words for multi-field fuzzy matching
    const tokens = qLower
      .replace(/[^a-z0-9+]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);

    let searchResults: any[] = [];

    // 1. Query Supabase
    try {
      let req = supabase.from("reports").select("*, profiles(username)");

      if (catFilter !== "all") {
        req = req.eq("category", catFilter);
      }

      if (tokens.length > 0) {
        const orConditions = tokens
          .map((t) => `title.ilike.%${t}%,target.ilike.%${t}%,description.ilike.%${t}%,category.ilike.%${t}%`)
          .join(",");
        req = req.or(orConditions);
      }

      const { data, error } = await req;

      if (!error && data && data.length > 0) {
        searchResults = data.map((r: any) => ({
          ...r,
          username: r.profiles?.username || "anonymous",
        }));
      }
    } catch (e) {
      console.error("Supabase search error:", e);
    }

    // 2. Client-side scoring / fallback matching
    if (searchResults.length === 0) {
      const scoredMock = MOCK_REPORTS.map((report) => {
        if (catFilter !== "all" && report.category !== catFilter) {
          return { report, score: 0 };
        }

        const title = report.title.toLowerCase();
        const desc = report.description.toLowerCase();
        const target = report.target.toLowerCase();
        const cat = report.category.toLowerCase();
        const username = report.username.toLowerCase();
        const targetCleaned = cleanPhone(target);

        let score = 0;

        // If no query string, but category filter selected
        if (!q) {
          score = 5;
        } else {
          // Exact match bonus
          if (title.includes(qLower) || target.includes(qLower) || desc.includes(qLower)) {
            score += 10;
          }

          // Token matching
          if (tokens.length > 0) {
            for (const token of tokens) {
              if (title.includes(token)) score += 4;
              if (target.includes(token)) score += 4;
              if (desc.includes(token)) score += 2;
              if (cat.includes(token)) score += 3;
              if (username.includes(token)) score += 2;
            }
          }

          // Domain match
          if (domain && domain.length > 3 && (target.includes(domain) || domain.includes(target))) {
            score += 6;
          }

          // Phone match
          if (cleanedPhoneQuery.length >= 6 && targetCleaned.includes(cleanedPhoneQuery)) {
            score += 6;
          }
        }

        return { report, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

      searchResults = scoredMock.map((item) => item.report);
    }

    setResults(searchResults);
    setSearched(true);
    setLoading(false);
  }, []);

  // 300ms Debounce on query or category change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() || selectedCat !== "all") {
        performSearch(query, selectedCat);
      } else {
        setResults([]);
        setSearched(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedCat, performSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, selectedCat);
  };

  const handleCategoryClick = (catVal: string) => {
    const newCat = selectedCat === catVal ? "all" : catVal;
    setSelectedCat(newCat);
  };

  return (
    <div style={{ padding: "3rem 0 6rem", background: "var(--bg-base)", minHeight: "100vh" }}>
      <div className="container" style={{ maxWidth: "760px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1 style={{ marginBottom: "0.5rem" }}>Search &amp; Scam Lookup</h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Search URLs, phone numbers, emails, or keywords across community-verified reports
          </p>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.625rem", marginBottom: "1.5rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} strokeWidth={1.75} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              className="form-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by URL, domain, phone (+91...), or keywords…"
              style={{ height: "48px", fontSize: "0.9rem", paddingLeft: "2.5rem", paddingRight: query ? "2.5rem" : "1rem" }}
              suppressHydrationWarning
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); if (selectedCat === "all") { setResults([]); setSearched(false); } }}
                style={{
                  position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
                }}
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: "48px", padding: "0 1.25rem" }}>
            {loading ? <Loader size={16} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} /> : "Search"}
          </button>
        </form>

        {/* Category Pills Filter */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Filter by:</span>
            <button
              onClick={() => setSelectedCat("all")}
              className={`btn btn-sm ${selectedCat === "all" ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}
            >
              All Categories
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => handleCategoryClick(cat.value)}
                className={`btn btn-sm ${selectedCat === cat.value ? "btn-primary" : "btn-ghost"}`}
                style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Search Results or Loading State */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: "120px", borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        ) : searched ? (
          <div>
            {/* Results Counter */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                {results.length > 0 ? (
                  <>
                    Found <strong style={{ color: "var(--text-primary)" }}>{results.length}</strong> matching report{results.length !== 1 ? "s" : ""}
                    {query ? <> for &ldquo;{query}&rdquo;</> : null}
                    {selectedCat !== "all" ? <> in category &ldquo;{selectedCat}&rdquo;</> : null}
                  </>
                ) : (
                  <>No matches found</>
                )}
              </p>
              {(query || selectedCat !== "all") && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem" }}
                  onClick={() => { setQuery(""); setSelectedCat("all"); setResults([]); setSearched(false); }}
                >
                  <X size={12} strokeWidth={2} /> Reset search
                </button>
              )}
            </div>

            {/* Empty State when no results match */}
            {results.length === 0 ? (
              <div style={{
                background: "var(--bg-surface)",
                border: "1.5px solid var(--border)",
                borderRadius: "var(--radius-xl)",
                padding: "3rem 2rem",
                textAlign: "center",
                boxShadow: "var(--shadow-card)",
              }}>
                <div style={{
                  width: "52px", height: "52px", borderRadius: "14px",
                  background: "var(--genuine-dim)", border: "1.5px solid var(--genuine-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 1.25rem",
                }}>
                  <CheckCircle2 size={24} strokeWidth={1.75} color="var(--genuine)" />
                </div>
                <h3 style={{ marginBottom: "0.5rem" }}>No reported scams found</h3>
                <p style={{ marginBottom: "1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)", maxWidth: "460px", margin: "0 auto 1.5rem" }}>
                  Nothing in our database matches &ldquo;{query || selectedCat}&rdquo;.
                  However, scammers create new domains and numbers daily.
                </p>

                {/* Safety Tips Card inside Empty State */}
                <div style={{
                  background: "var(--bg-base)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)", padding: "1.25rem",
                  textAlign: "left", maxWidth: "480px", margin: "0 auto 1.75rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.625rem", color: "var(--accent)" }}>
                    <ShieldAlert size={15} strokeWidth={1.75} />
                    <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Verification Tips</span>
                  </div>
                  <ul style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, paddingLeft: "1.2rem", lineHeight: 1.6 }}>
                    <li>UPI payments NEVER require your PIN to receive money.</li>
                    <li>Always check official website domain spellings carefully.</li>
                    <li>Be cautious of unsolicited messages offering high daily wages or guaranteed profits.</li>
                  </ul>
                </div>

                <Link
                  href={`/submit?target=${encodeURIComponent(query)}`}
                  className="btn btn-danger btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Flag size={13} strokeWidth={2} />
                  Submit a report for this target
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {results.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Default initial state */
          <div style={{
            background: "var(--bg-surface)", border: "1.5px dashed var(--border)",
            borderRadius: "var(--radius-xl)", padding: "3.5rem 2rem", textAlign: "center",
            color: "var(--text-muted)",
          }}>
            <Search size={32} strokeWidth={1.5} style={{ margin: "0 auto 0.875rem", display: "block", opacity: 0.4 }} />
            <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.35rem" }}>
              Start searching
            </h3>
            <p style={{ fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto" }}>
              Type any domain, phone number, bank name, or scam phrase above or select a category filter to inspect community reports.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: "4rem 0", textAlign: "center", color: "var(--text-muted)" }}>Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
