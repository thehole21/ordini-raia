-- Additivo: non modifica gli accessi o le tabelle del gestionale esistente.
create schema if not exists ordini_private;
revoke all on schema ordini_private from public, anon;
grant usage on schema ordini_private to authenticated;

create table public.ordini_companies (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(btrim(name)) between 1 and 160),
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
 color text not null default '#dc302e' check(color ~ '^#[0-9a-fA-F]{6}$'),
 logo_url text not null default '' check(logo_url='' or logo_url ~ '^https://'),
 email text not null default '', address text not null default '',
 welcome text not null default 'Il tuo catalogo, pronto da ordinare.',
 gestionale_client_id text,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.ordini_memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 company_id uuid not null references public.ordini_companies(id),
 name text not null, email text not null,
 active boolean not null default true
);
create index ordini_memberships_company on public.ordini_memberships(company_id);
create table public.ordini_products (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.ordini_companies(id),
 name text not null check(length(btrim(name)) between 1 and 160),
 description text not null default '' check(length(description)<=3000),
 category text not null default 'Stampa',
 sku text not null default '',
 unit text not null default 'pz',
 price numeric(12,4) check(price>=0 and price<=1000000),
 min_qty integer not null default 1 check(min_qty between 1 and 1000000),
 qty_step integer not null default 1 check(qty_step between 1 and 1000000),
 image_url text not null default '' check(image_url='' or image_url ~ '^https://'),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create index ordini_products_company on public.ordini_products(company_id);
create table public.ordini_orders (
 id uuid primary key,
 number bigint generated always as identity unique,
 company_id uuid not null references public.ordini_companies(id),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 status text not null default 'Da elaborare' check(status in ('Da elaborare','Confermato','In lavorazione','Pronto','Consegnato','Annullato')),
 requested_date date, address text not null default '', notes text not null default '',
 total numeric(14,2) check(total>=0),
 gestionale_order_id text unique
);
create index ordini_orders_company on public.ordini_orders(company_id,created_at desc);
create index ordini_orders_creator on public.ordini_orders(created_by);
create table public.ordini_order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.ordini_orders(id),
 product_id uuid not null references public.ordini_products(id),
 name text not null, unit text not null, quantity integer not null check(quantity>0),
 price numeric(12,4) check(price>=0),
 total numeric(14,2) check(total>=0)
);
create index ordini_items_order on public.ordini_order_items(order_id);
create index ordini_items_product on public.ordini_order_items(product_id);

create function ordini_private.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.raia_profiles where id=auth.uid() and role='admin' and active and deleted_at is null)
$$;
create function ordini_private.can_access(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (ordini_private.is_staff() or exists(
 select 1 from public.ordini_memberships m join public.ordini_companies c on c.id=m.company_id
 where m.user_id=auth.uid() and m.company_id=target and m.active and c.active))
$$;
revoke all on function ordini_private.is_staff(),ordini_private.can_access(uuid) from public,anon;
grant execute on function ordini_private.is_staff(),ordini_private.can_access(uuid) to authenticated;

alter table public.ordini_companies enable row level security;
alter table public.ordini_memberships enable row level security;
alter table public.ordini_products enable row level security;
alter table public.ordini_orders enable row level security;
alter table public.ordini_order_items enable row level security;
revoke all on public.ordini_companies,public.ordini_memberships,public.ordini_products,public.ordini_orders,public.ordini_order_items from anon,authenticated;
grant select on public.ordini_companies,public.ordini_memberships,public.ordini_products,public.ordini_orders,public.ordini_order_items to authenticated;
grant insert,update on public.ordini_companies,public.ordini_memberships,public.ordini_products to authenticated;
create policy ordini_company_read on public.ordini_companies for select to authenticated using(ordini_private.can_access(id));
create policy ordini_company_insert on public.ordini_companies for insert to authenticated with check(ordini_private.is_staff());
create policy ordini_company_update on public.ordini_companies for update to authenticated using(ordini_private.is_staff()) with check(ordini_private.is_staff());
create policy ordini_member_read on public.ordini_memberships for select to authenticated using(ordini_private.is_staff() or (user_id=auth.uid() and ordini_private.can_access(company_id)));
create policy ordini_member_insert on public.ordini_memberships for insert to authenticated with check(ordini_private.is_staff());
create policy ordini_member_update on public.ordini_memberships for update to authenticated using(ordini_private.is_staff()) with check(ordini_private.is_staff());
create policy ordini_product_read on public.ordini_products for select to authenticated using(ordini_private.is_staff() or (active and ordini_private.can_access(company_id)));
create policy ordini_product_insert on public.ordini_products for insert to authenticated with check(ordini_private.is_staff());
create policy ordini_product_update on public.ordini_products for update to authenticated using(ordini_private.is_staff()) with check(ordini_private.is_staff());
create policy ordini_order_read on public.ordini_orders for select to authenticated using(ordini_private.can_access(company_id));
create policy ordini_item_read on public.ordini_order_items for select to authenticated using(exists(select 1 from public.ordini_orders o where o.id=order_id and ordini_private.can_access(o.company_id)));

create function public.ordini_is_staff() returns boolean language sql stable security invoker set search_path='' as $$ select ordini_private.is_staff() $$;
revoke all on function public.ordini_is_staff() from public,anon;
grant execute on function public.ordini_is_staff() to authenticated;

create function ordini_private.clients() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not ordini_private.is_staff() then raise exception 'FORBIDDEN'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',c->>'id','name',c->>'name') order by c->>'name'),'[]'::jsonb)
 from public.raia_workspace w cross join lateral jsonb_array_elements(w.payload->'clients') c where w.id=1);
end $$;
create function public.ordini_clients() returns jsonb language sql stable security invoker set search_path='' as $$ select ordini_private.clients() $$;
revoke all on function ordini_private.clients(),public.ordini_clients() from public,anon;
grant execute on function ordini_private.clients(),public.ordini_clients() to authenticated;

create function ordini_private.submit(request_id uuid,target_company uuid,items jsonb,delivery_date date,delivery_address text,order_notes text) returns uuid language plpgsql security definer set search_path='' as $$
declare company public.ordini_companies; previous public.ordini_orders; product public.ordini_products; ws public.raia_workspace;
 item jsonb; qty integer; line_total numeric; amount numeric:=0; snapshot jsonb:='[]'; work_lines jsonb:='[]'; cid text; oid text; order_number bigint; item_id uuid; new_order jsonb;
begin
 if auth.uid() is null or not ordini_private.can_access(target_company) then raise exception 'FORBIDDEN'; end if;
 perform pg_advisory_xact_lock(hashtextextended(request_id::text,0));
 select * into previous from public.ordini_orders where id=request_id;
 if found then
  if previous.created_by<>auth.uid() or previous.company_id<>target_company then raise exception 'FORBIDDEN'; end if;
  return previous.id;
 end if;
 select * into company from public.ordini_companies where id=target_company and active for share;
 if not found then raise exception 'CLIENT_INACTIVE'; end if;
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 50 then raise exception 'INVALID_CART'; end if;
 if length(coalesce(order_notes,''))>3000 or length(coalesce(delivery_address,''))>1000 then raise exception 'INVALID_NOTES'; end if;
 if delivery_date < (now() at time zone 'Europe/Rome')::date then raise exception 'INVALID_DATE'; end if;
 if (select count(*) from public.ordini_orders where created_by=auth.uid() and created_at>now()-interval '1 day')>=100 then raise exception 'DAILY_LIMIT'; end if;
 if (select count(distinct x->>'product_id') from jsonb_array_elements(items) x)<>jsonb_array_length(items) then raise exception 'INVALID_CART'; end if;
 for item in select * from jsonb_array_elements(items) loop
  if coalesce(item->>'quantity','') !~ '^[0-9]{1,7}$' then raise exception 'INVALID_QUANTITY'; end if;
  qty:=(item->>'quantity')::integer;
  select * into product from public.ordini_products where id=(item->>'product_id')::uuid and company_id=target_company and active for share;
  if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  if qty<product.min_qty or qty>1000000 or (qty-product.min_qty)%product.qty_step<>0 then raise exception 'INVALID_QUANTITY'; end if;
  line_total:=round(qty*product.price,2); amount:=amount+line_total; item_id:=gen_random_uuid();
  snapshot:=snapshot||jsonb_build_array(jsonb_build_object('id',item_id,'product_id',product.id,'name',product.name,'unit',product.unit,'quantity',qty,'price',product.price,'total',line_total));
  work_lines:=work_lines||jsonb_build_array(jsonb_build_object('id','portal_'||item_id::text,'description',concat_ws(' · ',nullif(product.sku,''),product.name,product.description),'qty',qty,'unit',product.unit,'price',coalesce(product.price,0),'production',case when product.price is null then jsonb_build_object('quantity',qty::text,'priceUnspecified',true,'requestedDate',coalesce(delivery_date::text,''),'invoicing','','terminated',false,'supplier','','requestedText','','ddtNumber','','delivery','') else null end,'status','Da elaborare','operatorId','','invoiceId',null,'notes',product.description));
 end loop;
 select * into ws from public.raia_workspace where id=1 for update;
 if not found or jsonb_typeof(ws.payload->'orders') is distinct from 'array' or jsonb_typeof(ws.payload->'clients') is distinct from 'array' then raise exception 'WORKSPACE_UNAVAILABLE'; end if;
 cid:=company.gestionale_client_id;
 if cid is null or not exists(select 1 from jsonb_array_elements(ws.payload->'clients') c where c->>'id'=cid) then raise exception 'CLIENT_MAPPING_MISSING'; end if;
 oid:='portal_'||request_id::text;
 insert into public.ordini_orders(id,company_id,created_by,requested_date,address,notes,total,gestionale_order_id)
 values(request_id,target_company,auth.uid(),delivery_date,coalesce(delivery_address,''),coalesce(order_notes,''),amount,oid) returning number into order_number;
 insert into public.ordini_order_items(id,order_id,product_id,name,unit,quantity,price,total)
 select (s->>'id')::uuid,request_id,(s->>'product_id')::uuid,s->>'name',s->>'unit',(s->>'quantity')::integer,(s->>'price')::numeric,(s->>'total')::numeric from jsonb_array_elements(snapshot) s;
 new_order:=jsonb_build_object('id',oid,'number','WEB-'||lpad(order_number::text,6,'0'),'title','Ordine dal portale clienti','clientId',cid,'created',to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'),'due',coalesce(delivery_date::text,''),'notes','Ordine dal portale clienti.'||E'\n'||coalesce(order_notes,'')||E'\nConsegna: '||coalesce(delivery_address,''),'lines',work_lines);
 update public.raia_workspace set payload=jsonb_set(ws.payload,'{orders}',jsonb_build_array(new_order)||(ws.payload->'orders')),revision=revision+1 where id=1;
 return request_id;
end $$;
create function public.ordini_submit(request_id uuid,target_company uuid,items jsonb,delivery_date date default null,delivery_address text default '',order_notes text default '') returns uuid language sql security invoker set search_path='' as $$ select ordini_private.submit(request_id,target_company,items,delivery_date,delivery_address,order_notes) $$;
revoke all on function ordini_private.submit(uuid,uuid,jsonb,date,text,text),public.ordini_submit(uuid,uuid,jsonb,date,text,text) from public,anon;
grant execute on function ordini_private.submit(uuid,uuid,jsonb,date,text,text),public.ordini_submit(uuid,uuid,jsonb,date,text,text) to authenticated;

