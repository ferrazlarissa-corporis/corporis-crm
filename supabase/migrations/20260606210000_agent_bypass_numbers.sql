-- Números que sempre recebem resposta da IA, independente do filtro de contatos salvos.
-- Útil para testes e para staff que quer testar o agente pelo próprio WhatsApp.

alter table crm.agent_config
  add column if not exists numeros_bypass jsonb not null default '[]'::jsonb;

comment on column crm.agent_config.numeros_bypass is
  'Array de números E.164 (ex.: "+5547991719570") que ignoram o filtro apenas_desconhecidos.';
