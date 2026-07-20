import Link from "next/link";
import { Heart, MessageCircle, CheckCircle2, Clock, User } from "lucide-react";
import type { CommunityPost } from "@/lib/communityData";
import { CATEGORY_COLORS } from "@/lib/communityData";
import { timeAgo } from "@/lib/mockData";

interface PostCardProps {
  post: CommunityPost;
}

export default function PostCard({ post }: PostCardProps) {
  const cat = CATEGORY_COLORS[post.category];
  const categoryLabel = post.category.charAt(0).toUpperCase() + post.category.slice(1);
  const excerpt = post.content.slice(0, 200).replace(/\n/g, " ") + (post.content.length > 200 ? "…" : "");

  return (
    <Link href={`/feed/${post.id}`} style={{ textDecoration: "none" }}>
      <article
        className="card"
        style={{
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          gap: "0.875rem",
        }}
      >
        {/* Author + meta */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          {/* Avatar */}
          <div style={{
            width: "34px", height: "34px", borderRadius: "50%",
            background: post.avatar_color + "22",
            border: `1.5px solid ${post.avatar_color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: post.avatar_color }}>
              {post.avatar_initial}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-primary)" }}>
                {post.username}
              </span>
              {post.is_verified_report && (
                <span style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.68rem", color: "var(--genuine)", fontWeight: 500 }}>
                  <CheckCircle2 size={10} strokeWidth={2} /> Verified
                </span>
              )}
            </div>
            <span suppressHydrationWarning style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <Clock size={10} strokeWidth={1.75} />
              {timeAgo(post.created_at)}
            </span>
          </div>
          {/* Category badge */}
          <div style={{
            background: cat.bg, border: `1.5px solid ${cat.border}`,
            borderRadius: "999px", padding: "0.18rem 0.65rem",
            fontSize: "0.68rem", color: cat.color, fontWeight: 500, flexShrink: 0,
          }}>
            {categoryLabel}
          </div>
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: "0.975rem", fontWeight: 600, color: "var(--text-primary)",
          lineHeight: 1.4, margin: 0,
        }}>
          {post.title}
        </h3>

        {/* Excerpt */}
        <p style={{
          fontSize: "0.845rem", lineHeight: 1.7, color: "var(--text-secondary)",
          margin: 0,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {excerpt}
        </p>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{
                fontSize: "0.68rem", color: "var(--text-muted)",
                background: "var(--bg-input)", border: "1px solid var(--border)",
                borderRadius: "999px", padding: "0.15rem 0.55rem", fontWeight: 400,
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer stats */}
        <div style={{
          display: "flex", alignItems: "center", gap: "1rem",
          borderTop: "1px solid var(--border)", paddingTop: "0.75rem",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            <Heart size={13} strokeWidth={1.75} />
            {post.likes}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            <MessageCircle size={13} strokeWidth={1.75} />
            {post.comment_count}
          </span>
          {post.image_urls.length > 0 && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {post.image_urls.length} image{post.image_urls.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}
