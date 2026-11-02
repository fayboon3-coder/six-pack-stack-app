-- Six-Pack Stack app: delete my account (version 5). Apple requires in-app deletion.
-- The app removes the person's progress photos through Storage first, then calls this.
-- Deleting the auth user cascades to their profile, plans, workout logs, check-ins,
-- photo records, reviews, Ask Boon chats and usage. The coach can't delete themselves here.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'coach') then
    raise exception 'coach account can''t be deleted from the app';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

select 'delete_my_account ready' as status;
