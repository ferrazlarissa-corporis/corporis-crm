-- Corporis OS — Fase 5 (agenda completa): permite agendamento de cliente sem lead.
-- Sessões de alunas/pacientes vinculam-se a core.pessoa (pessoa_id), não a um lead.
-- A avaliação inicial via Clara continua preenchendo lead_id normalmente.

alter table crm.appointments alter column lead_id drop not null;

-- Índice para a regra de capacidade por slot (mesmo início + sala + serviço).
create index if not exists appointments_slot_capacidade_idx
  on crm.appointments (inicio, sala_id, servico_id)
  where status in ('agendado', 'confirmado');
