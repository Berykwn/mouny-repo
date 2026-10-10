-- Wish parts: a wish split into the things it's made of ("Rakit PC" → motherboard, CPU,
-- RAM, ...), each bought on its own. The wish is done once every part is bought.
--
-- Money set aside for the wish (wish_list.saved_amount) is spent on its parts: buying a
-- part takes up to its price off saved_amount, and the part remembers how much it took
-- (from_saved) so undoing the purchase puts that back. A part can be recorded as an
-- expense (linked to the wish like any wish purchase) or marked bought without one, for
-- things already paid for before they were tracked here. Deleting a part's expense
-- undoes the part. Safe to run twice.

create table if not exists public.wish_parts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  wish_id         uuid not null,
  name            text not null check (length(btrim(name)) between 1 and 80),
  estimated_price numeric check (estimated_price >= 0),
  position        integer not null default 0,
  is_purchased    boolean not null default false,
  paid_amount     numeric check (paid_amount > 0),
  -- How much of paid_amount came out of the wish's saved_amount.
  from_saved      numeric not null default 0 check (from_saved >= 0),
  purchased_on    date,
  -- The expense that bought it, if one was recorded. No foreign key: the transactions
  -- delete trigger finds the part through it and undoes the purchase, which a
  -- "set null" would have cleared first.
  transaction_id  uuid,
  created_at      timestamptz not null default now(),
  constraint wish_parts_id_user_id_key unique (id, user_id),
  constraint wish_parts_wish_id_fkey
    foreign key (wish_id, user_id) references public.wish_list (id, user_id) on delete cascade,
  constraint wish_parts_bought_check
    check (is_purchased = (paid_amount is not null))
);

create index if not exists wish_parts_user_id_idx on public.wish_parts (user_id);
create index if not exists wish_parts_wish_id_idx on public.wish_parts (wish_id);
create index if not exists wish_parts_transaction_id_idx on public.wish_parts (transaction_id) where transaction_id is not null;

alter table public.wish_parts enable row level security;

drop policy if exists wish_parts_select_own on public.wish_parts;
drop policy if exists wish_parts_insert_own on public.wish_parts;
drop policy if exists wish_parts_update_own on public.wish_parts;
drop policy if exists wish_parts_delete_own on public.wish_parts;
create policy wish_parts_select_own on public.wish_parts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy wish_parts_insert_own on public.wish_parts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy wish_parts_update_own on public.wish_parts
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy wish_parts_delete_own on public.wish_parts
  for delete to authenticated using ((select auth.uid()) = user_id);


-- An early version of this file had a callable reset helper; a reset that left the
-- expense in place could put a part and its expense out of step, so it's gone.
drop function if exists public.reset_wish_part(uuid);

-- Save a wish's parts as listed, all or nothing. p_parts is a JSON array of
-- {id?, name, estimated_price}: entries without an id are added, the rest updated, and
-- open parts left off the list removed. Bought parts aren't touched; open ones are
-- listed after them. Leaving nothing to buy once some parts are bought finishes the wish.
create or replace function public.save_wish_parts(
  p_wish_id uuid,
  p_parts   jsonb
) returns public.wish_list
language plpgsql
set search_path = public
as $$
declare
  v_wish   public.wish_list;
  v_bought integer;
  v_ids    uuid[];
  v_part   jsonb;
  v_pos    integer := 0;
begin
  if p_parts is null or jsonb_typeof(p_parts) <> 'array' then
    raise exception 'Parts must be a list.';
  end if;

  select * into v_wish from public.wish_list where id = p_wish_id for update;
  if not found then
    raise exception 'Wish not found';
  end if;
  if v_wish.is_purchased then
    raise exception 'This wish is already bought.';
  end if;
  if v_wish.quantity is not null then
    raise exception 'A wish tracked by quantity can''t be split.';
  end if;

  -- Bought parts first, keeping their order; the listed open ones follow.
  update public.wish_parts p
     set position = r.rn - 1
    from (select id, row_number() over (order by position, created_at) as rn
            from public.wish_parts where wish_id = p_wish_id and is_purchased) r
   where p.id = r.id;
  get diagnostics v_bought = row_count;

  select coalesce(array_agg((e->>'id')::uuid), '{}') into v_ids
    from jsonb_array_elements(p_parts) e
   where e->>'id' is not null;

  delete from public.wish_parts
   where wish_id = p_wish_id and not is_purchased and id <> all (v_ids);

  for v_part in select value from jsonb_array_elements(p_parts) loop
    if v_part->>'id' is null then
      insert into public.wish_parts (user_id, wish_id, name, estimated_price, position)
      values (v_wish.user_id, p_wish_id, btrim(v_part->>'name'), (v_part->>'estimated_price')::numeric, v_bought + v_pos);
    else
      update public.wish_parts
         set name = btrim(v_part->>'name'), estimated_price = (v_part->>'estimated_price')::numeric, position = v_bought + v_pos
       where id = (v_part->>'id')::uuid and wish_id = p_wish_id and not is_purchased;
      if not found then
        raise exception 'One of the parts was bought or removed meanwhile. Refresh and try again.';
      end if;
    end if;
    v_pos := v_pos + 1;
  end loop;

  -- Every part left is bought: the wish is done, linked to the latest recorded part.
  if v_bought > 0 and v_pos = 0 then
    update public.wish_list
       set is_purchased = true,
           transaction_id = (select transaction_id from public.wish_parts
                              where wish_id = p_wish_id and transaction_id is not null
                              order by purchased_on desc nulls last, position desc limit 1)
     where id = p_wish_id;
  end if;

  select * into v_wish from public.wish_list where id = p_wish_id;
  return v_wish;
end;
$$;

-- Buy one part of a wish. With p_record, an expense linked to the wish; without, the part
-- is only marked bought (paid for outside what's tracked here). Takes what it can from
-- the wish's savings, and closes the wish when it was the last part.
create or replace function public.buy_wish_part(
  p_part_id       uuid,
  p_amount        numeric,
  p_record        boolean,
  p_account_id    uuid,
  p_category_id   uuid,
  p_date          date,
  p_pay_period_id uuid,
  p_note          text
) returns public.wish_list
language plpgsql
set search_path = public
as $$
declare
  v_part  public.wish_parts;
  v_wish  public.wish_list;
  v_tx_id uuid;
  v_draw  numeric;
  v_open  boolean;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  select * into v_part from public.wish_parts where id = p_part_id for update;
  if not found then
    raise exception 'Part not found';
  end if;
  if v_part.is_purchased then
    raise exception 'That part is already bought.';
  end if;

  select * into v_wish from public.wish_list where id = v_part.wish_id for update;

  if p_record then
    insert into public.transactions (user_id, pay_period_id, account_id, category_id, type, amount, note, date, wish_list_item_id)
    values (auth.uid(), p_pay_period_id, p_account_id, p_category_id, 'expense', p_amount, p_note, p_date, v_wish.id)
    returning id into v_tx_id;
  end if;

  v_draw := least(coalesce(v_wish.saved_amount, 0), p_amount);

  update public.wish_parts
     set is_purchased = true, paid_amount = p_amount, from_saved = v_draw,
         purchased_on = coalesce(p_date, current_date), transaction_id = v_tx_id
   where id = p_part_id;

  v_open := exists (select 1 from public.wish_parts where wish_id = v_wish.id and not is_purchased);

  update public.wish_list
     set saved_amount   = coalesce(saved_amount, 0) - v_draw,
         is_purchased   = not v_open,
         transaction_id = case when v_open then transaction_id else v_tx_id end
   where id = v_wish.id
  returning * into v_wish;

  return v_wish;
end;
$$;

-- Undo a part's purchase. A recorded one deletes its expense (the money goes back to the
-- account, and the delete trigger resets the part); otherwise the part is reset directly.
create or replace function public.undo_wish_part(p_part_id uuid)
returns public.wish_list
language plpgsql
set search_path = public
as $$
declare
  v_part public.wish_parts;
  v_wish public.wish_list;
begin
  select * into v_part from public.wish_parts where id = p_part_id for update;
  if not found then
    raise exception 'Part not found';
  end if;
  if not v_part.is_purchased then
    raise exception 'That part isn''t bought yet.';
  end if;

  if v_part.transaction_id is not null then
    delete from public.transactions where id = v_part.transaction_id;
  end if;

  -- Not recorded (or its expense was already gone): reset it here. After the delete
  -- above, the trigger has done this and the update finds nothing to change. v_part
  -- still holds what the part took from savings (RETURNING would give the new 0).
  update public.wish_parts
     set is_purchased = false, paid_amount = null, from_saved = 0, purchased_on = null, transaction_id = null
   where id = p_part_id and is_purchased;
  if found then
    update public.wish_list
       set saved_amount = coalesce(saved_amount, 0) + v_part.from_saved, is_purchased = false, transaction_id = null
     where id = v_part.wish_id;
  end if;

  select * into v_wish from public.wish_list where id = v_part.wish_id;
  return v_wish;
end;
$$;

-- After a delete, the records linked to it follow. As before, plus: deleting a part's
-- expense undoes that part: what it took from the wish's savings goes back, and the
-- wish is open again.
create or replace function public.transactions_after_delete()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_wish public.wish_list;
  v_qty  numeric;
  v_part public.wish_parts;
begin
  -- The other side of a transfer.
  if old.transfer_id is not null then
    delete from public.transactions where transfer_id = old.transfer_id and id <> old.id;
  end if;

  -- A wish's purchase or installment. (Its transaction_id link is already cleared by the
  -- foreign key when this runs.)
  if old.wish_list_item_id is not null then
    -- Read before resetting: RETURNING would give the new from_saved, 0.
    select * into v_part from public.wish_parts where transaction_id = old.id and is_purchased for update;
    if found then
      update public.wish_parts
         set is_purchased = false, paid_amount = null, from_saved = 0, purchased_on = null, transaction_id = null
       where id = v_part.id;
      update public.wish_list
         set saved_amount = coalesce(saved_amount, 0) + v_part.from_saved, is_purchased = false, transaction_id = null
       where id = v_part.wish_id;
      return old;
    end if;

    select * into v_wish from public.wish_list where id = old.wish_list_item_id for update;
    if found and v_wish.quantity is null then
      if v_wish.is_purchased and (v_wish.transaction_id is null or v_wish.transaction_id = old.id) then
        update public.wish_list set is_purchased = false, transaction_id = null where id = v_wish.id;
      end if;
    elsif found then
      v_qty := greatest(0, round(v_wish.saved_quantity - coalesce(old.wish_quantity, 0), 3));
      update public.wish_list
         set saved_quantity = v_qty,
             saved_amount   = greatest(0, saved_amount - old.amount),
             is_purchased   = v_qty >= round(quantity, 3),
             transaction_id = case when v_qty >= round(quantity, 3) then transaction_id end
       where id = v_wish.id;
    end if;
  end if;

  return old;
end;
$$;

-- Signed-in users only.
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('save_wish_parts', 'buy_wish_part', 'undo_wish_part')
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
