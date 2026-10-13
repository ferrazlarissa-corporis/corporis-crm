-- "Onde nos conheceu?" — origem de captação da cliente (cadastro e ficha).
alter table core.pessoa
  add column if not exists origem text
  check (origem is null or origem in ('indicacao', 'instagram', 'google', 'parceiro', 'whatsapp', 'outro'));
