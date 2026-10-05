-- Mouny schema, part 1 of 4: tables, constraints and indexes.
--
-- Every row belongs to one user (user_id -> auth.users) and goes when that user is
-- deleted. Money is numeric (rupiah, no rounding surprises). Allowed values are kept in
-- check constraints rather than enums, so adding one is a one-line migration; they mirror
-- the union types in src/types/index.ts.
--
-- Foreign keys between user tables are NO ACTION unless noted: deleting an account,
-- category or period that transactions still use fails, and the app says it's in use
-- (handleError in src/services/_base.ts, code 23503). Constraint names are Postgres's
-- defaults on purpose: PostgREST embeds use them (wish_list_transaction_id_fkey).

-- Bank and cash accounts. `balance` is kept current by the transaction triggers
-- (part 2) and by transfer_balance / collect_receivable (part 4); it can't go below zero,
-- and the app reads that check failing as "Insufficient balance".
create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  type            text not null check (type in ('bank', 'cash')),
  initial_balance numeric not null default 0 check (initial_balance >= 0),
  balance         numeric not null default 0,
  created_at      timestamptz not null default now(),
  constraint accounts_balance_check check (balance >= 0)
);

create index accounts_user_id_idx on public.accounts (user_id);

-- Income and expense categories. `kind` says what an expense is for (a bill paid once a
-- period, everyday spending, lifestyle, or savings) and drives the daily pace and the
-- needs / wants / savings split; income categories have none. `is_savings` mirrors
-- kind = 'savings' through a trigger (part 2) for queries that filter on it.
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  type       text not null check (type in ('income', 'expense')),
  kind       text check (kind in ('fixed', 'daily', 'lifestyle', 'savings')),
  is_savings boolean not null default false,
  -- Icon key from src/lib/icon-map.ts, the icon color, and the tile background
  -- (null = a soft tint of the icon color).
  icon       text,
  color      text,
  bg_color   text,
  created_at timestamptz not null default now()
);

create index categories_user_id_idx on public.categories (user_id);

-- A standing spending target per category, reused every pay period.
create table public.category_budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  amount      numeric not null check (amount >= 0),
  created_at  timestamptz not null default now(),
  unique (user_id, category_id)
);

-- Payday to payday. At most one period per user is active; closing it fixes its end
-- date and the total balance across accounts at that moment.
create table public.pay_periods (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_date        date not null,
  end_date          date,
  status            text not null default 'active' check (status in ('active', 'closed')),
  salary_amount     numeric not null check (salary_amount >= 0),
  salary_account_id uuid references public.accounts (id) on delete set null,
  closing_balance   numeric,
  notes             text,
  created_at        timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create unique index pay_periods_one_active_per_user on public.pay_periods (user_id) where status = 'active';
create index pay_periods_user_id_start_date_idx on public.pay_periods (user_id, start_date desc);

-- Savings goals. Either a price (saved_amount counts up to estimated_price) or a
-- quantity (e.g. 10 grams of gold bought in installments: saved_quantity counts up to
-- quantity). transaction_id is the purchase, or the installment that completed it.
create table public.wish_list (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pay_period_id   uuid not null references public.pay_periods (id),
  name            text not null check (length(trim(name)) > 0),
  estimated_price numeric check (estimated_price >= 0),
  priority        text default 'low' check (priority in ('low', 'medium', 'high')),
  notes           text,
  icon            text,
  target_date     date,
  quantity        numeric check (quantity > 0),
  unit            text,
  price_per_unit  numeric check (price_per_unit >= 0),
  saved_amount    numeric not null default 0 check (saved_amount >= 0),
  saved_quantity  numeric not null default 0 check (saved_quantity >= 0),
  is_purchased    boolean not null default false,
  transaction_id  uuid, -- foreign key added after transactions, which points back here
  created_at      timestamptz not null default now()
);

create index wish_list_user_id_idx on public.wish_list (user_id);
create index wish_list_pay_period_id_idx on public.wish_list (pay_period_id);

-- Money in and out of an account. Transfers between accounts aren't transactions:
-- they move balances directly (transfer_balance).
create table public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pay_period_id     uuid not null references public.pay_periods (id),
  account_id        uuid not null references public.accounts (id),
  category_id       uuid references public.categories (id),
  -- Set on a wish purchase or installment; a deleted wish leaves the expense in place.
  wish_list_item_id uuid references public.wish_list (id) on delete set null,
  type              text not null check (type in ('income', 'expense')),
  amount            numeric not null check (amount > 0),
  note              text,
  date              date not null default current_date,
  created_at        timestamptz not null default now()
);

create index transactions_pay_period_id_date_idx on public.transactions (pay_period_id, date desc);
create index transactions_user_id_date_idx on public.transactions (user_id, date desc);
create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_category_id_idx on public.transactions (category_id);
create index transactions_wish_list_item_id_idx on public.transactions (wish_list_item_id);

alter table public.wish_list
  add constraint wish_list_transaction_id_fkey
  foreign key (transaction_id) references public.transactions (id) on delete set null;

-- Debts (money you owe) and receivables (money owed to you).
create table public.debts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type                text not null check (type in ('debt', 'receivable')),
  counterparty        text not null check (length(trim(counterparty)) > 0),
  total_amount        numeric not null check (total_amount > 0),
  remaining_amount    numeric not null check (remaining_amount >= 0),
  status              text not null default 'active' check (status in ('active', 'paid')),
  due_date            date,
  -- The account the money came from or went to when the debt was recorded; payments
  -- can use any account.
  pay_from_account_id uuid references public.accounts (id) on delete set null,
  notes               text,
  created_at          timestamptz not null default now()
);

create index debts_user_id_due_date_idx on public.debts (user_id, due_date);

-- One row per payment on a debt or collection on a receivable. Collections don't
-- create a transaction, so transactions alone can't tell a debt's history.
create table public.debt_payments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  debt_id        uuid not null references public.debts (id) on delete cascade,
  amount         numeric not null check (amount > 0),
  date           date not null,
  account_id     uuid references public.accounts (id) on delete set null,
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at     timestamptz not null default now()
);

create index debt_payments_debt_id_date_idx on public.debt_payments (debt_id, date desc);
