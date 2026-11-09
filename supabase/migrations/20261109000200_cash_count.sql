-- Cash count.
--
-- Recording every coffee is the part people skip; counting what's actually in the wallet
-- (or the bank app) once in a while is easy. count_account takes what's really there and
-- records the difference, one of three ways the user picks:
--   spending    less than recorded: money that went on things not written down. An
--               expense in "Unrecorded", so the spending stats stay honest.
--   income      more than recorded: money that came in and wasn't written down. Income
--               in "Unrecorded".
--   correction  the record was wrong (a typo, a double entry): a balance adjustment, a
--               transfer that's neither income nor spending, like adjust_balance.
-- The difference is taken from the locked row, not from what the app last showed, so a
-- transaction saved in between can't make it miss. Spending and income need the active
-- period, like any other expense or income.

create or replace function public.count_account(
  p_account_id uuid,
  p_actual     numeric,
  p_as         text,
  p_date       date default null
) returns public.accounts
language plpgsql
set search_path = public
as $$
declare
  v_account  public.accounts;
  v_date     date := coalesce(p_date, current_date);
  v_diff     numeric;
  v_period   uuid;
  v_type     text;
  v_category uuid;
begin
  if p_actual is null then
    raise exception 'Enter what''s actually there.';
  end if;
  if p_as not in ('spending', 'income', 'correction') then
    raise exception 'Choose how to record the difference.';
  end if;

  select * into v_account from public.accounts where id = p_account_id for update;
  if not found then
    raise exception 'Account not found';
  end if;

  v_diff := p_actual - v_account.balance;
  if v_diff = 0 then
    return v_account;
  end if;

  v_period := public.period_for_date(v_date);

  if p_as = 'correction' then
    insert into public.transactions (user_id, pay_period_id, account_id, type, amount, note, date)
    values (auth.uid(), v_period, p_account_id,
            case when v_diff > 0 then 'transfer_in' else 'transfer_out' end,
            abs(v_diff), 'Cash count correction', v_date);
  else
    if p_as = 'spending' and v_diff > 0 then
      raise exception 'There''s more than recorded, so it can''t be spending.';
    end if;
    if p_as = 'income' and v_diff < 0 then
      raise exception 'There''s less than recorded, so it can''t be income.';
    end if;
    if v_period is null then
      raise exception 'Open a pay period to record this as %.', p_as;
    end if;

    v_type := case when p_as = 'spending' then 'expense' else 'income' end;

    -- The user's own "Unrecorded" category of that type, oldest first; made once if missing.
    select id into v_category from public.categories
     where user_id = auth.uid() and name = 'Unrecorded' and type = v_type
     order by created_at
     limit 1;
    if v_category is null then
      insert into public.categories (user_id, name, type, color, icon)
      values (auth.uid(), 'Unrecorded', v_type, '#6b7280', 'more-horizontal')
      returning id into v_category;
    end if;

    insert into public.transactions (user_id, pay_period_id, account_id, category_id, type, amount, note, date)
    values (auth.uid(), v_period, p_account_id, v_category, v_type, abs(v_diff), 'Cash count', v_date);
  end if;

  select * into v_account from public.accounts where id = p_account_id;
  return v_account;
end;
$$;

revoke execute on function public.count_account(uuid, numeric, text, date) from public, anon;
grant execute on function public.count_account(uuid, numeric, text, date) to authenticated;
