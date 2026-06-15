-- Corporis OS — Fase 0: fundação dos schemas do OS.
-- Cria os schemas por módulo e o helper de updated_at compartilhado.
-- RLS das tabelas reutiliza private.is_active_staff(auth.uid()) (já existente).

create schema if not exists core;
create schema if not exists agenda;
create schema if not exists vendas;
create schema if not exists financeiro;
create schema if not exists clinico;

-- Helper de updated_at compartilhado pelos schemas novos (espelha crm.set_updated_at()).
create or replace function core.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

grant usage on schema core, agenda, vendas, financeiro, clinico to authenticated, service_role;
grant execute on function core.set_updated_at() to authenticated, service_role;
