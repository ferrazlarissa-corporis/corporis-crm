-- Ajusta o fluxo de gestantes quando a lead pergunta sobre valores:
-- explicar processo por trimestre e evitar repetir avaliação gratuita/50min.

update crm.agent_config
set persona_prompt = persona_prompt || E'\n\nImportante: quando uma gestante perguntar sobre valores do acompanhamento, não responda com avaliação inicial gratuita ou 50 minutos. Antes de falar valores, explique que o acompanhamento é separado por trimestre gestacional, que a frequência depende da semana gestacional e das necessidades avaliadas na consulta inicial. Se ela estiver no terceiro trimestre, mencione que o atendimento costuma ser semanal, mas pode variar de pessoa para pessoa. Feche perguntando se podemos agendar a consulta inicial.'
where persona_prompt not like '%quando uma gestante perguntar sobre valores do acompanhamento%';

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
    where item ->> 'q' = 'Como responder valores no acompanhamento para gestantes?'
  ) then
    current_default := current_default || $json$
[
  {
    "q": "Como responder valores no acompanhamento para gestantes?",
    "a": "Quando a gestante perguntar como funcionam os valores, principalmente depois de já falar disponibilidade ou interesse em acompanhar, não responda com avaliação inicial gratuita de 50 minutos e não repita uma tentativa de agendamento. Responda: \"Antes de falar em valores, deixa eu te explicar como funciona o processo.\" Explique que o acompanhamento é separado por trimestre gestacional, que cada trimestre tem um número de atendimentos conforme a semana gestacional e as necessidades avaliadas na consulta. Se ela estiver no terceiro trimestre, diga que no terceiro tri o atendimento é semanal, mas pode variar de pessoa para pessoa. Reforce que por isso a consulta inicial é importante para avaliar as individualidades e preparar um plano personalizado. Finalize: \"Podemos agendar essa consulta inicial para você?\""
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
    where item ->> 'id' = 'gestante-valores-por-trimestre'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "gestante-valores-por-trimestre",
    "title": "Valores para gestante.",
    "detail": "Quando a gestante perguntar como funcionam os valores do acompanhamento, não use o texto de avaliação gratuita de 50 minutos e não repita o agendamento. Primeiro explique que o processo é separado por trimestre gestacional, com número de atendimentos conforme a semana gestacional e as necessidades avaliadas na consulta. Se ela estiver no terceiro trimestre, diga que no terceiro tri o atendimento costuma ser semanal, mas pode variar. Feche reforçando a consulta inicial para montar um plano personalizado e pergunte se podemos agendar essa consulta."
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
    where item ->> 'id' = 'larissa-gestante-valores-terceiro-trimestre'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "larissa-gestante-valores-terceiro-trimestre",
    "titulo": "Gestante - valores no terceiro trimestre",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "Faço sim, tenho disponibilidade durante o dia"
      },
      {
        "autor": "lead",
        "texto": "e como funciona valores"
      },
      {
        "autor": "clara",
        "texto": "Antes de falar em valores, deixa eu te explicar como funciona o processo."
      },
      {
        "autor": "clara",
        "texto": "Nosso acompanhamento é separado por trimestre gestacional. Cada trimestre tem um número de atendimentos de acordo com a sua semana gestacional e as necessidades que serão avaliadas na consulta."
      },
      {
        "autor": "clara",
        "texto": "No terceiro tri, que é o trimestre em que você está, o atendimento é semanal, mas pode variar de pessoa para pessoa. Por isso, é tão importante a consulta inicial: assim conseguimos avaliar as suas individualidades e preparar um plano personalizado para você."
      },
      {
        "autor": "clara",
        "texto": "Podemos agendar essa consulta inicial para você?"
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
    "q": "Como responder valores no acompanhamento para gestantes?",
    "a": "Quando a gestante perguntar como funcionam os valores, principalmente depois de já falar disponibilidade ou interesse em acompanhar, não responda com avaliação inicial gratuita de 50 minutos e não repita uma tentativa de agendamento. Responda: \"Antes de falar em valores, deixa eu te explicar como funciona o processo.\" Explique que o acompanhamento é separado por trimestre gestacional, que cada trimestre tem um número de atendimentos conforme a semana gestacional e as necessidades avaliadas na consulta. Se ela estiver no terceiro trimestre, diga que no terceiro tri o atendimento é semanal, mas pode variar de pessoa para pessoa. Reforce que por isso a consulta inicial é importante para avaliar as individualidades e preparar um plano personalizado. Finalize: \"Podemos agendar essa consulta inicial para você?\""
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.faq, '[]'::jsonb)) item
  where item ->> 'q' = 'Como responder valores no acompanhamento para gestantes?'
);

update crm.agent_config c
set boas_praticas = coalesce(c.boas_praticas, '[]'::jsonb) || $json$
[
  {
    "id": "gestante-valores-por-trimestre",
    "title": "Valores para gestante.",
    "detail": "Quando a gestante perguntar como funcionam os valores do acompanhamento, não use o texto de avaliação gratuita de 50 minutos e não repita o agendamento. Primeiro explique que o processo é separado por trimestre gestacional, com número de atendimentos conforme a semana gestacional e as necessidades avaliadas na consulta. Se ela estiver no terceiro trimestre, diga que no terceiro tri o atendimento costuma ser semanal, mas pode variar. Feche reforçando a consulta inicial para montar um plano personalizado e pergunte se podemos agendar essa consulta."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.boas_praticas, '[]'::jsonb)) item
  where item ->> 'id' = 'gestante-valores-por-trimestre'
);

update crm.agent_config c
set exemplos_conversa = coalesce(c.exemplos_conversa, '[]'::jsonb) || $json$
[
  {
    "id": "larissa-gestante-valores-terceiro-trimestre",
    "titulo": "Gestante - valores no terceiro trimestre",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "Faço sim, tenho disponibilidade durante o dia"
      },
      {
        "autor": "lead",
        "texto": "e como funciona valores"
      },
      {
        "autor": "clara",
        "texto": "Antes de falar em valores, deixa eu te explicar como funciona o processo."
      },
      {
        "autor": "clara",
        "texto": "Nosso acompanhamento é separado por trimestre gestacional. Cada trimestre tem um número de atendimentos de acordo com a sua semana gestacional e as necessidades que serão avaliadas na consulta."
      },
      {
        "autor": "clara",
        "texto": "No terceiro tri, que é o trimestre em que você está, o atendimento é semanal, mas pode variar de pessoa para pessoa. Por isso, é tão importante a consulta inicial: assim conseguimos avaliar as suas individualidades e preparar um plano personalizado para você."
      },
      {
        "autor": "clara",
        "texto": "Podemos agendar essa consulta inicial para você?"
      }
    ]
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.exemplos_conversa, '[]'::jsonb)) item
  where item ->> 'id' = 'larissa-gestante-valores-terceiro-trimestre'
);
