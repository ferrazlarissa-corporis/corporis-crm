-- Lead: nova origem "parceiro" e detalhe da origem (quem indicou / qual parceiro).
-- ATENÇÃO: rode este arquivo ANTES do 20260727120100 (valor novo de enum só vale após o commit).
alter type crm.lead_origin add value if not exists 'parceiro';
alter table crm.leads add column if not exists origem_detalhe text;
