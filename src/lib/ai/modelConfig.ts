/**
 * Single source of truth for Gemini model IDs.
 *
 * Set GEMINI_MODEL_ID or GEMINI_FALLBACK_MODEL_ID in your environment to
 * override without touching code. This is critical because Google has
 * deprecated multiple model generations; hardcoding is a recurring outage risk.
 *
 * Current status (2025-07): gemini-2.0-flash is stable.
 * Check https://ai.google.dev/gemini-api/docs/models before changing.
 */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL_ID ?? "gemini-3.6-flash";

export const GEMINI_FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL_ID ?? "gemini-2.5-flash";

