-- Corporis Conteúdo — M3: público-alvo por pilar + config de marca/tom de voz
-- (campos vistos em Corporis Configurações.html, ausentes no schema do M1).

alter table conteudo.pilar_editorial add column publico_alvo text;

create table conteudo.marca_config (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  tom_voz text not null default '',
  tom_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marca_config_singleton check (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

create trigger set_marca_config_updated_at before update on conteudo.marca_config
for each row execute function core.set_updated_at();

alter table conteudo.marca_config enable row level security;

create policy "staff manage marca_config" on conteudo.marca_config for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));

grant all on table conteudo.marca_config to authenticated, service_role;

insert into conteudo.marca_config (id, tom_voz, tom_tags)
values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Cuidadosa, técnica e acolhedora — como uma fisioterapeuta amiga que escuta antes de prescrever. Frases curtas, sem urgência fabricada, sem promessa de cura. Fala "aluna", nunca "paciente".',
  array['Cuidadosa', 'Técnica', 'Acolhedora']
)
on conflict (id) do nothing;
