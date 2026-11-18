import { createBrowserClient } from '@supabase/ssr';

const FALLBACK_SUPABASE_URL = 'https://hyfnybkteqhvdlkeunyg.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Zm55Ymt0ZXFodmRsa2V1bnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMDY1MDMsImV4cCI6MjExMDU4MjUwM30.lKaw7FuksI9xtbJy6VH_-TaNSm0So_Q0GcZZVjd-nnQ';

export function getSupabaseCredentials() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const url =
    envUrl &&
    envUrl.startsWith('http') &&
    !envUrl.includes('your-project-id')
      ? envUrl
      : FALLBACK_SUPABASE_URL;

  const key =
    envKey && !envKey.includes('your-supabase-anon-key')
      ? envKey
      : FALLBACK_SUPABASE_ANON_KEY;

  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key);
}

export function createClient() {
  const { url, key } = getSupabaseCredentials();
  return createBrowserClient(url, key);
}
