-- Removes what test-reminders.sql added for demo@gmail.com, and sets its evening reminder
-- back to 20:00.
-- Run in the Supabase SQL editor. Safe to run twice.

do $$
declare
  v_user uuid;
begin
  select id into v_user from auth.users where email = 'demo@gmail.com';
  if v_user is null then
    raise notice 'There’s no demo@gmail.com account; nothing to clean up.';
    return;
  end if;

  -- The budget expense first: the account and category can't go while it points at them.
  delete from public.transactions
  where user_id = v_user
    and category_id in (select id from public.categories where user_id = v_user and name = '[TEST] Jajan');
  -- Its budget goes with the category.
  delete from public.categories where user_id = v_user and name = '[TEST] Jajan';
  delete from public.accounts where user_id = v_user and name = '[TEST] Dompet';
  delete from public.recurring_bills where user_id = v_user and name like '[TEST] %';
  delete from public.debts where user_id = v_user and counterparty like '[TEST] %';

  update public.notification_settings set daily_hour = 20, updated_at = now() where user_id = v_user;

  raise notice 'Test data removed. Evening reminder back to 20:00.';
end;
$$;
