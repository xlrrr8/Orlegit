"use client";

import { useEffect, useState } from "react";
import ReportCard from "@/components/ReportCard";
import { CATEGORIES } from "@/lib/mockData";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { Flag, SlidersHorizontal, Search, Loader } from "lucide-react";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      const supabase = createClient();
      let loaded: any[] = [];
      try {
        const { data, error } = await supabase
          .from("reports")
          .select("*, profiles(username)")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          loaded = data.map((r: any) => ({
            ...r,
            username: r.profiles?.username || "anonymous",
          }));
        }
      } catch (err) {
        console.error("Failed to load reports from Supabase:", err);
      }

      setReports(loaded);
      setLoading(false);
    }

    loadReports();
  }, []);

  // Filter & Search Logic
  const filteredReports = reports
    .filter((report) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesCategory =
        selectedCategory === "all" || report.category === selectedCategory;

      if (!term) return matchesCategory;

      const cleanPhoneTerm = term.replace(/[\s\-\(\)\.]/g, "");
      const tokens = term
        .replace(/[^a-z0-9+]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 1);

      const title = report.title.toLowerCase();
      const target = report.target.toLowerCase();
      const desc = report.description.toLowerCase();
      const cat = report.category.toLowerCase();
      const cleanTarget = target.replace(/[\s\-\(\)\.]/g, "");

      const matchesKeyword =
        tokens.length > 0
          ? tokens.some(
              (t) => title.includes(t) || target.includes(t) || desc.includes(t) || cat.includes(t)
            )
          : title.includes(term) || target.includes(term) || desc.includes(term);

      const matchesPhone =
        cleanPhoneTerm.length >= 6 && cleanTarget.includes(cleanPhoneTerm);

      return (matchesKeyword || matchesPhone) && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "votes") {
        const votesA = a.community_scam_votes + a.community_genuine_votes;
        const votesB = b.community_scam_votes + b.community_genuine_votes;
        return votesB - votesA;
      }
      if (sortBy === "confidence") {
        return b.ai_confidence - a.ai_confidence;
      }
      // default: newest first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div style={{ padding: "3rem 0 5rem", background: "var(--bg-base)", minHeight: "100vh" }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ marginBottom: "0.375rem" }}>Reports</h1>
              <p style={{ fontSize: "0.875rem" }}>
                {loading ? "..." : `${filteredReports.length} community-verified reports`}
              </p>
            </div>
            <Link href="/submit" className="btn btn-danger btn-sm" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Flag size={13} strokeWidth={2} />
              Report a Scam
            </Link>
          </div>
        </div>

        {/* Search bar & Filters container */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
          {/* Search bar */}
          <div style={{ position: "relative", width: "100%" }}>
            <Search
              size={16}
              strokeWidth={1.75}
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search reports by title, domain, keyword or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "2.5rem", height: "46px" }}
              suppressHydrationWarning
            />
          </div>

          {/* Filters and Sorting row */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem"
          }}>
            {/* Category tabs */}
            <div style={{
              background: "var(--bg-surface)",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "0.5rem 0.75rem",
              display: "flex",
              gap: "0.375rem",
              flexWrap: "wrap",
              alignItems: "center",
              boxShadow: "var(--shadow-sm)",
            }}>
              <SlidersHorizontal size={13} strokeWidth={1.75} color="var(--text-muted)" style={{ marginRight: "0.25rem" }} />
              <button
                onClick={() => setSelectedCategory("all")}
                className={`btn btn-sm ${selectedCategory === "all" ? "btn-primary" : "btn-ghost"}`}
                style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`btn btn-sm ${selectedCategory === cat.value ? "btn-primary" : "btn-ghost"}`}
                  style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sorting */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Sort by</span>
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: "auto", padding: "0.4rem 2rem 0.4rem 0.75rem", fontSize: "0.78rem", height: "36px" }}
              >
                <option value="newest">Newest first</option>
                <option value="votes">Most votes</option>
                <option value="confidence">Highest confidence</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports List */}
        {loading ? (
          /* Loading Skeletons */
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{
                  height: "140px",
                  width: "100%",
                  borderRadius: "var(--radius-lg)",
                }}
              />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{
            background: "var(--bg-surface)",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "4rem 2rem",
            textAlign: "center",
            boxShadow: "var(--shadow-sm)"
          }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>No reports match your filters.</p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setSearchTerm(""); setSelectedCategory("all"); }}
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {filteredReports.map((report, i) => (
              <div key={report.id} style={{ animation: `fadeInUp 0.4s ${i * 0.05}s ease both` }}>
                <ReportCard report={report} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
