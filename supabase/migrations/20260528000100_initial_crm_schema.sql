create schema if not exists crm;

create type crm.lead_stage as enum (
  'novo',
  'qualificacao',
  'avaliacao_agendada',
  'compareceu',
  'convertido',
  'perdido'
);

create type crm.lead_origin as enum (
  'whatsapp',
  'instagram',
  'indicacao',
  'google',
  'outro'
);

create type crm.lead_interest as enum (
  'pilates',
  'pilates_gestante',
  'fisio_pelvica',
  'indefinido'
);

create type crm.conversation_mode as enum ('ia', 'humano');
create type crm.conversation_status as enum ('aberta', 'aguardando', 'resolvida');
create type crm.message_direction as enum ('entrada', 'saida');
create type crm.message_author as enum ('lead', 'ia', 'humano', 'sistema');
create type crm.message_type as enum ('texto', 'imagem', 'audio', 'documento', 'template');
create type crm.appointment_type as enum (
  'avaliacao_pilates',
  'avaliacao_fisio_pelvica',
  'avaliacao_gestante'
);
create type crm.appointment_status as enum (
  'agendado',
  'confirmado',
  'compareceu',
  'faltou',
  'cancelado'
);
create type crm.activity_type as enum (
  'mensagem',
  'mudanca_estagio',
  'agendamento',
  'nota',
  'campanha',
  'handoff',
  'sistema'
);
create type crm.campaign_status as enum (
  'rascunho',
  'agendada',
  'enviando',
  'concluida'
);
create type crm.template_category as enum (
  'lembrete',
  'confirmacao',
  'reativacao',
  'boas_vindas'
);

create or replace function crm.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table crm.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  avatar_url text,
  role text not null default 'staff',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (
    role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

create table crm.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null unique,
  email text,
  estagio crm.lead_stage not null default 'novo',
  origem crm.lead_origin not null default 'whatsapp',
  interesse crm.lead_interest not null default 'indefinido',
  motivo_perda text,
  score_qualificacao integer,
  responsavel_id uuid references crm.profiles(id) on delete set null,
  ultima_interacao_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_score_check check (
    score_qualificacao is null or score_qualificacao between 0 and 100
  ),
  constraint leads_motivo_perda_check check (
    estagio = 'perdido' or motivo_perda is null
  )
);

create table crm.conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm.leads(id) on delete cascade,
  evolution_chat_id text not null unique,
  modo crm.conversation_mode not null default 'ia',
  status crm.conversation_status not null default 'aberta',
  nao_lida boolean not null default false,
  janela_24h_expira_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crm.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references crm.conversations(id) on delete cascade,
  direcao crm.message_direction not null,
  autor crm.message_author not null,
  conteudo text not null,
  tipo crm.message_type not null default 'texto',
  media_url text,
  evolution_message_id text unique,
  entregue_at timestamptz,
  lida_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crm.appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm.leads(id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz not null,
  tipo crm.appointment_type not null,
  status crm.appointment_status not null default 'agendado',
  profissional_id uuid references crm.profiles(id) on delete set null,
  observacoes text,
  lembrete_enviado_at timestamptz,
  confirmacao_enviada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_range_check check (fim > inicio)
);

create table crm.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm.leads(id) on delete cascade,
  tipo crm.activity_type not null,
  descricao text not null,
  meta jsonb not null default '{}'::jsonb,
  autor_id uuid references crm.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crm.message_templates (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria crm.template_category not null,
  conteudo text not null,
  aprovado_whatsapp boolean not null default false,
  whatsapp_template_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crm.campaigns (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  segmento jsonb not null default '{}'::jsonb,
  template_id uuid references crm.message_templates(id) on delete restrict,
  status crm.campaign_status not null default 'rascunho',
  agendada_para timestamptz,
  total_alvos integer not null default 0,
  total_enviados integer not null default 0,
  total_respostas integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crm.agent_config (
  id uuid primary key default gen_random_uuid(),
  persona_prompt text not null,
  ativo boolean not null default true,
  horario_atendimento jsonb not null default '{}'::jsonb,
  mensagem_fora_horario text not null default '',
  faq jsonb not null default '[]'::jsonb,
  regras_handoff jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index agent_config_singleton on crm.agent_config ((true));
create index leads_estagio_idx on crm.leads (estagio) where archived_at is null;
create index leads_ultima_interacao_idx on crm.leads (ultima_interacao_at desc);
create index conversations_lead_id_idx on crm.conversations (lead_id);
create index messages_conversation_created_idx on crm.messages (conversation_id, created_at);
create index appointments_inicio_idx on crm.appointments (inicio);
create index activities_lead_created_idx on crm.activities (lead_id, created_at desc);

create trigger set_profiles_updated_at before update on crm.profiles
for each row execute function crm.set_updated_at();
create trigger set_leads_updated_at before update on crm.leads
for each row execute function crm.set_updated_at();
create trigger set_conversations_updated_at before update on crm.conversations
for each row execute function crm.set_updated_at();
create trigger set_messages_updated_at before update on crm.messages
for each row execute function crm.set_updated_at();
create trigger set_appointments_updated_at before update on crm.appointments
for each row execute function crm.set_updated_at();
create trigger set_activities_updated_at before update on crm.activities
for each row execute function crm.set_updated_at();
create trigger set_message_templates_updated_at before update on crm.message_templates
for each row execute function crm.set_updated_at();
create trigger set_campaigns_updated_at before update on crm.campaigns
for each row execute function crm.set_updated_at();
create trigger set_agent_config_updated_at before update on crm.agent_config
for each row execute function crm.set_updated_at();

alter table crm.profiles enable row level security;
alter table crm.leads enable row level security;
alter table crm.conversations enable row level security;
alter table crm.messages enable row level security;
alter table crm.appointments enable row level security;
alter table crm.activities enable row level security;
alter table crm.message_templates enable row level security;
alter table crm.campaigns enable row level security;
alter table crm.agent_config enable row level security;

create policy "profiles read own active profile"
on crm.profiles for select
to authenticated
using (id = auth.uid() and ativo = true);

create policy "profiles update own active profile"
on crm.profiles for update
to authenticated
using (id = auth.uid() and ativo = true)
with check (id = auth.uid() and ativo = true);

create policy "profiles insert own profile"
on crm.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "staff read leads"
on crm.leads for select
to authenticated
using (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

create policy "staff write leads"
on crm.leads for all
to authenticated
using (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
)
with check (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

create policy "staff manage conversations"
on crm.conversations for all
to authenticated
using (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
)
with check (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

create policy "staff manage messages"
on crm.messages for all
to authenticated
using (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
)
with check (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

create policy "staff manage appointments"
on crm.appointments for all
to authenticated
using (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
)
with check (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

create policy "staff manage activities"
on crm.activities for all
to authenticated
using (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
)
with check (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

create policy "staff read templates"
on crm.message_templates for select
to authenticated
using (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

create policy "staff write templates"
on crm.message_templates for all
to authenticated
using (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
)
with check (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

create policy "staff manage campaigns"
on crm.campaigns for all
to authenticated
using (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
)
with check (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

create policy "staff read agent config"
on crm.agent_config for select
to authenticated
using (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

create policy "staff write agent config"
on crm.agent_config for all
to authenticated
using (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
)
with check (
  exists (
    select 1 from crm.profiles p
    where p.id = auth.uid()
      and p.ativo = true
      and p.role in ('staff', 'recepcao', 'profissional', 'gestao')
  )
);

grant usage on schema crm to authenticated, service_role;
grant all on all tables in schema crm to authenticated, service_role;
grant all on all routines in schema crm to authenticated, service_role;
