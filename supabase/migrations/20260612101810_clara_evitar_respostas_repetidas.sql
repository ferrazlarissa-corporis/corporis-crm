-- Evita que a Clara envie duas versões da mesma resposta na mesma rodada.

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
    where item ->> 'id' = 'nao-repetir-intencao'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "nao-repetir-intencao",
    "title": "Não repita a mesma intenção.",
    "detail": "Em cada resposta, escolha uma única versão do acolhimento e uma única versão da pergunta. Não mande \"Que bom...\" duas vezes, nem duas perguntas equivalentes com palavras diferentes. Se já perguntou o motivo ou a queixa, espere a resposta da aluna antes de reformular."
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
    where item ->> 'id' = 'larissa-fisio-pelvica-primeiro-contato-sem-repetir'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "larissa-fisio-pelvica-primeiro-contato-sem-repetir",
    "titulo": "Fisio pélvica - primeiro contato sem repetir",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "quero mais informações sobre a fisioterapia pélvica"
      },
      {
        "autor": "clara",
        "texto": "Que bom que você veio falar com a gente!"
      },
      {
        "autor": "clara",
        "texto": "Antes de te explicar tudo, me conta um pouquinho: você está buscando a fisioterapia pélvica por algum motivo específico?"
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
set boas_praticas = coalesce(c.boas_praticas, '[]'::jsonb) || $json$
[
  {
    "id": "nao-repetir-intencao",
    "title": "Não repita a mesma intenção.",
    "detail": "Em cada resposta, escolha uma única versão do acolhimento e uma única versão da pergunta. Não mande \"Que bom...\" duas vezes, nem duas perguntas equivalentes com palavras diferentes. Se já perguntou o motivo ou a queixa, espere a resposta da aluna antes de reformular."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.boas_praticas, '[]'::jsonb)) item
  where item ->> 'id' = 'nao-repetir-intencao'
);

update crm.agent_config c
set exemplos_conversa = coalesce(c.exemplos_conversa, '[]'::jsonb) || $json$
[
  {
    "id": "larissa-fisio-pelvica-primeiro-contato-sem-repetir",
    "titulo": "Fisio pélvica - primeiro contato sem repetir",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "quero mais informações sobre a fisioterapia pélvica"
      },
      {
        "autor": "clara",
        "texto": "Que bom que você veio falar com a gente!"
      },
      {
        "autor": "clara",
        "texto": "Antes de te explicar tudo, me conta um pouquinho: você está buscando a fisioterapia pélvica por algum motivo específico?"
      }
    ]
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.exemplos_conversa, '[]'::jsonb)) item
  where item ->> 'id' = 'larissa-fisio-pelvica-primeiro-contato-sem-repetir'
);
