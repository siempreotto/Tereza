-- Tereza · RLS en todas las tablas por household_id, con funciones de apoyo security definer.

create or replace function private.is_member(h uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.household_id = h and m.user_id = (select auth.uid()));
$$;

create or replace function private.member_role(h uuid)
returns public.rol_miembro language sql stable security definer set search_path = '' as $$
  select m.rol from public.members m where m.household_id = h and m.user_id = (select auth.uid());
$$;

-- Admin o cuidador: ve y registra salud e historial completo.
create or replace function private.puede_salud(h uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.member_role(h) in ('admin', 'cuidador'), false);
$$;

create or replace function private.es_admin(h uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.member_role(h) = 'admin', false);
$$;

-- Medianoche de hoy en la zona horaria del hogar.
create or replace function private.hoy_inicio(h uuid)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select (date_trunc('day', now() at time zone s.zona_horaria)) at time zone s.zona_horaria
  from public.household_settings s where s.household_id = h;
$$;

-- Tipos que el rol limitado puede registrar y ver.
create or replace function private.tipo_limitado(t public.tipo_evento)
returns boolean language sql immutable set search_path = '' as $$
  select t in ('sueno', 'toma_pecho', 'toma_biberon', 'toma_solidos', 'extraccion', 'panal');
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

alter table public.households enable row level security;
alter table public.household_settings enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.babies enable row level security;
alter table public.next_appointments enable row level security;
alter table public.events enable row level security;
alter table public.event_revisions enable row level security;
alter table public.measurements enable row level security;
alter table public.medications enable row level security;
alter table public.visits enable row level security;
alter table public.questions enable row level security;
alter table public.mcp_audit enable row level security;

-- Hogar y ajustes: cualquier miembro lee; solo admin cambia.
create policy households_select on public.households for select to authenticated using (private.is_member(id));
create policy households_update on public.households for update to authenticated using (private.es_admin(id)) with check (private.es_admin(id));

create policy settings_select on public.household_settings for select to authenticated using (private.is_member(household_id));
create policy settings_update on public.household_settings for update to authenticated using (private.es_admin(household_id)) with check (private.es_admin(household_id));

-- Miembros: se ven entre sí; solo admin cambia roles o quita acceso. Altas por RPC.
create policy members_select on public.members for select to authenticated using (private.is_member(household_id));
create policy members_update on public.members for update to authenticated using (private.es_admin(household_id)) with check (private.es_admin(household_id));
create policy members_delete on public.members for delete to authenticated using (private.es_admin(household_id) and user_id <> (select auth.uid()));

-- Invitaciones: solo admin (se crean por RPC, que guarda el hash del token).
create policy invites_select on public.invites for select to authenticated using (private.es_admin(household_id));
create policy invites_delete on public.invites for delete to authenticated using (private.es_admin(household_id));

-- Bebés: todos los miembros ven nombre y edad; solo admin crea o edita.
create policy babies_select on public.babies for select to authenticated using (private.is_member(household_id));
create policy babies_insert on public.babies for insert to authenticated with check (private.es_admin(household_id));
create policy babies_update on public.babies for update to authenticated using (private.es_admin(household_id)) with check (private.es_admin(household_id));

-- Eventos.
create policy events_select on public.events for select to authenticated using (
  private.puede_salud(household_id)
  or (private.member_role(household_id) = 'limitado' and private.tipo_limitado(tipo)
      and (started_at >= private.hoy_inicio(household_id) or ended_at is null))
);
create policy events_insert on public.events for insert to authenticated with check (
  logged_by = (select auth.uid())
  and (private.puede_salud(household_id)
       or (private.member_role(household_id) = 'limitado' and private.tipo_limitado(tipo)))
);
create policy events_update on public.events for update to authenticated
  using (
    private.puede_salud(household_id)
    or (private.member_role(household_id) = 'limitado' and private.tipo_limitado(tipo)
        and (started_at >= private.hoy_inicio(household_id) or ended_at is null))
  )
  with check (
    private.puede_salud(household_id)
    or (private.member_role(household_id) = 'limitado' and private.tipo_limitado(tipo))
  );
-- Sin delete: el borrado es lógico (eliminado_en) para poder deshacer.

create policy event_revisions_select on public.event_revisions for select to authenticated using (private.puede_salud(household_id));

-- Salud: solo admin y cuidador.
create policy next_appointments_all on public.next_appointments for all to authenticated using (private.puede_salud(household_id)) with check (private.puede_salud(household_id));
create policy measurements_all on public.measurements for all to authenticated using (private.puede_salud(household_id)) with check (private.puede_salud(household_id));
create policy medications_all on public.medications for all to authenticated using (private.puede_salud(household_id)) with check (private.puede_salud(household_id));
create policy visits_all on public.visits for all to authenticated using (private.puede_salud(household_id)) with check (private.puede_salud(household_id));
create policy questions_all on public.questions for all to authenticated using (private.puede_salud(household_id)) with check (private.puede_salud(household_id));

-- Auditoría MCP: cada quien inserta lo suyo; el admin ve la de su hogar y cada quien la propia.
create policy mcp_audit_insert on public.mcp_audit for insert to authenticated with check (
  user_id = (select auth.uid()) and (household_id is null or private.is_member(household_id))
);
create policy mcp_audit_select on public.mcp_audit for select to authenticated using (
  user_id = (select auth.uid()) or private.es_admin(household_id)
);

-- Anónimos: nada.
revoke all on all tables in schema public from anon;
