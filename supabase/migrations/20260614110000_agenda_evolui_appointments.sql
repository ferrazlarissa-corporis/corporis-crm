-- Corporis OS — Fase 1: evolui crm.appointments (NÃO recria).
-- Adiciona vínculo à espinha (pessoa_id), serviço/sala/matrícula e categoria.
-- Todas as colunas são nullable ou têm default → o INSERT atual do agente Clara
-- (src/lib/ai/tools.ts > agendar_avaliacao) continua válido sem alteração obrigatória.

create type agenda.categoria as enum ('avaliacao', 'sessao', 'experimental');

alter table crm.appointments
  add column if not exists pessoa_id    uuid references core.pessoa(id),
  add column if not exists servico_id   uuid references core.servico(id),
  add column if not exists sala_id      uuid references core.sala(id),
  add column if not exists matricula_id uuid,                              -- FK adicionada em vendas_init
  add column if not exists categoria    agenda.categoria not null default 'avaliacao',
  add column if not exists recorrencia  jsonb;

-- Backfill: liga cada agendamento existente à pessoa do seu lead.
update crm.appointments a
set pessoa_id = l.pessoa_id
from crm.leads l
where a.lead_id = l.id
  and a.pessoa_id is null;

create index if not exists appointments_pessoa_idx on crm.appointments(pessoa_id);
create index if not exists appointments_sala_inicio_idx on crm.appointments(sala_id, inicio);
