-- Ajusta fisio pélvica após qualificação: mandar só o texto da consulta inicial
-- e evitar "diagnóstico fisioterapêutico".

update crm.agent_config
set persona_prompt = replace(
  persona_prompt,
  'Você nunca promete cura, nunca diagnostica, nunca prescreve. Quando o assunto for clínico específico, encaminhe para uma das fisioterapeutas.',
  'Você nunca promete cura, nunca diagnostica, nunca prescreve e nunca diz que a fisioterapeuta dará um "diagnóstico fisioterapêutico" pelo WhatsApp. Quando o assunto for clínico específico, encaminhe para uma das fisioterapeutas.'
)
where persona_prompt like '%Você nunca promete cura, nunca diagnostica, nunca prescreve.%'
  and persona_prompt not like '%diagnóstico fisioterapêutico%';

update crm.agent_config
set persona_prompt = persona_prompt || E'\n\nImportante: nunca diga que a consulta dará "diagnóstico fisioterapêutico". Prefira dizer que a fisioterapeuta avalia a região pélvica e entende o histórico para orientar o acompanhamento.'
where persona_prompt not like '%diagnóstico fisioterapêutico%';

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

  select coalesce(jsonb_agg(
    case
      when item.value ->> 'id' = 'fisio-pelvica-consulta-inicial' then
        jsonb_set(
          item.value,
          '{detail}',
          to_jsonb('Quando a pessoa perguntar como funciona ou qual o valor da fisioterapia pélvica, não ofereça aula experimental gratuita nem avaliação gratuita. Explique que começamos com uma consulta inicial: a fisioterapeuta conversa, entende o histórico e avalia a região pélvica para identificar como estão os músculos íntimos e o abdômen. Informe valor e duração somente se a pessoa perguntar preço/valor ou "quanto fica".'::text)
        )
      else item.value
    end
    order by item.ordinality
  ), '[]'::jsonb)
  into current_default
  from jsonb_array_elements(current_default) with ordinality as item(value, ordinality);

  if not exists (
    select 1
    from jsonb_array_elements(current_default) item
    where item ->> 'id' = 'fisio-pelvica-pos-qualificacao-consulta-curta'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "fisio-pelvica-pos-qualificacao-consulta-curta",
    "title": "Depois da queixa, só consulta inicial.",
    "detail": "Quando a lead de fisioterapia pélvica já respondeu sobre a queixa, como escape de urina/perdas durante exercício, dor na relação ou desconforto íntimo, não mande nova explicação clínica e não faça outra pergunta antes. Envie só: \"Como funciona aqui: a gente começa com uma *consulta inicial*. Nela a fisioterapeuta conversa com você, entende seu histórico e faz uma avaliação da região pélvica, para identificar como estão os seus músculos íntimos e seu abdômen. É um momento bem tranquilo e seguro.\" Não fale \"diagnóstico fisioterapêutico\", não diga 50 minutos e não chame de avaliação inicial."
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
    where item ->> 'id' = 'larissa-fisio-pelvica-escape-pos-qualificacao'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "larissa-fisio-pelvica-escape-pos-qualificacao",
    "titulo": "Fisio pélvica - escape após qualificação",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "Faz alguns meses, e normalmente é fazendo exercício"
      },
      {
        "autor": "clara",
        "texto": "Como funciona aqui: a gente começa com uma *consulta inicial*. Nela a fisioterapeuta conversa com você, entende seu histórico e faz uma avaliação da região pélvica, para identificar como estão os seus músculos íntimos e seu abdômen. É um momento bem tranquilo e seguro."
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
set boas_praticas = updated.boas_praticas
from (
  select c.id,
    coalesce(jsonb_agg(
      case
        when item.value ->> 'id' = 'fisio-pelvica-consulta-inicial' then
          jsonb_set(
            item.value,
            '{detail}',
            to_jsonb('Quando a pessoa perguntar como funciona ou qual o valor da fisioterapia pélvica, não ofereça aula experimental gratuita nem avaliação gratuita. Explique que começamos com uma consulta inicial: a fisioterapeuta conversa, entende o histórico e avalia a região pélvica para identificar como estão os músculos íntimos e o abdômen. Informe valor e duração somente se a pessoa perguntar preço/valor ou "quanto fica".'::text)
          )
        else item.value
      end
      order by item.ordinality
    ), '[]'::jsonb) as boas_praticas
  from crm.agent_config c
  cross join lateral jsonb_array_elements(coalesce(c.boas_praticas, '[]'::jsonb)) with ordinality as item(value, ordinality)
  group by c.id
) updated
where c.id = updated.id
  and exists (
    select 1
    from jsonb_array_elements(coalesce(c.boas_praticas, '[]'::jsonb)) item
    where item ->> 'id' = 'fisio-pelvica-consulta-inicial'
  );

update crm.agent_config c
set boas_praticas = coalesce(c.boas_praticas, '[]'::jsonb) || $json$
[
  {
    "id": "fisio-pelvica-pos-qualificacao-consulta-curta",
    "title": "Depois da queixa, só consulta inicial.",
    "detail": "Quando a lead de fisioterapia pélvica já respondeu sobre a queixa, como escape de urina/perdas durante exercício, dor na relação ou desconforto íntimo, não mande nova explicação clínica e não faça outra pergunta antes. Envie só: \"Como funciona aqui: a gente começa com uma *consulta inicial*. Nela a fisioterapeuta conversa com você, entende seu histórico e faz uma avaliação da região pélvica, para identificar como estão os seus músculos íntimos e seu abdômen. É um momento bem tranquilo e seguro.\" Não fale \"diagnóstico fisioterapêutico\", não diga 50 minutos e não chame de avaliação inicial."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.boas_praticas, '[]'::jsonb)) item
  where item ->> 'id' = 'fisio-pelvica-pos-qualificacao-consulta-curta'
);

update crm.agent_config c
set exemplos_conversa = coalesce(c.exemplos_conversa, '[]'::jsonb) || $json$
[
  {
    "id": "larissa-fisio-pelvica-escape-pos-qualificacao",
    "titulo": "Fisio pélvica - escape após qualificação",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "Faz alguns meses, e normalmente é fazendo exercício"
      },
      {
        "autor": "clara",
        "texto": "Como funciona aqui: a gente começa com uma *consulta inicial*. Nela a fisioterapeuta conversa com você, entende seu histórico e faz uma avaliação da região pélvica, para identificar como estão os seus músculos íntimos e seu abdômen. É um momento bem tranquilo e seguro."
      }
    ]
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.exemplos_conversa, '[]'::jsonb)) item
  where item ->> 'id' = 'larissa-fisio-pelvica-escape-pos-qualificacao'
);
