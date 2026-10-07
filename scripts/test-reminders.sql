-- Dummy data to try reminders right away, without waiting for a bill to come due.
-- Run in the Supabase SQL editor AFTER signing in as demo@gmail.com and turning
-- notifications on (Menu → Notifications → Turn on for this device). Remove it with
-- test-reminders-reset.sql.
--
-- For demo@gmail.com it adds (all named [TEST]):
--   - 2 bills due tomorrow             → one "2 bills due tomorrow" notification
--   - a debt and a receivable due tomorrow → one notification each
--   - a category at 90% of its budget  → "[TEST] Jajan is at 90% of its budget"
-- and moves the evening reminder to the current hour, so it all goes out now, plus the
-- daily check-in if nothing is recorded for today. Then it calls send-reminders at once.
--
-- Needs an active pay period and a local time between 09:00 and 23:59.

do $$
declare
  v_user     uuid;
  v_tz       text;
  v_now      timestamp;
  v_tomorrow date;
  v_period   public.pay_periods;
  v_account  uuid;
  v_category uuid;
begin
  select id into v_user from auth.users where email = 'demo@gmail.com';
  if v_user is null then
    raise exception 'There’s no demo@gmail.com account.';
  end if;
  if not exists (select 1 from public.push_subscriptions where user_id = v_user) then
    raise exception 'demo@gmail.com has no device with notifications on. Sign in as demo and turn them on first (Menu → Notifications).';
  end if;

  select coalesce((select time_zone from public.notification_settings where user_id = v_user), 'Asia/Jakarta') into v_tz;
  v_now := now() at time zone v_tz;
  v_tomorrow := v_now::date + 1;
  if extract(hour from v_now) < 9 then
    raise exception 'It’s % in %; the evening reminder can only be set from 09:00. Try again later.', to_char(v_now, 'HH24:MI'), v_tz;
  end if;

  select * into v_period from public.pay_periods where user_id = v_user and status = 'active';
  if v_period.id is null then
    raise exception 'No active pay period. Open one in the app first.';
  end if;

  -- The evening reminder at this hour, so tomorrow's bills and debts go out now.
  insert into public.notification_settings (user_id, bills, debts, budgets, daily_log, daily_hour, time_zone)
  values (v_user, true, true, true, true, extract(hour from v_now)::int, v_tz)
  on conflict (user_id) do update
    set bills = true, debts = true, budgets = true, daily_log = true,
        daily_hour = excluded.daily_hour, updated_at = now();

  -- Today's check-in may have gone out already in an earlier try.
  delete from public.notification_log where user_id = v_user and key = 'daily:' || v_now::date;

  -- Bills due tomorrow.
  insert into public.recurring_bills (user_id, name, amount, kind, frequency, due_day, starts_on)
  values
    (v_user, '[TEST] Internet', 350000, 'bill', 'monthly', extract(day from v_tomorrow)::int, v_now::date - 60),
    (v_user, '[TEST] Netflix', 186000, 'subscription', 'monthly', extract(day from v_tomorrow)::int, v_now::date - 60);

  -- A debt and a receivable due tomorrow.
  insert into public.debts (user_id, type, counterparty, total_amount, remaining_amount, due_date)
  values
    (v_user, 'debt', '[TEST] Andi', 750000, 750000, v_tomorrow),
    (v_user, 'receivable', '[TEST] Budi', 500000, 500000, v_tomorrow);

  -- A category at 90% of its budget, spent from its own account so real balances stay put.
  insert into public.accounts (user_id, name, type, initial_balance)
  values (v_user, '[TEST] Dompet', 'cash', 1000000)
  returning id into v_account;

  insert into public.categories (user_id, name, type, kind)
  values (v_user, '[TEST] Jajan', 'expense', 'daily')
  returning id into v_category;

  insert into public.category_budgets (user_id, category_id, amount)
  values (v_user, v_category, 100000);

  -- Dated yesterday (or the period's first day) so it doesn't count as logging today.
  insert into public.transactions (user_id, pay_period_id, account_id, category_id, type, amount, note, date)
  values (v_user, v_period.id, v_account, v_category, 'expense', 90000, '[TEST] reminder budget',
          greatest(v_period.start_date, v_now::date - 1));

  raise notice 'Test data added. Evening reminder set to %:00 (%).', extract(hour from v_now), v_tz;
end;
$$;

-- What will go out:
select kind, name, amount, budget, pct from public.due_reminders();

-- And send it now, the way the hourly job does. Notifications arrive in a few seconds.
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-reminders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-reminders-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_secret')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
) as request_id;

-- A few seconds later, the function's answer, e.g. {"reminders":5,"sent":4}:
-- select status_code, content from net._http_response order by created desc limit 1;
