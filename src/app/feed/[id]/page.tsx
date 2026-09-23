"use client";

import { useState, use, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, Heart, MessageCircle, Share2, CheckCircle2,
  Clock, Flag, Send, ThumbsUp, Loader, ImageIcon,
} from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/communityData";
import { timeAgo } from "@/lib/mockData";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

function Avatar({ initial, color, size = 36 }: { initial: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color + "22", border: `1.5px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.38 + "px", fontWeight: 600, color }}>{initial}</span>
    </div>
  );
}

function CommentBlock({ comment }: { comment: any }) {
  const [likes, setLikes] = useState(comment.likes || 0);
  const [liked, setLiked] = useState(false);
  const supabase = createClient();

  const handleLikeComment = async () => {
    if (liked) return;
    setLiked(true);
    const newLikes = likes + 1;
    setLikes(newLikes);
    await supabase.from("post_comments").update({ likes: newLikes }).eq("id", comment.id);
  };

  return (
    <div style={{
      display: "flex", gap: "0.75rem",
      paddingBottom: "1rem",
      borderBottom: "1px solid var(--border)",
    }}>
      <Avatar initial={(comment.username?.[0] || "u").toUpperCase()} color="#4c63d2" size={32} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {comment.username}
          </span>
          <span suppressHydrationWarning style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
            <Clock size={10} strokeWidth={1.75} /> {timeAgo(comment.created_at)}
          </span>
        </div>
        <p style={{ fontSize: "0.875rem", lineHeight: 1.7, margin: "0 0 0.625rem" }}>
          {comment.content}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <button
            onClick={handleLikeComment}
            disabled={liked}
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              background: "none", border: "none", cursor: liked ? "default" : "pointer",
              fontSize: "0.72rem", color: liked ? "var(--scam)" : "var(--text-muted)",
              transition: "color 0.2s",
            }}
          >
            <ThumbsUp size={12} strokeWidth={liked ? 2.5 : 1.75} />
            {likes}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sidePosts, setSidePosts] = useState<any[]>([]);

  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function loadPostData() {
      setLoading(true);

      // Fetch specific post
      const { data: postData } = await supabase
        .from("posts")
        .select("*, profiles(username)")
        .eq("id", id)
        .single();

      if (!postData) {
        setLoading(false);
        return;
      }

      // Fetch comments on this post
      const { data: commentsData } = await supabase
        .from("post_comments")
        .select("*, profiles(username)")
        .eq("post_id", id)
        .order("created_at", { ascending: false });

      // Fetch side posts
      const { data: sideData } = await supabase
        .from("posts")
        .select("*, profiles(username)")
        .neq("id", id)
        .limit(4);

      setPost({
        ...postData,
        username: postData.profiles?.username || "anonymous",
        avatar_initial: (postData.profiles?.username?.[0] || "A").toUpperCase(),
        avatar_color: "#4c63d2",
      });

      setComments(
        (commentsData || []).map((c: any) => ({
          ...c,
          username: c.profiles?.username || "anonymous",
        }))
      );

      setSidePosts(sideData || []);
      setLoading(false);
    }

    loadPostData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleLikePost = async () => {
    if (liked || !post) return;
    setLiked(true);

    const newLikes = post.likes + 1;
    setPost({ ...post, likes: newLikes });

    await supabase.from("posts").update({ likes: newLikes }).eq("id", id);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || submittingComment || !post) return;
    setSubmittingComment(true);

    try {
      const username = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "anonymous";

      const { data: insertedComment, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: id,
          user_id: user?.id || null,
          content: comment.trim(),
        })
        .select()
        .single();

      if (!error && insertedComment) {
        setComments([
          {
            ...insertedComment,
            username: username,
          },
          ...comments,
        ]);
        setComment("");
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <Loader size={32} strokeWidth={2} color="var(--accent)" style={{ animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!post) {
    return notFound();
  }

  const catColors = CATEGORY_COLORS[post.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.discussion;
  const catLabel = post.category.charAt(0).toUpperCase() + post.category.slice(1);

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", padding: "2.5rem 0 5rem" }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", marginBottom: "2rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <Link href="/" style={{ color: "var(--text-muted)" }}>Home</Link>
          <ChevronRight size={12} strokeWidth={1.75} />
          <Link href="/feed" style={{ color: "var(--text-muted)" }}>Feed</Link>
          <ChevronRight size={12} strokeWidth={1.75} />
          <span style={{ color: "var(--text-secondary)", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {post.title}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "2rem", alignItems: "start" }}>
          {/* Main post */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Post body */}
            <div style={{
              background: "var(--bg-surface)", border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xl)", padding: "2rem", boxShadow: "var(--shadow-card)",
            }}>
              {/* Category + verified */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
                <div style={{
                  background: catColors.bg, border: `1.5px solid ${catColors.border}`,
                  borderRadius: "999px", padding: "0.2rem 0.7rem",
                  fontSize: "0.72rem", color: catColors.color, fontWeight: 500,
                }}>
                  {catLabel}
                </div>
                {post.is_verified_report && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.7rem", color: "var(--genuine)", fontWeight: 500 }}>
                    <CheckCircle2 size={11} strokeWidth={2} /> Verified
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: "1.375rem", marginBottom: "1.25rem" }}>{post.title}</h1>

              {/* Author row */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.5rem" }}>
                <Avatar initial={post.avatar_initial} color={post.avatar_color} />
                <div>
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                    {post.username}
                  </p>
                  <span suppressHydrationWarning style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Clock size={10} strokeWidth={1.75} />
                    {timeAgo(post.created_at)}
                  </span>
                </div>
              </div>

              {/* Content — render newlines */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {post.content.split("\n\n").map((para: string, i: number) => (
                  <p key={i} style={{ fontSize: "0.9rem", lineHeight: 1.8, margin: 0 }}>
                    {para}
                  </p>
                ))}
              </div>

              {/* Attached Screenshots / Images */}
              {post.image_urls && post.image_urls.length > 0 && (
                <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <ImageIcon size={14} strokeWidth={2} color="var(--accent)" />
                    Attached Screenshots &amp; Evidence ({post.image_urls.length})
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
                    {post.image_urls.map((url: string, index: number) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          position: "relative",
                          aspectRatio: "16/10",
                          borderRadius: "var(--radius-md)",
                          overflow: "hidden",
                          border: "1.5px solid var(--border)",
                          background: "var(--bg-input)",
                          display: "block",
                          cursor: "pointer",
                          transition: "transform 0.15s ease, border-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                          (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                        }}
                        title="Click to view full image in new tab"
                      >
                        <img
                          src={url}
                          alt={`Post screenshot ${index + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
                  {post.tags.map((tag: string) => (
                    <span key={tag} style={{
                      fontSize: "0.7rem", color: "var(--text-muted)",
                      background: "var(--bg-input)", border: "1px solid var(--border)",
                      borderRadius: "999px", padding: "0.2rem 0.625rem",
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{
                display: "flex", gap: "0.75rem", marginTop: "1.5rem",
                paddingTop: "1.25rem", borderTop: "1px solid var(--border)",
              }}>
                <button
                  onClick={handleLikePost}
                  disabled={liked}
                  className={`btn btn-sm ${liked ? "btn-danger" : "btn-ghost"}`}
                  style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
                >
                  <Heart size={13} strokeWidth={liked ? 2.5 : 1.75} fill={liked ? "currentColor" : "none"} />
                  {post.likes} helpful
                </button>
                <button className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Share2 size={13} strokeWidth={1.75} />
                  Share
                </button>
              </div>
            </div>

            {/* Comments section */}
            <div style={{
              background: "var(--bg-surface)", border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xl)", padding: "1.75rem", boxShadow: "var(--shadow-card)",
            }}>
              <h3 style={{
                fontSize: "1rem", marginBottom: "1.25rem",
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}>
                <MessageCircle size={16} strokeWidth={1.75} color="var(--accent)" />
                Discussion ({comments.length})
              </h3>

              {/* Post a comment */}
              <form onSubmit={handleCommentSubmit} style={{ marginBottom: "1.75rem" }}>
                <textarea
                  className="form-textarea"
                  placeholder="Share your experience, add context, or ask a follow-up question…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submittingComment || !comment.trim()}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  {submittingComment ? (
                    <><Loader size={12} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} /> Posting…</>
                  ) : (
                    <><Send size={12} strokeWidth={2} /> Post comment</>
                  )}
                </button>
              </form>

              {/* Comment list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {comments.length === 0 ? (
                  <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", textAlign: "center", padding: "1.5rem 0" }}>
                    No comments yet. Be the first to respond.
                  </p>
                ) : (
                  comments.map((c) => <CommentBlock key={c.id} comment={c} />)
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ position: "sticky", top: "80px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Quick stats */}
            <div style={{
              background: "var(--bg-surface)", border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xl)", padding: "1.375rem", boxShadow: "var(--shadow-card)",
            }}>
              <h3 style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>Post stats</h3>
              {[
                { icon: <Heart size={13} strokeWidth={1.75} />, label: "Found helpful", value: post.likes.toString() },
                { icon: <MessageCircle size={13} strokeWidth={1.75} />, label: "Comments", value: comments.length.toString() },
              ].map((s) => (
                <div key={s.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.5rem 0", borderBottom: "1px solid var(--border)",
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    {s.icon} {s.label}
                  </span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Other posts */}
            <div style={{
              background: "var(--bg-surface)", border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xl)", padding: "1.375rem", boxShadow: "var(--shadow-card)",
            }}>
              <h3 style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>More experiences</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {sidePosts.map((p) => {
                  const c = CATEGORY_COLORS[p.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.discussion;
                  return (
                    <Link key={p.id} href={`/feed/${p.id}`} style={{ textDecoration: "none" }}>
                      <div style={{
                        padding: "0.625rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid transparent",
                        transition: "all 0.15s ease",
                      }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-base)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
                      >
                        <span style={{
                          fontSize: "0.63rem", background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                          borderRadius: "999px", padding: "0.1rem 0.45rem", fontWeight: 500, display: "inline-block", marginBottom: "0.3rem",
                        }}>
                          {p.category}
                        </span>
                        <p style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 0.2rem", lineHeight: 1.35 }}>
                          {p.title.length > 60 ? p.title.slice(0, 57) + "…" : p.title}
                        </p>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                          {p.likes} helpful
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <Link href="/feed" className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: "0.875rem", display: "flex" }}>
                View all posts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
