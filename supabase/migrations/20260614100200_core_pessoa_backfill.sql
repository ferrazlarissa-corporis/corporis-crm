-- Corporis OS — Fase 0: migração da espinha. Preserva 100% dos dados do CRM.
-- Cria 1 core.pessoa por crm.lead (identidade = telefone E.164) e liga via pessoa_id.

alter table crm.leads add column if not exists pessoa_id uuid references core.pessoa(id);

-- 1 pessoa por lead existente ainda não migrado.
insert into core.pessoa (nome, telefone, email, status, pilar_principal, responsavel_id, created_at)
select l.nome,
       l.telefone,
       l.email,
       case
         when l.estagio = 'convertido' then 'cliente_ativo'::core.pessoa_status
         when l.estagio = 'perdido'    then 'inativo'::core.pessoa_status
         else 'lead'::core.pessoa_status
       end,
       nullif(l.interesse::text, 'indefinido')::core.pilar,
       l.responsavel_id,
       l.created_at
from crm.leads l
where l.pessoa_id is null;

-- O UPDATE abaixo revalida a CHECK constraint NOT VALID de telefone (Postgres
-- revalida CHECK em qualquer UPDATE da linha), o que barraria leads herdados com
-- número internacional (ex.: +351, grandfathered). Removemos e recriamos a
-- constraint idêntica (NOT VALID) ao redor do UPDATE — comportamento inalterado.
alter table crm.leads drop constraint if exists leads_telefone_e164_br_check;

-- Liga cada lead à pessoa recém-criada pelo telefone (único nos dois lados).
update crm.leads l
set pessoa_id = p.id
from core.pessoa p
where p.telefone = l.telefone
  and l.pessoa_id is null;

alter table crm.leads
  add constraint leads_telefone_e164_br_check
  check (telefone ~ '^\+55[1-9][0-9][0-9]{8,9}$')
  not valid;

-- A partir daqui todo lead tem pessoa.
alter table crm.leads alter column pessoa_id set not null;

create index if not exists leads_pessoa_idx on crm.leads(pessoa_id);
