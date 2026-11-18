import { createServerSupabase } from './server';

export async function requireStudioAdmin() {
  const adminEmail = process.env.STUDIO_H_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    return { authorized: false as const, status: 503, error: 'Configuration administrateur manquante.' };
  }

  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || user.email?.toLowerCase() !== adminEmail) {
      return { authorized: false as const, status: 401, error: 'Authentification requise.' };
    }
    return { authorized: true as const, supabase, user };
  } catch {
    return { authorized: false as const, status: 503, error: 'Service d’authentification indisponible.' };
  }
}
