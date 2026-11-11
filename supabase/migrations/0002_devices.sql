-- Device codes: every device that joins a company gets its own short code, so protocol
-- numbers stay unique even when several devices number offline (e.g. ZW-2026-M1-001).
-- The device that put the company into the cloud keeps numbering without a code.

create table public.devices (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{1,6}$'),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  primary key (organization_id, code)
);

alter table public.devices enable row level security;
create policy devices_select on public.devices for select to authenticated
  using (app.role_in(organization_id) is not null);

-- Reserves a device code: the wished one if it is free, otherwise the first letter of the
-- name plus the next free number (M1, M2, …).
create function public.register_device(p_org uuid, p_wanted text, p_name text, p_label text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  wanted text := left(upper(regexp_replace(coalesce(p_wanted, ''), '[^A-Za-z0-9]', '', 'g')), 6);
  base text := upper(left(regexp_replace(coalesce(p_name, ''), '[^A-Za-zÄÖÜäöü]', '', 'g'), 1));
  candidate text;
  n int := 1;
begin
  if app.role_in(p_org) is null then
    raise exception 'Kein Mitglied dieser Firma.' using errcode = '42501';
  end if;
  base := translate(base, 'ÄÖÜ', 'AOU');
  if base = '' then base := 'G'; end if;
  if wanted <> '' then
    -- Already ours (e.g. retried after a connection loss) or still free.
    if exists (select 1 from public.devices d
        where d.organization_id = p_org and d.code = wanted and d.user_id = auth.uid()) then
      return wanted;
    end if;
    if not exists (select 1 from public.devices d where d.organization_id = p_org and d.code = wanted) then
      insert into public.devices (organization_id, code, user_id, label)
        values (p_org, wanted, auth.uid(), p_label);
      return wanted;
    end if;
  end if;
  loop
    candidate := base || n;
    begin
      insert into public.devices (organization_id, code, user_id, label)
        values (p_org, candidate, auth.uid(), p_label);
      return candidate;
    exception when unique_violation then
      n := n + 1;
    end;
  end loop;
end $$;

revoke all on function public.register_device(uuid, text, text, text) from public, anon;
grant execute on function public.register_device(uuid, text, text, text) to authenticated;
