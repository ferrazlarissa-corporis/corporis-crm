-- Ajusta fisioterapia genérica com lombalgia/dor nas costas:
-- a clínica só atende fisio pélvica; redirecionar com cuidado para Pilates.

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

create or replace function pg_temp.clara_lombalgia_pilates_faq(input_faq jsonb)
returns jsonb
language plpgsql
as $fn$
begin
  return pg_temp.clara_upsert_jsonb_item(
    coalesce(input_faq, '[]'::jsonb),
    'q',
    'Como responder lombalgia ou dor nas costas após pergunta genérica sobre fisioterapia?',
    $json$
{
  "q": "Como responder lombalgia ou dor nas costas após pergunta genérica sobre fisioterapia?",
  "a": "Quando a lead pergunta genericamente sobre fisioterapia e depois explica que é por dor nas costas, dor lombar, lombalgia, coluna ou encaminhamento médico para esse tipo de queixa, não ofereça avaliação gratuita, consulta inicial, agenda ou valores de fisioterapia. Responda: \"Entendi, [nome]. Dor lombar é muito comum. Aqui nós atendemos muitas mulheres que chegam pra gente no Pilates com essa mesma queixa que você e têm ótimos resultados após algumas aulas. Caso queira conhecer, posso te explicar como funciona um pouco melhor.\" Depois explique: \"Sobre a fisioterapia, aqui só atendemos fisioterapia pélvica. Mesmo o médico indicando a fisioterapia, acredito que o Pilates seja uma opção para você.\" Finalize: \"Caso queira conhecer, me avisa que te explico certinho.\""
}
$json$::jsonb
  );
end;
$fn$;

create or replace function pg_temp.clara_lombalgia_pilates_boas(input_boas jsonb)
returns jsonb
language plpgsql
as $fn$
begin
  return pg_temp.clara_upsert_jsonb_item(
    coalesce(input_boas, '[]'::jsonb),
    'id',
    'fisioterapia-nao-pelvica-lombalgia-pilates',
    $json$
{
  "id": "fisioterapia-nao-pelvica-lombalgia-pilates",
  "title": "Lombalgia não é fisio pélvica.",
  "detail": "Quando a lead vier de uma pergunta genérica de fisioterapia e disser dor nas costas, lombalgia, dor lombar, coluna ou encaminhamento médico para essa queixa, não ofereça avaliação gratuita, consulta inicial, agendamento ou valores de fisioterapia. Explique que aqui só atendemos fisioterapia pélvica e que, mesmo com indicação médica de fisioterapia, o Pilates pode ser uma opção. Use prova social de mulheres que chegam com a mesma queixa e têm ótimos resultados após algumas aulas. Finalize perguntando se ela quer conhecer para você explicar melhor."
}
$json$::jsonb
  );
end;
$fn$;

create or replace function pg_temp.clara_lombalgia_pilates_exemplos(input_exemplos jsonb)
returns jsonb
language plpgsql
as $fn$
begin
  return pg_temp.clara_upsert_jsonb_item(
    coalesce(input_exemplos, '[]'::jsonb),
    'id',
    'larissa-fisioterapia-generica-lombalgia',
    $json$
{
  "id": "larissa-fisioterapia-generica-lombalgia",
  "titulo": "Fisioterapia - lombalgia vira Pilates",
  "dialogo": [
    {
      "autor": "lead",
      "texto": "Será para minha dor nas costas, encaminhamento médico tenho lombalgia"
    },
    {
      "autor": "clara",
      "texto": "Entendi, Larissa. Dor lombar é muito comum. Aqui nós atendemos muitas mulheres que chegam pra gente no Pilates com essa mesma queixa que você e têm ótimos resultados após algumas aulas."
    },
    {
      "autor": "clara",
      "texto": "Caso queira conhecer, posso te explicar como funciona um pouco melhor."
    },
    {
      "autor": "clara",
      "texto": "Sobre a fisioterapia, aqui só atendemos fisioterapia pélvica. Mesmo o médico indicando a fisioterapia, acredito que o Pilates seja uma opção para você."
    },
    {
      "autor": "clara",
      "texto": "Caso queira conhecer, me avisa que te explico certinho."
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

  current_default := pg_temp.clara_lombalgia_pilates_faq(coalesce(current_default, '[]'::jsonb));

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

  current_default := pg_temp.clara_lombalgia_pilates_boas(coalesce(current_default, '[]'::jsonb));

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

  current_default := pg_temp.clara_lombalgia_pilates_exemplos(coalesce(current_default, '[]'::jsonb));

  execute format(
    'alter table crm.agent_config alter column exemplos_conversa set default %L::jsonb',
    current_default::text
  );
end;
$do$;

update crm.agent_config
set
  faq = pg_temp.clara_lombalgia_pilates_faq(coalesce(faq, '[]'::jsonb)),
  boas_praticas = pg_temp.clara_lombalgia_pilates_boas(coalesce(boas_praticas, '[]'::jsonb)),
  exemplos_conversa = pg_temp.clara_lombalgia_pilates_exemplos(coalesce(exemplos_conversa, '[]'::jsonb));
