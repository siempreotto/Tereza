-- Tereza · Hito 6: conexiones de Claude revocadas por la persona (el MCP rechaza tokens de ese client_id).
create table public.mcp_revocados (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  client_id text not null check (char_length(client_id) <= 200),
  revocado_en timestamptz not null default now(),
  primary key (user_id, client_id)
);
alter table public.mcp_revocados enable row level security;
create policy mcp_revocados_propios on public.mcp_revocados for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
