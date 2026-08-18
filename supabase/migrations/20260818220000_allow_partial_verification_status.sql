alter table public.seller_profiles
  drop constraint if exists seller_profiles_verification_status_check;

alter table public.seller_profiles
  add constraint seller_profiles_verification_status_check check (
    verification_status in (
      'unverified', 'pending', 'partially_verified', 'verified',
      'rejected', 'suspended', 'additional_info_required'
    )
  );
