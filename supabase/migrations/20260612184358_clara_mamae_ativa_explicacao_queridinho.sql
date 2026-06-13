-- Ajusta a explicação do programa Mamãe Ativa com texto mais completo e específico.

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

create or replace function pg_temp.clara_mamae_ativa_faq(input_faq jsonb)
returns jsonb
language plpgsql
as $fn$
declare
  result jsonb;
begin
  result := pg_temp.clara_upsert_jsonb_item(
    coalesce(input_faq, '[]'::jsonb),
    'q',
    'Como funcionam os serviços para gestantes?',
    $json$
{
  "q": "Como funcionam os serviços para gestantes?",
  "a": "Temos três caminhos para gestantes. O plano de Pilates Gestar em Movimento é estruturado por fases da gestação, respeitando o tempo, as mudanças do corpo e as necessidades de adaptação em cada etapa; a aluna entra na fase correspondente à semana gestacional atual. A Fisioterapia Pélvica é um acompanhamento mais específico da musculatura pélvica e do abdômen, importante para preparação para o parto, independente da via escolhida, e para uma recuperação melhor no pós-parto. O Mamãe Ativa é o queridinho das mamães aqui: reúne cuidados com a saúde íntima e também com a saúde física de modo geral, com aulas de pilates específicas para a necessidade da aluna, de acordo com o trimestre em que ela está e seus objetivos, além de atendimentos de fisioterapia pélvica. A fisio pélvica tem um olhar mais direcionado para a saúde íntima, ajudando a prevenir desconfortos e queixas como perda de xixi ao final da gestação ou no pós-parto, preparar para o parto independente da via escolhida e favorecer uma recuperação no pós-parto muito melhor."
}
$json$::jsonb
  );

  result := pg_temp.clara_upsert_jsonb_item(
    result,
    'q',
    'Como funciona o Mamãe Ativa?',
    $json$
{
  "q": "Como funciona o Mamãe Ativa?",
  "a": "Quando a lead perguntar como funciona o Mamãe Ativa, responda: \"O Mamãe Ativa é o queridinho das mamães aqui. O programa reúne cuidados com a sua saúde íntima e também com a sua saúde física de modo geral. Trabalhamos com aulas de pilates específicas para sua necessidade, de acordo com o trimestre em que você está e seus objetivos, e também com atendimentos de fisioterapia pélvica. A fisioterapia pélvica tem um olhar mais direcionado para sua saúde íntima, ajudando a prevenir desconfortos e queixas como perda de xixi ao final da gestação ou no pós-parto, preparar para o parto independente da via escolhida e favorecer uma recuperação no pós-parto muito melhor.\" Depois, se ela ainda não informou, pergunte com quantas semanas de gestação ela está."
}
$json$::jsonb
  );

  return result;
end;
$fn$;

create or replace function pg_temp.clara_mamae_ativa_boas(input_boas jsonb)
returns jsonb
language plpgsql
as $fn$
declare
  result jsonb;
begin
  result := pg_temp.clara_upsert_jsonb_item(
    coalesce(input_boas, '[]'::jsonb),
    'id',
    'gestantes-tres-caminhos',
    $json$
{
  "id": "gestantes-tres-caminhos",
  "title": "Gestantes têm três caminhos.",
  "detail": "Quando uma gestante pedir para entender os serviços, não resuma em \"pilates para gestantes\" e \"fisioterapia pélvica\". Explique Gestar em Movimento, Fisioterapia Pélvica e Mamãe Ativa, destacando fases/trimestres, saúde íntima, saúde física e consulta inicial para detalhar frequência."
}
$json$::jsonb
  );

  result := pg_temp.clara_upsert_jsonb_item(
    result,
    'id',
    'gestante-mamae-ativa-explicacao',
    $json$
{
  "id": "gestante-mamae-ativa-explicacao",
  "title": "Mamãe Ativa completo.",
  "detail": "Quando a lead perguntar como funciona o Mamãe Ativa, diga que é o queridinho das mamães e que reúne cuidados com saúde íntima e saúde física de modo geral. Explique que inclui aulas de pilates específicas para a necessidade da gestante, de acordo com trimestre e objetivos, e atendimentos de fisioterapia pélvica com foco em saúde íntima, prevenção de desconfortos e queixas como perda de xixi no fim da gestação ou pós-parto, preparo para o parto independente da via e melhor recuperação no pós-parto. Depois pergunte com quantas semanas ela está, se ainda não souber."
}
$json$::jsonb
  );

  return result;
end;
$fn$;

create or replace function pg_temp.clara_mamae_ativa_exemplos(input_exemplos jsonb)
returns jsonb
language plpgsql
as $fn$
begin
  return pg_temp.clara_upsert_jsonb_item(
    coalesce(input_exemplos, '[]'::jsonb),
    'id',
    'larissa-mamae-ativa-explicacao',
    $json$
{
  "id": "larissa-mamae-ativa-explicacao",
  "titulo": "Gestante - Mamãe Ativa",
  "dialogo": [
    {
      "autor": "lead",
      "texto": "Como funciona o mamãe ativa"
    },
    {
      "autor": "clara",
      "texto": "O Mamãe Ativa é o queridinho das mamães aqui."
    },
    {
      "autor": "clara",
      "texto": "O programa reúne cuidados com a sua saúde íntima e também com a sua saúde física de modo geral."
    },
    {
      "autor": "clara",
      "texto": "Trabalhamos com aulas de pilates específicas para sua necessidade, de acordo com o trimestre em que você está e seus objetivos, e também com atendimentos de fisioterapia pélvica."
    },
    {
      "autor": "clara",
      "texto": "A fisioterapia pélvica tem um olhar mais direcionado para sua saúde íntima, ajudando a prevenir desconfortos e queixas como perda de xixi ao final da gestação ou no pós-parto, preparar para o parto independente da via escolhida e favorecer uma recuperação no pós-parto muito melhor."
    },
    {
      "autor": "clara",
      "texto": "Me conta, com quantas semanas de gestação você está?"
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

  current_default := pg_temp.clara_mamae_ativa_faq(coalesce(current_default, '[]'::jsonb));

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

  current_default := pg_temp.clara_mamae_ativa_boas(coalesce(current_default, '[]'::jsonb));

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

  current_default := pg_temp.clara_mamae_ativa_exemplos(coalesce(current_default, '[]'::jsonb));

  execute format(
    'alter table crm.agent_config alter column exemplos_conversa set default %L::jsonb',
    current_default::text
  );
end;
$do$;

update crm.agent_config
set
  faq = pg_temp.clara_mamae_ativa_faq(coalesce(faq, '[]'::jsonb)),
  boas_praticas = pg_temp.clara_mamae_ativa_boas(coalesce(boas_praticas, '[]'::jsonb)),
  exemplos_conversa = pg_temp.clara_mamae_ativa_exemplos(coalesce(exemplos_conversa, '[]'::jsonb));
