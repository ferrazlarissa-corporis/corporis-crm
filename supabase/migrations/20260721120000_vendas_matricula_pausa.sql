-- Pausa de matrícula: congela o prazo; ao retomar, `fim` é empurrado pelos dias pausados.
alter table vendas.matricula
  add column if not exists pausada_em date,
  add column if not exists dias_pausados int not null default 0;
