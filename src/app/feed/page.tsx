"use client";

import { useState, useCallback, useEffect } from "react";
import { PenLine, X, ImageIcon, Loader, TrendingUp, Clock, MessageCircle, Flame } from "lucide-react";
import PostCard from "@/components/PostCard";
import DropZone from "@/components/DropZone";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import {
  POST_CATEGORIES,
  CATEGORY_COLORS,
  type CommunityPost,
} from "@/lib/communityData";

type FilterTab = "all" | CommunityPost["category"];
type SortBy = "latest" | "popular" | "most_discussed";

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortBy>("latest");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postForm, setPostForm] = useState({
    title: "",
    content: "",
    category: "experience" as CommunityPost["category"],
    tags: "",
  });
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  const { user } = useAuth();
  const supabase = createClient();

  // Load feed posts
  async function loadPosts() {
    setLoading(true);
    // Fetch posts, counting comments for each post
    const { data: postsData, error } = await supabase
      .from("posts")
      .select("*, profiles(username)");

    if (!error && postsData) {
      // For each post, fetch comments count
      const postsWithCounts = await Promise.all(
        postsData.map(async (post: any) => {
          const { count } = await supabase
            .from("post_comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);
          
          return {
            ...post,
            username: post.profiles?.username || "anonymous",
            avatar_initial: (post.profiles?.username?.[0] || "a").toUpperCase(),
            avatar_color: "#4c63d2",
            comment_count: count || 0,
          };
        })
      );
      setPosts(postsWithCounts);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = posts
    .filter((p) => activeTab === "all" || p.category === activeTab)
    .sort((a, b) => {
      if (sortBy === "popular") return b.likes - a.likes;
      if (sortBy === "most_discussed") return b.comment_count - a.comment_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.title || !postForm.content) return;
    setPosting(true);

    try {
      const tagsArray = postForm.tags
        ? postForm.tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
        : [];

      const { data: insertedPost, error } = await supabase
        .from("posts")
        .insert({
          title: postForm.title,
          content: postForm.content,
          category: postForm.category,
          tags: tagsArray,
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (!error && insertedPost) {
        setPosted(true);
        setShowCreateModal(false);
        setPostForm({ title: "", content: "", category: "experience", tags: "" });
        setPostImages([]);
        loadPosts(); // reload feed
        setTimeout(() => setPosted(false), 3500);
      }
    } catch (err) {
      console.error("Failed to post:", err);
    } finally {
      setPosting(false);
    }
  };

  const handleImagesChange = useCallback((files: File[]) => {
    setPostImages(files);
  }, []);

  const sortIcons: Record<SortBy, React.ReactNode> = {
    latest: <Clock size={13} strokeWidth={1.75} />,
    popular: <Flame size={13} strokeWidth={1.75} />,
    most_discussed: <MessageCircle size={13} strokeWidth={1.75} />,
  };

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
      {/* Toast */}
      {posted && (
        <div style={{
          position: "fixed", top: "80px", left: "50%", transform: "translateX(-50%)",
          background: "var(--genuine)", color: "white", borderRadius: "999px",
          padding: "0.5rem 1.25rem", fontSize: "0.82rem", fontWeight: 500,
          zIndex: 1000, boxShadow: "0 4px 20px rgba(13,158,92,0.3)",
          animation: "fadeInUp 0.3s ease both",
        }}>
          Your post has been shared with the feed!
        </div>
      )}

      {/* Page Header */}
      <div style={{
        background: "var(--bg-surface)",
        borderBottom: "1.5px solid var(--border)",
        padding: "2.5rem 0 0",
      }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ marginBottom: "0.375rem" }}>Feed</h1>
              <p style={{ fontSize: "0.875rem" }}>
                Share experiences, warn others, ask questions — together we stay safer.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <PenLine size={14} strokeWidth={2} />
              Share experience
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.125rem", overflowX: "auto" }}>
            {[
              { value: "all" as FilterTab, label: "All posts" },
              ...POST_CATEGORIES.map((c) => ({ value: c.value as FilterTab, label: c.label })),
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                style={{
                  padding: "0.625rem 1rem",
                  fontSize: "0.82rem",
                  fontWeight: activeTab === tab.value ? 600 : 400,
                  color: activeTab === tab.value ? "var(--accent)" : "var(--text-muted)",
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === tab.value ? "2px solid var(--accent)" : "2px solid transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
              >
                {tab.label}
                {tab.value !== "all" && (
                  <span style={{ marginLeft: "0.4rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    ({posts.filter((p) => p.category === tab.value).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container" style={{ padding: "2rem 1.5rem 5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "2rem", alignItems: "start" }}>
          {/* Feed */}
          <div>
            {/* Sort controls */}
            <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.25rem" }}>
              {(["latest", "popular", "most_discussed"] as SortBy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`btn btn-sm ${sortBy === s ? "btn-primary" : "btn-ghost"}`}
                  style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem" }}
                >
                  {sortIcons[s]}
                  {s === "latest" ? "Latest" : s === "popular" ? "Popular" : "Most discussed"}
                </button>
              ))}
            </div>

            {/* Posts */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: "160px", width: "100%", borderRadius: "var(--radius-lg)" }} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{
                  background: "var(--bg-surface)", border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-xl)", padding: "3rem", textAlign: "center",
                }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    No posts in this category yet.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowCreateModal(true)}
                    style={{ marginTop: "1rem" }}
                  >
                    Be the first to share
                  </button>
                </div>
              ) : (
                filtered.map((post, i) => (
                  <div key={post.id} style={{ animation: `fadeInUp 0.4s ${i * 0.06}s ease both` }}>
                    <PostCard post={post} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ position: "sticky", top: "80px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Community stats */}
            <div style={{
              background: "var(--bg-surface)", border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xl)", padding: "1.375rem",
              boxShadow: "var(--shadow-card)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem" }}>
                <TrendingUp size={14} strokeWidth={1.75} color="var(--accent)" />
                <h3 style={{ fontSize: "0.875rem", margin: 0 }}>Feed stats</h3>
              </div>
              {[
                { label: "Total posts", value: posts.length.toString() },
                { label: "Experiences shared", value: posts.filter((p) => p.category === "experience").length.toString() },
                { label: "Warnings issued", value: posts.filter((p) => p.category === "warning").length.toString() },
                { label: "People helped", value: "2,481" },
              ].map((stat) => (
                <div key={stat.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.5rem 0", borderBottom: "1px solid var(--border)",
                }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{stat.label}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <div style={{
              background: "var(--bg-surface)", border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xl)", padding: "1.375rem",
              boxShadow: "var(--shadow-card)",
            }}>
              <h3 style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>Browse by type</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {POST_CATEGORIES.map((cat) => {
                  const colors = CATEGORY_COLORS[cat.value];
                  const count = posts.filter((p) => p.category === cat.value).length;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setActiveTab(cat.value)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: activeTab === cat.value ? colors.bg : "transparent",
                        border: `1.5px solid ${activeTab === cat.value ? colors.border : "transparent"}`,
                        borderRadius: "var(--radius-md)", padding: "0.5rem 0.75rem",
                        cursor: "pointer", transition: "all 0.2s ease",
                      }}
                    >
                      <span style={{ fontSize: "0.8rem", color: activeTab === cat.value ? colors.color : "var(--text-secondary)", fontWeight: 500 }}>
                        {cat.label}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <div style={{
              background: "var(--accent-dim)", border: "1.5px solid #c5cdf5",
              borderRadius: "var(--radius-xl)", padding: "1.375rem", textAlign: "center",
            }}>
              <h3 style={{ fontSize: "0.875rem", marginBottom: "0.4rem" }}>Have an experience?</h3>
              <p style={{ fontSize: "0.78rem", marginBottom: "1rem" }}>
                Your story could protect someone else from being scammed.
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowCreateModal(true)}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Share your story
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(10, 11, 25, 0.55)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
          animation: "fadeIn 0.2s ease both",
        }}>
          <div style={{
            background: "var(--bg-surface)",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "2rem",
            width: "100%",
            maxWidth: "620px",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(10,11,25,0.2)",
            animation: "fadeInUp 0.25s ease both",
          }}>
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>Share your experience</h2>
                <p style={{ fontSize: "0.78rem", margin: 0 }}>
                  Help the community by sharing what happened
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}
              >
                <X size={18} strokeWidth={1.75} color="var(--text-muted)" />
              </button>
            </div>

            <form onSubmit={handlePostSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
              {/* Category selector */}
              <div>
                <label className="form-label">Post type</label>
                <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                  {POST_CATEGORIES.map((cat) => {
                    const colors = CATEGORY_COLORS[cat.value];
                    const isActive = postForm.category === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setPostForm((p) => ({ ...p, category: cat.value }))}
                        style={{
                          padding: "0.3rem 0.875rem",
                          fontSize: "0.75rem", fontWeight: 500,
                          borderRadius: "999px",
                          border: `1.5px solid ${isActive ? colors.border : "var(--border)"}`,
                          background: isActive ? colors.bg : "transparent",
                          color: isActive ? colors.color : "var(--text-muted)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="post-title">Title</label>
                <input
                  id="post-title"
                  className="form-input"
                  placeholder="Give your post a clear, descriptive title"
                  value={postForm.title}
                  onChange={(e) => setPostForm((p) => ({ ...p, title: e.target.value }))}
                  required
                  suppressHydrationWarning
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="post-content">Your experience</label>
                <textarea
                  id="post-content"
                  className="form-textarea"
                  placeholder="Share your full story — what happened, how it happened, what the red flags were, and what you did about it. The more detail, the more it helps others."
                  value={postForm.content}
                  onChange={(e) => setPostForm((p) => ({ ...p, content: e.target.value }))}
                  rows={7}
                  required
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Drop zone for images */}
              <div className="form-group">
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <ImageIcon size={13} strokeWidth={1.75} color="var(--text-muted)" />
                  Upload screenshots / evidence
                  <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.78rem" }}>— optional</span>
                </label>
                <DropZone onImagesChange={handleImagesChange} maxFiles={8} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="post-tags">Tags</label>
                <input
                  id="post-tags"
                  className="form-input"
                  placeholder="e.g. investment scam, fake app, UPI (comma separated)"
                  value={postForm.tags}
                  onChange={(e) => setPostForm((p) => ({ ...p, tags: e.target.value }))}
                  suppressHydrationWarning
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={posting}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "center" }}
                >
                  {posting ? (
                    <><Loader size={13} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} /> Posting…</>
                  ) : (
                    <><PenLine size={13} strokeWidth={2} /> Post{postImages.length > 0 ? ` with ${postImages.length} image${postImages.length > 1 ? "s" : ""}` : ""}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
