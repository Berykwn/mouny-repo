-- Account roles, order and credit.
--
-- 1. An account's role says what its money is for, separately from where it sits (type):
--      everyday  spent from day to day (bank, cash, e-wallet)
--      savings   set aside (a separate pocket like Bank Jago)
--      credit    a credit card or pay-later line: spent from, and may go below zero down
--                to its limit; what's below zero is owed
--    `is_savings` stays and now mirrors role: savings accounts are set aside (not
--    spendable), which is what every savings calculation already reads. A client
--    that still writes only is_savings keeps working: the role follows it.
-- 2. Type gains 'ewallet' (GoPay, OVO, ShopeePay…). Type is only where the money sits.
-- 3. `position` is the user's own order. The first everyday account is the default in
--    every form; pickers group by role and keep this order inside each group. A new
--    account goes to the end.
-- 4. New money out can't overdraw an account, except a credit account, which may go down
--    to minus its limit (or without bound when it has none).


-- ---------------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------------
alter table public.accounts
  add column if not exists role         text    not null default 'everyday',
  add column if not exists position     integer not null default 0,
  add column if not exists credit_limit numeric;

alter table public.accounts drop constraint if exists accounts_role_check;
alter table public.accounts add constraint accounts_role_check
  check (role in ('everyday', 'savings', 'credit'));

alter table public.accounts drop constraint if exists accounts_credit_limit_check;
alter table public.accounts add constraint accounts_credit_limit_check
  check (credit_limit is null or (role = 'credit' and credit_limit > 0));

-- The old type check, under whatever name it was made with, found by what it allows.
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
     where conrelid = 'public.accounts'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ~ '''bank'''
  loop
    execute format('alter table public.accounts drop constraint %I', r.conname);
  end loop;
end;
$$;

alter table public.accounts add constraint accounts_type_check
  check (type in ('bank', 'cash', 'ewallet'));

-- Existing accounts: savings ones keep being savings; the order starts alphabetical,
-- which is how the app listed them until now.
update public.accounts set role = 'savings' where is_savings and role = 'everyday';

update public.accounts a
   set position = o.n
  from (select id, row_number() over (partition by user_id order by name, created_at) - 1 as n
          from public.accounts) o
 where o.id = a.id;

create index if not exists accounts_user_position_idx on public.accounts (user_id, position);


-- ---------------------------------------------------------------------------------
-- 2. Role and is_savings in step; a new account goes last
-- ---------------------------------------------------------------------------------
create or replace function public.accounts_sync_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- An older client marks a savings account through is_savings only.
    if new.is_savings and new.role = 'everyday' then
      new.role := 'savings';
    end if;
    new.position := coalesce(
      (select max(position) + 1 from public.accounts where user_id = new.user_id), 0);
  elsif new.role is not distinct from old.role and new.is_savings is distinct from old.is_savings then
    -- Only the flag changed (an older client): the role follows it.
    new.role := case when new.is_savings then 'savings' else 'everyday' end;
  end if;

  if new.role <> 'credit' then
    new.credit_limit := null;
  end if;
  new.is_savings := new.role = 'savings';
  return new;
end;
$$;

drop trigger if exists accounts_sync_role on public.accounts;
create trigger accounts_sync_role
  before insert or update on public.accounts
  for each row execute function public.accounts_sync_role();


-- ---------------------------------------------------------------------------------
-- 3. Order
-- ---------------------------------------------------------------------------------

-- Put the user's accounts in the given order. Accounts left out (archived ones, say)
-- keep their place after the ones named.
create or replace function public.reorder_accounts(p_ids uuid[])
returns void
language plpgsql
set search_path = public
as $$
begin
  update public.accounts a
     set position = o.n - 1
    from unnest(p_ids) with ordinality as o(id, n)
   where a.id = o.id and a.user_id = auth.uid();

  update public.accounts a
     set position = coalesce(array_length(p_ids, 1), 0) + r.n
    from (select id, row_number() over (order by position, name) as n
            from public.accounts
           where user_id = auth.uid() and not (id = any (p_ids))) r
   where a.id = r.id;
end;
$$;

revoke execute on function public.reorder_accounts(uuid[]) from public, anon;
grant execute on function public.reorder_accounts(uuid[]) to authenticated;


-- ---------------------------------------------------------------------------------
-- 4. Overdrawing, with credit
-- ---------------------------------------------------------------------------------

-- As in 20261005000100_ledger_integrity.sql, except that a credit account may go below
-- zero down to minus its limit.
create or replace function public.transactions_apply_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta   numeric;
  v_balance numeric;
  v_name    text;
  v_role    text;
  v_limit   numeric;
begin
  if tg_op = 'DELETE' then
    update public.accounts
       set balance = balance - public.transaction_effect(old.type, old.amount)
     where id = old.account_id;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.account_id <> new.account_id then
    update public.accounts
       set balance = balance - public.transaction_effect(old.type, old.amount)
     where id = old.account_id;
    v_delta := public.transaction_effect(new.type, new.amount);
  elsif tg_op = 'UPDATE' then
    v_delta := public.transaction_effect(new.type, new.amount) - public.transaction_effect(old.type, old.amount);
  else
    v_delta := public.transaction_effect(new.type, new.amount);
  end if;

  update public.accounts
     set balance = balance + v_delta
   where id = new.account_id and user_id = new.user_id
  returning balance, name, role, credit_limit into v_balance, v_name, v_role, v_limit;
  if not found then
    raise exception 'Account not found';
  end if;

  -- New money out can't overdraw. A correction that lowers a balance (deleting income,
  -- say) may take it below zero; the app then shows the account as overdrawn. A credit
  -- account may go down to minus its limit.
  if tg_op <> 'DELETE' and v_delta < 0 then
    if v_role = 'credit' then
      if v_limit is not null and v_balance < -v_limit then
        raise exception 'That goes over the credit limit of %.', v_name using errcode = 'check_violation';
      end if;
    elsif v_balance < 0 then
      raise exception 'Insufficient balance in %.', v_name using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;


-- ---------------------------------------------------------------------------------
-- 5. What the app may change
-- ---------------------------------------------------------------------------------
revoke update on public.accounts from anon, authenticated;
grant update (name, type, archived_at, is_savings, role, position, credit_limit) on public.accounts to authenticated;
