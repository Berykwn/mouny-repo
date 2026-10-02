-- What an expense category is for: a bill paid once a period, everyday spending, lifestyle,
-- or savings. Replaces guessing bills from category names, and lets analytics split spending
-- into needs / wants / savings. Income categories have no kind.
-- Run this manually in the Supabase SQL editor (this repo has no linked Supabase CLI project yet).

alter table public.categories
    add column kind text check (kind in ('fixed', 'daily', 'lifestyle', 'savings'));

-- Backfill from what the app guessed until now: the savings flag, then the bill-name word list
-- the spending pace used (src/lib/category-kind.ts), then the usual lifestyle names.
update public.categories
set kind = case
    when is_savings then 'savings'
    when name ~* '\m(rent|utilit|internet|insurance|loan|debt|subscription|receivable|education|kos|sewa|cicilan|tagihan|listrik|asuransi|langganan|pinjam|hutang|utang)'
        then 'fixed'
    when name ~* '\m(shop|entertain|travel|hobby|hobi|belanja|hiburan|liburan|jalan|nongkrong|game|gift|hadiah)'
        then 'lifestyle'
    else 'daily'
end
where type = 'expense';

-- kind is the source of truth; is_savings stays as its mirror for the period_summaries RPC
-- and anything else that already reads it. Expense categories always get a kind.
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
