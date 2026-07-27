begin;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('product', 'user')),
  product_id uuid references public.products(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reason text not null check (
    reason in ('scam', 'counterfeit', 'prohibited', 'harassment', 'spam', 'other')
  ),
  details text not null default '' check (char_length(details) <= 2000),
  evidence_urls jsonb not null default '[]'::jsonb
    check (jsonb_typeof(evidence_urls) = 'array' and jsonb_array_length(evidence_urls) <= 5),
  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'resolved', 'dismissed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  resolution_action text not null default 'none'
    check (resolution_action in ('none', 'warn', 'hide_listing', 'suspend_user')),
  resolution_note text not null default '' check (char_length(resolution_note) <= 2000),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (target_type = 'product' and product_id is not null)
    or (target_type = 'user' and reported_user_id is not null)
  ),
  check (reporter_id is distinct from reported_user_id)
);

create table if not exists public.report_audit_log (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  from_status text,
  to_status text not null,
  action text not null default 'none',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);
create index if not exists reports_reporter_created_idx
  on public.reports (reporter_id, created_at desc);
create index if not exists reports_product_idx
  on public.reports (product_id) where product_id is not null;
create index if not exists reports_user_idx
  on public.reports (reported_user_id) where reported_user_id is not null;
create index if not exists report_audit_report_created_idx
  on public.report_audit_log (report_id, created_at);

alter table public.reports enable row level security;
alter table public.report_audit_log enable row level security;

revoke all on public.reports from anon, authenticated;
revoke all on public.report_audit_log from anon, authenticated;
grant all on public.reports to service_role;
grant all on public.report_audit_log to service_role;

create or replace function public.process_moderation_report(
  p_report_id uuid,
  p_actor_id uuid,
  p_status text,
  p_action text default 'none',
  p_note text default ''
)
returns public.reports
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_report public.reports;
  v_actor_role text;
  v_previous_status text;
begin
  select role into v_actor_role
  from public.profiles
  where id = p_actor_id and status = 'active';

  if v_actor_role not in ('admin', 'agent') then
    raise exception 'moderation_forbidden';
  end if;

  select * into v_report
  from public.reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'report_not_found';
  end if;

  if v_report.status in ('resolved', 'dismissed') then
    raise exception 'report_already_closed';
  end if;

  if p_status not in ('in_review', 'resolved', 'dismissed') then
    raise exception 'invalid_report_status';
  end if;

  if p_status = 'resolved' and p_action not in ('warn', 'hide_listing', 'suspend_user') then
    raise exception 'resolution_action_required';
  end if;

  if p_status <> 'resolved' and p_action <> 'none' then
    raise exception 'action_requires_resolution';
  end if;

  if p_action = 'hide_listing' and v_report.product_id is null then
    raise exception 'product_report_required';
  end if;

  if p_action = 'suspend_user' and v_report.reported_user_id is null then
    raise exception 'reported_user_required';
  end if;

  v_previous_status := v_report.status;

  if p_action = 'hide_listing' then
    update public.products
    set status = 'inactive', updated_at = now()
    where id = v_report.product_id;
  elsif p_action = 'suspend_user' then
    update public.profiles
    set status = 'blocked', updated_at = now()
    where id = v_report.reported_user_id;
  end if;

  update public.reports
  set status = p_status,
      assigned_to = p_actor_id,
      resolution_action = p_action,
      resolution_note = left(coalesce(p_note, ''), 2000),
      resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end,
      updated_at = now()
  where id = p_report_id
  returning * into v_report;

  insert into public.report_audit_log (
    report_id, actor_id, from_status, to_status, action, note
  ) values (
    p_report_id, p_actor_id, v_previous_status, p_status, p_action,
    left(coalesce(p_note, ''), 2000)
  );

  insert into public.notifications (
    user_id, type, title, message, entity_type, entity_id, metadata,
    is_read, created_at, updated_at
  )
  values (
    v_report.reporter_id,
    'moderation',
    'Bao cao da duoc cap nhat',
    case when p_status = 'dismissed'
      then 'Bao cao cua ban da duoc xem xet va dong.'
      else 'Bao cao cua ban da duoc doi ngu moderation xu ly.'
    end,
    'report',
    v_report.id::text,
    jsonb_build_object('status', p_status, 'action', p_action),
    false, now(), now()
  );

  if v_report.reported_user_id is not null and p_status = 'resolved' then
    insert into public.notifications (
      user_id, type, title, message, entity_type, entity_id, metadata,
      is_read, created_at, updated_at
    )
    values (
      v_report.reported_user_id,
      'moderation',
      'Cap nhat moderation',
      case p_action
        when 'warn' then 'Tai khoan cua ban da nhan canh bao moderation.'
        when 'suspend_user' then 'Tai khoan cua ban da bi tam khoa.'
        else 'Tin dang cua ban da bi an sau khi moderation xem xet.'
      end,
      'report',
      v_report.id::text,
      jsonb_build_object('action', p_action),
      false, now(), now()
    );
  end if;

  return v_report;
end;
$$;

revoke all on function public.process_moderation_report(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.process_moderation_report(uuid, uuid, text, text, text)
  to service_role;

commit;
