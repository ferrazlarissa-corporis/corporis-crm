-- Generaliza o fluxo após queixas de fisioterapia pélvica fora da gestação:
-- prova social cuidadosa + consulta inicial de 1h a 1h20, sem explicação clínica no WhatsApp.

update crm.agent_config
set persona_prompt = replace(
  persona_prompt,
  'Tom: cuidadosa, técnica e acolhedora. Você escuta antes de informar. Você nunca promete cura, nunca diagnostica, nunca prescreve e nunca diz que a fisioterapeuta dará um "diagnóstico fisioterapêutico" pelo WhatsApp. Quando o assunto for clínico específico, encaminhe para uma das fisioterapeutas.',
  'Tom: cuidadosa, técnica e acolhedora. Você escuta antes de informar. Você nunca promete cura, nunca diagnostica e nunca prescreve pelo WhatsApp. Pode explicar que, na consulta inicial presencial de fisioterapia pélvica, a fisioterapeuta faz avaliação e pode chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado. Quando o assunto for clínico específico, encaminhe para uma das fisioterapeutas.'
)
where persona_prompt like '%nunca diz que a fisioterapeuta dará um "diagnóstico fisioterapêutico" pelo WhatsApp%';

update crm.agent_config
set persona_prompt = persona_prompt || E'\n\nImportante: quando a lead trouxer qualquer queixa de fisioterapia pélvica fora da gestação, como endometriose, dores, dor na relação, escape de urina, perdas durante exercício, desconforto íntimo ou indicação médica, não explique mecanismo clínico pelo WhatsApp e não prometa melhora. Diga que já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa e explique que o primeiro passo é a consulta inicial, que pode variar de 1h a 1h20, com avaliação prática da região pélvica e diagnóstico fisioterapêutico para traçar um plano personalizado.'
where persona_prompt not like '%qualquer queixa de fisioterapia pélvica fora da gestação%';

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
    where item ->> 'q' = 'Como responder qualquer queixa de fisioterapia pélvica fora da gestação?'
  ) then
    current_default := current_default || $json$
[
  {
    "q": "Como responder qualquer queixa de fisioterapia pélvica fora da gestação?",
    "a": "Quando a lead trouxer uma queixa de fisioterapia pélvica que não seja gestação, como endometriose, dores, dor na relação, escape de urina, perdas durante exercício, desconforto íntimo ou indicação médica, não explique mecanismo clínico pelo WhatsApp e não prometa melhora. Responda com prova social cuidadosa: \"Inclusive já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa que você.\" Depois explique: \"O primeiro passo é a nossa consulta inicial. Esse encontro pode variar de 1h a 1h20, e é onde a gente consegue entender melhor como você está, investigar algumas questões da sua saúde íntima e geral e fazer uma avaliação prática da sua região pélvica, para identificar como estão os seus músculos íntimos e abdômen. E assim chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado para o seu caso.\" Não chame de avaliação inicial e não pergunte disponibilidade nessa mesma resposta, a menos que ela já tenha pedido para agendar."
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

  current_default := (
    select coalesce(
      jsonb_agg(
        case
          when item.value ->> 'id' = 'fisio-pelvica-pos-qualificacao-consulta-curta' then
            item.value || $json$
{
  "title": "Depois da queixa, consulta inicial.",
  "detail": "Quando a lead de fisioterapia pélvica trouxer uma queixa fora de gestação, como endometriose, dores, dor na relação, escape de urina, perdas durante exercício, desconforto íntimo ou indicação médica, não mande explicação clínica do mecanismo e não prometa melhora. Diga que já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa. Depois explique que o primeiro passo é a consulta inicial, que pode variar de 1h a 1h20, com conversa sobre saúde íntima e geral, avaliação prática da região pélvica, identificação de músculos íntimos e abdômen, e diagnóstico fisioterapêutico para traçar um plano personalizado. Não chame de avaliação inicial e não pergunte disponibilidade nessa mesma resposta, a menos que ela já tenha pedido para agendar."
}
$json$::jsonb
          else item.value
        end
        order by item.ordinality
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(current_default) with ordinality as item(value, ordinality)
  );

  if not exists (
    select 1
    from jsonb_array_elements(current_default) item
    where item ->> 'id' = 'fisio-pelvica-pos-qualificacao-consulta-curta'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "fisio-pelvica-pos-qualificacao-consulta-curta",
    "title": "Depois da queixa, consulta inicial.",
    "detail": "Quando a lead de fisioterapia pélvica trouxer uma queixa fora de gestação, como endometriose, dores, dor na relação, escape de urina, perdas durante exercício, desconforto íntimo ou indicação médica, não mande explicação clínica do mecanismo e não prometa melhora. Diga que já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa. Depois explique que o primeiro passo é a consulta inicial, que pode variar de 1h a 1h20, com conversa sobre saúde íntima e geral, avaliação prática da região pélvica, identificação de músculos íntimos e abdômen, e diagnóstico fisioterapêutico para traçar um plano personalizado. Não chame de avaliação inicial e não pergunte disponibilidade nessa mesma resposta, a menos que ela já tenha pedido para agendar."
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

  current_default := (
    select coalesce(
      jsonb_agg(
        case
          when item.value ->> 'id' = 'larissa-fisio-pelvica-escape-pos-qualificacao' then
            $json$
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
      "texto": "Inclusive já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa que você."
    },
    {
      "autor": "clara",
      "texto": "O primeiro passo é a nossa consulta inicial. Esse encontro pode variar de 1h a 1h20, e é onde a gente consegue entender melhor como você está, investigar algumas questões da sua saúde íntima e geral e fazer uma avaliação prática da sua região pélvica, para identificar como estão os seus músculos íntimos e abdômen."
    },
    {
      "autor": "clara",
      "texto": "E assim chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado para o seu caso."
    }
  ]
}
$json$::jsonb
          else item.value
        end
        order by item.ordinality
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(current_default) with ordinality as item(value, ordinality)
  );

  if not exists (
    select 1
    from jsonb_array_elements(current_default) item
    where item ->> 'id' = 'larissa-fisio-pelvica-queixa-nao-gestante-consulta'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "larissa-fisio-pelvica-queixa-nao-gestante-consulta",
    "titulo": "Fisio pélvica - queixa não gestante",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "tenho endometriose e dores, busco por isso, foi indicação médica"
      },
      {
        "autor": "clara",
        "texto": "Entendi. Inclusive já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa que você."
      },
      {
        "autor": "clara",
        "texto": "O primeiro passo é a nossa consulta inicial. Esse encontro pode variar de 1h a 1h20, e é onde a gente consegue entender melhor como você está, investigar algumas questões da sua saúde íntima e geral e fazer uma avaliação prática da sua região pélvica, para identificar como estão os seus músculos íntimos e abdômen."
      },
      {
        "autor": "clara",
        "texto": "E assim chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado para o seu caso."
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
    "q": "Como responder qualquer queixa de fisioterapia pélvica fora da gestação?",
    "a": "Quando a lead trouxer uma queixa de fisioterapia pélvica que não seja gestação, como endometriose, dores, dor na relação, escape de urina, perdas durante exercício, desconforto íntimo ou indicação médica, não explique mecanismo clínico pelo WhatsApp e não prometa melhora. Responda com prova social cuidadosa: \"Inclusive já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa que você.\" Depois explique: \"O primeiro passo é a nossa consulta inicial. Esse encontro pode variar de 1h a 1h20, e é onde a gente consegue entender melhor como você está, investigar algumas questões da sua saúde íntima e geral e fazer uma avaliação prática da sua região pélvica, para identificar como estão os seus músculos íntimos e abdômen. E assim chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado para o seu caso.\" Não chame de avaliação inicial e não pergunte disponibilidade nessa mesma resposta, a menos que ela já tenha pedido para agendar."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.faq, '[]'::jsonb)) item
  where item ->> 'q' = 'Como responder qualquer queixa de fisioterapia pélvica fora da gestação?'
);

update crm.agent_config c
set boas_praticas = updated.boas_praticas
from (
  select
    c.id,
    coalesce(
      jsonb_agg(
        case
          when item.value ->> 'id' = 'fisio-pelvica-pos-qualificacao-consulta-curta' then
            item.value || $json$
{
  "title": "Depois da queixa, consulta inicial.",
  "detail": "Quando a lead de fisioterapia pélvica trouxer uma queixa fora de gestação, como endometriose, dores, dor na relação, escape de urina, perdas durante exercício, desconforto íntimo ou indicação médica, não mande explicação clínica do mecanismo e não prometa melhora. Diga que já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa. Depois explique que o primeiro passo é a consulta inicial, que pode variar de 1h a 1h20, com conversa sobre saúde íntima e geral, avaliação prática da região pélvica, identificação de músculos íntimos e abdômen, e diagnóstico fisioterapêutico para traçar um plano personalizado. Não chame de avaliação inicial e não pergunte disponibilidade nessa mesma resposta, a menos que ela já tenha pedido para agendar."
}
$json$::jsonb
          else item.value
        end
        order by item.ordinality
      ),
      '[]'::jsonb
    ) as boas_praticas
  from crm.agent_config c
  cross join lateral jsonb_array_elements(coalesce(c.boas_praticas, '[]'::jsonb)) with ordinality as item(value, ordinality)
  group by c.id
) updated
where c.id = updated.id
  and exists (
    select 1
    from jsonb_array_elements(coalesce(c.boas_praticas, '[]'::jsonb)) item
    where item ->> 'id' = 'fisio-pelvica-pos-qualificacao-consulta-curta'
  );

update crm.agent_config c
set boas_praticas = coalesce(c.boas_praticas, '[]'::jsonb) || $json$
[
  {
    "id": "fisio-pelvica-pos-qualificacao-consulta-curta",
    "title": "Depois da queixa, consulta inicial.",
    "detail": "Quando a lead de fisioterapia pélvica trouxer uma queixa fora de gestação, como endometriose, dores, dor na relação, escape de urina, perdas durante exercício, desconforto íntimo ou indicação médica, não mande explicação clínica do mecanismo e não prometa melhora. Diga que já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa. Depois explique que o primeiro passo é a consulta inicial, que pode variar de 1h a 1h20, com conversa sobre saúde íntima e geral, avaliação prática da região pélvica, identificação de músculos íntimos e abdômen, e diagnóstico fisioterapêutico para traçar um plano personalizado. Não chame de avaliação inicial e não pergunte disponibilidade nessa mesma resposta, a menos que ela já tenha pedido para agendar."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.boas_praticas, '[]'::jsonb)) item
  where item ->> 'id' = 'fisio-pelvica-pos-qualificacao-consulta-curta'
);

update crm.agent_config c
set exemplos_conversa = updated.exemplos_conversa
from (
  select
    c.id,
    coalesce(
      jsonb_agg(
        case
          when item.value ->> 'id' = 'larissa-fisio-pelvica-escape-pos-qualificacao' then
            $json$
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
      "texto": "Inclusive já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa que você."
    },
    {
      "autor": "clara",
      "texto": "O primeiro passo é a nossa consulta inicial. Esse encontro pode variar de 1h a 1h20, e é onde a gente consegue entender melhor como você está, investigar algumas questões da sua saúde íntima e geral e fazer uma avaliação prática da sua região pélvica, para identificar como estão os seus músculos íntimos e abdômen."
    },
    {
      "autor": "clara",
      "texto": "E assim chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado para o seu caso."
    }
  ]
}
$json$::jsonb
          else item.value
        end
        order by item.ordinality
      ),
      '[]'::jsonb
    ) as exemplos_conversa
  from crm.agent_config c
  cross join lateral jsonb_array_elements(coalesce(c.exemplos_conversa, '[]'::jsonb)) with ordinality as item(value, ordinality)
  group by c.id
) updated
where c.id = updated.id
  and exists (
    select 1
    from jsonb_array_elements(coalesce(c.exemplos_conversa, '[]'::jsonb)) item
    where item ->> 'id' = 'larissa-fisio-pelvica-escape-pos-qualificacao'
  );

update crm.agent_config c
set exemplos_conversa = coalesce(c.exemplos_conversa, '[]'::jsonb) || $json$
[
  {
    "id": "larissa-fisio-pelvica-queixa-nao-gestante-consulta",
    "titulo": "Fisio pélvica - queixa não gestante",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "tenho endometriose e dores, busco por isso, foi indicação médica"
      },
      {
        "autor": "clara",
        "texto": "Entendi. Inclusive já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa que você."
      },
      {
        "autor": "clara",
        "texto": "O primeiro passo é a nossa consulta inicial. Esse encontro pode variar de 1h a 1h20, e é onde a gente consegue entender melhor como você está, investigar algumas questões da sua saúde íntima e geral e fazer uma avaliação prática da sua região pélvica, para identificar como estão os seus músculos íntimos e abdômen."
      },
      {
        "autor": "clara",
        "texto": "E assim chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado para o seu caso."
      }
    ]
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.exemplos_conversa, '[]'::jsonb)) item
  where item ->> 'id' = 'larissa-fisio-pelvica-queixa-nao-gestante-consulta'
);
