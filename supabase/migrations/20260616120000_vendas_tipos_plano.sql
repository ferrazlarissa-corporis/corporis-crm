-- Corporis OS — Reestruturação dos tipos de plano: fixo / personalizado / avulso.
-- `recorrente` deixa de existir (migra para `fixo`). A matrícula passa a carregar o
-- snapshot contratado (tipo, periodicidade, valor, sessões, data fim), tornando-se a
-- fonte de verdade da cobrança — necessário para catálogo genérico e preço por cliente.
-- A RPC criar_adesao e o cron de mensalidades passam a ser type-aware.

-- ─── 1. Enum plano_tipo: (recorrente, personalizado) → (fixo, personalizado, avulso) ──
alter table vendas.plano alter column tipo drop default;
alter type vendas.plano_tipo rename to plano_tipo_old;
create type vendas.plano_tipo as enum ('fixo', 'personalizado', 'avulso');
alter table vendas.plano
  alter column tipo type vendas.plano_tipo
  using (case tipo::text when 'recorrente' then 'fixo' else tipo::text end)::vendas.plano_tipo;
alter table vendas.plano alter column tipo set default 'fixo';

-- ─── 2. Status concluida (fixo encerrado naturalmente, distinto de cancelada) ──────────
alter type vendas.matricula_status add value if not exists 'concluida';

-- ─── 3. Snapshot contratado na matrícula ───────────────────────────────────────────────
alter table vendas.matricula
  add column if not exists tipo           vendas.plano_tipo not null default 'fixo',
  add column if not exists periodicidade  vendas.periodicidade,
  add column if not exists valor          numeric(14,2),
  add column if not exists sessoes_semana int,
  add column if not exists total_sessoes  int,
  add column if not exists fim            date;

-- Backfill das matrículas existentes a partir do plano/venda (no-op se não houver dados).
update vendas.matricula m set
  tipo          = p.tipo,
  periodicidade = case when p.tipo = 'fixo' then p.periodicidade else null end,
  valor         = coalesce(
    (select v.valor - v.desconto from vendas.venda v where v.id = m.venda_id),
    p.valor
  ),
  sessoes_semana = case when p.tipo = 'fixo' then p.sessoes_semana else null end,
  fim = case when p.tipo = 'fixo'
    then (m.inicio + (interval '1 month' * (case p.periodicidade
      when 'mensal' then 1 when 'trimestral' then 3 when 'semestral' then 6
      when 'anual' then 12 else 1 end)))::date
    else null end
from vendas.plano p
where m.plano_id = p.id;

drop type vendas.plano_tipo_old;

-- ─── 4. RPC criar_adesao — type-aware ──────────────────────────────────────────────────
-- Assinatura muda de aridade: dropa a antiga antes de recriar.
drop function if exists vendas.criar_adesao(uuid, uuid, numeric, numeric, int, date, uuid, uuid);

create or replace function vendas.criar_adesao(
  p_pessoa_id uuid,
  p_plano_id uuid,
  p_valor numeric,
  p_desconto numeric,
  p_dia_vencimento int,
  p_inicio date,
  p_modelo_contrato_id uuid,
  p_vendedor_id uuid,
  p_tipo vendas.plano_tipo,
  p_periodicidade vendas.periodicidade,
  p_sessoes_semana int,
  p_total_sessoes int
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda_id uuid;
  v_matricula_id uuid;
  v_plano vendas.plano;
  v_liquido numeric := p_valor - p_desconto;
  v_meses int;
  v_fim date;
  v_periodicidade vendas.periodicidade;
  v_sessoes_semana int;
  v_total_sessoes int;
  v_descricao text;
begin
  select * into v_plano from vendas.plano where id = p_plano_id;
  if not found then
    raise exception 'Plano % não encontrado', p_plano_id;
  end if;

  v_meses := case p_periodicidade
    when 'mensal' then 1 when 'trimestral' then 3 when 'semestral' then 6
    when 'anual' then 12 else 1 end;

  -- Termos contratados por tipo.
  if p_tipo = 'fixo' then
    v_periodicidade  := p_periodicidade;
    v_sessoes_semana := p_sessoes_semana;
    v_total_sessoes  := null;
    v_fim            := (p_inicio + (interval '1 month' * v_meses))::date;
    v_descricao      := 'Mensalidade ' || v_plano.nome;
  elsif p_tipo = 'personalizado' then
    v_periodicidade  := null;
    v_sessoes_semana := null;
    v_total_sessoes  := p_total_sessoes;
    v_fim            := null;
    v_descricao      := 'Pacote ' || v_plano.nome;
  else -- avulso
    v_periodicidade  := null;
    v_sessoes_semana := null;
    v_total_sessoes  := coalesce(p_total_sessoes, 1);
    v_fim            := p_inicio;
    v_descricao      := 'Sessão avulsa ' || v_plano.nome;
  end if;

  insert into vendas.venda(pessoa_id, plano_id, valor, desconto, data, vendedor_id)
    values (p_pessoa_id, p_plano_id, p_valor, p_desconto, p_inicio, p_vendedor_id)
    returning id into v_venda_id;

  insert into vendas.matricula(
    pessoa_id, plano_id, venda_id, inicio, dia_vencimento,
    tipo, periodicidade, valor, sessoes_semana, total_sessoes, fim
  ) values (
    p_pessoa_id, p_plano_id, v_venda_id, p_inicio, p_dia_vencimento,
    p_tipo, v_periodicidade, v_liquido, v_sessoes_semana, v_total_sessoes, v_fim
  ) returning id into v_matricula_id;

  -- promove a pessoa a cliente ativo
  update core.pessoa set status = 'cliente_ativo'
   where id = p_pessoa_id and status <> 'cliente_ativo';

  -- 1º lançamento a receber. Fixo: recorrência futura vem do cron mensal.
  -- Personalizado/avulso: cobrança única (cron ignora por periodicidade nula).
  insert into financeiro.lancamento(pessoa_id, matricula_id, competencia, descricao, valor, vencimento, status)
    values (
      p_pessoa_id, v_matricula_id,
      date_trunc('month', p_inicio)::date,
      v_descricao,
      v_liquido,
      make_date(
        extract(year from p_inicio)::int,
        extract(month from p_inicio)::int,
        least(p_dia_vencimento, 28)
      ),
      'a_receber'
    );

  -- contrato em rascunho a partir do modelo
  insert into vendas.contrato(pessoa_id, modelo_id, venda_id, status)
    values (p_pessoa_id, p_modelo_contrato_id, v_venda_id, 'rascunho');

  return v_venda_id;
end $$;

revoke all on function vendas.criar_adesao(uuid, uuid, numeric, numeric, int, date, uuid, uuid, vendas.plano_tipo, vendas.periodicidade, int, int) from public;
grant execute on function vendas.criar_adesao(uuid, uuid, numeric, numeric, int, date, uuid, uuid, vendas.plano_tipo, vendas.periodicidade, int, int) to authenticated, service_role;
