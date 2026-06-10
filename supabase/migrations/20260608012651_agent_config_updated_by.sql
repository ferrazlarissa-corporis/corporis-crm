-- Track who last edited the agent configuration.

alter table crm.agent_config
  add column if not exists updated_by uuid references crm.profiles(id) on delete set null;

comment on column crm.agent_config.updated_by is
  'Profile that last saved the agent configuration.';
