-- Ajusta o fluxo de fisio pélvica quando a lead diz que seria a primeira vez:
-- responder com duração/valor da consulta e faixa de atendimentos.

update crm.agent_config
set persona_prompt = persona_prompt || E'\n\nImportante: em fisioterapia pélvica, nunca diga que a consulta é gratuita ou dura 50 minutos. A consulta inicial dura aproximadamente 1h20; se falar de valores, use R$ 350,00 e condição especial de R$ 100,00 fechando tratamento.'
where persona_prompt not like '%em fisioterapia pélvica, nunca diga que a consulta é gratuita ou dura 50 minutos%';

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

  current_default := coalesce(current_default, '[]'::jsonb);

  if not exists (
    select 1
    from jsonb_array_elements(current_default) item
    where item ->> 'q' = 'É minha primeira vez na fisioterapia pélvica. O que preciso saber sobre valores?'
  ) then
    current_default := current_default || $json$
[
  {
    "q": "É minha primeira vez na fisioterapia pélvica. O que preciso saber sobre valores?",
    "a": "Quando a lead disser que seria a primeira vez na fisioterapia pélvica, responda com as condições da consulta inicial: \"A primeira consulta tem duração de aproximadamente 1h20 e é R$ 350,00. Mas temos uma condição especial para você: fechando o tratamento conosco, está com mais de 70% OFF, ficando por R$ 100,00.\" Depois complemente: \"E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Podem variar de 4 a 12 atendimentos.\" Não diga que é gratuita e não diga que dura 50 minutos."
  }
]
$json$::jsonb;
  end if;

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

  current_default := coalesce(current_default, '[]'::jsonb);

  if not exists (
    select 1
    from jsonb_array_elements(current_default) item
    where item ->> 'id' = 'fisio-pelvica-primeira-vez-valores'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "fisio-pelvica-primeira-vez-valores",
    "title": "Primeira vez na fisio pélvica.",
    "detail": "Se a lead responder que seria a primeira vez ou que nunca fez acompanhamento de fisioterapia pélvica, não diga \"sem problema\" seguido de avaliação gratuita. Responda diretamente: \"A primeira consulta tem duração de aproximadamente 1h20 e é R$ 350,00. Mas temos uma condição especial para você: fechando o tratamento conosco, está com mais de 70% OFF, ficando por R$ 100,00.\" Depois envie: \"E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Podem variar de 4 a 12 atendimentos.\""
  }
]
$json$::jsonb;
  end if;

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

  current_default := coalesce(current_default, '[]'::jsonb);

  if not exists (
    select 1
    from jsonb_array_elements(current_default) item
    where item ->> 'id' = 'larissa-fisio-pelvica-primeira-vez-valores'
  ) then
    current_default := current_default || $json$
[
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
      }
    ]
  }
]
$json$::jsonb;
  end if;

  execute format(
    'alter table crm.agent_config alter column exemplos_conversa set default %L::jsonb',
    current_default::text
  );
end;
$do$;

update crm.agent_config c
set faq = coalesce(c.faq, '[]'::jsonb) || $json$
[
  {
    "q": "É minha primeira vez na fisioterapia pélvica. O que preciso saber sobre valores?",
    "a": "Quando a lead disser que seria a primeira vez na fisioterapia pélvica, responda com as condições da consulta inicial: \"A primeira consulta tem duração de aproximadamente 1h20 e é R$ 350,00. Mas temos uma condição especial para você: fechando o tratamento conosco, está com mais de 70% OFF, ficando por R$ 100,00.\" Depois complemente: \"E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Podem variar de 4 a 12 atendimentos.\" Não diga que é gratuita e não diga que dura 50 minutos."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.faq, '[]'::jsonb)) item
  where item ->> 'q' = 'É minha primeira vez na fisioterapia pélvica. O que preciso saber sobre valores?'
);

update crm.agent_config c
set boas_praticas = coalesce(c.boas_praticas, '[]'::jsonb) || $json$
[
  {
    "id": "fisio-pelvica-primeira-vez-valores",
    "title": "Primeira vez na fisio pélvica.",
    "detail": "Se a lead responder que seria a primeira vez ou que nunca fez acompanhamento de fisioterapia pélvica, não diga \"sem problema\" seguido de avaliação gratuita. Responda diretamente: \"A primeira consulta tem duração de aproximadamente 1h20 e é R$ 350,00. Mas temos uma condição especial para você: fechando o tratamento conosco, está com mais de 70% OFF, ficando por R$ 100,00.\" Depois envie: \"E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Podem variar de 4 a 12 atendimentos.\""
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.boas_praticas, '[]'::jsonb)) item
  where item ->> 'id' = 'fisio-pelvica-primeira-vez-valores'
);

update crm.agent_config c
set exemplos_conversa = coalesce(c.exemplos_conversa, '[]'::jsonb) || $json$
[
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
      }
    ]
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.exemplos_conversa, '[]'::jsonb)) item
  where item ->> 'id' = 'larissa-fisio-pelvica-primeira-vez-valores'
);
