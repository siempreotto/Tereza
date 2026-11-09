-- Tereza · migración base: extensiones, tipos, tablas, índices y disparadores.
-- Todo en timestamptz; las unidades se guardan siempre en métrico.

create extension if not exists pg_jsonschema with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.rol_miembro as enum ('admin', 'cuidador', 'limitado');
create type public.tipo_evento as enum (
  'sueno', 'toma_pecho', 'toma_biberon', 'toma_solidos', 'extraccion',
  'panal', 'medicamento', 'temperatura', 'sintoma', 'nota'
);
create type public.origen_registro as enum ('web', 'mcp');

-- Hogares ---------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 80),
  creado_en timestamptz not null default now()
);

create table public.household_settings (
  household_id uuid primary key references public.households on delete cascade,
  zona_horaria text not null default 'America/Guatemala',
  unidad_volumen text not null default 'oz' check (unidad_volumen in ('ml', 'oz')),
  unidad_peso text not null default 'lb' check (unidad_peso in ('kg', 'lb')),
  unidad_longitud text not null default 'in' check (unidad_longitud in ('cm', 'in')),
  noche_ui_modo text not null default 'auto' check (noche_ui_modo in ('auto', 'on', 'off')),
  noche_ui_desde time not null default '19:00',
  noche_ui_hasta time not null default '06:00',
  sueno_noche_desde time not null default '18:00',
  sueno_noche_hasta time not null default '05:00',
  ventanas_modo text not null default 'auto' check (ventanas_modo in ('auto', 'propias')),
  ventanas_propias int[] check (ventanas_propias is null or (array_length(ventanas_propias, 1) between 1 and 6)),
  hora_dormir time not null default '19:15',
  notificaciones jsonb not null default '{}'::jsonb,
  alarmas_activas boolean not null default true,
  editado_en timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  nombre_visible text not null check (char_length(nombre_visible) between 1 and 60),
  rol public.rol_miembro not null,
  creado_en timestamptz not null default now(),
  unique (household_id, user_id)
);
create index members_user_idx on public.members (user_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  email extensions.citext not null,
  rol public.rol_miembro not null,
  token_hash text not null unique,
  creada_por uuid references auth.users on delete set null,
  creada_en timestamptz not null default now(),
  vence_en timestamptz not null default now() + interval '7 days',
  aceptada_en timestamptz,
  aceptada_por uuid references auth.users on delete set null
);
create index invites_household_idx on public.invites (household_id);
create index invites_creada_por_idx on public.invites (creada_por);
create index invites_aceptada_por_idx on public.invites (aceptada_por);

-- Bebés -------------------------------------------------------------------------
create table public.babies (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 60),
  fecha_nacimiento date not null,
  semanas_gestacion int check (semanas_gestacion between 22 and 44),
  sexo text not null check (sexo in ('F', 'M')),
  foto_path text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create index babies_household_idx on public.babies (household_id);

-- Próxima cita: tabla aparte para que el rol limitado no la vea.
create table public.next_appointments (
  baby_id uuid primary key references public.babies on delete cascade,
  household_id uuid not null references public.households on delete cascade,
  fecha timestamptz not null,
  titulo text,
  pediatra text,
  editado_en timestamptz not null default now()
);
create index next_appointments_household_idx on public.next_appointments (household_id);

-- Validación del payload por tipo (pg_jsonschema) -------------------------------
create or replace function public.payload_valido(p_tipo public.tipo_evento, p_payload jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select extensions.jsonb_matches_schema(
    case p_tipo
      when 'sueno' then '{"type":"object","additionalProperties":false,"properties":{
        "lugar":{"enum":["cuna","brazos","carriola","auto","otro"]},
        "como_se_durmio":{"enum":["solo","arrullo","pecho","biberon"]},
        "calidad":{"enum":["buena","regular","mala"]}}}'
      when 'toma_pecho' then '{"type":"object","additionalProperties":false,"required":["lado_inicial"],"properties":{
        "lado_inicial":{"enum":["izq","der"]},
        "segundos_izq":{"type":"integer","minimum":0,"maximum":21600},
        "segundos_der":{"type":"integer","minimum":0,"maximum":21600},
        "lado_activo":{"enum":["izq","der",null]},
        "ultimo_lado":{"enum":["izq","der",null]},
        "activo_desde":{"type":["string","null"],"maxLength":40}}}'
      when 'toma_biberon' then '{"type":"object","additionalProperties":false,"required":["contenido","volumen_ml"],"properties":{
        "contenido":{"enum":["materna","formula","mixta"]},
        "volumen_ml":{"type":"number","minimum":0,"maximum":1000},
        "sobrante_ml":{"type":"number","minimum":0,"maximum":1000}}}'
      when 'toma_solidos' then '{"type":"object","additionalProperties":false,"required":["alimentos"],"properties":{
        "alimentos":{"type":"array","minItems":1,"maxItems":20,"items":{"type":"string","minLength":1,"maxLength":80}},
        "cantidad":{"type":"string","maxLength":120},
        "reaccion":{"type":"string","maxLength":280}}}'
      when 'extraccion' then '{"type":"object","additionalProperties":false,"properties":{
        "volumen_ml_izq":{"type":"number","minimum":0,"maximum":1000},
        "volumen_ml_der":{"type":"number","minimum":0,"maximum":1000}}}'
      when 'panal' then '{"type":"object","additionalProperties":false,"required":["mojado","sucio"],"properties":{
        "mojado":{"type":"boolean"},"sucio":{"type":"boolean"},
        "color":{"enum":["amarillo","verde","cafe","negro","rojo","blanco","otro",null]},
        "consistencia":{"enum":["liquida","pastosa","firme",null]}}}'
      when 'medicamento' then '{"type":"object","additionalProperties":false,"required":["medication_id","cantidad_textual"],"properties":{
        "medication_id":{"type":"string","format":"uuid"},
        "cantidad_textual":{"type":"string","minLength":1,"maxLength":120},
        "via":{"enum":["oral","topica","inhalada","nasal","otra"]}}}'
      when 'temperatura' then '{"type":"object","additionalProperties":false,"required":["valor_c"],"properties":{
        "valor_c":{"type":"number","minimum":30,"maximum":45},
        "metodo":{"enum":["axilar","rectal","frente","oido"]}}}'
      when 'sintoma' then '{"type":"object","additionalProperties":false,"required":["descripcion"],"properties":{
        "descripcion":{"type":"string","minLength":1,"maxLength":500},
        "severidad":{"enum":["leve","moderado","fuerte",null]}}}'
      when 'nota' then '{"type":"object","additionalProperties":false,"required":["texto"],"properties":{
        "texto":{"type":"string","minLength":1,"maxLength":2000}}}'
    end::json,
    p_payload
  );
$$;

-- Eventos -----------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  baby_id uuid not null references public.babies on delete cascade,
  tipo public.tipo_evento not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  notas text check (notas is null or char_length(notas) <= 1000),
  logged_by uuid not null default auth.uid() references auth.users on delete set null,
  source public.origen_registro not null default 'web',
  client_op_id uuid unique,
  version int not null default 1,
  creado_en timestamptz not null default now(),
  editado_en timestamptz,
  editado_por uuid references auth.users on delete set null,
  eliminado_en timestamptz,
  constraint events_fin_despues_de_inicio check (ended_at is null or ended_at >= started_at),
  constraint events_duracion_maxima check (ended_at is null or ended_at - started_at <= interval '24 hours'),
  constraint events_payload_valido check (public.payload_valido(tipo, payload))
);
-- Un solo temporizador activo por tipo y bebé.
create unique index events_un_timer_activo on public.events (baby_id, tipo)
  where ended_at is null and eliminado_en is null and tipo in ('sueno', 'toma_pecho', 'extraccion');
create index events_baby_inicio_idx on public.events (baby_id, started_at desc) where eliminado_en is null;
create index events_household_idx on public.events (household_id);
create index events_logged_by_idx on public.events (logged_by);
create index events_editado_por_idx on public.events (editado_por);

create table public.event_revisions (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events on delete cascade,
  household_id uuid not null references public.households on delete cascade,
  version int not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  payload jsonb not null,
  notas text,
  eliminado_en timestamptz,
  editado_por uuid references auth.users on delete set null,
  source public.origen_registro,
  creado_en timestamptz not null default now()
);
create index event_revisions_event_idx on public.event_revisions (event_id);
create index event_revisions_household_idx on public.event_revisions (household_id);
create index event_revisions_editado_por_idx on public.event_revisions (editado_por);

-- Salud -------------------------------------------------------------------------
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  baby_id uuid not null references public.babies on delete cascade,
  medido_en timestamptz not null,
  peso_g int check (peso_g between 300 and 40000),
  longitud_mm int check (longitud_mm between 200 and 1300),
  perimetro_cefalico_mm int check (perimetro_cefalico_mm between 200 and 600),
  origen text not null check (origen in ('nacimiento', 'casa', 'consulta')),
  notas text check (notas is null or char_length(notas) <= 500),
  logged_by uuid not null default auth.uid() references auth.users on delete set null,
  source public.origen_registro not null default 'web',
  creado_en timestamptz not null default now(),
  check (coalesce(peso_g, longitud_mm, perimetro_cefalico_mm) is not null)
);
create index measurements_baby_idx on public.measurements (baby_id, medido_en);
create index measurements_household_idx on public.measurements (household_id);
create index measurements_logged_by_idx on public.measurements (logged_by);

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  baby_id uuid not null references public.babies on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  indicacion_textual text not null check (char_length(indicacion_textual) between 1 and 500),
  prescrito_por text check (prescrito_por is null or char_length(prescrito_por) <= 120),
  inicio date not null default current_date,
  fin date,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create index medications_baby_idx on public.medications (baby_id);
create index medications_household_idx on public.medications (household_id);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  baby_id uuid not null references public.babies on delete cascade,
  fecha timestamptz not null,
  pediatra text,
  motivo text,
  notas text check (notas is null or char_length(notas) <= 4000),
  vacunas jsonb not null default '[]'::jsonb check (jsonb_typeof(vacunas) = 'array'),
  adjuntos text[] not null default '{}',
  creado_en timestamptz not null default now()
);
create index visits_baby_idx on public.visits (baby_id, fecha desc);
create index visits_household_idx on public.visits (household_id);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  baby_id uuid not null references public.babies on delete cascade,
  texto text not null check (char_length(texto) between 1 and 1000),
  creada_por uuid not null default auth.uid() references auth.users on delete set null,
  source public.origen_registro not null default 'web',
  creada_en timestamptz not null default now(),
  resuelta_en_visita_id uuid references public.visits on delete set null
);
create index questions_baby_idx on public.questions (baby_id);
create index questions_household_idx on public.questions (household_id);
create index questions_creada_por_idx on public.questions (creada_por);
create index questions_visita_idx on public.questions (resuelta_en_visita_id);

-- Auditoría de acciones MCP (sin argumentos ni datos de salud) -------------------
create table public.mcp_audit (
  id bigint generated always as identity primary key,
  household_id uuid references public.households on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  client_id text not null check (char_length(client_id) <= 200),
  herramienta text not null check (char_length(herramienta) <= 60),
  resultado text not null check (resultado in ('ok', 'error', 'denegado')),
  codigo_error text check (codigo_error is null or char_length(codigo_error) <= 40),
  creado_en timestamptz not null default now()
);
create index mcp_audit_household_idx on public.mcp_audit (household_id, creado_en desc);
create index mcp_audit_user_idx on public.mcp_audit (user_id);

-- Disparadores ------------------------------------------------------------------
-- La zona horaria debe existir en Postgres.
create or replace function private.validar_zona_horaria()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.zona_horaria) then
    raise exception 'Zona horaria desconocida: %', new.zona_horaria using errcode = '22023';
  end if;
  new.editado_en := now();
  return new;
end $$;
create trigger household_settings_zona before insert or update on public.household_settings
  for each row execute function private.validar_zona_horaria();

-- household_id de cada registro sale del bebé (no se confía en el cliente).
create or replace function private.household_desde_bebe()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select b.household_id into new.household_id from public.babies b where b.id = new.baby_id;
  if new.household_id is null then
    raise exception 'Bebé no encontrado' using errcode = '23503';
  end if;
  return new;
end $$;
create trigger events_household before insert or update of baby_id on public.events
  for each row execute function private.household_desde_bebe();
create trigger measurements_household before insert or update of baby_id on public.measurements
  for each row execute function private.household_desde_bebe();
create trigger medications_household before insert or update of baby_id on public.medications
  for each row execute function private.household_desde_bebe();
create trigger visits_household before insert or update of baby_id on public.visits
  for each row execute function private.household_desde_bebe();
create trigger questions_household before insert or update of baby_id on public.questions
  for each row execute function private.household_desde_bebe();
create trigger next_appointments_household before insert or update of baby_id on public.next_appointments
  for each row execute function private.household_desde_bebe();

-- Edición de eventos: versión, quién y cuándo; guarda la versión anterior; protege autoría.
create or replace function private.eventos_al_editar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.logged_by := old.logged_by;
  new.source := old.source;
  new.creado_en := old.creado_en;
  new.client_op_id := old.client_op_id;
  new.version := old.version + 1;
  new.editado_en := now();
  new.editado_por := auth.uid();
  insert into public.event_revisions (event_id, household_id, version, started_at, ended_at, payload, notas, eliminado_en, editado_por, source)
  values (old.id, old.household_id, old.version, old.started_at, old.ended_at, old.payload, old.notas, old.eliminado_en, coalesce(old.editado_por, old.logged_by), old.source);
  return new;
end $$;
create trigger events_al_editar before update on public.events
  for each row execute function private.eventos_al_editar();
