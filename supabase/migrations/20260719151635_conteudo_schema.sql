-- Corporis Conteúdo — M1: schema completo do módulo (§4 do app/conteúdo/CLAUDE_1.md).
-- RLS reaproveita private.is_active_staff(auth.uid()), mesmo padrão do resto do OS.

create type conteudo.ideia_origem as enum ('manual', 'import', 'sugestao');
create type conteudo.ideia_status as enum ('nova', 'selecionada', 'virou_post', 'descartada');
create type conteudo.referencia_origem as enum ('manual', 'descoberta');
-- 'citacao' no lugar de 'prova_social': nome real usado nos mockups (Editor de post.html TEMPLATES).
create type conteudo.tipo_template as enum ('capa', 'conteudo', 'citacao', 'cta');
create type conteudo.formato_post as enum ('carrossel', 'estatico');
create type conteudo.status_post as enum (
  'rascunho', 'briefing', 'gerando', 'previa', 'em_aprovacao',
  'aprovado', 'reprovado', 'agendado', 'publicado', 'erro', 'arquivado'
);
create type conteudo.provedor_geracao as enum ('gemini', 'openai');
create type conteudo.status_geracao as enum ('fila', 'processando', 'pronto', 'erro');
create type conteudo.resultado_conformidade as enum ('ok', 'alerta', 'bloqueio');
create type conteudo.status_slot as enum ('vazio', 'pendente', 'aprovado', 'publicado');

create table conteudo.pilar_editorial (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  cor_token text not null,             -- nome do token da paleta, ex: 'pillar-diastase'
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conteudo.template_slide (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  tipo conteudo.tipo_template not null,
  layout_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conteudo.ideia (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  angulo text,
  pilar_id uuid references conteudo.pilar_editorial(id) on delete set null,
  publico_alvo text,
  origem conteudo.ideia_origem not null default 'manual',
  status conteudo.ideia_status not null default 'nova',
  notas text,
  created_by uuid references crm.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conteudo.referencia (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  fonte text,
  print_url text,
  pilar_id uuid references conteudo.pilar_editorial(id) on delete set null,
  por_que_funciona text,
  origem conteudo.referencia_origem not null default 'manual',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conteudo.post (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  formato conteudo.formato_post not null,
  pilar_id uuid references conteudo.pilar_editorial(id) on delete set null,
  ideia_id uuid references conteudo.ideia(id) on delete set null,
  briefing text,
  legenda text,
  hashtags text[] not null default '{}',
  status conteudo.status_post not null default 'rascunho',
  aprovado_por uuid references crm.profiles(id) on delete set null,
  agendado_para timestamptz,
  publicado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conteudo.post_slide (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references conteudo.post(id) on delete cascade,
  ordem int not null,
  template_id uuid references conteudo.template_slide(id) on delete set null,
  texto_titulo text,
  texto_corpo text,
  fundo_geracao_id uuid,               -- FK pra conteudo.geracao_imagem adicionada abaixo (dependência circular)
  imagem_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, ordem)
);

create table conteudo.geracao_imagem (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references conteudo.post(id) on delete cascade,
  slide_id uuid references conteudo.post_slide(id) on delete cascade,
  prompt text not null,
  provedor conteudo.provedor_geracao not null,
  modelo text,
  versao int not null default 1,
  status conteudo.status_geracao not null default 'fila',
  imagem_url text,
  custo numeric(10, 4),
  created_at timestamptz not null default now()
);

alter table conteudo.post_slide
  add constraint post_slide_fundo_geracao_id_fkey
  foreign key (fundo_geracao_id) references conteudo.geracao_imagem(id) on delete set null;

create table conteudo.checklist_conformidade (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references conteudo.post(id) on delete cascade,
  regra text not null,
  resultado conteudo.resultado_conformidade not null,
  detalhe text,
  consentimento_lgpd_ref text,
  created_at timestamptz not null default now()
);

create table conteudo.slot_calendario (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  horario time,
  pilar_sugerido uuid references conteudo.pilar_editorial(id) on delete set null,
  post_id uuid references conteudo.post(id) on delete set null,
  status conteudo.status_slot not null default 'vazio',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conteudo.publicacao (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references conteudo.post(id) on delete cascade,
  ig_media_id text,
  publicado_em timestamptz,
  canal text not null default 'instagram',
  created_at timestamptz not null default now()
);

create table conteudo.metrica (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references conteudo.post(id) on delete cascade,
  data date not null,
  alcance int,
  impressoes int,
  curtidas int,
  saves int,
  comentarios int,
  visitas_perfil int,
  cliques_link int,
  created_at timestamptz not null default now(),
  unique (post_id, data)
);

create table conteudo.cta_lead (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references conteudo.post(id) on delete cascade,
  short_code text not null unique,
  cliques int not null default 0,
  pessoa_id uuid references core.pessoa(id) on delete set null,
  virou_agendamento boolean not null default false,
  created_at timestamptz not null default now()
);

create index ideia_pilar_idx on conteudo.ideia(pilar_id);
create index referencia_pilar_idx on conteudo.referencia(pilar_id);
create index post_pilar_idx on conteudo.post(pilar_id);
create index post_status_idx on conteudo.post(status);
create index post_slide_post_idx on conteudo.post_slide(post_id);
create index geracao_imagem_post_idx on conteudo.geracao_imagem(post_id);
create index geracao_imagem_slide_idx on conteudo.geracao_imagem(slide_id);
create index checklist_conformidade_post_idx on conteudo.checklist_conformidade(post_id);
create index slot_calendario_data_idx on conteudo.slot_calendario(data);
create index publicacao_post_idx on conteudo.publicacao(post_id);
create index metrica_post_idx on conteudo.metrica(post_id);
create index cta_lead_post_idx on conteudo.cta_lead(post_id);
create index cta_lead_pessoa_idx on conteudo.cta_lead(pessoa_id);

create trigger set_pilar_editorial_updated_at before update on conteudo.pilar_editorial
for each row execute function core.set_updated_at();
create trigger set_template_slide_updated_at before update on conteudo.template_slide
for each row execute function core.set_updated_at();
create trigger set_ideia_updated_at before update on conteudo.ideia
for each row execute function core.set_updated_at();
create trigger set_referencia_updated_at before update on conteudo.referencia
for each row execute function core.set_updated_at();
create trigger set_post_updated_at before update on conteudo.post
for each row execute function core.set_updated_at();
create trigger set_post_slide_updated_at before update on conteudo.post_slide
for each row execute function core.set_updated_at();
create trigger set_slot_calendario_updated_at before update on conteudo.slot_calendario
for each row execute function core.set_updated_at();

alter table conteudo.pilar_editorial        enable row level security;
alter table conteudo.template_slide         enable row level security;
alter table conteudo.ideia                  enable row level security;
alter table conteudo.referencia             enable row level security;
alter table conteudo.post                   enable row level security;
alter table conteudo.post_slide             enable row level security;
alter table conteudo.geracao_imagem         enable row level security;
alter table conteudo.checklist_conformidade enable row level security;
alter table conteudo.slot_calendario        enable row level security;
alter table conteudo.publicacao             enable row level security;
alter table conteudo.metrica                enable row level security;
alter table conteudo.cta_lead               enable row level security;

create policy "staff manage pilar_editorial" on conteudo.pilar_editorial for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage template_slide" on conteudo.template_slide for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage ideia" on conteudo.ideia for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage referencia" on conteudo.referencia for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage post" on conteudo.post for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage post_slide" on conteudo.post_slide for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage geracao_imagem" on conteudo.geracao_imagem for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage checklist_conformidade" on conteudo.checklist_conformidade for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage slot_calendario" on conteudo.slot_calendario for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage publicacao" on conteudo.publicacao for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage metrica" on conteudo.metrica for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));
create policy "staff manage cta_lead" on conteudo.cta_lead for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));

grant all on all tables in schema conteudo to authenticated, service_role;
