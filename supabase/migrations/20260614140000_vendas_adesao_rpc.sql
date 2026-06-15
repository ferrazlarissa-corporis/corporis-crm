-- Corporis OS — Fase 2b: RPC de adesão (fan-out transacional).
-- Chamada pela server action do wizard de venda. Cria venda + matrícula, promove a
-- pessoa a cliente_ativo, gera 1º lançamento a receber e contrato em rascunho — tudo
-- numa transação. Depende de financeiro.lancamento (Fase 3) já existir.

create or replace function vendas.criar_adesao(
  p_pessoa_id uuid,
  p_plano_id uuid,
  p_valor numeric,
  p_desconto numeric,
  p_dia_vencimento int,
  p_inicio date,
  p_modelo_contrato_id uuid,
  p_vendedor_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda_id uuid;
  v_matricula_id uuid;
  v_plano vendas.plano;
begin
  select * into v_plano from vendas.plano where id = p_plano_id;
  if not found then
    raise exception 'Plano % não encontrado', p_plano_id;
  end if;

  insert into vendas.venda(pessoa_id, plano_id, valor, desconto, data, vendedor_id)
    values (p_pessoa_id, p_plano_id, p_valor, p_desconto, p_inicio, p_vendedor_id)
    returning id into v_venda_id;

  insert into vendas.matricula(pessoa_id, plano_id, venda_id, inicio, dia_vencimento)
    values (p_pessoa_id, p_plano_id, v_venda_id, p_inicio, p_dia_vencimento)
    returning id into v_matricula_id;

  -- promove a pessoa a cliente ativo
  update core.pessoa set status = 'cliente_ativo'
   where id = p_pessoa_id and status <> 'cliente_ativo';

  -- 1º lançamento a receber (recorrência futura é gerada pelo cron mensal)
  insert into financeiro.lancamento(pessoa_id, matricula_id, competencia, descricao, valor, vencimento, status)
    values (
      p_pessoa_id, v_matricula_id,
      date_trunc('month', p_inicio)::date,
      'Mensalidade ' || v_plano.nome,
      (p_valor - p_desconto),
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

revoke all on function vendas.criar_adesao(uuid, uuid, numeric, numeric, int, date, uuid, uuid) from public;
grant execute on function vendas.criar_adesao(uuid, uuid, numeric, numeric, int, date, uuid, uuid) to authenticated, service_role;
