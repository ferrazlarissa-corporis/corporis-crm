alter table crm.clinic_config
  add column razao_social text not null default 'Corporis Fisioterapia e Pilates LTDA',
  add column documento text not null default 'CNPJ 47.612.358/0001-09 · CREFITO-10 / 21.345-F',
  add column nome_comercial text not null default 'Corporis · Fisioterapia e Pilates',
  add column endereco text not null default 'Rua Coronel Santos Marinho, 347 — Sala 903',
  add column endereco_complemento text not null default 'Centro Médico Xanxerê · Centro · Xanxerê / SC · CEP 89820-000',
  add column telefone text not null default '+55 49 99183-1900',
  add column telefone_observacao text not null default 'WhatsApp da clínica · também recebe ligações',
  add column email text not null default 'contato@corporisxre.com.br',
  add column funcionamento jsonb not null default '[
    {"day": "Segunda", "h": "07:00 – 20:00", "off": false},
    {"day": "Terça", "h": "07:00 – 20:00", "off": false},
    {"day": "Quarta", "h": "07:00 – 20:00", "off": false},
    {"day": "Quinta", "h": "07:00 – 20:00", "off": false},
    {"day": "Sexta", "h": "07:00 – 18:00", "off": false},
    {"day": "Sábado", "h": "Fechado", "off": true},
    {"day": "Domingo", "h": "Fechado", "off": true}
  ]'::jsonb;

drop policy if exists "staff read clinic config" on crm.clinic_config;
drop policy if exists "staff write clinic config" on crm.clinic_config;

create policy "staff read clinic config"
on crm.clinic_config for select
to authenticated
using (private.is_active_staff(auth.uid()));

create policy "staff write clinic config"
on crm.clinic_config for all
to authenticated
using (private.is_active_staff(auth.uid()))
with check (
  id = '00000000-0000-0000-0000-000000000001'::uuid
  and private.is_active_staff(auth.uid())
);
