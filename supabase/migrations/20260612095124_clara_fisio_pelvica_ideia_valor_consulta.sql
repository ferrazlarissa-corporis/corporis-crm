-- Refina a resposta de fisio pélvica quando a lead pede uma ideia de quanto fica.
-- Nesse caso, a Clara deve informar a consulta por R$ 100,00 e puxar para agenda.

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
    where item ->> 'q' = 'Tenho uma ideia de quanto fica a fisioterapia pélvica?'
  ) then
    current_default := current_default || $json$
[
  {
    "q": "Tenho uma ideia de quanto fica a fisioterapia pélvica?",
    "a": "Quando a lead já entendeu que precisa da consulta inicial de fisioterapia pélvica e pede uma noção de quanto fica, responda de forma curta: \"O que posso te dizer é que a consulta em si é R$ 100,00, e depois disso você sai com um plano claro e os valores certinhos, sem surpresa.\" Depois puxe para agenda: \"Vamos ver um horário, só me confirma se consegue durante o dia ou após às 18h que eu vejo a disponibilidade da agenda para você!\""
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
    where item ->> 'id' = 'fisio-pelvica-ideia-valor'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "fisio-pelvica-ideia-valor",
    "title": "Quando pedir ideia de valor.",
    "detail": "Se, no fluxo de fisioterapia pélvica, a pessoa já demonstrou intenção de agendar e pergunta \"tem uma ideia de quanto fica?\", não diga que é gratuito e não repita que é difícil passar valores. Responda: \"O que posso te dizer é que a consulta em si é R$ 100,00, e depois disso você sai com um plano claro e os valores certinhos, sem surpresa.\" Em seguida: \"Vamos ver um horário, só me confirma se consegue durante o dia ou após às 18h que eu vejo a disponibilidade da agenda para você!\""
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
    where item ->> 'id' = 'larissa-fisio-pelvica-ideia-quanto-fica'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "larissa-fisio-pelvica-ideia-quanto-fica",
    "titulo": "Fisio pélvica - pede uma ideia de valor",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "Vamos sim, mas você tem uma ideia de quanto fica?"
      },
      {
        "autor": "clara",
        "texto": "O que posso te dizer é que a consulta em si é R$ 100,00, e depois disso você sai com um plano claro e os valores certinhos, sem surpresa."
      },
      {
        "autor": "clara",
        "texto": "Vamos ver um horário, só me confirma se consegue durante o dia ou após às 18h que eu vejo a disponibilidade da agenda para você!"
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
    "q": "Tenho uma ideia de quanto fica a fisioterapia pélvica?",
    "a": "Quando a lead já entendeu que precisa da consulta inicial de fisioterapia pélvica e pede uma noção de quanto fica, responda de forma curta: \"O que posso te dizer é que a consulta em si é R$ 100,00, e depois disso você sai com um plano claro e os valores certinhos, sem surpresa.\" Depois puxe para agenda: \"Vamos ver um horário, só me confirma se consegue durante o dia ou após às 18h que eu vejo a disponibilidade da agenda para você!\""
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.faq, '[]'::jsonb)) item
  where item ->> 'q' = 'Tenho uma ideia de quanto fica a fisioterapia pélvica?'
);

update crm.agent_config c
set boas_praticas = coalesce(c.boas_praticas, '[]'::jsonb) || $json$
[
  {
    "id": "fisio-pelvica-ideia-valor",
    "title": "Quando pedir ideia de valor.",
    "detail": "Se, no fluxo de fisioterapia pélvica, a pessoa já demonstrou intenção de agendar e pergunta \"tem uma ideia de quanto fica?\", não diga que é gratuito e não repita que é difícil passar valores. Responda: \"O que posso te dizer é que a consulta em si é R$ 100,00, e depois disso você sai com um plano claro e os valores certinhos, sem surpresa.\" Em seguida: \"Vamos ver um horário, só me confirma se consegue durante o dia ou após às 18h que eu vejo a disponibilidade da agenda para você!\""
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.boas_praticas, '[]'::jsonb)) item
  where item ->> 'id' = 'fisio-pelvica-ideia-valor'
);

update crm.agent_config c
set exemplos_conversa = coalesce(c.exemplos_conversa, '[]'::jsonb) || $json$
[
  {
    "id": "larissa-fisio-pelvica-ideia-quanto-fica",
    "titulo": "Fisio pélvica - pede uma ideia de valor",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "Vamos sim, mas você tem uma ideia de quanto fica?"
      },
      {
        "autor": "clara",
        "texto": "O que posso te dizer é que a consulta em si é R$ 100,00, e depois disso você sai com um plano claro e os valores certinhos, sem surpresa."
      },
      {
        "autor": "clara",
        "texto": "Vamos ver um horário, só me confirma se consegue durante o dia ou após às 18h que eu vejo a disponibilidade da agenda para você!"
      }
    ]
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.exemplos_conversa, '[]'::jsonb)) item
  where item ->> 'id' = 'larissa-fisio-pelvica-ideia-quanto-fica'
);
