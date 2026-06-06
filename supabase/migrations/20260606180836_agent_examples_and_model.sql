-- Humaniza o agente (Clara): exemplos de conversa editáveis (few-shot)
-- e seleção de modelo/provedor de IA pela tela de configuração.

alter table crm.agent_config
  add column if not exists exemplos_conversa jsonb not null default '[]'::jsonb,
  add column if not exists model_provider text not null default 'anthropic',
  add column if not exists model_id text not null default 'claude-sonnet-4-6';

comment on column crm.agent_config.exemplos_conversa is
  'Few-shot: array de { id, titulo, dialogo: [{ autor: lead|clara, texto }] } usado para imitar o tom da Larissa.';
comment on column crm.agent_config.model_provider is
  'Provedor do modelo de IA do agente: anthropic | openai.';
comment on column crm.agent_config.model_id is
  'ID do modelo de IA usado pelo agente (ex.: claude-sonnet-4-6).';
