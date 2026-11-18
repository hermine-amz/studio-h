-- IMPORTANT: This is a REVIEW TEMPLATE, not an executable migration yet.
-- Replace __STUDIO_H_ADMIN_EMAIL__ with the exact administrator email used by Supabase Auth.
-- Review the resulting diff, then apply manually in Supabase only after backup/approval.
-- Never commit a service_role key or other secret.

begin;

do $$
begin
  if position('@' in '__STUDIO_H_ADMIN_EMAIL__') = 0 then
    raise exception 'Replace __STUDIO_H_ADMIN_EMAIL__ with a valid administrator email before applying this migration';
  end if;
end
$$;

alter table public.prospects enable row level security;
alter table public.commandes_ugc enable row level security;
alter table public.medias_creations enable row level security;
alter table public.prompts_scripts enable row level security;
alter table public.finances enable row level security;
alter table public.focus_taches enable row level security;

revoke all on table
  public.prospects,
  public.commandes_ugc,
  public.medias_creations,
  public.prompts_scripts,
  public.finances,
  public.focus_taches
from anon, authenticated, public;

grant select, insert, update, delete on table
  public.prospects,
  public.commandes_ugc,
  public.medias_creations,
  public.prompts_scripts,
  public.finances,
  public.focus_taches
to authenticated;

create policy "studio_h_admin_only" on public.prospects
  for all to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = lower('__STUDIO_H_ADMIN_EMAIL__'))
  with check ((auth.jwt() ->> 'email') = '__STUDIO_H_ADMIN_EMAIL__');

create policy "studio_h_admin_only" on public.commandes_ugc
  for all to authenticated
  using ((auth.jwt() ->> 'email') = '__STUDIO_H_ADMIN_EMAIL__')
  with check ((auth.jwt() ->> 'email') = '__STUDIO_H_ADMIN_EMAIL__');

create policy "studio_h_admin_only" on public.medias_creations
  for all to authenticated
  using ((auth.jwt() ->> 'email') = '__STUDIO_H_ADMIN_EMAIL__')
  with check ((auth.jwt() ->> 'email') = '__STUDIO_H_ADMIN_EMAIL__');

create policy "studio_h_admin_only" on public.prompts_scripts
  for all to authenticated
  using ((auth.jwt() ->> 'email') = '__STUDIO_H_ADMIN_EMAIL__')
  with check ((auth.jwt() ->> 'email') = '__STUDIO_H_ADMIN_EMAIL__');

create policy "studio_h_admin_only" on public.finances
  for all to authenticated
  using ((auth.jwt() ->> 'email') = '__STUDIO_H_ADMIN_EMAIL__')
  with check ((auth.jwt() ->> 'email') = '__STUDIO_H_ADMIN_EMAIL__');

create policy "studio_h_admin_only" on public.focus_taches
  for all to authenticated
  using ((auth.jwt() ->> 'email') = '__STUDIO_H_ADMIN_EMAIL__')
  with check ((auth.jwt() ->> 'email') = '__STUDIO_H_ADMIN_EMAIL__');

commit;
