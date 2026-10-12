-- A transfer can carry the user's own note.
--
-- Until now both legs were always noted "Transfer to X" / "Transfer from Y", so a transfer
-- for the rent or a top-up for a trip read the same as any other in the ledger. p_note,
-- when given, goes on both legs; left out or blank, the old notes stay. Everything else is
-- as in 20261005000100_ledger_integrity.sql.
--
-- The old four-argument function is dropped rather than overloaded: two candidates that
-- both fit a call without p_note would leave PostgREST unable to choose.

drop function if exists public.transfer_balance(uuid, uuid, numeric, date);

create function public.transfer_balance(
  p_from_id uuid,
  p_to_id   uuid,
  p_amount  numeric,
  p_date    date default null,
  p_note    text default null
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_date   date := coalesce(p_date, current_date);
  v_note   text := nullif(btrim(p_note), '');
  v_from   text;
  v_to     text;
  v_period uuid;
  v_id     uuid := gen_random_uuid();
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;
  if p_from_id = p_to_id then
    raise exception 'Choose two different accounts.';
  end if;

  select name into v_from from public.accounts where id = p_from_id;
  if not found then raise exception 'Account not found'; end if;
  select name into v_to from public.accounts where id = p_to_id;
  if not found then raise exception 'Account not found'; end if;

  v_period := public.period_for_date(v_date);

  insert into public.transactions (user_id, pay_period_id, account_id, type, amount, note, date, transfer_id)
  values (auth.uid(), v_period, p_from_id, 'transfer_out', p_amount, coalesce(v_note, 'Transfer to ' || v_to), v_date, v_id),
         (auth.uid(), v_period, p_to_id, 'transfer_in', p_amount, coalesce(v_note, 'Transfer from ' || v_from), v_date, v_id);

  return v_id;
end;
$$;

-- Signed-in users only.
revoke execute on function public.transfer_balance(uuid, uuid, numeric, date, text) from public, anon;
grant execute on function public.transfer_balance(uuid, uuid, numeric, date, text) to authenticated;
