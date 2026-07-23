"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, ImageIcon, FileImage, AlertTriangle } from "lucide-react";

interface DropZoneProps {
  onImagesChange: (files: File[]) => void;
  maxFiles?: number;
  /** Maximum file size in bytes. Default: 5MB */
  maxSizeBytes?: number;
  /**
   * When true, files are uploaded to Supabase Storage via /api/upload.
   * Requires accessToken to be set. Falls back to local-only preview if not set.
   */
  uploadToStorage?: boolean;
  /** Supabase access token for authenticated uploads */
  accessToken?: string;
  /** Called after each successful storage upload with the signed URL */
  onUploadComplete?: (url: string, path: string) => void;
}

// Explicit allowlist of accepted MIME types
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

// Allowed extensions (fallback check)
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function getFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function isAllowedFile(file: File): { valid: boolean; reason?: string } {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    const ext = getFileExtension(file.name);
    // Fallback: check extension if MIME is generic (e.g., "application/octet-stream")
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        reason: `"${file.name}" is not an accepted image type. Use PNG, JPG, or WEBP.`,
      };
    }
  }

  return { valid: true };
}

export default function DropZone({
  onImagesChange,
  maxFiles = 5,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  uploadToStorage = false,
  accessToken,
  onUploadComplete,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string; uploading?: boolean; uploaded?: boolean }[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      setValidationError(null);

      const errors: string[] = [];
      const validFiles: File[] = [];

      for (const file of Array.from(files)) {
        // Check file type
        const typeCheck = isAllowedFile(file);
        if (!typeCheck.valid) {
          errors.push(typeCheck.reason!);
          continue;
        }

        // Check file size
        if (file.size > maxSizeBytes) {
          const sizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
          errors.push(
            `"${file.name}" (${fileSizeMB}MB) exceeds the ${sizeMB}MB limit.`
          );
          continue;
        }

        validFiles.push(file);
      }

      if (errors.length > 0) {
        setValidationError(errors.join(" "));
      }

      const remaining = maxFiles - images.length;
      if (remaining <= 0) {
        if (validFiles.length > 0) {
          setValidationError(`Maximum ${maxFiles} images allowed.`);
        }
        return;
      }

      const toAdd = validFiles.slice(0, remaining).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        uploading: uploadToStorage && !!accessToken,
        uploaded: false,
      }));
      const updated = [...images, ...toAdd];
      setImages(updated);
      onImagesChange(updated.map((i) => i.file));

      // Upload to Supabase Storage if configured
      if (uploadToStorage && accessToken) {
        toAdd.forEach(async (item, idx) => {
          const formData = new FormData();
          formData.append("file", item.file);
          try {
            const res = await fetch("/api/upload", {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}` },
              body: formData,
            });
            const data = await res.json();
            if (res.ok && data.url) {
              onUploadComplete?.(data.url, data.path);
              setImages((prev) => prev.map((img, i) =>
                img.file === item.file ? { ...img, uploading: false, uploaded: true } : img
              ));
            } else {
              setImages((prev) => prev.map((img) =>
                img.file === item.file ? { ...img, uploading: false } : img
              ));
              if (data.error) setValidationError(`Upload failed: ${data.error}`);
            }
          } catch {
            setImages((prev) => prev.map((img) =>
              img.file === item.file ? { ...img, uploading: false } : img
            ));
          }
        });
      }

      // Reset input so the same file can be re-selected
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [images, maxFiles, maxSizeBytes, onImagesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(images[idx].preview);
    const updated = images.filter((_, i) => i !== idx);
    setImages(updated);
    onImagesChange(updated.map((i) => i.file));
    setValidationError(null);
  };

  const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);

  return (
    <div>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? "var(--accent)" : "var(--border-accent)"}`,
          borderRadius: "var(--radius-lg)",
          background: isDragging ? "var(--accent-dim)" : "var(--bg-input)",
          padding: images.length === 0 ? "2.5rem 1.5rem" : "1.25rem",
          cursor: "pointer",
          transition: "all 0.2s ease",
          transform: isDragging ? "scale(1.01)" : "scale(1)",
          textAlign: "center",
        }}
      >
        {images.length === 0 ? (
          <div>
            <div style={{
              width: "48px", height: "48px", borderRadius: "12px",
              background: isDragging ? "var(--accent)" : "var(--bg-surface)",
              border: "1.5px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1rem",
              transition: "all 0.2s ease",
            }}>
              <Upload size={20} strokeWidth={1.75} color={isDragging ? "white" : "var(--text-muted)"} />
            </div>
            <p style={{
              fontSize: "0.875rem", fontWeight: 500,
              color: isDragging ? "var(--accent)" : "var(--text-secondary)",
              marginBottom: "0.3rem",
            }}>
              {isDragging ? "Drop images here" : "Drag & drop screenshots"}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
              or <span style={{ color: "var(--accent)", fontWeight: 500 }}>click to browse</span> · PNG, JPG, WEBP · max {maxSizeMB}MB each · up to {maxFiles} images
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileImage size={14} strokeWidth={1.75} color="var(--accent)" />
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {images.length} image{images.length !== 1 ? "s" : ""} added ·{" "}
              <span style={{ color: "var(--accent)" }}>
                {images.length < maxFiles ? "add more" : "limit reached"}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Validation error */}
      {validationError && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "0.4rem",
          marginTop: "0.5rem", padding: "0.5rem 0.75rem",
          background: "var(--scam-dim)", border: "1px solid var(--scam-border)",
          borderRadius: "var(--radius-md)",
        }}>
          <AlertTriangle size={13} strokeWidth={2} color="var(--scam)" style={{ flexShrink: 0, marginTop: "0.1rem" }} />
          <p style={{ fontSize: "0.75rem", color: "var(--scam)", margin: 0 }}>
            {validationError}
          </p>
        </div>
      )}

      {/* Hidden input — explicit accept attribute for browser file picker */}
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        multiple
        style={{ display: "none" }}
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* Image previews */}
      {images.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
          gap: "0.625rem",
          marginTop: "0.875rem",
        }}>
          {images.map((img, idx) => (
            <div key={idx} style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.preview}
                alt={`Evidence ${idx + 1}`}
                style={{
                  width: "100%", height: "90px", objectFit: "cover",
                  display: "block", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)",
                }}
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                style={{
                  position: "absolute", top: "4px", right: "4px",
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: "rgba(0,0,0,0.6)", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "white",
                }}
              >
                <X size={10} strokeWidth={2.5} />
              </button>
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "rgba(0,0,0,0.45)", padding: "0.2rem 0.4rem",
              }}>
                <p style={{
                  fontSize: "0.6rem", color: "white", margin: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {img.file.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
