"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, ImageIcon, FileImage } from "lucide-react";

interface DropZoneProps {
  onImagesChange: (files: File[]) => void;
  maxFiles?: number;
}

export default function DropZone({ onImagesChange, maxFiles = 5 }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const remaining = maxFiles - images.length;
      const toAdd = imageFiles.slice(0, remaining).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      const updated = [...images, ...toAdd];
      setImages(updated);
      onImagesChange(updated.map((i) => i.file));
    },
    [images, maxFiles, onImagesChange]
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
  };

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
              or <span style={{ color: "var(--accent)", fontWeight: 500 }}>click to browse</span> · PNG, JPG, WEBP · up to {maxFiles} images
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

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
