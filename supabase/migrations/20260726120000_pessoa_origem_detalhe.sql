-- Detalhe da origem: nome de quem indicou (origem = indicacao) ou do parceiro (origem = parceiro).
alter table core.pessoa add column if not exists origem_detalhe text;
