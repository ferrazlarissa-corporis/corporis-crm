-- Corporis OS — Fase 6: config da ponte de posting OS → Corporis Finance.
-- Mapa pilar → código do chart_of_accounts no Finance. Ver CLAUDE-OS §4 / data-model §6.

create table financeiro.finance_map (
  pilar core.pilar primary key,
  chart_code text not null,
  created_at timestamptz not null default now()
);

insert into financeiro.finance_map(pilar, chart_code) values
  ('pilates', '1.01'),
  ('pilates_gestante', '1.01'),
  ('fisio_pelvica', '1.03')
on conflict (pilar) do nothing;

alter table financeiro.finance_map enable row level security;
create policy "staff read finance_map" on financeiro.finance_map for select to authenticated
using (private.is_active_staff(auth.uid()));

grant select on financeiro.finance_map to authenticated, service_role;
