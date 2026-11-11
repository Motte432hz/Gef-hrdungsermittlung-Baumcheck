-- BaumCheck – cloud schema (phase 2).
--
-- Every synced record is stored as one row with a few columns the server needs for access
-- control, immutability and syncing, plus the full record as JSON (`data`). The app keeps
-- working offline on its local copy; the server is the shared copy of the company.
--
-- Roles per company (memberships.role):
--   owner  – exactly one; the only one allowed to delete (soft and hard) and to transfer ownership
--   admin  – may change master data (company, equipment preset, everyone's records), approve members
--   member – may read everything of the company, create new records, change own records and own profile

create schema if not exists app;
grant usage on schema app to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Companies (tenants) and memberships
-- ---------------------------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key,
  organization_id uuid not null,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  constraint organizations_self check (organization_id = id)
);

create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected', 'removed')),
  display_name text not null default '',
  email text,
  device_info text,
  -- The person's own profile (workers.id) in this company.
  worker_id uuid,
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  primary key (organization_id, user_id)
);
create unique index memberships_one_owner on public.memberships (organization_id)
  where role = 'owner' and status = 'active';

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code_hash text not null unique,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz
);

-- Role of the current user in a company (null = no active member). Security definer, so
-- policies can use it without running into the memberships policies themselves.
create function app.role_in(org uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select m.role from public.memberships m
  where m.organization_id = org and m.user_id = auth.uid() and m.status = 'active'
$$;

create function app.is_admin(org uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(app.role_in(org) in ('owner', 'admin'), false) $$;

create function app.my_worker_id(org uuid) returns uuid
language sql stable security definer set search_path = ''
as $$
  select m.worker_id from public.memberships m
  where m.organization_id = org and m.user_id = auth.uid() and m.status = 'active'
$$;

grant execute on function app.role_in(uuid), app.is_admin(uuid), app.my_worker_id(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Synced records
-- ---------------------------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'workers', 'companies', 'customers', 'equipment_presets',
    'assessments', 'trees', 'signatures', 'attachments', 'audit_log'
  ] loop
    execute format($f$
      create table public.%I (
        id uuid primary key,
        organization_id uuid not null references public.organizations (id) on delete cascade,
        created_by uuid not null default auth.uid() references auth.users (id),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        deleted_at timestamptz,
        synced_at timestamptz not null default now(),
        data jsonb not null default '{}'::jsonb
      )$f$, t);
    execute format('create index %I on public.%I (organization_id, synced_at)', t || '_sync', t);
  end loop;
end $$;

alter table public.assessments
  add column status text not null default 'draft' check (status in ('draft', 'completed', 'sent'));
alter table public.trees add column assessment_id uuid not null;
alter table public.signatures add column assessment_id uuid not null;
alter table public.attachments add column assessment_id uuid not null;
create index trees_assessment on public.trees (assessment_id);
create index signatures_assessment on public.signatures (assessment_id);
create index attachments_assessment on public.attachments (assessment_id);

-- ---------------------------------------------------------------------------------------------
-- Triggers: server-side bookkeeping, delete rights, stale writes, immutability
-- ---------------------------------------------------------------------------------------------

-- New rows: the creator is the signed-in user, synced_at is the server clock (pull cursor).
create function app.before_insert() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  new.synced_at := clock_timestamp();
  return new;
end $$;

-- Updates: identity columns never change; an older version never overwrites a newer one
-- (silently skipped – the device gets the newer version on its next pull); deleting and
-- restoring is reserved for the owner (own drafts and their parts excepted).
create function app.before_update() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  role text := app.role_in(old.organization_id);
  own_draft_part boolean;
begin
  new.id := old.id;
  new.organization_id := old.organization_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;

  if new.updated_at < old.updated_at then
    return null;
  end if;

  if auth.uid() is not null and new.deleted_at is distinct from old.deleted_at then
    own_draft_part := old.created_by = auth.uid()
      and tg_table_name in ('assessments', 'trees', 'signatures', 'attachments');
    if role is distinct from 'owner' and not (own_draft_part and new.deleted_at is not null) then
      raise exception 'Nur die Inhaberin oder der Inhaber darf löschen oder wiederherstellen.'
        using errcode = '42501';
    end if;
  end if;

  new.synced_at := clock_timestamp();
  return new;
end $$;

-- Completed protocols are locked: only status (completed → sent) and sending/sync metadata
-- may change. Only the owner may delete a completed protocol (e.g. GDPR deletion).
create function app.guard_assessment() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  free text[] := array['status', 'sentAt', 'syncState', 'updatedAt'];
begin
  if old.status <> 'draft' then
    if new.status = 'draft' then
      raise exception 'Abgeschlossene Protokolle können nicht wieder geöffnet werden.'
        using errcode = '42501';
    end if;
    if (old.data - free) is distinct from (new.data - free) then
      raise exception 'Das Protokoll ist abgeschlossen und kann nicht mehr geändert werden.'
        using errcode = '42501';
    end if;
    if new.deleted_at is not null and old.deleted_at is null
      and app.role_in(old.organization_id) is distinct from 'owner' and auth.uid() is not null then
      raise exception 'Nur die Inhaberin oder der Inhaber darf abgeschlossene Protokolle löschen.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- Trees and signatures of a locked protocol can no longer be added or changed. Attachments
-- (PDF, order confirmation, invoice) may still be added, but not changed.
create function app.guard_part() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  parent_status text;
begin
  select a.status into parent_status from public.assessments a where a.id = new.assessment_id;
  if parent_status is not null and parent_status <> 'draft' then
    if tg_op = 'UPDATE' and (old.data is distinct from new.data or old.assessment_id is distinct from new.assessment_id) then
      raise exception 'Das Protokoll ist abgeschlossen und kann nicht mehr geändert werden.'
        using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.deleted_at is distinct from old.deleted_at
      and app.role_in(old.organization_id) is distinct from 'owner' and auth.uid() is not null then
      raise exception 'Nur die Inhaberin oder der Inhaber darf Teile abgeschlossener Protokolle löschen.'
        using errcode = '42501';
    end if;
    if tg_op = 'INSERT' and tg_table_name in ('trees', 'signatures') then
      raise exception 'Das Protokoll ist abgeschlossen und kann nicht mehr geändert werden.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations', 'workers', 'companies', 'customers', 'equipment_presets',
    'assessments', 'trees', 'signatures', 'attachments', 'audit_log'
  ] loop
    execute format('create trigger a_before_insert before insert on public.%I
      for each row execute function app.before_insert()', t);
    execute format('create trigger a_before_update before update on public.%I
      for each row execute function app.before_update()', t);
  end loop;
  foreach t in array array['trees', 'signatures', 'attachments'] loop
    execute format('create trigger b_guard_part before insert or update on public.%I
      for each row execute function app.guard_part()', t);
  end loop;
end $$;

create trigger b_guard_assessment before update on public.assessments
  for each row execute function app.guard_assessment();

-- ---------------------------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;

-- Companies: members read; admins change; created only through create_organization().
create policy org_select on public.organizations for select to authenticated
  using (app.role_in(id) is not null);
create policy org_update on public.organizations for update to authenticated
  using (app.is_admin(id)) with check (app.is_admin(id));

-- Memberships: everyone sees their own requests and the members of their companies.
-- Changes only through the functions below.
create policy membership_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or app.role_in(organization_id) is not null);

-- Invites: admins see (hash only) and revoke them.
create policy invite_select on public.invites for select to authenticated
  using (app.is_admin(organization_id));
create policy invite_update on public.invites for update to authenticated
  using (app.is_admin(organization_id)) with check (app.is_admin(organization_id));

do $$
declare t text;
begin
  foreach t in array array[
    'workers', 'companies', 'customers', 'equipment_presets',
    'assessments', 'trees', 'signatures', 'attachments', 'audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy %I on public.%I for select to authenticated
      using (app.role_in(organization_id) is not null)$p$, t || '_select', t);
    execute format($p$create policy %I on public.%I for delete to authenticated
      using (app.role_in(organization_id) = 'owner')$p$, t || '_delete', t);
  end loop;

  -- Master data of the company: admins only.
  execute $p$create policy equipment_presets_insert on public.equipment_presets for insert
    to authenticated with check (app.is_admin(organization_id))$p$;
  execute $p$create policy equipment_presets_update on public.equipment_presets for update
    to authenticated using (app.is_admin(organization_id)) with check (app.is_admin(organization_id))$p$;

  -- Everything else: every member may add; admins change everything, members their own
  -- records (and their own person profile).
  foreach t in array array[
    'workers', 'companies', 'customers', 'assessments', 'trees', 'signatures', 'attachments'
  ] loop
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check (app.role_in(organization_id) is not null)$p$, t || '_insert', t);
    execute format($p$create policy %I on public.%I for update to authenticated
      using (app.is_admin(organization_id) or created_by = auth.uid()
        or (%L = 'workers' and id = app.my_worker_id(organization_id)))
      with check (app.role_in(organization_id) is not null)$p$, t || '_update', t, t);
  end loop;

  -- Audit log: append only.
  execute $p$create policy audit_log_insert on public.audit_log for insert to authenticated
    with check (app.role_in(organization_id) is not null)$p$;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Functions the app calls (RPC)
-- ---------------------------------------------------------------------------------------------

-- Puts the company that exists on the first device into the cloud; the caller becomes owner.
create function public.create_organization(p_id uuid, p_data jsonb, p_display_name text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet.' using errcode = '42501';
  end if;
  if exists (select 1 from public.organizations where id = p_id) then
    if app.role_in(p_id) = 'owner' then
      return; -- already done (e.g. retried after a connection loss)
    end if;
    raise exception 'Diese Firma existiert bereits.' using errcode = '42501';
  end if;
  insert into public.organizations (id, organization_id, created_by, data)
    values (p_id, p_id, auth.uid(), coalesce(p_data, '{}'::jsonb));
  insert into public.memberships
    (organization_id, user_id, role, status, display_name, email, decided_by, decided_at)
    values (p_id, auth.uid(), 'owner', 'active', coalesce(p_display_name, ''),
      auth.jwt() ->> 'email', auth.uid(), now());
end $$;

create function app.normalize_code(code text) returns text
language sql immutable set search_path = ''
as $$ select upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g')) $$;

-- New invitation code (shown once, stored as hash), valid for 7 days.
create function public.create_invite(p_org uuid) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  raw text := '';
  i int;
begin
  if not app.is_admin(p_org) then
    raise exception 'Nur Admins können einladen.' using errcode = '42501';
  end if;
  for i in 0..7 loop
    raw := raw || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  insert into public.invites (organization_id, code_hash, created_by)
    values (p_org, encode(extensions.digest(raw, 'sha256'), 'hex'), auth.uid());
  return substr(raw, 1, 4) || '-' || substr(raw, 5, 4);
end $$;

-- A new device asks to join with a code. Returns the company and the request status.
create function public.request_join(p_code text, p_display_name text, p_device_info text)
returns table (organization_id uuid, organization_name text, status text)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  inv public.invites;
  existing public.memberships;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet.' using errcode = '42501';
  end if;
  select * into inv from public.invites i
    where i.code_hash = encode(extensions.digest(app.normalize_code(p_code), 'sha256'), 'hex')
      and i.revoked_at is null and i.expires_at > now();
  if inv.id is null then
    raise exception 'Der Code ist ungültig oder abgelaufen.' using errcode = 'P0002';
  end if;
  select * into existing from public.memberships m
    where m.organization_id = inv.organization_id and m.user_id = auth.uid();
  if existing.user_id is null then
    insert into public.memberships (organization_id, user_id, display_name, email, device_info)
      values (inv.organization_id, auth.uid(), coalesce(p_display_name, ''),
        auth.jwt() ->> 'email', p_device_info);
  elsif existing.status in ('rejected', 'removed') then
    update public.memberships m set status = 'pending', requested_at = now(),
      display_name = coalesce(p_display_name, m.display_name), device_info = p_device_info,
      decided_by = null, decided_at = null
      where m.organization_id = inv.organization_id and m.user_id = auth.uid();
  end if;
  return query
    select o.id, o.data ->> 'name', m.status
    from public.organizations o
    join public.memberships m on m.organization_id = o.id and m.user_id = auth.uid()
    where o.id = inv.organization_id;
end $$;

-- Admins approve or reject a request, or change a member's role. The owner is untouchable
-- here (see transfer_ownership); admins cannot make anyone owner.
create function public.decide_membership(p_org uuid, p_user uuid, p_approve boolean, p_role text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target public.memberships;
begin
  if not app.is_admin(p_org) then
    raise exception 'Nur Admins können Mitglieder freigeben.' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'Ungültige Rolle.' using errcode = '22023';
  end if;
  select * into target from public.memberships m
    where m.organization_id = p_org and m.user_id = p_user;
  if target.user_id is null then
    raise exception 'Unbekannte Anfrage.' using errcode = 'P0002';
  end if;
  if target.role = 'owner' then
    raise exception 'Die Inhaberin oder der Inhaber kann hier nicht geändert werden.'
      using errcode = '42501';
  end if;
  -- Only the owner can change or remove other admins.
  if target.role = 'admin' and target.status = 'active' and app.role_in(p_org) <> 'owner' then
    raise exception 'Nur die Inhaberin oder der Inhaber kann Admins ändern.' using errcode = '42501';
  end if;
  update public.memberships m set
    status = case when p_approve then 'active' else
      case when m.status = 'active' then 'removed' else 'rejected' end end,
    role = p_role, decided_by = auth.uid(), decided_at = now()
    where m.organization_id = p_org and m.user_id = p_user;
end $$;

-- Links the caller's own person profile in a company (created by the caller).
create function public.set_my_worker(p_org uuid, p_worker uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if app.role_in(p_org) is null then
    raise exception 'Kein Mitglied dieser Firma.' using errcode = '42501';
  end if;
  update public.memberships m set worker_id = p_worker
    where m.organization_id = p_org and m.user_id = auth.uid();
end $$;

-- The owner hands over the company; the previous owner stays as admin.
create function public.transfer_ownership(p_org uuid, p_user uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if app.role_in(p_org) is distinct from 'owner' then
    raise exception 'Nur die Inhaberin oder der Inhaber kann das.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.memberships m
      where m.organization_id = p_org and m.user_id = p_user and m.status = 'active') then
    raise exception 'Die Person ist kein aktives Mitglied.' using errcode = 'P0002';
  end if;
  update public.memberships m set role = 'admin'
    where m.organization_id = p_org and m.user_id = auth.uid();
  update public.memberships m set role = 'owner', decided_by = auth.uid(), decided_at = now()
    where m.organization_id = p_org and m.user_id = p_user;
end $$;

revoke all on function public.create_organization(uuid, jsonb, text),
  public.create_invite(uuid), public.request_join(text, text, text),
  public.decide_membership(uuid, uuid, boolean, text), public.set_my_worker(uuid, uuid),
  public.transfer_ownership(uuid, uuid) from public, anon;
grant execute on function public.create_organization(uuid, jsonb, text),
  public.create_invite(uuid), public.request_join(text, text, text),
  public.decide_membership(uuid, uuid, boolean, text), public.set_my_worker(uuid, uuid),
  public.transfer_ownership(uuid, uuid) to authenticated;

-- Helpers are internal.
revoke all on function app.before_insert(), app.before_update(), app.guard_assessment(),
  app.guard_part(), app.normalize_code(text) from public, anon, authenticated;

-- The anonymous role gets nothing.
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------------------------------
-- Files (photos, signatures, logo, PDFs): private bucket, path "<organization id>/…"
-- ---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
  values ('files', 'files', false, 26214400)
  on conflict (id) do nothing;

create function app.file_org(name text) returns uuid
language sql immutable set search_path = ''
as $$
  select case when split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$'
    then split_part(name, '/', 1)::uuid end
$$;
grant execute on function app.file_org(text) to authenticated;

create policy files_select on storage.objects for select to authenticated
  using (bucket_id = 'files' and app.role_in(app.file_org(name)) is not null);
create policy files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and app.role_in(app.file_org(name)) is not null);
create policy files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'files' and app.role_in(app.file_org(name)) = 'owner');
