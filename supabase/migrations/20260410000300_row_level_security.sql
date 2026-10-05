-- Mouny schema, part 3 of 4: row level security.
--
-- Signed-in users see and change only their own rows; signed-out requests see nothing.
-- `(select auth.uid())` rather than `auth.uid()` so Postgres evaluates it once per query,
-- not once per row.

do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'categories', 'category_budgets', 'pay_periods',
    'wish_list', 'transactions', 'debts', 'debt_payments'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t || '_delete_own', t);
  end loop;
end;
$$;
