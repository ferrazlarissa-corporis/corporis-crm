-- Valor por sessão (no plano) e sessões por pilar (na matrícula) para pacotes mistos
-- como "Mamãe ativa" (pilates + fisio pélvica). O valor por sessão é diferenciado
-- justamente por estar dentro do plano, por isso vive em vendas.plano, não em core.servico.
alter table vendas.plano
  add column if not exists valor_sessao_pilates numeric(10,2) check (valor_sessao_pilates is null or valor_sessao_pilates >= 0),
  add column if not exists valor_sessao_fisio_pelvica numeric(10,2) check (valor_sessao_fisio_pelvica is null or valor_sessao_fisio_pelvica >= 0);

alter table vendas.matricula
  add column if not exists sessoes_pilates int check (sessoes_pilates is null or sessoes_pilates >= 0),
  add column if not exists sessoes_fisio_pelvica int check (sessoes_fisio_pelvica is null or sessoes_fisio_pelvica >= 0);

-- Valores iniciais do plano Mamãe ativa (editáveis em Vendas → Planos).
update vendas.plano
   set valor_sessao_pilates = 45, valor_sessao_fisio_pelvica = 150
 where tipo = 'personalizado'
   and lower(nome) in ('mamãe ativa', 'mamae ativa')
   and valor_sessao_pilates is null and valor_sessao_fisio_pelvica is null;

-- Nova assinatura (2 params extras com default): remove a antiga para evitar overload ambíguo.
drop function if exists vendas.criar_adesao(
  uuid, uuid, numeric, numeric, int, date, uuid, uuid,
  vendas.plano_tipo, vendas.periodicidade, int, int, text, text
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
  p_cobranca_modo text,
  p_sessoes_pilates int default null,
  p_sessoes_fisio_pelvica int default null
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
  v_sessoes_pilates int;
  v_sessoes_fisio_pelvica int;
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
    -- Pacote misto (ex.: Mamãe ativa): total = soma das sessões por pilar.
    if p_sessoes_pilates is not null or p_sessoes_fisio_pelvica is not null then
      v_sessoes_pilates := greatest(coalesce(p_sessoes_pilates, 0), 0);
      v_sessoes_fisio_pelvica := greatest(coalesce(p_sessoes_fisio_pelvica, 0), 0);
      v_total_sessoes := v_sessoes_pilates + v_sessoes_fisio_pelvica;
    end if;
    if v_total_sessoes is null or v_total_sessoes < 1 then
      raise exception 'Informe ao menos uma sessão no plano personalizado';
    end if;
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
    sessoes_semana, total_sessoes, fim,
    sessoes_pilates, sessoes_fisio_pelvica
  ) values (
    p_pessoa_id, p_plano_id, v_venda_id, p_inicio, p_dia_vencimento,
    p_tipo, v_periodicidade, v_valor_mensal, v_liquido, v_forma_pagamento, v_cobranca_modo,
    v_sessoes_semana, v_total_sessoes, v_fim,
    v_sessoes_pilates, v_sessoes_fisio_pelvica
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
  vendas.plano_tipo, vendas.periodicidade, int, int, text, text, int, int
) from public;
grant execute on function vendas.criar_adesao(
  uuid, uuid, numeric, numeric, int, date, uuid, uuid,
  vendas.plano_tipo, vendas.periodicidade, int, int, text, text, int, int
) to authenticated, service_role;
