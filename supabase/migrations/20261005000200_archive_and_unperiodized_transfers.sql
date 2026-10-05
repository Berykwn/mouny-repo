-- Account archiving, and transfers between pay periods.
--
-- An early version of 20261005000100_ledger_integrity.sql ran on production without
-- these two parts; the final version of that file has them. This brings a database
-- from either version to the same place, so it is safe to run on both (and twice).

-- A transfer can happen between periods (before the first one, or after closing one and
-- before opening the next); it then belongs to no period. Income and spending always
-- belong to one.
alter table public.transactions alter column pay_period_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_period_check') then
    alter table public.transactions
      add constraint transactions_period_check
        check (pay_period_id is not null or type in ('transfer_in', 'transfer_out'));
  end if;
end;
$$;

-- An account that's no longer used but has history is archived instead of deleted: the
-- app hides it, and its money is fixed. Only an empty account can be archived, so hiding
-- it never hides money.
alter table public.accounts add column if not exists archived_at timestamptz;

create or replace function public.accounts_archive_rules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.archived_at is not null and old.archived_at is null and new.balance <> 0 then
    raise exception 'Move the money out of % before archiving it.', new.name;
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_archive_rules on public.accounts;
create trigger accounts_archive_rules
  before update of archived_at on public.accounts
  for each row execute function public.accounts_archive_rules();

grant update (name, type, archived_at) on public.accounts to authenticated;

-- The transaction rules, now also refusing money changes on an archived account.
create or replace function public.transactions_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_period   public.pay_periods;
  v_new_period   public.pay_periods;
  v_moves_money  boolean;
  v_linked       public.transactions;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if tg_op <> 'INSERT' then
    select * into v_old_period from public.pay_periods where id = old.pay_period_id;
  end if;
  if tg_op <> 'DELETE' then
    select * into v_new_period from public.pay_periods where id = new.pay_period_id;
  end if;

  v_moves_money := tg_op <> 'UPDATE'
    or old.amount <> new.amount or old.account_id <> new.account_id
    or old.type <> new.type or old.pay_period_id is distinct from new.pay_period_id;

  if v_moves_money and ('closed' in (v_old_period.status, v_new_period.status)) then
    raise exception 'This period is closed, so its money can''t change.';
  end if;

  if v_moves_money and exists (
    select 1 from public.accounts
     where archived_at is not null
       and id in (case when tg_op <> 'INSERT' then old.account_id end,
                  case when tg_op <> 'DELETE' then new.account_id end)
  ) then
    raise exception 'That account is archived. Restore it to change its money.';
  end if;

  -- A linked transaction's money belongs to its transfer, debt or wish.
  if tg_op = 'UPDATE' and v_moves_money then
    v_linked := old;
    if v_linked.transfer_id is not null or v_linked.debt_id is not null or v_linked.wish_list_item_id is not null then
      raise exception 'This transaction belongs to a %. Delete it and record it again instead.',
        case when v_linked.transfer_id is not null then 'transfer'
             when v_linked.debt_id is not null then 'debt'
             else 'wish' end;
    end if;
  end if;

  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and (old.date <> new.date or old.pay_period_id is distinct from new.pay_period_id)) then
    if new.date < v_new_period.start_date
       or (v_new_period.end_date is not null and new.date > v_new_period.end_date) then
      raise exception 'The date has to fall inside its pay period (from %).', to_char(v_new_period.start_date, 'DD Mon YYYY');
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

-- The period a transfer on this date belongs to: the active one, if it has started by
-- then. Otherwise none — the transfer happened between periods, and a closed period
-- never takes new money.
drop function if exists public.period_for_date(date);
create function public.period_for_date(p_date date)
returns uuid
language sql
stable
set search_path = public
as $$
  select id
    from public.pay_periods
   where user_id = auth.uid() and status = 'active' and start_date <= p_date
$$;

-- Correct an account's balance by a signed amount: a transfer_in or transfer_out row
-- noted "Balance adjustment", in the active period if there is one.
create or replace function public.adjust_balance(
  p_account_id uuid,
  p_amount     numeric,
  p_date       date default null
) returns public.accounts
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_account public.accounts;
  v_date    date := coalesce(p_date, current_date);
begin
  if p_amount is null or p_amount = 0 then
    raise exception 'Enter an amount other than zero.';
  end if;

  perform 1 from public.accounts where id = p_account_id;
  if not found then
    raise exception 'Account not found';
  end if;

  insert into public.transactions (user_id, pay_period_id, account_id, type, amount, note, date)
  values (auth.uid(), public.period_for_date(v_date), p_account_id,
          case when p_amount > 0 then 'transfer_in' else 'transfer_out' end,
          abs(p_amount), 'Balance adjustment', v_date);

  select * into v_account from public.accounts where id = p_account_id;
  return v_account;
end;
$$;

revoke execute on function public.period_for_date(date) from public, anon;
grant execute on function public.period_for_date(date) to authenticated;
revoke execute on function public.adjust_balance(uuid, numeric, date) from public, anon;
grant execute on function public.adjust_balance(uuid, numeric, date) to authenticated;
