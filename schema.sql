create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  stock_quantity numeric not null default 0,
  critical_stock numeric not null default 5,
  purchase_price numeric not null default 0,
  sale_price numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'customer'
    check (type in ('customer','supplier','both')),
  phone text,
  email text,
  address text,
  tax_number text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  invoice_no text,
  party_id uuid references public.parties(id) on delete set null,
  invoice_date date not null default current_date,
  subtotal numeric not null default 0,
  vat_rate numeric not null default 20,
  vat_amount numeric not null default 0,
  total numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null default 0,
  vat_rate numeric not null default 20,
  line_subtotal numeric not null default 0,
  vat_amount numeric not null default 0,
  line_total numeric not null default 0
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_no text,
  party_id uuid references public.parties(id) on delete set null,
  invoice_date date not null default current_date,
  subtotal numeric not null default 0,
  vat_rate numeric not null default 20,
  vat_amount numeric not null default 0,
  total numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null default 0,
  vat_rate numeric not null default 20,
  line_subtotal numeric not null default 0,
  vat_amount numeric not null default 0,
  line_total numeric not null default 0
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  party_id uuid references public.parties(id) on delete set null,
  type text not null check (type in ('in','out')),
  quantity numeric not null check (quantity > 0),
  source_type text,
  source_id uuid,
  note text,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.parties enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists products_select on public.products;
drop policy if exists products_insert on public.products;
drop policy if exists products_update on public.products;
drop policy if exists products_delete on public.products;

create policy products_select
on public.products for select
to anon, authenticated
using (true);

create policy products_insert
on public.products for insert
to anon, authenticated
with check (true);

create policy products_update
on public.products for update
to anon, authenticated
using (true)
with check (true);

create policy products_delete
on public.products for delete
to anon, authenticated
using (true);

drop policy if exists parties_select on public.parties;
drop policy if exists parties_insert on public.parties;
drop policy if exists parties_update on public.parties;
drop policy if exists parties_delete on public.parties;

create policy parties_select
on public.parties for select
to anon, authenticated
using (true);

create policy parties_insert
on public.parties for insert
to anon, authenticated
with check (true);

create policy parties_update
on public.parties for update
to anon, authenticated
using (true)
with check (true);

create policy parties_delete
on public.parties for delete
to anon, authenticated
using (true);

drop policy if exists purchases_select on public.purchases;
drop policy if exists purchases_insert on public.purchases;

create policy purchases_select
on public.purchases for select
to anon, authenticated
using (true);

create policy purchases_insert
on public.purchases for insert
to anon, authenticated
with check (true);

drop policy if exists purchase_items_select on public.purchase_items;
drop policy if exists purchase_items_insert on public.purchase_items;

create policy purchase_items_select
on public.purchase_items for select
to anon, authenticated
using (true);

create policy purchase_items_insert
on public.purchase_items for insert
to anon, authenticated
with check (true);

drop policy if exists sales_select on public.sales;
drop policy if exists sales_insert on public.sales;

create policy sales_select
on public.sales for select
to anon, authenticated
using (true);

create policy sales_insert
on public.sales for insert
to anon, authenticated
with check (true);

drop policy if exists sale_items_select on public.sale_items;
drop policy if exists sale_items_insert on public.sale_items;

create policy sale_items_select
on public.sale_items for select
to anon, authenticated
using (true);

create policy sale_items_insert
on public.sale_items for insert
to anon, authenticated
with check (true);

drop policy if exists movements_select on public.stock_movements;
drop policy if exists movements_insert on public.stock_movements;

create policy movements_select
on public.stock_movements for select
to anon, authenticated
using (true);

create policy movements_insert
on public.stock_movements for insert
to anon, authenticated
with check (true);
