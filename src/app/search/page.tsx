"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, Flag, ArrowRight } from "lucide-react";
import { CATEGORIES } from "@/lib/mockData";
import ReportCard from "@/components/ReportCard";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const q = searchQuery.trim();

    const { data, error } = await supabase
      .from("reports")
      .select("*, profiles(username)")
      .or(`title.ilike.%${q}%,target.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`);

    if (!error && data) {
      setResults(
        data.map((r: any) => ({
          ...r,
          username: r.profiles?.username || "anonymous",
        }))
      );
    } else {
      setResults([]);
    }
    setSearched(true);
    setLoading(false);
  };

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };


  return (
    <div style={{ padding: "3rem 0 6rem", background: "var(--bg-base)", minHeight: "100vh" }}>
      <div className="container" style={{ maxWidth: "760px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1 style={{ marginBottom: "0.5rem" }}>Search &amp; Lookup</h1>
          <p style={{ fontSize: "0.9rem" }}>
            Paste a URL, phone number, email, or message to check if it&apos;s been reported
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.625rem", marginBottom: "2.5rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} strokeWidth={1.75} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              className="form-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. suspicious-site.tk, +91 98765 43210…"
              style={{ height: "48px", fontSize: "0.9rem", paddingLeft: "2.4rem" }}
              suppressHydrationWarning
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: "48px", padding: "0 1.25rem" }}>
            Search
          </button>
        </form>

        {/* Category Quick Links */}
        {!searched && (
          <div style={{ marginBottom: "3rem" }}>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.875rem", fontWeight: 500 }}>
              Browse by category
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: "0.75rem" }}
                  onClick={() => {
                    setQuery(cat.label);
                    performSearch(cat.value);
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {searched && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.125rem" }}>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {results.length > 0 ? (
                  <>
                    <strong style={{ color: "var(--text-primary)" }}>{results.length}</strong> result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
                  </>
                ) : (
                  <>No results for &ldquo;{query}&rdquo;</>
                )}
              </p>
              <button
                className="btn btn-ghost btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem" }}
                onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
              >
                <X size={12} strokeWidth={2} /> Clear
              </button>
            </div>

            {results.length === 0 ? (
              <div style={{
                background: "var(--bg-surface)", border: "1.5px solid var(--border)",
                borderRadius: "var(--radius-xl)", padding: "3rem", textAlign: "center",
                boxShadow: "var(--shadow-card)",
              }}>
                <div style={{
                  width: "48px", height: "48px", borderRadius: "12px",
                  background: "var(--genuine-dim)", border: "1.5px solid var(--genuine-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 1.125rem",
                }}>
                  <Search size={20} strokeWidth={1.75} color="var(--genuine)" />
                </div>
                <h3 style={{ marginBottom: "0.5rem" }}>No reports found</h3>
                <p style={{ marginBottom: "1.5rem", fontSize: "0.875rem" }}>
                  Looks clean — nothing in our database for this query.
                  <br />Still unsure? You can report it.
                </p>
                <Link
                  href={`/submit?target=${encodeURIComponent(query)}`}
                  className="btn btn-danger btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Flag size={13} strokeWidth={2} />
                  Report anyway
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
        )}

        {!searched && (
          <div style={{
            background: "var(--bg-surface)", border: "1.5px dashed var(--border)",
            borderRadius: "var(--radius-xl)", padding: "3rem", textAlign: "center",
            color: "var(--text-muted)",
          }}>
            <Search size={28} strokeWidth={1.5} style={{ margin: "0 auto 0.75rem", display: "block", opacity: 0.4 }} />
            <p style={{ fontSize: "0.875rem" }}>
              Enter a URL, phone number, or keyword to search reported scams
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
