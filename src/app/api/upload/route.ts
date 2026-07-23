import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 365; // 1 year in seconds (stored; access via signed URL)

/**
 * POST /api/upload
 *
 * Accepts multipart/form-data with a 'file' field.
 * Validates MIME type and size server-side (not just client-side).
 * Uploads to the 'evidence' private Supabase Storage bucket via service-role client.
 * Returns a signed URL for immediate display.
 *
 * Spec: Phase 6
 *
 * Storage bucket setup (one-time, in Supabase dashboard):
 *   1. Go to Storage → Create bucket
 *   2. Name: "evidence"
 *   3. Set to PRIVATE (not public)
 *   4. RLS: allow service_role to INSERT/SELECT (default for private buckets)
 */
export async function POST(req: NextRequest) {
  // Auth check — only authenticated users can upload evidence
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabase = createServiceClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Server-side MIME validation
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: `File type not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(", ")}`,
      },
      { status: 415 }
    );
  }

  // Server-side size validation
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_SIZE_BYTES / 1024 / 1024}MB` },
      { status: 413 }
    );
  }

  // Generate a unique storage path
  const ext = file.name.split(".").pop() ?? "bin";
  const timestamp = Date.now();
  const storagePath = `${user.id}/${timestamp}.${ext}`;

  // Upload to private 'evidence' bucket
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("evidence")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[/api/upload] Storage upload error:", uploadError.message);

    // Specific error for missing bucket
    if (uploadError.message.includes("Bucket not found")) {
      return NextResponse.json(
        {
          error:
            "Evidence storage bucket not configured. Create a private bucket named 'evidence' in your Supabase project → Storage.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Generate signed URL for access (1 year expiry — enough for report lifetime)
  const { data: signedData, error: signError } = await supabase.storage
    .from("evidence")
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (signError || !signedData?.signedUrl) {
    console.error("[/api/upload] Signed URL error:", signError?.message);
    return NextResponse.json({ error: "Failed to generate access URL" }, { status: 500 });
  }

  return NextResponse.json({
    url: signedData.signedUrl,
    path: storagePath,
    size: file.size,
    type: file.type,
  });
}
