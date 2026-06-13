-- Ajusta o fluxo de valores das sessões de fisioterapia pélvica não gestante:
-- não repetir avaliação gratuita/50min e explicar a faixa de 4 a 12 atendimentos.

create or replace function pg_temp.clara_fisio_pelvica_valores_faq(input_faq jsonb)
returns jsonb
language plpgsql
as $fn$
declare
  result jsonb;
  consulta_answer text := 'Na fisioterapia pélvica, começamos com uma consulta inicial. Nela a fisioterapeuta conversa com a aluna, entende o histórico e faz uma avaliação da região pélvica para identificar como estão os músculos íntimos e o abdômen. É um momento tranquilo e seguro. A primeira consulta dura aproximadamente 1h20 e custa R$ 350,00, mas temos uma condição especial: fechando o tratamento conosco, ela fica com mais de 70% OFF, por R$ 100,00. Ao final desse atendimento, passamos o orçamento com a quantidade de atendimentos necessária para o acompanhamento. Podem variar de 4 a 12 atendimentos. Ao final da consulta as meninas já conseguem passar certinho o plano de tratamento, com o número de atendimentos e a frequência.';
  sessoes_answer text := 'Quando a lead de fisioterapia pélvica, fora de gestação, perguntar valor das sessões, atendimentos ou tratamento, não volte para "avaliação inicial gratuita", não fale em 50 minutos e não repita toda a explicação da consulta. Responda: "Os valores das sessões dependem do plano de tratamento que a fisioterapeuta vai montar para você. Mas podem variar de 4 a 12 atendimentos. Ao final da consulta, as meninas já conseguem te passar certinho o plano de tratamento para você, com o número de atendimentos e a frequência." Depois puxe para agendar a consulta inicial.';
  primeira_answer text := 'Quando a lead disser que seria a primeira vez na fisioterapia pélvica, responda com as condições da consulta inicial: "A primeira consulta tem duração de aproximadamente 1h20 e é R$ 350,00. Mas temos uma condição especial para você: fechando o tratamento conosco, está com mais de 70% OFF, ficando por R$ 100,00." Depois complemente: "E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Podem variar de 4 a 12 atendimentos. Ao final da consulta as meninas já conseguem te passar certinho o plano de tratamento, com o número de atendimentos e a frequência." Não diga que é gratuita e não diga que dura 50 minutos.';
begin
  select coalesce(
    jsonb_agg(
      case
        when item.value ->> 'q' = 'Como funciona e qual o valor da consulta inicial de fisioterapia pélvica?' then
          item.value || jsonb_build_object('a', consulta_answer)
        when item.value ->> 'q' = 'Como responder quando perguntam o valor das sessões de fisioterapia pélvica?' then
          item.value || jsonb_build_object('a', sessoes_answer)
        when item.value ->> 'q' = 'É minha primeira vez na fisioterapia pélvica. O que preciso saber sobre valores?' then
          item.value || jsonb_build_object('a', primeira_answer)
        else item.value
      end
      order by item.ordinality
    ),
    '[]'::jsonb
  )
  into result
  from jsonb_array_elements(coalesce(input_faq, '[]'::jsonb)) with ordinality as item(value, ordinality);

  if not exists (
    select 1
    from jsonb_array_elements(result) item
    where item ->> 'q' = 'Como funciona e qual o valor da consulta inicial de fisioterapia pélvica?'
  ) then
    result := result || jsonb_build_array(jsonb_build_object(
      'q', 'Como funciona e qual o valor da consulta inicial de fisioterapia pélvica?',
      'a', consulta_answer
    ));
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(result) item
    where item ->> 'q' = 'Como responder quando perguntam o valor das sessões de fisioterapia pélvica?'
  ) then
    result := result || jsonb_build_array(jsonb_build_object(
      'q', 'Como responder quando perguntam o valor das sessões de fisioterapia pélvica?',
      'a', sessoes_answer
    ));
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(result) item
    where item ->> 'q' = 'É minha primeira vez na fisioterapia pélvica. O que preciso saber sobre valores?'
  ) then
    result := result || jsonb_build_array(jsonb_build_object(
      'q', 'É minha primeira vez na fisioterapia pélvica. O que preciso saber sobre valores?',
      'a', primeira_answer
    ));
  end if;

  return result;
end;
$fn$;

create or replace function pg_temp.clara_fisio_pelvica_valores_boas(input_boas jsonb)
returns jsonb
language plpgsql
as $fn$
declare
  result jsonb;
  valores_detail text := 'Se, no fluxo de fisioterapia pélvica fora de gestação, a pessoa perguntar valor das sessões, atendimentos ou tratamento, não diga que a avaliação inicial é gratuita, não fale em 50 minutos e não repita toda a explicação da consulta. Diga que os valores dependem do plano de tratamento montado pela fisioterapeuta, que podem variar de 4 a 12 atendimentos, e que ao final da consulta as meninas conseguem passar certinho o plano, com número de atendimentos e frequência. Depois puxe para agendar a consulta inicial.';
  primeira_detail text := 'Se a lead responder que seria a primeira vez ou que nunca fez acompanhamento de fisioterapia pélvica, não diga "sem problema" seguido de avaliação gratuita. Responda diretamente: "A primeira consulta tem duração de aproximadamente 1h20 e é R$ 350,00. Mas temos uma condição especial para você: fechando o tratamento conosco, está com mais de 70% OFF, ficando por R$ 100,00." Depois envie: "E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Podem variar de 4 a 12 atendimentos. Ao final da consulta as meninas já conseguem te passar certinho o plano de tratamento, com o número de atendimentos e a frequência."';
begin
  select coalesce(
    jsonb_agg(
      case
        when item.value ->> 'id' = 'fisio-pelvica-valores-sessoes' then
          item.value || jsonb_build_object('title', 'Valor das sessões.', 'detail', valores_detail)
        when item.value ->> 'id' = 'fisio-pelvica-primeira-vez-valores' then
          item.value || jsonb_build_object('title', 'Primeira vez na fisio pélvica.', 'detail', primeira_detail)
        else item.value
      end
      order by item.ordinality
    ),
    '[]'::jsonb
  )
  into result
  from jsonb_array_elements(coalesce(input_boas, '[]'::jsonb)) with ordinality as item(value, ordinality);

  if not exists (
    select 1
    from jsonb_array_elements(result) item
    where item ->> 'id' = 'fisio-pelvica-valores-sessoes'
  ) then
    result := result || jsonb_build_array(jsonb_build_object(
      'id', 'fisio-pelvica-valores-sessoes',
      'title', 'Valor das sessões.',
      'detail', valores_detail
    ));
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(result) item
    where item ->> 'id' = 'fisio-pelvica-primeira-vez-valores'
  ) then
    result := result || jsonb_build_array(jsonb_build_object(
      'id', 'fisio-pelvica-primeira-vez-valores',
      'title', 'Primeira vez na fisio pélvica.',
      'detail', primeira_detail
    ));
  end if;

  return result;
end;
$fn$;

create or replace function pg_temp.clara_fisio_pelvica_valores_exemplos(input_exemplos jsonb)
returns jsonb
language plpgsql
as $fn$
declare
  result jsonb;
  consulta_example jsonb := $json$
{
  "id": "larissa-fisio-pelvica-consulta-inicial-valor",
  "titulo": "Fisio pélvica - consulta inicial e valor",
  "dialogo": [
    {
      "autor": "lead",
      "texto": "tenho dor pra ter relação, e ouvi falar q a fisio ajuda"
    },
    {
      "autor": "clara",
      "texto": "Entendi, obrigada por me contar. Eu sei que não é fácil falar sobre isso."
    },
    {
      "autor": "clara",
      "texto": "Inclusive já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa que você."
    },
    {
      "autor": "clara",
      "texto": "O primeiro passo é a nossa consulta inicial. Esse encontro pode variar de 1h a 1h20, e é onde a gente consegue entender melhor como você está, investigar algumas questões da sua saúde íntima e geral e fazer uma avaliação prática da sua região pélvica, para identificar como estão os seus músculos íntimos e abdômen."
    },
    {
      "autor": "clara",
      "texto": "E assim chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado para o seu caso."
    },
    {
      "autor": "lead",
      "texto": "pode me passar qual o valor dessa consulta"
    },
    {
      "autor": "clara",
      "texto": "A primeira consulta tem duração de aproximadamente 1h20 e é R$ 350,00."
    },
    {
      "autor": "clara",
      "texto": "Mas temos uma condição especial para você: fechando o tratamento conosco, ela fica com mais de 70% OFF, por R$ 100,00."
    },
    {
      "autor": "clara",
      "texto": "E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Podem variar de 4 a 12 atendimentos."
    },
    {
      "autor": "clara",
      "texto": "Ao final da consulta as meninas já conseguem te passar certinho o plano de tratamento, com o número de atendimentos e a frequência."
    },
    {
      "autor": "clara",
      "texto": "O que acha de já agendarmos a consulta? Você consegue durante o dia ou fica melhor após às 18h?"
    }
  ]
}
$json$::jsonb;
  primeira_example jsonb := $json$
{
  "id": "larissa-fisio-pelvica-primeira-vez-valores",
  "titulo": "Fisio pélvica - primeira vez e valores",
  "dialogo": [
    {
      "autor": "lead",
      "texto": "Seria a primeira vez"
    },
    {
      "autor": "clara",
      "texto": "A primeira consulta tem duração de aproximadamente 1h20 e é R$ 350,00. Mas temos uma condição especial para você: fechando o tratamento conosco, está com mais de 70% OFF, ficando por R$ 100,00."
    },
    {
      "autor": "clara",
      "texto": "E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Podem variar de 4 a 12 atendimentos."
    },
    {
      "autor": "clara",
      "texto": "Ao final da consulta as meninas já conseguem te passar certinho o plano de tratamento, com o número de atendimentos e a frequência."
    }
  ]
}
$json$::jsonb;
  sessoes_example jsonb := $json$
{
  "id": "larissa-fisio-pelvica-valor-sessoes",
  "titulo": "Fisio pélvica - valor das sessões",
  "dialogo": [
    {
      "autor": "lead",
      "texto": "Entendi. E qual o valor das sessões?"
    },
    {
      "autor": "clara",
      "texto": "Os valores das sessões dependem do plano de tratamento que a fisioterapeuta vai montar para você."
    },
    {
      "autor": "clara",
      "texto": "Mas podem variar de 4 a 12 atendimentos. Ao final da consulta, as meninas já conseguem te passar certinho o plano de tratamento para você, com o número de atendimentos e a frequência."
    },
    {
      "autor": "clara",
      "texto": "Vamos ver um horário para sua consulta inicial? Você consegue durante o dia ou fica melhor após às 18h?"
    }
  ]
}
$json$::jsonb;
begin
  select coalesce(
    jsonb_agg(
      case
        when item.value ->> 'id' = 'larissa-fisio-pelvica-consulta-inicial-valor' then consulta_example
        when item.value ->> 'id' = 'larissa-fisio-pelvica-primeira-vez-valores' then primeira_example
        when item.value ->> 'id' = 'larissa-fisio-pelvica-valor-sessoes' then sessoes_example
        else item.value
      end
      order by item.ordinality
    ),
    '[]'::jsonb
  )
  into result
  from jsonb_array_elements(coalesce(input_exemplos, '[]'::jsonb)) with ordinality as item(value, ordinality);

  if not exists (
    select 1
    from jsonb_array_elements(result) item
    where item ->> 'id' = 'larissa-fisio-pelvica-consulta-inicial-valor'
  ) then
    result := result || jsonb_build_array(consulta_example);
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(result) item
    where item ->> 'id' = 'larissa-fisio-pelvica-primeira-vez-valores'
  ) then
    result := result || jsonb_build_array(primeira_example);
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(result) item
    where item ->> 'id' = 'larissa-fisio-pelvica-valor-sessoes'
  ) then
    result := result || jsonb_build_array(sessoes_example);
  end if;

  return result;
end;
$fn$;

do $do$
declare
  current_default jsonb;
begin
  execute 'select ' || coalesce((
    select pg_get_expr(d.adbin, d.adrelid)
    from pg_attrdef d
    join pg_class c on c.oid = d.adrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
    where n.nspname = 'crm'
      and c.relname = 'agent_config'
      and a.attname = 'faq'
  ), '''[]''::jsonb')
  into current_default;

  current_default := pg_temp.clara_fisio_pelvica_valores_faq(coalesce(current_default, '[]'::jsonb));

  execute format(
    'alter table crm.agent_config alter column faq set default %L::jsonb',
    current_default::text
  );
end;
$do$;

do $do$
declare
  current_default jsonb;
begin
  execute 'select ' || coalesce((
    select pg_get_expr(d.adbin, d.adrelid)
    from pg_attrdef d
    join pg_class c on c.oid = d.adrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
    where n.nspname = 'crm'
      and c.relname = 'agent_config'
      and a.attname = 'boas_praticas'
  ), '''[]''::jsonb')
  into current_default;

  current_default := pg_temp.clara_fisio_pelvica_valores_boas(coalesce(current_default, '[]'::jsonb));

  execute format(
    'alter table crm.agent_config alter column boas_praticas set default %L::jsonb',
    current_default::text
  );
end;
$do$;

do $do$
declare
  current_default jsonb;
begin
  execute 'select ' || coalesce((
    select pg_get_expr(d.adbin, d.adrelid)
    from pg_attrdef d
    join pg_class c on c.oid = d.adrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
    where n.nspname = 'crm'
      and c.relname = 'agent_config'
      and a.attname = 'exemplos_conversa'
  ), '''[]''::jsonb')
  into current_default;

  current_default := pg_temp.clara_fisio_pelvica_valores_exemplos(coalesce(current_default, '[]'::jsonb));

  execute format(
    'alter table crm.agent_config alter column exemplos_conversa set default %L::jsonb',
    current_default::text
  );
end;
$do$;

update crm.agent_config
set
  faq = pg_temp.clara_fisio_pelvica_valores_faq(coalesce(faq, '[]'::jsonb)),
  boas_praticas = pg_temp.clara_fisio_pelvica_valores_boas(coalesce(boas_praticas, '[]'::jsonb)),
  exemplos_conversa = pg_temp.clara_fisio_pelvica_valores_exemplos(coalesce(exemplos_conversa, '[]'::jsonb));
