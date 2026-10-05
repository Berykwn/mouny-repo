-- Mouny schema, part 2 of 4: triggers that keep derived columns right.

-- What a transaction does to its account's balance.
create or replace function public.transaction_effect(p_type text, p_amount numeric)
returns numeric
language sql
immutable
as $$
  select case when p_type = 'income' then p_amount else -p_amount end
$$;

-- Account balances follow transactions: an insert applies it, a delete undoes it, and
-- an update that changes the account, type or amount moves the difference. A balance
-- that would go below zero fails accounts_balance_check, which the app shows as
-- "Insufficient balance".
--
-- Runs as the calling user, so RLS applies: a transaction pointing at someone else's
-- account finds no account and is refused.
create or replace function public.transactions_apply_balance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    -- Deleted by a cascade (the user's account is being removed): the account is going
    -- too, so there's no balance to correct.
    if pg_trigger_depth() > 1 then
      return old;
    end if;
    update public.accounts
       set balance = balance - public.transaction_effect(old.type, old.amount)
     where id = old.account_id;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.account_id = new.account_id then
    update public.accounts
       set balance = balance
                   - public.transaction_effect(old.type, old.amount)
                   + public.transaction_effect(new.type, new.amount)
     where id = new.account_id;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    update public.accounts
       set balance = balance - public.transaction_effect(old.type, old.amount)
     where id = old.account_id;
  end if;

  update public.accounts
     set balance = balance + public.transaction_effect(new.type, new.amount)
   where id = new.account_id;
  if not found then
    raise exception 'Account not found';
  end if;
  return new;
end;
$$;

create trigger transactions_apply_balance
  after insert or delete or update of account_id, type, amount on public.transactions
  for each row execute function public.transactions_apply_balance();

-- kind is the source of truth for what an expense category is for; is_savings mirrors
-- it. Expense categories always get a kind (savings if flagged, everyday otherwise);
-- income categories never have one.
create or replace function public.categories_sync_kind()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.type = 'expense' then
    new.kind := coalesce(new.kind, case when new.is_savings then 'savings' else 'daily' end);
  else
    new.kind := null;
  end if;
  new.is_savings := coalesce(new.kind = 'savings', false);
  return new;
end;
$$;

create trigger categories_sync_kind
  before insert or update on public.categories
  for each row execute function public.categories_sync_kind();
