-- Access rules of the cloud schema, checked against the real database.
-- Runs in one transaction that is rolled back at the end (no test data remains).
-- Run: scripts/db.sh test   (needs the Supabase access token, see docs/PLAN-phase2-cloud.md)

begin;

-- Test users: owner, admin, member, outsider.
insert into auth.users (id, aud, role, email, instance_id) values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'owner@test.invalid', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'admin@test.invalid', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated', 'member@test.invalid', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-00000000000d', 'authenticated', 'authenticated', 'outsider@test.invalid', '00000000-0000-0000-0000-000000000000');

create temp table t_ctx (key text primary key, value text);
grant all on t_ctx to authenticated;

-- Runs `sql` as the given test user; `expect` = 'ok' | 'error' | number of affected rows.
create function pg_temp.check_as(uid text, label text, sql text, expect text) returns void
language plpgsql as $$
declare n int; failed boolean := false; msg text;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'email', uid || '@test.invalid')::text, true);
  execute 'set local role authenticated';
  begin
    execute sql;
    get diagnostics n = row_count;
  exception when others then
    failed := true; msg := sqlerrm;
  end;
  execute 'reset role';
  if expect = 'error' and not failed then
    raise exception 'FAILED [%]: expected an error', label;
  elsif expect <> 'error' and failed then
    raise exception 'FAILED [%]: unexpected error: %', label, msg;
  elsif expect ~ '^\d+$' and n <> expect::int then
    raise exception 'FAILED [%]: expected % rows, got %', label, expect, n;
  end if;
end $$;

create function pg_temp.scalar_as(uid text, sql text) returns text
language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'email', uid || '@test.invalid')::text, true);
  execute 'set local role authenticated';
  execute sql into v;
  execute 'reset role';
  return v;
end $$;

do $$
declare
  o text := '00000000-0000-0000-0000-00000000000a';
  a text := '00000000-0000-0000-0000-00000000000b';
  m text := '00000000-0000-0000-0000-00000000000c';
  x text := '00000000-0000-0000-0000-00000000000d';
  org text := '11111111-1111-1111-1111-111111111111';
  code text;
  v text;
begin
  -- Company is created by the owner.
  perform pg_temp.check_as(o, 'create company',
    format($q$select public.create_organization(%L, '{"name":"Zwieselwiesel"}', 'Olaf')$q$, org), 'ok');
  perform pg_temp.check_as(o, 'create again is idempotent for the owner',
    format($q$select public.create_organization(%L, '{}', 'Olaf')$q$, org), 'ok');
  perform pg_temp.check_as(x, 'nobody else can take the company id',
    format($q$select public.create_organization(%L, '{}', 'X')$q$, org), 'error');
  v := pg_temp.scalar_as(o, 'select count(*) from public.organizations');
  if v <> '1' then raise exception 'FAILED [owner sees company]: %', v; end if;

  -- Invitation and requests.
  perform pg_temp.check_as(m, 'members cannot invite',
    format('select public.create_invite(%L)', org), 'error');
  code := pg_temp.scalar_as(o, format('select public.create_invite(%L)', org));
  if code !~ '^[A-Z2-9]{4}-[A-Z2-9]{4}$' then raise exception 'FAILED [code format]: %', code; end if;
  perform pg_temp.check_as(x, 'wrong code',
    $q$select * from public.request_join('ABCD-EFGH', 'X', null)$q$, 'error');
  v := pg_temp.scalar_as(m, format($q$select status from public.request_join(%L, 'Mia', 'iPhone')$q$,
    lower(replace(code, '-', ' '))));
  if v <> 'pending' then raise exception 'FAILED [join pending]: %', v; end if;
  perform pg_temp.scalar_as(a, format($q$select status from public.request_join(%L, 'Anton', null)$q$, code));
  v := pg_temp.scalar_as(m, 'select count(*) from public.organizations');
  if v <> '0' then raise exception 'FAILED [pending sees nothing]: %', v; end if;
  perform pg_temp.check_as(m, 'pending cannot add data', format(
    $q$insert into public.workers (id, organization_id, updated_at, data)
       values (gen_random_uuid(), %L, now(), '{}')$q$, org), 'error');

  -- Approval.
  perform pg_temp.check_as(m, 'member cannot approve itself',
    format('select public.decide_membership(%L, %L, true, %L)', org, m, 'admin'), 'error');
  perform pg_temp.check_as(o, 'owner approves member',
    format('select public.decide_membership(%L, %L, true, %L)', org, m, 'member'), 'ok');
  perform pg_temp.check_as(o, 'owner approves admin',
    format('select public.decide_membership(%L, %L, true, %L)', org, a, 'admin'), 'ok');
  perform pg_temp.check_as(a, 'admins cannot make owners',
    format('select public.decide_membership(%L, %L, true, %L)', org, m, 'owner'), 'error');
  perform pg_temp.check_as(a, 'admins cannot touch the owner',
    format('select public.decide_membership(%L, %L, false, %L)', org, o, 'member'), 'error');

  -- Members: read all, add, change own.
  perform pg_temp.check_as(m, 'member adds own profile', format(
    $q$insert into public.workers (id, organization_id, updated_at, data)
       values ('22222222-0000-0000-0000-000000000001', %L, now(), '{"name":"Mia"}')$q$, org), '1');
  perform pg_temp.check_as(m, 'member links own profile', format(
    $q$select public.set_my_worker(%L, '22222222-0000-0000-0000-000000000001')$q$, org), 'ok');
  perform pg_temp.check_as(a, 'admin adds a customer', format(
    $q$insert into public.customers (id, organization_id, updated_at, data)
       values ('33333333-0000-0000-0000-000000000001', %L, now(), '{"name":"HV Müller"}')$q$, org), '1');
  perform pg_temp.check_as(m, 'member adds a customer', format(
    $q$insert into public.customers (id, organization_id, updated_at, data)
       values ('33333333-0000-0000-0000-000000000002', %L, now(), '{"name":"Kita"}')$q$, org), '1');
  perform pg_temp.check_as(m, 'created_by cannot be forged', format(
    $q$insert into public.customers (id, organization_id, created_by, updated_at, data)
       values ('33333333-0000-0000-0000-000000000003', %L, %L, now(), '{}')$q$, org, a), '1');
  v := (select created_by::text from public.customers where id = '33333333-0000-0000-0000-000000000003');
  if v <> m then raise exception 'FAILED [created_by forced to the user]: %', v; end if;
  perform pg_temp.check_as(m, 'member changes own customer',
    $q$update public.customers set data = '{"name":"Kita Sonne"}', updated_at = now()
       where id = '33333333-0000-0000-0000-000000000002'$q$, '1');
  perform pg_temp.check_as(m, 'member cannot change the admin''s customer',
    $q$update public.customers set data = '{"name":"x"}', updated_at = now()
       where id = '33333333-0000-0000-0000-000000000001'$q$, '0');
  perform pg_temp.check_as(m, 'member cannot change the company',
    format($q$update public.organizations set data = '{"name":"x"}' where id = %L$q$, org), '0');
  perform pg_temp.check_as(m, 'member cannot set the equipment preset', format(
    $q$insert into public.equipment_presets (id, organization_id, updated_at, data)
       values (gen_random_uuid(), %L, now(), '{}')$q$, org), 'error');
  perform pg_temp.check_as(m, 'member cannot delete (soft)',
    $q$update public.customers set deleted_at = now(), updated_at = now()
       where id = '33333333-0000-0000-0000-000000000002'$q$, 'error');
  perform pg_temp.check_as(m, 'member cannot delete (hard)',
    $q$delete from public.customers where id = '33333333-0000-0000-0000-000000000002'$q$, '0');

  -- Admins: change everything, but not delete.
  perform pg_temp.check_as(a, 'admin changes the member''s customer',
    $q$update public.customers set data = '{"name":"Kita Sonnenschein"}', updated_at = now()
       where id = '33333333-0000-0000-0000-000000000002'$q$, '1');
  perform pg_temp.check_as(a, 'admin changes the company',
    format($q$update public.organizations set data = '{"name":"Zwieselwiesel GmbH"}' where id = %L$q$, org), '1');
  perform pg_temp.check_as(a, 'admin cannot delete',
    $q$update public.customers set deleted_at = now(), updated_at = now()
       where id = '33333333-0000-0000-0000-000000000002'$q$, 'error');

  -- An older version never overwrites a newer one.
  perform pg_temp.check_as(a, 'stale write is skipped',
    $q$update public.customers set data = '{"name":"alt"}', updated_at = now() - interval '1 day'
       where id = '33333333-0000-0000-0000-000000000002'$q$, '0');
  v := (select data ->> 'name' from public.customers where id = '33333333-0000-0000-0000-000000000002');
  if v <> 'Kita Sonnenschein' then raise exception 'FAILED [stale write kept newer]: %', v; end if;

  -- Owner deletes.
  perform pg_temp.check_as(o, 'owner deletes (soft)',
    $q$update public.customers set deleted_at = now(), updated_at = now()
       where id = '33333333-0000-0000-0000-000000000002'$q$, '1');
  perform pg_temp.check_as(o, 'owner deletes (hard)',
    $q$delete from public.customers where id = '33333333-0000-0000-0000-000000000003'$q$, '1');

  -- Protocols: own drafts can be deleted, completed ones are locked.
  perform pg_temp.check_as(m, 'member starts a protocol', format(
    $q$insert into public.assessments (id, organization_id, updated_at, data)
       values ('44444444-0000-0000-0000-000000000001', %L, now(), '{"answers":{}}')$q$, org), '1');
  perform pg_temp.check_as(m, 'member adds a tree', format(
    $q$insert into public.trees (id, organization_id, assessment_id, updated_at, data)
       values ('55555555-0000-0000-0000-000000000001', %L, '44444444-0000-0000-0000-000000000001', now(), '{}')$q$, org), '1');
  perform pg_temp.check_as(m, 'member completes it',
    $q$update public.assessments set status = 'completed',
         data = '{"answers":{"x":1},"status":"completed"}', updated_at = now()
       where id = '44444444-0000-0000-0000-000000000001'$q$, '1');
  perform pg_temp.check_as(o, 'completed: answers locked, even for the owner',
    $q$update public.assessments set data = '{"answers":{"x":2},"status":"completed"}', updated_at = now()
       where id = '44444444-0000-0000-0000-000000000001'$q$, 'error');
  perform pg_temp.check_as(m, 'completed: cannot reopen',
    $q$update public.assessments set status = 'draft', updated_at = now()
       where id = '44444444-0000-0000-0000-000000000001'$q$, 'error');
  perform pg_temp.check_as(m, 'completed: can be marked as sent',
    $q$update public.assessments set status = 'sent',
         data = '{"answers":{"x":1},"status":"sent","sentAt":"2026-11-11"}', updated_at = now()
       where id = '44444444-0000-0000-0000-000000000001'$q$, '1');
  perform pg_temp.check_as(m, 'completed: no new trees', format(
    $q$insert into public.trees (id, organization_id, assessment_id, updated_at, data)
       values (gen_random_uuid(), %L, '44444444-0000-0000-0000-000000000001', now(), '{}')$q$, org), 'error');
  perform pg_temp.check_as(m, 'completed: trees locked',
    $q$update public.trees set data = '{"x":1}', updated_at = now()
       where id = '55555555-0000-0000-0000-000000000001'$q$, 'error');
  perform pg_temp.check_as(m, 'completed: invoice can still be attached', format(
    $q$insert into public.attachments (id, organization_id, assessment_id, updated_at, data)
       values (gen_random_uuid(), %L, '44444444-0000-0000-0000-000000000001', now(), '{"kind":"invoice"}')$q$, org), '1');
  perform pg_temp.check_as(m, 'completed: creator cannot delete',
    $q$update public.assessments set deleted_at = now(), updated_at = now()
       where id = '44444444-0000-0000-0000-000000000001'$q$, 'error');
  perform pg_temp.check_as(m, 'member starts a second draft', format(
    $q$insert into public.assessments (id, organization_id, updated_at, data)
       values ('44444444-0000-0000-0000-000000000002', %L, now(), '{}')$q$, org), '1');
  perform pg_temp.check_as(m, 'own draft can be deleted',
    $q$update public.assessments set deleted_at = now(), updated_at = now()
       where id = '44444444-0000-0000-0000-000000000002'$q$, '1');
  perform pg_temp.check_as(o, 'owner can delete a completed protocol',
    $q$update public.assessments set deleted_at = now(), updated_at = now()
       where id = '44444444-0000-0000-0000-000000000001'$q$, '1');

  -- Audit log is append-only.
  perform pg_temp.check_as(m, 'audit insert', format(
    $q$insert into public.audit_log (id, organization_id, updated_at, data)
       values ('66666666-0000-0000-0000-000000000001', %L, now(), '{"action":"created"}')$q$, org), '1');
  perform pg_temp.check_as(a, 'audit cannot be changed',
    $q$update public.audit_log set data = '{}' where id = '66666666-0000-0000-0000-000000000001'$q$, '0');

  -- Outsiders see nothing.
  v := pg_temp.scalar_as(x, 'select (select count(*) from public.workers) + (select count(*) from public.customers) + (select count(*) from public.memberships)');
  if v <> '0' then raise exception 'FAILED [outsider sees nothing]: %', v; end if;

  -- Ownership transfer.
  perform pg_temp.check_as(a, 'admin cannot transfer ownership',
    format('select public.transfer_ownership(%L, %L)', org, a), 'error');
  perform pg_temp.check_as(o, 'owner transfers to the admin',
    format('select public.transfer_ownership(%L, %L)', org, a), 'ok');
  perform pg_temp.check_as(o, 'former owner can no longer delete',
    $q$update public.customers set deleted_at = now(), updated_at = now()
       where id = '33333333-0000-0000-0000-000000000001'$q$, 'error');
  perform pg_temp.check_as(a, 'new owner can delete',
    $q$update public.customers set deleted_at = now(), updated_at = now()
       where id = '33333333-0000-0000-0000-000000000001'$q$, '1');

  -- Removing a member ends access.
  perform pg_temp.check_as(a, 'owner removes the member',
    format('select public.decide_membership(%L, %L, false, %L)', org, m, 'member'), 'ok');
  v := pg_temp.scalar_as(m, 'select count(*) from public.workers');
  if v <> '0' then raise exception 'FAILED [removed member sees nothing]: %', v; end if;

  -- Device codes are unique per company.
  v := pg_temp.scalar_as(a, format($q$select public.register_device(%L, '', 'Anton', 'iPad')$q$, org));
  if v <> 'A1' then raise exception 'FAILED [first device code]: %', v; end if;
  v := pg_temp.scalar_as(a, format($q$select public.register_device(%L, '', 'Anton', 'Handy')$q$, org));
  if v <> 'A2' then raise exception 'FAILED [second device code]: %', v; end if;
  v := pg_temp.scalar_as(a, format($q$select public.register_device(%L, 'a1', 'Anton', 'iPad')$q$, org));
  if v <> 'A1' then raise exception 'FAILED [own code again]: %', v; end if;
  v := pg_temp.scalar_as(o, format($q$select public.register_device(%L, 'A1', 'Olaf', 'PC')$q$, org));
  if v <> 'O1' then raise exception 'FAILED [taken code is not given twice]: %', v; end if;
  perform pg_temp.check_as(x, 'outsiders get no device code',
    format($q$select public.register_device(%L, '', 'X', null)$q$, org), 'error');

  raise notice 'ALL RLS TESTS PASSED';
end $$;

rollback;
