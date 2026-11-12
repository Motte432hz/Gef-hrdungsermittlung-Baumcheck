-- The owner can delete the whole company from the cloud (all records, members, invites,
-- device codes). Files in storage are removed by the app beforehand (storage API).

create function public.delete_organization(p_org uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if app.role_in(p_org) is distinct from 'owner' then
    raise exception 'Nur die Inhaberin oder der Inhaber kann die Firma löschen.'
      using errcode = '42501';
  end if;
  delete from public.organizations where id = p_org;
end $$;

revoke all on function public.delete_organization(uuid) from public, anon;
grant execute on function public.delete_organization(uuid) to authenticated;
