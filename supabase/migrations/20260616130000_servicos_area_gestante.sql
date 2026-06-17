-- Corporis OS — Serviços: área × gestante.
-- `pilar` deixa de embutir gestante e passa a significar ÁREA (balde financeiro):
-- (pilates, pilates_gestante, fisio_pelvica) → (pilates, fisio_pelvica, acupuntura).
-- gestante vira flag booleano (em core.servico e crm.leads). Realinha a taxonomia do CRM/IA
-- (lead_interest, appointment_type) e semeia os serviços + o plano combo "Mamãe ativa".
-- Transacional: erro em qualquer passo reverte tudo.

-- ─── 0. Captura gestante a partir do interesse ANTES de mexer no enum ────────────────────
alter table crm.leads add column if not exists gestante boolean not null default false;
update crm.leads set gestante = true where interesse::text = 'pilates_gestante';

-- ─── 1. Enum core.pilar (área) ──────────────────────────────────────────────────────────
-- Remove a linha duplicada de finance_map antes do swap (pilates_gestante dividia 1.01).
delete from financeiro.finance_map where pilar::text = 'pilates_gestante';

alter type core.pilar rename to pilar_old;
create type core.pilar as enum ('pilates', 'fisio_pelvica', 'acupuntura');

alter table core.pessoa
  alter column pilar_principal type core.pilar
  using (case pilar_principal::text when 'pilates_gestante' then 'pilates' else pilar_principal::text end)::core.pilar;
alter table core.servico
  alter column pilar type core.pilar
  using (case pilar::text when 'pilates_gestante' then 'pilates' else pilar::text end)::core.pilar;
alter table vendas.plano
  alter column pilar type core.pilar
  using (case pilar::text when 'pilates_gestante' then 'pilates' else pilar::text end)::core.pilar;
alter table financeiro.finance_map
  alter column pilar type core.pilar
  using (case pilar::text when 'pilates_gestante' then 'pilates' else pilar::text end)::core.pilar;

drop type core.pilar_old;

-- jsonb arrays (guardam strings, não são enum): troca pilates_gestante→pilates e deduplica.
update core.sala s set pilares = sub.arr from (
  select sa.id, coalesce(jsonb_agg(distinct (case when x = 'pilates_gestante' then 'pilates' else x end)), '[]'::jsonb) as arr
  from core.sala sa, jsonb_array_elements_text(sa.pilares) as x group by sa.id
) sub where s.id = sub.id and s.pilares ? 'pilates_gestante';

update core.profissional p set pilares = sub.arr from (
  select pr.id, coalesce(jsonb_agg(distinct (case when x = 'pilates_gestante' then 'pilates' else x end)), '[]'::jsonb) as arr
  from core.profissional pr, jsonb_array_elements_text(pr.pilares) as x group by pr.id
) sub where p.id = sub.id and p.pilares ? 'pilates_gestante';

update vendas.contrato_modelo c set pilares = sub.arr from (
  select cm.id, coalesce(jsonb_agg(distinct (case when x = 'pilates_gestante' then 'pilates' else x end)), '[]'::jsonb) as arr
  from vendas.contrato_modelo cm, jsonb_array_elements_text(cm.pilares) as x group by cm.id
) sub where c.id = sub.id and c.pilares ? 'pilates_gestante';

-- ─── 2. Flag gestante no serviço ────────────────────────────────────────────────────────
alter table core.servico add column if not exists gestante boolean not null default false;
update core.servico set gestante = true where nome ilike '%gestante%' or nome ilike '%gestar%';

-- ─── 3. finance_map: acupuntura (usa fallback 1.02; trocar p/ código real depois) ────────
insert into financeiro.finance_map(pilar, chart_code) values ('acupuntura', '1.02')
on conflict (pilar) do nothing;

-- ─── 4. crm.lead_interest: realinha p/ áreas ────────────────────────────────────────────
alter table crm.leads alter column interesse drop default;
alter type crm.lead_interest rename to lead_interest_old;
create type crm.lead_interest as enum ('pilates', 'fisio_pelvica', 'acupuntura', 'indefinido');
alter table crm.leads
  alter column interesse type crm.lead_interest
  using (case interesse::text when 'pilates_gestante' then 'pilates' else interesse::text end)::crm.lead_interest;
alter table crm.leads alter column interesse set default 'indefinido';
drop type crm.lead_interest_old;

-- ─── 5. crm.appointment_type: gestante deixa de ser tipo (vira flag); + acupuntura ──────
alter type crm.appointment_type rename to appointment_type_old;
create type crm.appointment_type as enum ('avaliacao_pilates', 'avaliacao_fisio_pelvica', 'avaliacao_acupuntura');
alter table crm.appointments
  alter column tipo type crm.appointment_type
  using (case tipo::text when 'avaliacao_gestante' then 'avaliacao_pilates' else tipo::text end)::crm.appointment_type;
drop type crm.appointment_type_old;

-- ─── 6. Seeds: 5 serviços + plano combo "Mamãe ativa" (idempotentes por nome) ───────────
insert into core.servico (nome, pilar, gestante, duracao_min, capacidade_slot, cor_token)
select s.nome, s.pilar::core.pilar, s.gestante, s.duracao_min, s.capacidade_slot, s.cor_token
from (values
  ('Pilates',                 'pilates',       false, 50, 4, 'alaranjado'),
  ('Gestar em movimento',     'pilates',       true,  50, 4, 'tangerina'),
  ('Fisio pélvica',           'fisio_pelvica', false, 50, 1, 'verde'),
  ('Fisio pélvica gestante',  'fisio_pelvica', true,  50, 1, 'verde'),
  ('Acupuntura',              'acupuntura',    false, 50, 1, 'bege')
) as s(nome, pilar, gestante, duracao_min, capacidade_slot, cor_token)
where not exists (select 1 from core.servico cs where cs.nome = s.nome);

insert into vendas.plano (nome, tipo, valor, periodicidade, pilar, servicos)
select 'Mamãe ativa', 'personalizado'::vendas.plano_tipo, 0, 'mensal'::vendas.periodicidade,
  'fisio_pelvica'::core.pilar,
  (select coalesce(jsonb_agg(cs.id), '[]'::jsonb) from core.servico cs
    where cs.nome in ('Gestar em movimento', 'Fisio pélvica gestante'))
where not exists (select 1 from vendas.plano p where p.nome = 'Mamãe ativa');
