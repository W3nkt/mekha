create or replace function public.admin_decide_verification(
  p_verification_id uuid,
  p_action text,
  p_admin_id uuid,
  p_reviewer_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_verification seller_verifications%rowtype;
  v_status text;
  v_identifier_type text;
  v_profile_status text;
begin
  if p_action not in ('approve', 'reject', 'request_info') then
    raise exception 'invalid decision action' using errcode = '22023';
  end if;
  if p_action <> 'approve' and nullif(trim(p_reviewer_notes), '') is null then
    raise exception 'reviewer notes are required' using errcode = '22023';
  end if;

  select * into v_verification
  from public.seller_verifications
  where id = p_verification_id
  for update;
  if not found then raise exception 'verification not found' using errcode = 'P0002'; end if;
  if v_verification.status <> 'pending' then raise exception 'verification already reviewed' using errcode = '40001'; end if;

  v_status := case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'additional_info_required' end;
  update public.seller_verifications
  set status = v_status, reviewer_notes = nullif(trim(p_reviewer_notes), ''), reviewed_by = p_admin_id, reviewed_at = now()
  where id = p_verification_id;

  if p_action = 'approve' then
    v_identifier_type := case v_verification.verification_type
      when 'identity' then 'phone' when 'business_registration' then 'business_registration'
      when 'social_account' then 'social_account' when 'payment_identity' then 'payment_identity'
      else 'e_trust' end;
    update public.seller_identifiers set verification_status = 'verified'
      where seller_id = v_verification.seller_id and type = v_identifier_type;
    if exists (select 1 from public.seller_verifications where seller_id = v_verification.seller_id and verification_type = 'identity' and status = 'approved')
       and exists (select 1 from public.seller_verifications where seller_id = v_verification.seller_id and verification_type = 'business_registration' and status = 'approved') then
      v_profile_status := 'verified';
    elsif exists (select 1 from public.seller_verifications where seller_id = v_verification.seller_id and verification_type = 'identity' and status = 'approved') then
      v_profile_status := 'partially_verified';
    else v_profile_status := 'unverified'; end if;
    update public.seller_profiles set verification_status = v_profile_status where id = v_verification.seller_id;
  end if;

  insert into public.moderation_actions (admin_user_id, entity_type, entity_id, action, reason, metadata)
  values (p_admin_id, 'verification', p_verification_id, p_action, nullif(trim(p_reviewer_notes), ''), jsonb_build_object('seller_id', v_verification.seller_id));
  insert into public.audit_logs (actor_id, event, entity_type, entity_id, metadata)
  values (p_admin_id, 'admin.verification_' || p_action, 'seller_verification', p_verification_id, jsonb_build_object('seller_id', v_verification.seller_id, 'reason', nullif(trim(p_reviewer_notes), '')));
  return jsonb_build_object('id', p_verification_id, 'status', v_status, 'seller_id', v_verification.seller_id);
end;
$$;

create or replace function public.admin_suspend_seller(p_seller_id uuid, p_admin_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if nullif(trim(p_reason), '') is null then raise exception 'reason is required' using errcode = '22023'; end if;
  update public.seller_profiles set verification_status = 'suspended' where id = p_seller_id;
  if not found then raise exception 'seller not found' using errcode = 'P0002'; end if;
  insert into public.moderation_actions (admin_user_id, entity_type, entity_id, action, reason) values (p_admin_id, 'seller', p_seller_id, 'suspend', trim(p_reason));
  insert into public.audit_logs (actor_id, event, entity_type, entity_id, metadata) values (p_admin_id, 'admin.seller_suspended', 'seller_profile', p_seller_id, jsonb_build_object('reason', trim(p_reason)));
  return jsonb_build_object('id', p_seller_id, 'status', 'suspended');
end; $$;

revoke all on function public.admin_decide_verification(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_suspend_seller(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_decide_verification(uuid, text, uuid, text) to service_role;
grant execute on function public.admin_suspend_seller(uuid, uuid, text) to service_role;
