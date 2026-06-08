-- Add handoff notification fields to agent_config
ALTER TABLE crm.agent_config
  ADD COLUMN IF NOT EXISTS mensagem_handoff_agendamento text,
  ADD COLUMN IF NOT EXISTS notificacao_handoff jsonb;
