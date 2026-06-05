insert into crm.agent_config (
  persona_prompt,
  ativo,
  horario_atendimento,
  mensagem_fora_horario,
  faq,
  regras_handoff
)
values (
  'Você fala como a Corporis: cuidadosa, técnica e acolhedora. Acolhe primeiro, informa depois. Nunca promete cura, nunca diagnostica, nunca usa urgência fabricada. Use aluna, incômodo e avaliação.',
  true,
  '{"segunda_sexta": "08:00-19:00", "sabado": "08:00-12:00"}',
  'Obrigada por chamar. A equipe da Corporis responde em horário de atendimento. Enquanto isso, pode me contar o que te trouxe até aqui?',
  '[]',
  '["pedido_humano", "duvida_clinica_especifica", "reclamacao", "agente_nao_sabe"]'
)
on conflict do nothing;
