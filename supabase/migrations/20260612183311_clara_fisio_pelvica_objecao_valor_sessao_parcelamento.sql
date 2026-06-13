-- Ajusta a objeção de valor das sessões em fisioterapia pélvica não gestante:
-- dar referência do atendimento avulso e explicar parcelamento do plano.

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

  current_default := pg_temp.clara_upsert_jsonb_item(
    coalesce(current_default, '[]'::jsonb),
    'q',
    'Como responder quando a lead não quer agendar sem saber o valor da sessão?',
    $json$
{
  "q": "Como responder quando a lead não quer agendar sem saber o valor da sessão?",
  "a": "Quando a lead de fisioterapia pélvica fora de gestação disser que não vai agendar, não quer marcar ou precisa saber o valor da sessão/tratamento para decidir se consegue fazer, não diga que a avaliação é gratuita, não fale em 50 minutos, não diga que ela pode vir sem custo e não responda \"sem compromisso\". Responda: \"Não cobramos o valor avulso de cada atendimento, que é R$ 170,00, mas sim o valor total do plano parcelado no cartão de crédito em até 10x sem juros, o que ajuda bastante na organização.\" Depois pergunte: \"Vamos agendar uma primeira consulta para avaliação, [nome]?\""
}
$json$::jsonb
  );

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

  current_default := pg_temp.clara_upsert_jsonb_item(
    coalesce(current_default, '[]'::jsonb),
    'id',
    'fisio-pelvica-objecao-valor-sessao',
    $json$
{
  "id": "fisio-pelvica-objecao-valor-sessao",
  "title": "Objeção sobre valor da sessão.",
  "detail": "Se, no fluxo de fisioterapia pélvica fora de gestação, a pessoa disser que não vai agendar ou que precisa saber o valor da sessão/tratamento para decidir se consegue fazer, não diga que é gratuito, não fale em 50 minutos, não diga que ela pode ir sem custo e não responda \"sem compromisso\". Diga que não cobramos o valor avulso de cada atendimento, que é R$ 170,00, mas sim o valor total do plano parcelado no cartão de crédito em até 10x sem juros. Depois pergunte se podemos agendar uma primeira consulta para avaliação, chamando a lead pelo nome."
}
$json$::jsonb
  );

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

  current_default := pg_temp.clara_upsert_jsonb_item(
    coalesce(current_default, '[]'::jsonb),
    'id',
    'larissa-fisio-pelvica-objecao-valor-sessao',
    $json$
{
  "id": "larissa-fisio-pelvica-objecao-valor-sessao",
  "titulo": "Fisio pélvica - objeção sobre valor da sessão",
  "dialogo": [
    {
      "autor": "lead",
      "texto": "Entendi. Então muito obrigada, não vou agendar, pois preciso saber quanto é o valor da sessão depois se vou conseguir fazer."
    },
    {
      "autor": "clara",
      "texto": "Não cobramos o valor avulso de cada atendimento, que é R$ 170,00, mas sim o valor total do plano parcelado no cartão de crédito em até 10x sem juros, o que ajuda bastante na organização."
    },
    {
      "autor": "clara",
      "texto": "Vamos agendar uma primeira consulta para avaliação, Larissa?"
    }
  ]
}
$json$::jsonb
  );

  execute format(
    'alter table crm.agent_config alter column exemplos_conversa set default %L::jsonb',
    current_default::text
  );
end;
$do$;

update crm.agent_config
set
  faq = pg_temp.clara_upsert_jsonb_item(
    coalesce(faq, '[]'::jsonb),
    'q',
    'Como responder quando a lead não quer agendar sem saber o valor da sessão?',
    $json$
{
  "q": "Como responder quando a lead não quer agendar sem saber o valor da sessão?",
  "a": "Quando a lead de fisioterapia pélvica fora de gestação disser que não vai agendar, não quer marcar ou precisa saber o valor da sessão/tratamento para decidir se consegue fazer, não diga que a avaliação é gratuita, não fale em 50 minutos, não diga que ela pode vir sem custo e não responda \"sem compromisso\". Responda: \"Não cobramos o valor avulso de cada atendimento, que é R$ 170,00, mas sim o valor total do plano parcelado no cartão de crédito em até 10x sem juros, o que ajuda bastante na organização.\" Depois pergunte: \"Vamos agendar uma primeira consulta para avaliação, [nome]?\""
}
$json$::jsonb
  ),
  boas_praticas = pg_temp.clara_upsert_jsonb_item(
    coalesce(boas_praticas, '[]'::jsonb),
    'id',
    'fisio-pelvica-objecao-valor-sessao',
    $json$
{
  "id": "fisio-pelvica-objecao-valor-sessao",
  "title": "Objeção sobre valor da sessão.",
  "detail": "Se, no fluxo de fisioterapia pélvica fora de gestação, a pessoa disser que não vai agendar ou que precisa saber o valor da sessão/tratamento para decidir se consegue fazer, não diga que é gratuito, não fale em 50 minutos, não diga que ela pode ir sem custo e não responda \"sem compromisso\". Diga que não cobramos o valor avulso de cada atendimento, que é R$ 170,00, mas sim o valor total do plano parcelado no cartão de crédito em até 10x sem juros. Depois pergunte se podemos agendar uma primeira consulta para avaliação, chamando a lead pelo nome."
}
$json$::jsonb
  ),
  exemplos_conversa = pg_temp.clara_upsert_jsonb_item(
    coalesce(exemplos_conversa, '[]'::jsonb),
    'id',
    'larissa-fisio-pelvica-objecao-valor-sessao',
    $json$
{
  "id": "larissa-fisio-pelvica-objecao-valor-sessao",
  "titulo": "Fisio pélvica - objeção sobre valor da sessão",
  "dialogo": [
    {
      "autor": "lead",
      "texto": "Entendi. Então muito obrigada, não vou agendar, pois preciso saber quanto é o valor da sessão depois se vou conseguir fazer."
    },
    {
      "autor": "clara",
      "texto": "Não cobramos o valor avulso de cada atendimento, que é R$ 170,00, mas sim o valor total do plano parcelado no cartão de crédito em até 10x sem juros, o que ajuda bastante na organização."
    },
    {
      "autor": "clara",
      "texto": "Vamos agendar uma primeira consulta para avaliação, Larissa?"
    }
  ]
}
$json$::jsonb
  );
