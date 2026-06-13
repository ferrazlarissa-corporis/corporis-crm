-- Ajusta pergunta genérica de valor da fisioterapia:
-- apresentar a Clara, perguntar o tipo de fisioterapia e só então contextualizar valores.

create or replace function pg_temp.clara_upsert_jsonb_item(
  input_array jsonb,
  lookup_key text,
  lookup_value text,
  new_item jsonb
)
returns jsonb
language plpgsql
as $fn$
declare
  result jsonb;
  found boolean;
begin
  select
    coalesce(
      jsonb_agg(
        case
          when item.value ->> lookup_key = lookup_value then new_item
          else item.value
        end
        order by item.ordinality
      ),
      '[]'::jsonb
    ),
    bool_or(item.value ->> lookup_key = lookup_value)
  into result, found
  from jsonb_array_elements(coalesce(input_array, '[]'::jsonb)) with ordinality as item(value, ordinality);

  if not coalesce(found, false) then
    result := result || jsonb_build_array(new_item);
  end if;

  return result;
end;
$fn$;

create or replace function pg_temp.clara_fisioterapia_generica_faq(input_faq jsonb)
returns jsonb
language plpgsql
as $fn$
begin
  return pg_temp.clara_upsert_jsonb_item(
    coalesce(input_faq, '[]'::jsonb),
    'q',
    'Como responder quando perguntam valor da fisioterapia sem dizer o tipo?',
    $json$
{
  "q": "Como responder quando perguntam valor da fisioterapia sem dizer o tipo?",
  "a": "Quando a lead perguntar genericamente \"qual o valor da fisioterapia?\" ou \"qual o valor da fisio?\" sem dizer se é fisioterapia pélvica, gestante, pilates ou outro serviço, primeiro se apresente: \"Oii, [nome]! Aqui é a Clara, da Corporis. Prazer em falar com você!\" Depois pergunte: \"E seria para qual tipo de fisioterapia, [nome]?\" Em seguida explique: \"Por aqui o acompanhamento é bem personalizado, então o valor depende do plano que a gente traça pra você depois da consulta inicial. Mas quero entender primeiro o que você tá sentindo pra te explicar melhor como funciona.\" Não ofereça agendamento e não cite valores específicos nessa resposta."
}
$json$::jsonb
  );
end;
$fn$;

create or replace function pg_temp.clara_fisioterapia_generica_boas(input_boas jsonb)
returns jsonb
language plpgsql
as $fn$
begin
  return pg_temp.clara_upsert_jsonb_item(
    coalesce(input_boas, '[]'::jsonb),
    'id',
    'fisioterapia-generica-qualificar-tipo',
    $json$
{
  "id": "fisioterapia-generica-qualificar-tipo",
  "title": "Fisio sem tipo definido.",
  "detail": "Quando a lead perguntar valor da fisioterapia ou da fisio sem dizer qual tipo, a Clara deve se apresentar, perguntar qual tipo de fisioterapia a lead busca e explicar que o valor depende do plano traçado depois da consulta inicial. Não cite valores, não ofereça agendamento e não presuma que é fisioterapia pélvica ou gestante."
}
$json$::jsonb
  );
end;
$fn$;

create or replace function pg_temp.clara_fisioterapia_generica_exemplos(input_exemplos jsonb)
returns jsonb
language plpgsql
as $fn$
begin
  return pg_temp.clara_upsert_jsonb_item(
    coalesce(input_exemplos, '[]'::jsonb),
    'id',
    'larissa-fisioterapia-generica-valor',
    $json$
{
  "id": "larissa-fisioterapia-generica-valor",
  "titulo": "Fisioterapia - valor sem tipo definido",
  "dialogo": [
    {
      "autor": "lead",
      "texto": "Oiii, qual o valor da fisioterapia?"
    },
    {
      "autor": "clara",
      "texto": "Oii, Larissa! Aqui é a Clara, da Corporis. Prazer em falar com você!"
    },
    {
      "autor": "clara",
      "texto": "E seria para qual tipo de fisioterapia, Larissa?"
    },
    {
      "autor": "clara",
      "texto": "Por aqui o acompanhamento é bem personalizado, então o valor depende do plano que a gente traça pra você depois da consulta inicial. Mas quero entender primeiro o que você tá sentindo pra te explicar melhor como funciona."
    }
  ]
}
$json$::jsonb
  );
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

  current_default := pg_temp.clara_fisioterapia_generica_faq(coalesce(current_default, '[]'::jsonb));

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

  current_default := pg_temp.clara_fisioterapia_generica_boas(coalesce(current_default, '[]'::jsonb));

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

  current_default := pg_temp.clara_fisioterapia_generica_exemplos(coalesce(current_default, '[]'::jsonb));

  execute format(
    'alter table crm.agent_config alter column exemplos_conversa set default %L::jsonb',
    current_default::text
  );
end;
$do$;

update crm.agent_config
set
  faq = pg_temp.clara_fisioterapia_generica_faq(coalesce(faq, '[]'::jsonb)),
  boas_praticas = pg_temp.clara_fisioterapia_generica_boas(coalesce(boas_praticas, '[]'::jsonb)),
  exemplos_conversa = pg_temp.clara_fisioterapia_generica_exemplos(coalesce(exemplos_conversa, '[]'::jsonb));
