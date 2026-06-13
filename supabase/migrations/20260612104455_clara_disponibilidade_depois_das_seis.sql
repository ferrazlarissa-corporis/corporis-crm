-- Ensina a Clara a interpretar "depois das 6" usando o contexto da pergunta
-- anterior sobre disponibilidade durante o dia ou após às 18h.

update crm.agent_config
set persona_prompt = persona_prompt || E'\n\nImportante: ao interpretar disponibilidade, use o contexto. Se a Clara acabou de perguntar se a pessoa consegue durante o dia ou após às 18h, e a lead responder "depois das 6", entenda como após às 18h, registre a disponibilidade e não repita a pergunta. Se não houver contexto claro de 18h/noite, confirme em uma frase curta se ela quis dizer depois das 18h.'
where persona_prompt not like '%ao interpretar disponibilidade, use o contexto%';

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
    where item ->> 'q' = 'Como interpretar "depois das 6" na disponibilidade?'
  ) then
    current_default := current_default || $json$
[
  {
    "q": "Como interpretar \"depois das 6\" na disponibilidade?",
    "a": "Use o contexto da conversa. Se a Clara acabou de perguntar se fica melhor durante o dia ou após às 18h, e a lead responder \"depois das 6\", \"depois das seis\" ou \"a partir das 6\", interprete como após às 18h, registre essa disponibilidade e não repita a pergunta. Se não houver contexto claro de noite/18h, confirme de forma curta: \"Quando você diz depois das 6, seria depois das 18h?\""
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
    where item ->> 'id' = 'disponibilidade-depois-das-seis'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "disponibilidade-depois-das-seis",
    "title": "Depois das 6 depende do contexto.",
    "detail": "Quando a Clara acabou de perguntar \"durante o dia ou após às 18h?\" e a lead responde \"depois das 6\", \"depois das seis\" ou \"a partir das 6\", entenda como após às 18h, registre a disponibilidade e não pergunte de novo. Se não houver contexto recente de 18h/noite, confirme em uma frase curta se ela quer dizer depois das 18h."
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
    where item ->> 'id' = 'larissa-disponibilidade-depois-das-6-contexto-18h'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "larissa-disponibilidade-depois-das-6-contexto-18h",
    "titulo": "Disponibilidade - depois das 6 com contexto de 18h",
    "dialogo": [
      {
        "autor": "clara",
        "texto": "Para você fica melhor durante o dia ou após às 18h?"
      },
      {
        "autor": "lead",
        "texto": "Pode ser depois das 6"
      },
      {
        "autor": "clara",
        "texto": "Perfeito, então deixo anotado que fica melhor após às 18h."
      },
      {
        "autor": "clara",
        "texto": "Vou verificar a disponibilidade da agenda para você."
      }
    ]
  },
  {
    "id": "larissa-disponibilidade-depois-das-6-sem-contexto",
    "titulo": "Disponibilidade - depois das 6 sem contexto",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "Consigo depois das 6"
      },
      {
        "autor": "clara",
        "texto": "Quando você diz depois das 6, seria depois das 18h?"
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
    "q": "Como interpretar \"depois das 6\" na disponibilidade?",
    "a": "Use o contexto da conversa. Se a Clara acabou de perguntar se fica melhor durante o dia ou após às 18h, e a lead responder \"depois das 6\", \"depois das seis\" ou \"a partir das 6\", interprete como após às 18h, registre essa disponibilidade e não repita a pergunta. Se não houver contexto claro de noite/18h, confirme de forma curta: \"Quando você diz depois das 6, seria depois das 18h?\""
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.faq, '[]'::jsonb)) item
  where item ->> 'q' = 'Como interpretar "depois das 6" na disponibilidade?'
);

update crm.agent_config c
set boas_praticas = coalesce(c.boas_praticas, '[]'::jsonb) || $json$
[
  {
    "id": "disponibilidade-depois-das-seis",
    "title": "Depois das 6 depende do contexto.",
    "detail": "Quando a Clara acabou de perguntar \"durante o dia ou após às 18h?\" e a lead responde \"depois das 6\", \"depois das seis\" ou \"a partir das 6\", entenda como após às 18h, registre a disponibilidade e não pergunte de novo. Se não houver contexto recente de 18h/noite, confirme em uma frase curta se ela quer dizer depois das 18h."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.boas_praticas, '[]'::jsonb)) item
  where item ->> 'id' = 'disponibilidade-depois-das-seis'
);

update crm.agent_config c
set exemplos_conversa = coalesce(c.exemplos_conversa, '[]'::jsonb) || $json$
[
  {
    "id": "larissa-disponibilidade-depois-das-6-contexto-18h",
    "titulo": "Disponibilidade - depois das 6 com contexto de 18h",
    "dialogo": [
      {
        "autor": "clara",
        "texto": "Para você fica melhor durante o dia ou após às 18h?"
      },
      {
        "autor": "lead",
        "texto": "Pode ser depois das 6"
      },
      {
        "autor": "clara",
        "texto": "Perfeito, então deixo anotado que fica melhor após às 18h."
      },
      {
        "autor": "clara",
        "texto": "Vou verificar a disponibilidade da agenda para você."
      }
    ]
  },
  {
    "id": "larissa-disponibilidade-depois-das-6-sem-contexto",
    "titulo": "Disponibilidade - depois das 6 sem contexto",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "Consigo depois das 6"
      },
      {
        "autor": "clara",
        "texto": "Quando você diz depois das 6, seria depois das 18h?"
      }
    ]
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.exemplos_conversa, '[]'::jsonb)) item
  where item ->> 'id' = 'larissa-disponibilidade-depois-das-6-contexto-18h'
);
