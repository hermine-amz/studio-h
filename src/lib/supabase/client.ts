import { createBrowserClient } from '@supabase/ssr';

export function getSupabaseCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !url.startsWith('https://') || !key) {
    throw new Error('Configuration Supabase manquante ou invalide.');
  }

  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createClient() {
  const { url, key } = getSupabaseCredentials();
  return createBrowserClient(url, key);
}
