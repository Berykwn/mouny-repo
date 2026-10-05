-- Move a savings expense into a savings account.
--
-- Before savings accounts existed, money set aside was recorded as an expense in a savings
-- category: it left the account and went nowhere. When it actually went into an account
-- that's now marked as savings, this turns that expense into the transfer it was, in
-- place: the expense becomes the transfer_out (same account, date, period and note), and a
-- transfer_in lands in the savings account. The source balance doesn't move again, the
-- savings account gains the money, and the period still counts it as saved.
--
-- Runs as the caller, so the usual rules apply: a closed period's money stays fixed, and
-- an archived account takes no money.

create or replace function public.move_to_savings(
  p_id         uuid,
  p_account_id uuid
) returns public.transactions
language plpgsql
set search_path = public
as $$
declare
  v_tx       public.transactions;
  v_saving   boolean;
  v_from     public.accounts;
  v_to       public.accounts;
  v_transfer uuid := gen_random_uuid();
begin
  select * into v_tx from public.transactions where id = p_id for update;
  if not found then
    raise exception 'Transaction not found';
  end if;

  select coalesce(c.is_savings, false) into v_saving from public.categories c where c.id = v_tx.category_id;
  if v_tx.type <> 'expense' or not coalesce(v_saving, false) then
    raise exception 'Only an expense in a savings category can be moved into a savings account.';
  end if;
  if v_tx.wish_list_item_id is not null or v_tx.debt_id is not null or v_tx.transfer_id is not null then
    raise exception 'This transaction belongs to a wish or debt, so it can''t be moved.';
  end if;

  select * into v_to from public.accounts where id = p_account_id;
  if not found then
    raise exception 'Account not found';
  end if;
  if not v_to.is_savings then
    raise exception '% isn''t a savings account.', v_to.name;
  end if;
  if v_to.id = v_tx.account_id then
    raise exception 'It''s already in %.', v_to.name;
  end if;
  select * into v_from from public.accounts where id = v_tx.account_id;

  update public.transactions
     set type = 'transfer_out',
         category_id = null,
         note = coalesce(nullif(note, ''), 'Transfer to ' || v_to.name),
         transfer_id = v_transfer
   where id = p_id
  returning * into v_tx;

  insert into public.transactions (user_id, pay_period_id, account_id, type, amount, note, date, transfer_id, created_at)
  values (v_tx.user_id, v_tx.pay_period_id, v_to.id, 'transfer_in', v_tx.amount,
          'Transfer from ' || v_from.name, v_tx.date, v_transfer, v_tx.created_at);

  return v_tx;
end;
$$;

revoke execute on function public.move_to_savings(uuid, uuid) from public, anon;
grant execute on function public.move_to_savings(uuid, uuid) to authenticated;
