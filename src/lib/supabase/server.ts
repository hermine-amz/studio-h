import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseCredentials, isSupabaseConfigured } from './client';

export function isServerSupabaseConfigured(): boolean {
  return isSupabaseConfigured();
}

export function createServerSupabase() {
  const cookieStore = cookies();
  const { url, key } = getSupabaseCredentials();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component
        }
      },
    },
  });
}
