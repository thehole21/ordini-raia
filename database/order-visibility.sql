create or replace function ordini_private.order_visible(portal_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists (
   select 1 from public.ordini_orders o join public.raia_workspace w on w.id=1
   where o.id=portal_id and ordini_private.can_access(o.company_id)
   and (w.payload->'orders') @> jsonb_build_array(jsonb_build_object('id',o.gestionale_order_id))
 )
$$;
revoke all on function ordini_private.order_visible(uuid) from public, anon;
grant execute on function ordini_private.order_visible(uuid) to authenticated;
alter policy ordini_order_read on public.ordini_orders using (ordini_private.order_visible(id));
