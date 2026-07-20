-- Corporis Conteúdo — corrige conteudo.status_slot pros 5 estados reais do mockup
-- (Calendário.html: --slot-empty/draft/scheduled/approved/published), não os 4
-- inventados no M1. Sem dados em produção ainda — troca direta, sem backfill.

alter table conteudo.slot_calendario alter column status drop default;
alter table conteudo.slot_calendario alter column status type text using status::text;
drop type conteudo.status_slot;
create type conteudo.status_slot as enum ('vazio', 'rascunho', 'agendado', 'aprovado', 'publicado');
alter table conteudo.slot_calendario alter column status type conteudo.status_slot using status::conteudo.status_slot;
alter table conteudo.slot_calendario alter column status set default 'vazio';
