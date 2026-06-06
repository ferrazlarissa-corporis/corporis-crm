-- Filtro: IA só responde contatos não salvos na agenda do WhatsApp.
-- Ativo por padrão — comportamento mais conservador para o MVP.

alter table crm.agent_config
  add column if not exists apenas_desconhecidos boolean not null default true;

comment on column crm.agent_config.apenas_desconhecidos is
  'Se true, o agente só responde mensagens de contatos NÃO salvos na agenda da instância WhatsApp.';
