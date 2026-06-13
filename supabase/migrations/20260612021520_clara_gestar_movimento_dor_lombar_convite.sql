-- Ensina a Clara a responder gestantes com dor lombar usando o Gestar em Movimento
-- e convidando para aula experimental avaliativa.

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
    where item ->> 'q' = 'Como funciona o Gestar em Movimento para dor lombar na gestação?'
  ) then
    current_default := current_default || $json$
[
  {
    "q": "Como funciona o Gestar em Movimento para dor lombar na gestação?",
    "a": "O Gestar em Movimento, nosso plano para gestantes, é estruturado por fases da gestação. Cada exercício respeita o momento do corpo e vai se adaptando conforme a aluna avança na gravidez. Ela entra na fase correspondente à semana gestacional atual e pode fazer o plano por fases ou o plano completo até o parto. Dor lombar é uma queixa bem comum na gestação, e costumamos trabalhar muito bem isso ao longo do acompanhamento. Depois de acolher a queixa, convide para a aula experimental avaliativa: nesse encontro entendemos como ela está até agora, avaliamos os movimentos e ela pode vivenciar no corpo como o pilates pode ajudar nesse momento especial."
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
    where item ->> 'id' = 'gestar-dor-lombar-convite'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "gestar-dor-lombar-convite",
    "title": "Gestar com dor lombar.",
    "detail": "Quando a gestante relatar dor lombar e preparo para o parto, fale do Gestar em Movimento pelo nome: plano estruturado por fases da gestação, com exercícios adaptados conforme ela avança, entrada na fase da semana gestacional atual e opção de fazer por fases ou completo até o parto. Diga que dor lombar é comum e que costumamos trabalhar isso bem no acompanhamento. Em seguida, convide para a aula experimental avaliativa, explicando que entendemos como ela está, avaliamos os movimentos e ela vivencia como o pilates pode ajudar."
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
    where item ->> 'id' = 'larissa-gestar-dor-lombar-preparo-parto'
  ) then
    current_default := current_default || $json$
[
  {
    "id": "larissa-gestar-dor-lombar-preparo-parto",
    "titulo": "Gestante — dor lombar e preparo para o parto",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "tenho dor na lombar e quero fazer atividade pra me preparar para o parto"
      },
      {
        "autor": "clara",
        "texto": "O Gestar em Movimento, nosso plano para gestantes, aqui é bem específico: ele é estruturado por fases da gestação, cada exercício respeita o momento do seu corpo e vai se adaptando conforme você avança na gravidez."
      },
      {
        "autor": "clara",
        "texto": "Você entra na fase correspondente à sua semana gestacional atual e pode fazer o plano por fases ou o plano completo até o parto."
      },
      {
        "autor": "clara",
        "texto": "A dor lombar é uma queixa bem comum, e costumamos conseguir trabalhar muito bem isso ao longo do acompanhamento."
      },
      {
        "autor": "clara",
        "texto": "Tenho um convite para te fazer: nós oferecemos uma aula experimental avaliativa."
      },
      {
        "autor": "clara",
        "texto": "Nesse encontro, entendemos como você está até agora, avaliamos os seus movimentos e você pode vivenciar no seu corpo como o pilates pode te ajudar nesse momento tão especial."
      },
      {
        "autor": "clara",
        "texto": "Qual a sua disponibilidade, consegue durante o dia ou fica melhor após às 18h?"
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
    "q": "Como funciona o Gestar em Movimento para dor lombar na gestação?",
    "a": "O Gestar em Movimento, nosso plano para gestantes, é estruturado por fases da gestação. Cada exercício respeita o momento do corpo e vai se adaptando conforme a aluna avança na gravidez. Ela entra na fase correspondente à semana gestacional atual e pode fazer o plano por fases ou o plano completo até o parto. Dor lombar é uma queixa bem comum na gestação, e costumamos trabalhar muito bem isso ao longo do acompanhamento. Depois de acolher a queixa, convide para a aula experimental avaliativa: nesse encontro entendemos como ela está até agora, avaliamos os movimentos e ela pode vivenciar no corpo como o pilates pode ajudar nesse momento especial."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.faq, '[]'::jsonb)) item
  where item ->> 'q' = 'Como funciona o Gestar em Movimento para dor lombar na gestação?'
);

update crm.agent_config c
set boas_praticas = coalesce(c.boas_praticas, '[]'::jsonb) || $json$
[
  {
    "id": "gestar-dor-lombar-convite",
    "title": "Gestar com dor lombar.",
    "detail": "Quando a gestante relatar dor lombar e preparo para o parto, fale do Gestar em Movimento pelo nome: plano estruturado por fases da gestação, com exercícios adaptados conforme ela avança, entrada na fase da semana gestacional atual e opção de fazer por fases ou completo até o parto. Diga que dor lombar é comum e que costumamos trabalhar isso bem no acompanhamento. Em seguida, convide para a aula experimental avaliativa, explicando que entendemos como ela está, avaliamos os movimentos e ela vivencia como o pilates pode ajudar."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.boas_praticas, '[]'::jsonb)) item
  where item ->> 'id' = 'gestar-dor-lombar-convite'
);

update crm.agent_config c
set exemplos_conversa = coalesce(c.exemplos_conversa, '[]'::jsonb) || $json$
[
  {
    "id": "larissa-gestar-dor-lombar-preparo-parto",
    "titulo": "Gestante — dor lombar e preparo para o parto",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "tenho dor na lombar e quero fazer atividade pra me preparar para o parto"
      },
      {
        "autor": "clara",
        "texto": "O Gestar em Movimento, nosso plano para gestantes, aqui é bem específico: ele é estruturado por fases da gestação, cada exercício respeita o momento do seu corpo e vai se adaptando conforme você avança na gravidez."
      },
      {
        "autor": "clara",
        "texto": "Você entra na fase correspondente à sua semana gestacional atual e pode fazer o plano por fases ou o plano completo até o parto."
      },
      {
        "autor": "clara",
        "texto": "A dor lombar é uma queixa bem comum, e costumamos conseguir trabalhar muito bem isso ao longo do acompanhamento."
      },
      {
        "autor": "clara",
        "texto": "Tenho um convite para te fazer: nós oferecemos uma aula experimental avaliativa."
      },
      {
        "autor": "clara",
        "texto": "Nesse encontro, entendemos como você está até agora, avaliamos os seus movimentos e você pode vivenciar no seu corpo como o pilates pode te ajudar nesse momento tão especial."
      },
      {
        "autor": "clara",
        "texto": "Qual a sua disponibilidade, consegue durante o dia ou fica melhor após às 18h?"
      }
    ]
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.exemplos_conversa, '[]'::jsonb)) item
  where item ->> 'id' = 'larissa-gestar-dor-lombar-preparo-parto'
);
