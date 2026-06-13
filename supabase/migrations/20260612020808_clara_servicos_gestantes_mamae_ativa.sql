-- Ensina a Clara a explicar corretamente os serviços para gestantes:
-- Gestar em Movimento, Fisioterapia Pélvica e Mamãe Ativa.

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

  if not exists (
    select 1
    from jsonb_array_elements(current_default) item
    where item ->> 'q' = 'Como funcionam os serviços para gestantes?'
  ) then
    current_default := current_default || $json$
[
  {
    "q": "Como funcionam os serviços para gestantes?",
    "a": "Temos três caminhos para gestantes. O plano de Pilates Gestar em Movimento é estruturado por fases da gestação, respeitando o tempo, as mudanças do corpo e as necessidades de adaptação em cada etapa; a aluna entra na fase correspondente à semana gestacional atual. A Fisioterapia Pélvica é um acompanhamento mais específico da musculatura pélvica e do abdômen, importante para preparação para o parto, independente da via escolhida, e para uma recuperação melhor no pós-parto. O Mamãe Ativa é o programa mais completo, com atendimentos de fisioterapia pélvica + aulas de pilates, para cuidar da saúde íntima, prevenir queixas comuns da gestação e se manter ativa evitando dores e desconfortos. Os serviços para gestantes são separados por trimestre gestacional; o que varia é a frequência dos atendimentos de fisioterapia pélvica. Para explicar com mais detalhes, agendamos uma consulta inicial para entender o histórico gestacional, a saúde de modo geral e avaliar região pélvica e abdômen."
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

  if not exists (
    select 1
    from jsonb_array_elements(current_default) item
    where item ->> 'id' = 'gestantes-tres-caminhos'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "gestantes-tres-caminhos",
    "title": "Gestantes têm três caminhos.",
    "detail": "Quando uma gestante pedir para entender os serviços, não resuma em \"pilates para gestantes\" e \"fisioterapia pélvica\". Explique Gestar em Movimento, Fisioterapia Pélvica e Mamãe Ativa, destacando fases/trimestres e consulta inicial para detalhar frequência."
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

  if not exists (
    select 1
    from jsonb_array_elements(current_default) item
    where item ->> 'id' = 'larissa-gestante-explica-servicos'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "larissa-gestante-explica-servicos",
    "titulo": "Gestante — explicar serviços",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "Estou de 13 semanas"
      },
      {
        "autor": "clara",
        "texto": "Que fase linda, ainda no comecinho!"
      },
      {
        "autor": "clara",
        "texto": "E você tem alguma queixa específica, como dores nas costas, quadril, ou é mais para se manter ativa e se preparar para o parto?"
      },
      {
        "autor": "lead",
        "texto": "Ainda não tenho certeza, pode me explicar um pouquinho de como é o serviço de vocês?"
      },
      {
        "autor": "clara",
        "texto": "Claro, com prazer!"
      },
      {
        "autor": "clara",
        "texto": "Nós temos o plano de pilates *Gestar em Movimento*, que é estruturado por fases da gestação, respeitando o tempo, as mudanças do seu corpo e as necessidades de adaptação em cada etapa. Você entra na fase correspondente à sua semana gestacional atual."
      },
      {
        "autor": "clara",
        "texto": "Também temos o acompanhamento na *Fisioterapia Pélvica*, um cuidado mais específico com a musculatura pélvica e abdômen, muito importante para a preparação para o parto, independente da via que você escolher, e para uma recuperação melhor no pós-parto."
      },
      {
        "autor": "clara",
        "texto": "E temos o *Mamãe Ativa*, que é o nosso programa com atendimentos de fisioterapia pélvica + aulas de pilates. É um programa mais completo para quem quer cuidar da saúde íntima, prevenir queixas comuns da gestação e também se manter ativa, evitando dores e desconfortos."
      },
      {
        "autor": "clara",
        "texto": "Os serviços para gestantes são separados por trimestre gestacional. O que varia, principalmente na fisioterapia pélvica, é a frequência dos atendimentos."
      },
      {
        "autor": "clara",
        "texto": "Para te explicar com mais detalhes, agendamos uma consulta inicial para entender melhor seu histórico gestacional, sua saúde de modo geral e avaliar sua região pélvica e abdômen."
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
set faq = c.faq || $json$
[
  {
    "q": "Como funcionam os serviços para gestantes?",
    "a": "Temos três caminhos para gestantes. O plano de Pilates Gestar em Movimento é estruturado por fases da gestação, respeitando o tempo, as mudanças do corpo e as necessidades de adaptação em cada etapa; a aluna entra na fase correspondente à semana gestacional atual. A Fisioterapia Pélvica é um acompanhamento mais específico da musculatura pélvica e do abdômen, importante para preparação para o parto, independente da via escolhida, e para uma recuperação melhor no pós-parto. O Mamãe Ativa é o programa mais completo, com atendimentos de fisioterapia pélvica + aulas de pilates, para cuidar da saúde íntima, prevenir queixas comuns da gestação e se manter ativa evitando dores e desconfortos. Os serviços para gestantes são separados por trimestre gestacional; o que varia é a frequência dos atendimentos de fisioterapia pélvica. Para explicar com mais detalhes, agendamos uma consulta inicial para entender o histórico gestacional, a saúde de modo geral e avaliar região pélvica e abdômen."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(c.faq) item
  where item ->> 'q' = 'Como funcionam os serviços para gestantes?'
);

update crm.agent_config c
set boas_praticas = c.boas_praticas || $json$
[
  {
    "id": "gestantes-tres-caminhos",
    "title": "Gestantes têm três caminhos.",
    "detail": "Quando uma gestante pedir para entender os serviços, não resuma em \"pilates para gestantes\" e \"fisioterapia pélvica\". Explique Gestar em Movimento, Fisioterapia Pélvica e Mamãe Ativa, destacando fases/trimestres e consulta inicial para detalhar frequência."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(c.boas_praticas) item
  where item ->> 'id' = 'gestantes-tres-caminhos'
);

update crm.agent_config c
set exemplos_conversa = c.exemplos_conversa || $json$
[
  {
    "id": "larissa-gestante-explica-servicos",
    "titulo": "Gestante — explicar serviços",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "Estou de 13 semanas"
      },
      {
        "autor": "clara",
        "texto": "Que fase linda, ainda no comecinho!"
      },
      {
        "autor": "clara",
        "texto": "E você tem alguma queixa específica, como dores nas costas, quadril, ou é mais para se manter ativa e se preparar para o parto?"
      },
      {
        "autor": "lead",
        "texto": "Ainda não tenho certeza, pode me explicar um pouquinho de como é o serviço de vocês?"
      },
      {
        "autor": "clara",
        "texto": "Claro, com prazer!"
      },
      {
        "autor": "clara",
        "texto": "Nós temos o plano de pilates *Gestar em Movimento*, que é estruturado por fases da gestação, respeitando o tempo, as mudanças do seu corpo e as necessidades de adaptação em cada etapa. Você entra na fase correspondente à sua semana gestacional atual."
      },
      {
        "autor": "clara",
        "texto": "Também temos o acompanhamento na *Fisioterapia Pélvica*, um cuidado mais específico com a musculatura pélvica e abdômen, muito importante para a preparação para o parto, independente da via que você escolher, e para uma recuperação melhor no pós-parto."
      },
      {
        "autor": "clara",
        "texto": "E temos o *Mamãe Ativa*, que é o nosso programa com atendimentos de fisioterapia pélvica + aulas de pilates. É um programa mais completo para quem quer cuidar da saúde íntima, prevenir queixas comuns da gestação e também se manter ativa, evitando dores e desconfortos."
      },
      {
        "autor": "clara",
        "texto": "Os serviços para gestantes são separados por trimestre gestacional. O que varia, principalmente na fisioterapia pélvica, é a frequência dos atendimentos."
      },
      {
        "autor": "clara",
        "texto": "Para te explicar com mais detalhes, agendamos uma consulta inicial para entender melhor seu histórico gestacional, sua saúde de modo geral e avaliar sua região pélvica e abdômen."
      }
    ]
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(c.exemplos_conversa) item
  where item ->> 'id' = 'larissa-gestante-explica-servicos'
);
