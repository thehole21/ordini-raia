create table public.ordini_sections (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.ordini_companies(id),
 name text not null check(length(trim(name)) between 1 and 80), position bigint generated always as identity,
 unique(company_id,name)
);
alter table public.ordini_sections enable row level security;
revoke all on public.ordini_sections from anon,authenticated;
grant select,insert,delete on public.ordini_sections to authenticated;
create policy sections_read on public.ordini_sections for select to authenticated using(ordini_private.can_access(company_id));
create policy sections_manage on public.ordini_sections for all to authenticated using(ordini_private.catalog_manager() or ordini_private.is_staff()) with check(ordini_private.catalog_manager() or ordini_private.is_staff());
insert into public.ordini_sections(company_id,name) select id,s from public.ordini_companies cross join unnest(array['Stickers','Gadget','Abbigliamento','In Arrivo']) s where slug='titocci';
update public.ordini_products set category='Stickers' where company_id=(select id from public.ordini_companies where slug='titocci');
insert into public.ordini_sections(company_id,name) select distinct company_id,category from public.ordini_products on conflict do nothing;
alter table public.ordini_products alter column category drop not null;
alter table public.ordini_products add constraint ordini_product_section foreign key(company_id,category) references public.ordini_sections(company_id,name) on delete set null (category);
create function ordini_private.archive_unsectioned() returns trigger language plpgsql set search_path='' as $$begin if new.category is null then new.active:=false; end if; return new;end$$;
create trigger archive_unsectioned before insert or update on public.ordini_products for each row execute function ordini_private.archive_unsectioned();
insert into public.ordini_companies(name,slug,color,logo_url,gestionale_client_id) values('Rimac','rimac','#EC1C24','https://rimacsrl.it/wp-content/uploads/2022/08/cropped-LOGO-RIMAC.png',(select c->>'id' from public.raia_workspace w cross join lateral jsonb_array_elements(w.payload->'clients') c where c->>'name'='RIMAC RIGANELLI MACCHINE SRL'));
