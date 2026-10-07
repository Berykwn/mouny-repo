-- Reminders: push notifications for bills and debts coming due, budgets running out, and
-- a nudge when nothing was logged today.
--
-- The browser hands each device a push subscription (push_subscriptions); what to remind
-- about and when is one row per user (notification_settings). Every hour pg_cron calls the
-- send-reminders Edge Function, which asks due_reminders() what's due right now, sends it
-- to the user's devices and records each reminder in notification_log so it goes out once.
--
-- Before the hourly job works, the Edge Function needs deploying and two secrets need
-- adding to the Vault (see supabase/functions/send-reminders/README.md). Safe to run twice.

-- One row per device that allowed notifications. The endpoint is the device's address at
-- its push service; it moves to whoever signs in on that device (save_push_subscription).
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Inserts go through here: a device someone else signed in on before already has a row,
-- which this user's policies couldn't touch.
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'You’re signed out. Please log in again.';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- What to be reminded about. No row means the defaults below.
create table if not exists public.notification_settings (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  bills      boolean not null default true,
  debts      boolean not null default true,
  budgets    boolean not null default true,
  daily_log  boolean not null default true,
  -- Local hour of the evening reminder: what's due tomorrow, and the nudge to log the day.
  -- What's due today goes out at 08:00.
  daily_hour smallint not null default 20 check (daily_hour between 9 and 23),
  -- IANA name from the browser, e.g. Asia/Jakarta.
  time_zone  text not null default 'Asia/Jakarta' check (length(time_zone) between 1 and 64),
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

drop policy if exists notification_settings_select_own on public.notification_settings;
drop policy if exists notification_settings_insert_own on public.notification_settings;
drop policy if exists notification_settings_update_own on public.notification_settings;
create policy notification_settings_select_own on public.notification_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy notification_settings_insert_own on public.notification_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy notification_settings_update_own on public.notification_settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Reminders already sent, so each goes out once. Only the Edge Function (service role)
-- reads and writes it: no policies.
create table if not exists public.notification_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  key     text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.notification_log enable row level security;

-- Whether a bill comes due on `d`. A 31st falls on a shorter month's last day, as in
-- dueDatesBetween (src/features/bills/lib/bills.ts).
create or replace function public.bill_due_on(b public.recurring_bills, d date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select not b.paused
    and d >= b.starts_on
    and (b.ends_on is null or d <= b.ends_on)
    and (b.frequency = 'monthly' or extract(month from d) = b.due_month)
    and extract(day from d) = least(
      b.due_day,
      extract(day from (date_trunc('month', d::timestamp) + interval '1 month - 1 day'))
    )
$$;

-- What's due to go out now, one row per reminder, for users with a device to send to.
-- The Edge Function words them; `key` is what notification_log remembers.
--   bill_today / bill_tomorrow          name, amount
--   debt_today / debt_tomorrow          name (who you owe), amount (what's left)
--   receivable_today / _tomorrow        name (who owes you), amount
--   budget                              name (category), amount (spent), budget, pct
--   daily                               nothing logged today
create or replace function public.due_reminders()
returns table (user_id uuid, kind text, key text, name text, amount numeric, budget numeric, pct integer)
language sql
stable
security definer
set search_path = ''
as $$
  with users as (
    select u.id as user_id,
           coalesce(s.bills, true) as bills,
           coalesce(s.debts, true) as debts,
           coalesce(s.budgets, true) as budgets,
           coalesce(s.daily_log, true) as daily_log,
           coalesce(s.daily_hour, 20) as daily_hour,
           (now() at time zone coalesce(tz.name, 'Asia/Jakarta')) as local_now
    from (select distinct ps.user_id as id from public.push_subscriptions ps) u
    left join public.notification_settings s on s.user_id = u.id
    -- An unknown time zone falls back to Jakarta instead of failing everyone's run.
    left join pg_catalog.pg_timezone_names tz on tz.name = s.time_zone
  ),
  moments as (
    select u.*,
           u.local_now::date as today,
           extract(hour from u.local_now)::int as hour,
           p.id as period_id,
           p.start_date as period_start
    from users u
    left join public.pay_periods p on p.user_id = u.user_id and p.status = 'active'
  ),
  -- What's due on a day: today's at 08:00, tomorrow's at the evening hour.
  targets as (
    select m.*, m.today as due, 'today' as stage from moments m where m.hour = 8
    union all
    select m.*, m.today + 1 as due, 'tomorrow' as stage from moments m where m.hour = m.daily_hour
  ),
  bills as (
    select t.user_id, 'bill_' || t.stage as kind,
           'bill:' || b.id || ':' || t.due || ':' || t.stage as key,
           b.name, b.amount, null::numeric as budget, null::integer as pct
    from targets t
    join public.recurring_bills b on b.user_id = t.user_id
    where t.bills
      and public.bill_due_on(b, t.due)
      -- Unpaid: fewer payments since the period began (or a month back) than due dates
      -- up to this one. Paying early counts, as on the Bills page.
      and (
        select count(*) from public.transactions tx
        where tx.recurring_bill_id = b.id and tx.type = 'expense'
          and tx.date >= coalesce(t.period_start, t.due - 30)
      ) < (
        select count(*) from generate_series(coalesce(t.period_start, t.due - 30)::timestamp, t.due::timestamp, interval '1 day') g
        where public.bill_due_on(b, g::date)
      )
  ),
  debts as (
    select t.user_id,
           case when d.type = 'debt' then 'debt_' else 'receivable_' end || t.stage as kind,
           'debt:' || d.id || ':' || t.due || ':' || t.stage as key,
           d.counterparty as name, d.remaining_amount as amount, null::numeric, null::integer
    from targets t
    join public.debts d on d.user_id = t.user_id
    where t.debts and d.status = 'active' and d.remaining_amount > 0 and d.due_date = t.due
  ),
  -- Budgets past 80% or 100% this period, any time of day except at night.
  spending as (
    select m.user_id, m.period_id, c.id as category_id, c.name, cb.amount as budget,
           coalesce((
             select sum(tx.amount) from public.transactions tx
             where tx.pay_period_id = m.period_id and tx.category_id = c.id and tx.type = 'expense'
           ), 0) as spent
    from moments m
    join public.category_budgets cb on cb.user_id = m.user_id and cb.amount > 0
    join public.categories c on c.id = cb.category_id and c.type = 'expense'
    where m.budgets and m.period_id is not null and m.hour between 8 and 21
  ),
  -- One reminder per step: a budget that jumps straight past 100% skips the 80% one.
  budgets as (
    select s.user_id, 'budget' as kind,
           'budget:' || s.category_id || ':' || s.period_id || ':' ||
             case when s.spent >= s.budget then '100' else '80' end as key,
           s.name, s.spent, s.budget, floor(s.spent / s.budget * 100)::integer
    from spending s
    where s.spent >= s.budget * 0.8
  ),
  daily as (
    select m.user_id, 'daily' as kind, 'daily:' || m.today as key,
           null::text, null::numeric, null::numeric, null::integer
    from moments m
    where m.daily_log and m.period_id is not null and m.hour = m.daily_hour
      and not exists (
        select 1 from public.transactions tx
        where tx.user_id = m.user_id and tx.date = m.today
      )
  ),
  candidates as (
    select * from bills
    union all select * from debts
    union all select * from budgets
    union all select * from daily
  )
  select c.*
  from candidates c
  where not exists (
    select 1 from public.notification_log l where l.user_id = c.user_id and l.key = c.key
  )
$$;

revoke all on function public.due_reminders() from public, anon, authenticated;
grant execute on function public.due_reminders() to service_role;

-- The hourly run. The project URL and the shared secret live in the Vault, so this file
-- holds neither; until they're added the job runs and fails quietly.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'send-reminders',
  '0 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminders-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  delete from public.notification_log where sent_at < now() - interval '120 days';
  $job$
);
