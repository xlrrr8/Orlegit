import { createBrowserClient } from "@supabase/ssr";

function isValidUrl(str: string | undefined): boolean {
  if (!str) return false;
  try {
    const url = new URL(str);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Use a known-valid placeholder so the app doesn't crash during SSG
// or when real credentials haven't been configured yet.
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder_sig";

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl! : PLACEHOLDER_URL;
const supabaseAnonKey = rawKey && rawKey.length > 20 ? rawKey : PLACEHOLDER_KEY;

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (_client) return _client;
  _client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

// Legacy export for backward compat
export const supabase = createClient();
