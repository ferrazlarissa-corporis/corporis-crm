-- Corporis OS — planos oficiais por periodicidade, com preço total por frequência.
-- Cards oficiais: Primeiros Passos (mensal), Corpo em Movimento (trimestral),
-- Transformação Completa (semestral). A frequência vira variação de preço no card.

-- ─── 1. Tabela de preços por frequência ───────────────────────────────────────
create table if not exists vendas.plano_preco (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null references vendas.plano(id) on delete cascade,
  sessoes_semana int not null check (sessoes_semana between 1 and 14),
  valor_total numeric(14,2) not null check (valor_total >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plano_id, sessoes_semana)
);

create index if not exists plano_preco_plano_idx on vendas.plano_preco(plano_id);

drop trigger if exists set_plano_preco_updated_at on vendas.plano_preco;
create trigger set_plano_preco_updated_at before update on vendas.plano_preco
for each row execute function core.set_updated_at();

alter table vendas.plano_preco enable row level security;
drop policy if exists "staff manage plano_preco" on vendas.plano_preco;
create policy "staff manage plano_preco" on vendas.plano_preco for all to authenticated
using (private.is_active_staff(auth.uid())) with check (private.is_active_staff(auth.uid()));

grant all on table vendas.plano_preco to authenticated, service_role;

-- ─── 2. Snapshot financeiro da matrícula ─────────────────────────────────────
alter table vendas.matricula
  add column if not exists valor_total numeric(14,2),
  add column if not exists forma_pagamento text,
  add column if not exists cobranca_modo text;

update vendas.matricula
set cobranca_modo = case when tipo = 'fixo' then 'parcelada_mensal' else 'unica' end
where cobranca_modo is null;

alter table vendas.matricula alter column cobranca_modo set default 'parcelada_mensal';

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'matricula_cobranca_modo_check'
       and conrelid = 'vendas.matricula'::regclass
  ) then
    alter table vendas.matricula
      add constraint matricula_cobranca_modo_check
      check (cobranca_modo in ('unica', 'parcelada_mensal'));
  end if;
end $$;

-- ─── 3. Garante os três cards oficiais ───────────────────────────────────────
with official_plans(nome, periodicidade, valor_ref) as (
  values
    ('Plano Primeiros Passos', 'mensal'::vendas.periodicidade, 240::numeric),
    ('Plano Corpo em Movimento', 'trimestral'::vendas.periodicidade, 210::numeric),
    ('Plano Transformação Completa', 'semestral'::vendas.periodicidade, 195::numeric)
)
insert into vendas.plano(nome, tipo, valor, periodicidade, sessoes_semana, servicos, pilar, ativo)
select
  o.nome,
  'fixo'::vendas.plano_tipo,
  o.valor_ref,
  o.periodicidade,
  null,
  '[]'::jsonb,
  'pilates'::core.pilar,
  true
from official_plans o
where not exists (select 1 from vendas.plano p where p.nome = o.nome);

-- ─── 4. Preços totais por frequência no card oficial ─────────────────────────
with official_prices(nome, sessoes_semana, valor_total) as (
  values
    ('Plano Primeiros Passos', 1, 240::numeric),
    ('Plano Primeiros Passos', 2, 400::numeric),
    ('Plano Primeiros Passos', 3, 495::numeric),
    ('Plano Corpo em Movimento', 1, 630::numeric),
    ('Plano Corpo em Movimento', 2, 1080::numeric),
    ('Plano Corpo em Movimento', 3, 1350::numeric),
    ('Plano Transformação Completa', 1, 1170::numeric),
    ('Plano Transformação Completa', 2, 1950::numeric),
    ('Plano Transformação Completa', 3, 2400::numeric)
),
canonical as (
  select distinct on (p.nome)
    p.nome,
    p.id
  from vendas.plano p
  where p.nome in (
    'Plano Primeiros Passos',
    'Plano Corpo em Movimento',
    'Plano Transformação Completa'
  )
  order by
    p.nome,
    case when p.sessoes_semana = 1 then 0 when p.ativo then 1 else 2 end,
    p.created_at,
    p.id
)
insert into vendas.plano_preco(plano_id, sessoes_semana, valor_total, ativo)
select c.id, op.sessoes_semana, op.valor_total, true
from official_prices op
join canonical c on c.nome = op.nome
on conflict (plano_id, sessoes_semana) do update
set valor_total = excluded.valor_total,
    ativo = true,
    updated_at = now();

-- ─── 5. Migra matrículas/vendas para o card canônico, preservando snapshots ──
with canonical as (
  select distinct on (p.nome)
    p.nome,
    p.id
  from vendas.plano p
  where p.nome in (
    'Plano Primeiros Passos',
    'Plano Corpo em Movimento',
    'Plano Transformação Completa'
  )
  order by
    p.nome,
    case when p.sessoes_semana = 1 then 0 when p.ativo then 1 else 2 end,
    p.created_at,
    p.id
),
plan_map as (
  select
    p.id as old_id,
    c.id as canonical_id,
    p.nome,
    p.periodicidade,
    p.sessoes_semana,
    p.valor
  from vendas.plano p
  join canonical c on c.nome = p.nome
  where p.nome in (
    'Plano Primeiros Passos',
    'Plano Corpo em Movimento',
    'Plano Transformação Completa'
  )
)
update vendas.matricula m
set
  plano_id = pm.canonical_id,
  tipo = 'fixo'::vendas.plano_tipo,
  periodicidade = coalesce(m.periodicidade, pm.periodicidade),
  sessoes_semana = coalesce(m.sessoes_semana, pm.sessoes_semana),
  valor = coalesce(m.valor, pm.valor, 0),
  valor_total = coalesce(
    m.valor_total,
    round(
      coalesce(m.valor, pm.valor, 0)
      * (case coalesce(m.periodicidade, pm.periodicidade)
          when 'mensal' then 1
          when 'trimestral' then 3
          when 'semestral' then 6
          when 'anual' then 12
          else 1
        end),
      2
    )
  ),
  forma_pagamento = coalesce(m.forma_pagamento, 'Legado recorrente'),
  cobranca_modo = coalesce(m.cobranca_modo, 'parcelada_mensal'),
  fim = coalesce(
    m.fim,
    (
      m.inicio
      + (
        interval '1 month'
        * (case coalesce(m.periodicidade, pm.periodicidade)
            when 'mensal' then 1
            when 'trimestral' then 3
            when 'semestral' then 6
            when 'anual' then 12
            else 1
          end)
      )
    )::date
  ),
  updated_at = now()
from plan_map pm
where m.plano_id = pm.old_id;

with canonical as (
  select distinct on (p.nome)
    p.nome,
    p.id
  from vendas.plano p
  where p.nome in (
    'Plano Primeiros Passos',
    'Plano Corpo em Movimento',
    'Plano Transformação Completa'
  )
  order by
    p.nome,
    case when p.sessoes_semana = 1 then 0 when p.ativo then 1 else 2 end,
    p.created_at,
    p.id
),
plan_map as (
  select p.id as old_id, c.id as canonical_id
  from vendas.plano p
  join canonical c on c.nome = p.nome
  where p.nome in (
    'Plano Primeiros Passos',
    'Plano Corpo em Movimento',
    'Plano Transformação Completa'
  )
)
update vendas.venda v
set plano_id = pm.canonical_id,
    updated_at = now()
from plan_map pm
where v.plano_id = pm.old_id;

-- Demais matrículas legadas: completa snapshots mínimos.
update vendas.matricula
set
  valor_total = coalesce(valor_total, valor, 0),
  forma_pagamento = coalesce(forma_pagamento, 'Legado'),
  cobranca_modo = coalesce(cobranca_modo, case when tipo = 'fixo' then 'parcelada_mensal' else 'unica' end),
  updated_at = now()
where valor_total is null or forma_pagamento is null or cobranca_modo is null;

-- Mantém um card ativo por plano oficial e pausa os duplicados antigos.
with official_plans(nome, periodicidade, valor_ref) as (
  values
    ('Plano Primeiros Passos', 'mensal'::vendas.periodicidade, 240::numeric),
    ('Plano Corpo em Movimento', 'trimestral'::vendas.periodicidade, 210::numeric),
    ('Plano Transformação Completa', 'semestral'::vendas.periodicidade, 195::numeric)
),
canonical as (
  select distinct on (p.nome)
    p.nome,
    p.id
  from vendas.plano p
  where p.nome in (
    'Plano Primeiros Passos',
    'Plano Corpo em Movimento',
    'Plano Transformação Completa'
  )
  order by
    p.nome,
    case when p.sessoes_semana = 1 then 0 when p.ativo then 1 else 2 end,
    p.created_at,
    p.id
)
update vendas.plano p
set
  tipo = 'fixo'::vendas.plano_tipo,
  periodicidade = o.periodicidade,
  valor = case when p.id = c.id then o.valor_ref else p.valor end,
  sessoes_semana = case when p.id = c.id then null else p.sessoes_semana end,
  pilar = coalesce(p.pilar, 'pilates'::core.pilar),
  ativo = (p.id = c.id),
  updated_at = now()
from official_plans o
join canonical c on c.nome = o.nome
where p.nome = o.nome;

-- ─── 6. RPC criar_adesao com valor total e modo de cobrança ──────────────────
drop function if exists vendas.criar_adesao(
  uuid, uuid, numeric, numeric, int, date, uuid, uuid,
  vendas.plano_tipo, vendas.periodicidade, int, int
);

create or replace function vendas.criar_adesao(
  p_pessoa_id uuid,
  p_plano_id uuid,
  p_valor_total numeric,
  p_desconto_total numeric,
  p_dia_vencimento int,
  p_inicio date,
  p_modelo_contrato_id uuid,
  p_vendedor_id uuid,
  p_tipo vendas.plano_tipo,
  p_periodicidade vendas.periodicidade,
  p_sessoes_semana int,
  p_total_sessoes int,
  p_forma_pagamento text,
  p_cobranca_modo text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda_id uuid;
  v_matricula_id uuid;
  v_plano vendas.plano;
  v_total_bruto numeric;
  v_desconto numeric;
  v_liquido numeric;
  v_valor_mensal numeric;
  v_lancamento_valor numeric;
  v_meses int := 1;
  v_fim date;
  v_periodicidade vendas.periodicidade;
  v_sessoes_semana int;
  v_total_sessoes int;
  v_descricao text;
  v_forma_pagamento text;
  v_cobranca_modo text;
begin
  select * into v_plano from vendas.plano where id = p_plano_id;
  if not found then
    raise exception 'Plano % não encontrado', p_plano_id;
  end if;

  v_total_bruto := greatest(coalesce(p_valor_total, 0), 0);
  v_desconto := least(greatest(coalesce(p_desconto_total, 0), 0), v_total_bruto);
  v_liquido := v_total_bruto - v_desconto;
  v_forma_pagamento := coalesce(nullif(trim(p_forma_pagamento), ''), 'Não informado');
  v_cobranca_modo := coalesce(nullif(trim(p_cobranca_modo), ''), case when p_tipo = 'fixo' then 'parcelada_mensal' else 'unica' end);

  if v_cobranca_modo not in ('unica', 'parcelada_mensal') then
    raise exception 'Modo de cobrança inválido: %', v_cobranca_modo;
  end if;

  if p_tipo = 'fixo' then
    if p_periodicidade is null then
      raise exception 'Periodicidade é obrigatória para plano fixo';
    end if;
    if p_sessoes_semana is null or p_sessoes_semana < 1 then
      raise exception 'Frequência semanal é obrigatória para plano fixo';
    end if;

    v_periodicidade := p_periodicidade;
    v_sessoes_semana := p_sessoes_semana;
    v_total_sessoes := null;
    v_meses := case p_periodicidade
      when 'mensal' then 1
      when 'trimestral' then 3
      when 'semestral' then 6
      when 'anual' then 12
      else 1
    end;
    v_fim := (p_inicio + (interval '1 month' * v_meses))::date;
    v_valor_mensal := round(v_liquido / v_meses, 2);
    v_lancamento_valor := case when v_cobranca_modo = 'parcelada_mensal' then v_valor_mensal else v_liquido end;
    v_descricao := case
      when v_cobranca_modo = 'parcelada_mensal' then 'Parcela mensal ' || v_plano.nome
      else 'Plano ' || v_plano.nome
    end;
  elsif p_tipo = 'personalizado' then
    v_periodicidade := null;
    v_sessoes_semana := null;
    v_total_sessoes := p_total_sessoes;
    v_fim := null;
    v_valor_mensal := v_liquido;
    v_lancamento_valor := v_liquido;
    v_cobranca_modo := 'unica';
    v_descricao := 'Pacote ' || v_plano.nome;
  else -- avulso
    v_periodicidade := null;
    v_sessoes_semana := null;
    v_total_sessoes := coalesce(p_total_sessoes, 1);
    v_fim := p_inicio;
    v_valor_mensal := v_liquido;
    v_lancamento_valor := v_liquido;
    v_cobranca_modo := 'unica';
    v_descricao := 'Sessão avulsa ' || v_plano.nome;
  end if;

  insert into vendas.venda(pessoa_id, plano_id, valor, desconto, data, vendedor_id)
    values (p_pessoa_id, p_plano_id, v_total_bruto, v_desconto, p_inicio, p_vendedor_id)
    returning id into v_venda_id;

  insert into vendas.matricula(
    pessoa_id, plano_id, venda_id, inicio, dia_vencimento,
    tipo, periodicidade, valor, valor_total, forma_pagamento, cobranca_modo,
    sessoes_semana, total_sessoes, fim
  ) values (
    p_pessoa_id, p_plano_id, v_venda_id, p_inicio, p_dia_vencimento,
    p_tipo, v_periodicidade, v_valor_mensal, v_liquido, v_forma_pagamento, v_cobranca_modo,
    v_sessoes_semana, v_total_sessoes, v_fim
  ) returning id into v_matricula_id;

  update core.pessoa set status = 'cliente_ativo'
   where id = p_pessoa_id and status <> 'cliente_ativo';

  insert into financeiro.lancamento(pessoa_id, matricula_id, competencia, descricao, valor, vencimento, status)
    values (
      p_pessoa_id, v_matricula_id,
      date_trunc('month', p_inicio)::date,
      v_descricao,
      v_lancamento_valor,
      make_date(
        extract(year from p_inicio)::int,
        extract(month from p_inicio)::int,
        least(p_dia_vencimento, 28)
      ),
      'a_receber'
    );

  insert into vendas.contrato(pessoa_id, modelo_id, venda_id, status)
    values (p_pessoa_id, p_modelo_contrato_id, v_venda_id, 'rascunho');

  return v_venda_id;
end $$;

revoke all on function vendas.criar_adesao(
  uuid, uuid, numeric, numeric, int, date, uuid, uuid,
  vendas.plano_tipo, vendas.periodicidade, int, int, text, text
) from public;
grant execute on function vendas.criar_adesao(
  uuid, uuid, numeric, numeric, int, date, uuid, uuid,
  vendas.plano_tipo, vendas.periodicidade, int, int, text, text
) to authenticated, service_role;
