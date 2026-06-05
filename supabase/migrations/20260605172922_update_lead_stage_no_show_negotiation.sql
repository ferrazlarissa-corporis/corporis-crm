do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'crm'
      and t.typname = 'lead_stage'
      and e.enumlabel = 'no_show'
  ) then
    alter type crm.lead_stage add value 'no_show' after 'avaliacao_agendada';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'crm'
      and t.typname = 'lead_stage'
      and e.enumlabel = 'compareceu'
  ) and not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'crm'
      and t.typname = 'lead_stage'
      and e.enumlabel = 'negociacao'
  ) then
    alter type crm.lead_stage rename value 'compareceu' to 'negociacao';
  end if;
end $$;
