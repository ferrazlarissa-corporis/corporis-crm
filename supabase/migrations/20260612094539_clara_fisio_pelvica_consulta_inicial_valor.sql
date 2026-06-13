-- Ajusta a Clara para tratar fisioterapia pélvica como consulta inicial paga,
-- sem confundir com a aula experimental avaliativa gratuita do Pilates.

update crm.agent_config
set persona_prompt = replace(
  persona_prompt,
  'Objetivo principal: acolher o primeiro contato, entender o que a pessoa busca (pilates, gestante, fisio pélvica), oferecer a aula experimental avaliativa gratuita de 50 minutos e ajudar a marcar um horário. Não tente fechar pacote no primeiro contato; se a aluna insistir em valores de Pilates, informe planos e preços com clareza, sem pressionar, e reforce a aula experimental antes da decisão.',
  'Objetivo principal: acolher o primeiro contato, entender o que a pessoa busca (pilates, gestante, fisio pélvica) e ajudar a marcar um horário. Para Pilates e gestantes, ofereça a aula experimental avaliativa gratuita de 50 minutos. Para fisioterapia pélvica, o caminho é a consulta inicial de aproximadamente 1h20, com valor e condição própria. Não tente fechar pacote no primeiro contato; se a aluna insistir em valores de Pilates, informe planos e preços com clareza, sem pressionar, e reforce a aula experimental antes da decisão.'
)
where persona_prompt like '%oferecer a aula experimental avaliativa gratuita de 50 minutos%'
  and persona_prompt not like '%Para fisioterapia pélvica, o caminho é a consulta inicial de aproximadamente 1h20%';

update crm.agent_config
set persona_prompt = persona_prompt || E'\n\nImportante: para fisioterapia pélvica, não ofereça aula experimental gratuita nem avaliação gratuita. O caminho é a consulta inicial de aproximadamente 1h20, com valor de R$ 350,00 e condição especial de R$ 100,00 se a aluna fechar o tratamento conosco.'
where persona_prompt not like '%Para fisioterapia pélvica, o caminho é a consulta inicial de aproximadamente 1h20%'
  and persona_prompt not like '%para fisioterapia pélvica, não ofereça aula experimental gratuita%';

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
    where item ->> 'q' = 'Como funciona e qual o valor da consulta inicial de fisioterapia pélvica?'
  ) then
    current_default := current_default || $json$
[
  {
    "q": "Como funciona e qual o valor da consulta inicial de fisioterapia pélvica?",
    "a": "Na fisioterapia pélvica, começamos com uma consulta inicial. Nela a fisioterapeuta conversa com a aluna, entende o histórico e faz uma avaliação da região pélvica para identificar como estão os músculos íntimos e o abdômen. É um momento tranquilo e seguro. A primeira consulta dura aproximadamente 1h20 e custa R$ 350,00, mas temos uma condição especial: fechando o tratamento conosco, ela fica com mais de 70% OFF, por R$ 100,00. Ao final desse atendimento, passamos o orçamento com a quantidade de atendimentos necessária para o acompanhamento, que pode variar de 4 a 12 atendimentos."
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
    where item ->> 'id' = 'fisio-pelvica-consulta-inicial'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "fisio-pelvica-consulta-inicial",
    "title": "Fisio pélvica tem consulta inicial.",
    "detail": "Quando o assunto for fisioterapia pélvica, como dor na relação, escape de urina, períneo, pós-parto ou musculatura íntima, não ofereça aula experimental gratuita nem avaliação gratuita. Explique que começamos com uma consulta inicial: a fisioterapeuta conversa, entende o histórico e avalia a região pélvica para identificar como estão os músculos íntimos e o abdômen. Informe que dura aproximadamente 1h20, custa R$ 350,00 e que, fechando o tratamento conosco, fica por R$ 100,00 com mais de 70% OFF. Ao final, passamos o orçamento do acompanhamento, que pode variar de 4 a 12 atendimentos. Depois pergunte se a pessoa consegue durante o dia ou se fica melhor após às 18h."
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
    where item ->> 'id' = 'larissa-fisio-pelvica-consulta-inicial-valor'
  ) then
    current_default := current_default || $json$
[
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
        "texto": "Sim, a fisioterapia pélvica pode ajudar muito nesse tipo de queixa. A gente consegue avaliar como está a tensão dessa musculatura e, a partir disso, traçar um caminho de tratamento específico para você."
      },
      {
        "autor": "clara",
        "texto": "Como funciona aqui: a gente começa com uma *consulta inicial*. Nela a fisioterapeuta conversa com você, entende seu histórico e faz uma avaliação da região pélvica, para identificar como estão os seus músculos íntimos e seu abdômen. É um momento bem tranquilo e seguro."
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
        "texto": "E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Pode variar de 4 a 12 atendimentos."
      },
      {
        "autor": "clara",
        "texto": "O que acha de já agendarmos a consulta? Você consegue durante o dia ou fica melhor após às 18h?"
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
    "q": "Como funciona e qual o valor da consulta inicial de fisioterapia pélvica?",
    "a": "Na fisioterapia pélvica, começamos com uma consulta inicial. Nela a fisioterapeuta conversa com a aluna, entende o histórico e faz uma avaliação da região pélvica para identificar como estão os músculos íntimos e o abdômen. É um momento tranquilo e seguro. A primeira consulta dura aproximadamente 1h20 e custa R$ 350,00, mas temos uma condição especial: fechando o tratamento conosco, ela fica com mais de 70% OFF, por R$ 100,00. Ao final desse atendimento, passamos o orçamento com a quantidade de atendimentos necessária para o acompanhamento, que pode variar de 4 a 12 atendimentos."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.faq, '[]'::jsonb)) item
  where item ->> 'q' = 'Como funciona e qual o valor da consulta inicial de fisioterapia pélvica?'
);

update crm.agent_config c
set boas_praticas = coalesce(c.boas_praticas, '[]'::jsonb) || $json$
[
  {
    "id": "fisio-pelvica-consulta-inicial",
    "title": "Fisio pélvica tem consulta inicial.",
    "detail": "Quando o assunto for fisioterapia pélvica, como dor na relação, escape de urina, períneo, pós-parto ou musculatura íntima, não ofereça aula experimental gratuita nem avaliação gratuita. Explique que começamos com uma consulta inicial: a fisioterapeuta conversa, entende o histórico e avalia a região pélvica para identificar como estão os músculos íntimos e o abdômen. Informe que dura aproximadamente 1h20, custa R$ 350,00 e que, fechando o tratamento conosco, fica por R$ 100,00 com mais de 70% OFF. Ao final, passamos o orçamento do acompanhamento, que pode variar de 4 a 12 atendimentos. Depois pergunte se a pessoa consegue durante o dia ou se fica melhor após às 18h."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.boas_praticas, '[]'::jsonb)) item
  where item ->> 'id' = 'fisio-pelvica-consulta-inicial'
);

update crm.agent_config c
set exemplos_conversa = coalesce(c.exemplos_conversa, '[]'::jsonb) || $json$
[
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
        "texto": "Sim, a fisioterapia pélvica pode ajudar muito nesse tipo de queixa. A gente consegue avaliar como está a tensão dessa musculatura e, a partir disso, traçar um caminho de tratamento específico para você."
      },
      {
        "autor": "clara",
        "texto": "Como funciona aqui: a gente começa com uma *consulta inicial*. Nela a fisioterapeuta conversa com você, entende seu histórico e faz uma avaliação da região pélvica, para identificar como estão os seus músculos íntimos e seu abdômen. É um momento bem tranquilo e seguro."
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
        "texto": "E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Pode variar de 4 a 12 atendimentos."
      },
      {
        "autor": "clara",
        "texto": "O que acha de já agendarmos a consulta? Você consegue durante o dia ou fica melhor após às 18h?"
      }
    ]
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.exemplos_conversa, '[]'::jsonb)) item
  where item ->> 'id' = 'larissa-fisio-pelvica-consulta-inicial-valor'
);
