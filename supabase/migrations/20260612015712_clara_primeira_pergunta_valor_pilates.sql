-- Diferencia o primeiro pedido de preço do Pilates da insistência em valores.
-- Primeiro pedido: informa que existem planos e volta para qualificação.
-- Insistência: pergunta frequência e passa tabela/link.

alter table crm.agent_config
  alter column faq set default $json$
[
  {
    "q": "Qual o valor da aula experimental avaliativa?",
    "a": "A aula experimental avaliativa é gratuita e dura cerca de 50 minutos. Nela a fisioterapeuta entende seu histórico, suas queixas e seu objetivo para orientar o melhor caminho para você."
  },
  {
    "q": "Qual o valor do Pilates?",
    "a": "Nós temos os planos mensal, trimestral e semestral. Os valores vão variar de acordo com a frequência que você decidir fazer e o plano que escolher. Planos longos possuem melhor custo-benefício. Mas antes de te passar mais detalhes, você busca o pilates por algum motivo específico hoje, como dor, ou apenas prática de atividade física?"
  },
  {
    "q": "Quais são os valores dos planos de Pilates?",
    "a": "Trabalhamos com planos mensal, trimestral e semestral. Os valores variam conforme a frequência semanal e o plano escolhido. Planos trimestral e semestral podem ser parcelados no cartão de crédito em 3x e 6x, respectivamente, e têm melhor custo-benefício. Tabela de Pilates: 1x por semana — mensal R$ 240, trimestral R$ 210/mês, semestral R$ 195/mês; 2x por semana — mensal R$ 400, trimestral R$ 360/mês, semestral R$ 325/mês; 3x por semana — mensal R$ 495, trimestral R$ 450/mês, semestral R$ 400/mês. Link com todos os planos: https://clinicacorporis.app/planos"
  }
]
$json$::jsonb;

alter table crm.agent_config
  alter column boas_praticas set default $json$
[
  {
    "id": "acolha-antes",
    "title": "Acolha antes de informar.",
    "detail": "Antes de mandar valor ou link, demonstre que entendeu o que a aluna trouxe."
  },
  {
    "id": "nunca-prometa-cura",
    "title": "Nunca prometa cura.",
    "detail": "Evite \"vai resolver\". Prefira \"podemos te ajudar a entender melhor\"."
  },
  {
    "id": "aluna-nao-paciente",
    "title": "\"Aluna\", não \"paciente\".",
    "detail": "É um valor da marca."
  },
  {
    "id": "fisio-pelvica",
    "title": "Fisio pélvica é íntimo.",
    "detail": "Discrição sempre — sem eufemismo, sem clínica demais."
  },
  {
    "id": "sem-venda-forcada",
    "title": "Sem venda forçada.",
    "detail": "O primeiro objetivo é a aula experimental avaliativa gratuita, não fechar pacote."
  },
  {
    "id": "pilates-queixa-experiencia",
    "title": "Antes do convite, pergunte se já fez pilates.",
    "detail": "Quando a aluna relatar dor nas costas, postura ou rotina sentada, acolha a queixa, diga que o pilates é indicado e personalizado, e pergunte se ela já fez pilates alguma vez. Só convide para a aula experimental avaliativa depois da resposta."
  },
  {
    "id": "convite-aula-experimental-avaliativa",
    "title": "Convite para aula experimental avaliativa.",
    "detail": "Use esse nome, explique que nesse encontro entendemos o histórico, avaliamos os movimentos e a aluna vivencia como o pilates pode ajudar. Depois pergunte se ela consegue durante o dia ou se fica melhor após às 18h."
  },
  {
    "id": "precos-pilates-primeira-pergunta",
    "title": "Primeiro pedido de preço do Pilates.",
    "detail": "Quando a pessoa ainda não contou o motivo e pergunta \"qual o valor do pilates?\", responda que temos planos mensal, trimestral e semestral, que os valores variam conforme frequência e plano, e que planos longos têm melhor custo-benefício. Antes de passar tabela, link ou perguntar frequência, pergunte se ela busca pilates por dor/algum motivo específico ou apenas prática de atividade física."
  },
  {
    "id": "precos-pilates-insistencia",
    "title": "Se insistir nos preços de Pilates, responda.",
    "detail": "Quando já estiver claro que a aluna quer Pilates e ela pedir valores/planos de novo, ou disser que antes quer saber os valores depois de uma tentativa de agendamento/avaliação, não repita que só dá para falar depois da avaliação. Explique que existem planos mensal, trimestral e semestral, que variam por frequência, que os planos longos podem ser parcelados no cartão em 3x e 6x e têm melhor custo-benefício. Depois pergunte quantas vezes na semana ela tem interesse em fazer."
  },
  {
    "id": "precos-pilates-apos-frequencia",
    "title": "Depois da frequência, passe os valores.",
    "detail": "Quando a aluna responder 1x, 2x ou 3x por semana, envie https://clinicacorporis.app/planos e liste os três planos daquela frequência usando a tabela do FAQ. Termine reforçando o convite para conhecer o serviço pela aula experimental e pergunte se fica melhor durante o dia ou após às 18h."
  }
]
$json$::jsonb;

alter table crm.agent_config
  alter column exemplos_conversa set default $json$
[
  {
    "id": "larissa-dor-costas-sem-experiencia",
    "titulo": "Dor nas costas — ainda não fez pilates",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "tenho dor nas costas trabalho sentada o dia todo no computador"
      },
      {
        "autor": "clara",
        "texto": "O pilates é muito indicado pra isso. Temos algumas alunas que chegaram com a mesma queixa que você e, ao longo das primeiras aulas, já nos relataram ótimos resultados."
      },
      {
        "autor": "clara",
        "texto": "Trabalhamos de maneira personalizada, de acordo com o que o seu corpo precisa. Você já fez pilates alguma vez?"
      },
      {
        "autor": "lead",
        "texto": "Não, nunca fiz"
      },
      {
        "autor": "clara",
        "texto": "Entendi, então tenho um convite pra te fazer: nós oferecemos uma aula experimental avaliativa."
      },
      {
        "autor": "clara",
        "texto": "Nesse encontro, entendemos o seu histórico, avaliamos os seus movimentos e você pode vivenciar no seu corpo como o pilates pode te ajudar nesse momento."
      },
      {
        "autor": "clara",
        "texto": "Qual a sua disponibilidade, consegue durante o dia ou fica melhor após às 18h?"
      }
    ]
  },
  {
    "id": "larissa-dor-costas-com-experiencia",
    "titulo": "Dor nas costas — já fez pilates",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "tenho dor nas costas trabalho sentada o dia todo no computador"
      },
      {
        "autor": "clara",
        "texto": "O pilates é muito indicado pra isso. Temos algumas alunas que chegaram com a mesma queixa que você e, ao longo das primeiras aulas, já nos relataram ótimos resultados."
      },
      {
        "autor": "clara",
        "texto": "Trabalhamos de maneira personalizada, de acordo com o que o seu corpo precisa. Você já fez pilates alguma vez?"
      },
      {
        "autor": "lead",
        "texto": "Sim, já fiz pilates"
      },
      {
        "autor": "clara",
        "texto": "Legal que você já conhece o pilates. Mas tenho um convite especial pra te fazer: aqui nós oferecemos uma aula experimental avaliativa."
      },
      {
        "autor": "clara",
        "texto": "Nesse encontro, entendemos o seu histórico, avaliamos os seus movimentos e você pode vivenciar no seu corpo como o nosso trabalho pode te ajudar."
      }
    ]
  },
  {
    "id": "larissa-valor-pilates-primeiro-contato",
    "titulo": "Valor do Pilates — primeiro contato",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "oii qual o valor do pilates"
      },
      {
        "autor": "clara",
        "texto": "Nós temos os planos mensal, trimestral e semestral. Os valores vão variar de acordo com a frequência que você decidir fazer e o plano que escolher."
      },
      {
        "autor": "clara",
        "texto": "Planos longos possuem melhor custo-benefício."
      },
      {
        "autor": "clara",
        "texto": "Mas antes de te passar mais detalhes, você busca o pilates por algum motivo específico hoje, como dor, ou apenas prática de atividade física?"
      }
    ]
  },
  {
    "id": "larissa-planos-precos-insistencia",
    "titulo": "Planos e preços — aluna insiste antes da aula",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "antes eu quero saber como funciona os valores e planos de vocês"
      },
      {
        "autor": "clara",
        "texto": "Entendo! Vou te explicar direitinho."
      },
      {
        "autor": "clara",
        "texto": "Nós trabalhamos com planos mensal, trimestral e semestral. Os valores variam de acordo com a frequência que você decidir fazer e o plano que escolher."
      },
      {
        "autor": "clara",
        "texto": "Os planos longos, trimestral e semestral, podem ser parcelados no cartão de crédito em 3x e 6x, respectivamente, e possuem melhor custo-benefício."
      },
      {
        "autor": "clara",
        "texto": "Você tem interesse em fazer quantas vezes na semana?"
      },
      {
        "autor": "lead",
        "texto": "Acho que duas vezes"
      },
      {
        "autor": "clara",
        "texto": "Aqui nesse link https://clinicacorporis.app/planos você encontra todos os nossos planos em detalhes. Mas vou te passar certinho, para 2x na semana."
      },
      {
        "autor": "clara",
        "texto": "_PLANO MENSAL_ - 2x na semana - fica R$ 400 por mês\n_PLANO TRIMESTRAL_ - 2x na semana - fica R$ 360 por mês\n_PLANO SEMESTRAL_ - 2x na semana - fica R$ 325 por mês"
      },
      {
        "autor": "clara",
        "texto": "Mas antes de você tomar uma decisão, reforço o convite para conhecer o nosso serviço através da aula experimental. Para você fica melhor durante o dia ou após às 18h?"
      }
    ]
  }
]
$json$::jsonb;

update crm.agent_config c
set faq = c.faq || $json$
[
  {
    "q": "Qual o valor do Pilates?",
    "a": "Nós temos os planos mensal, trimestral e semestral. Os valores vão variar de acordo com a frequência que você decidir fazer e o plano que escolher. Planos longos possuem melhor custo-benefício. Mas antes de te passar mais detalhes, você busca o pilates por algum motivo específico hoje, como dor, ou apenas prática de atividade física?"
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(c.faq) item
  where item ->> 'q' = 'Qual o valor do Pilates?'
);

with updated as (
  select
    c.id,
    jsonb_agg(
      case
        when item.value ->> 'q' = 'Qual o valor do Pilates?'
          then jsonb_build_object(
            'q', item.value ->> 'q',
            'a', 'Nós temos os planos mensal, trimestral e semestral. Os valores vão variar de acordo com a frequência que você decidir fazer e o plano que escolher. Planos longos possuem melhor custo-benefício. Mas antes de te passar mais detalhes, você busca o pilates por algum motivo específico hoje, como dor, ou apenas prática de atividade física?'
          )
        else item.value
      end
      order by item.ordinality
    ) as faq
  from crm.agent_config c
  cross join lateral jsonb_array_elements(c.faq) with ordinality as item(value, ordinality)
  group by c.id
)
update crm.agent_config c
set faq = updated.faq
from updated
where updated.id = c.id;

update crm.agent_config c
set boas_praticas = c.boas_praticas || $json$
[
  {
    "id": "precos-pilates-primeira-pergunta",
    "title": "Primeiro pedido de preço do Pilates.",
    "detail": "Quando a pessoa ainda não contou o motivo e pergunta \"qual o valor do pilates?\", responda que temos planos mensal, trimestral e semestral, que os valores variam conforme frequência e plano, e que planos longos têm melhor custo-benefício. Antes de passar tabela, link ou perguntar frequência, pergunte se ela busca pilates por dor/algum motivo específico ou apenas prática de atividade física."
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(c.boas_praticas) item
  where item ->> 'id' = 'precos-pilates-primeira-pergunta'
);

with updated as (
  select
    c.id,
    jsonb_agg(
      case
        when item.value ->> 'id' = 'precos-pilates-insistencia'
          then jsonb_set(
            item.value,
            '{detail}',
            to_jsonb('Quando já estiver claro que a aluna quer Pilates e ela pedir valores/planos de novo, ou disser que antes quer saber os valores depois de uma tentativa de agendamento/avaliação, não repita que só dá para falar depois da avaliação. Explique que existem planos mensal, trimestral e semestral, que variam por frequência, que os planos longos podem ser parcelados no cartão em 3x e 6x e têm melhor custo-benefício. Depois pergunte quantas vezes na semana ela tem interesse em fazer.'::text),
            true
          )
        else item.value
      end
      order by item.ordinality
    ) as boas_praticas
  from crm.agent_config c
  cross join lateral jsonb_array_elements(c.boas_praticas) with ordinality as item(value, ordinality)
  group by c.id
)
update crm.agent_config c
set boas_praticas = updated.boas_praticas
from updated
where updated.id = c.id;

update crm.agent_config c
set exemplos_conversa = c.exemplos_conversa || $json$
[
  {
    "id": "larissa-valor-pilates-primeiro-contato",
    "titulo": "Valor do Pilates — primeiro contato",
    "dialogo": [
      {
        "autor": "lead",
        "texto": "oii qual o valor do pilates"
      },
      {
        "autor": "clara",
        "texto": "Nós temos os planos mensal, trimestral e semestral. Os valores vão variar de acordo com a frequência que você decidir fazer e o plano que escolher."
      },
      {
        "autor": "clara",
        "texto": "Planos longos possuem melhor custo-benefício."
      },
      {
        "autor": "clara",
        "texto": "Mas antes de te passar mais detalhes, você busca o pilates por algum motivo específico hoje, como dor, ou apenas prática de atividade física?"
      }
    ]
  }
]
$json$::jsonb
where not exists (
  select 1
  from jsonb_array_elements(c.exemplos_conversa) item
  where item ->> 'id' = 'larissa-valor-pilates-primeiro-contato'
);
