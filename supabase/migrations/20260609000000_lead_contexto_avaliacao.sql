-- Resumo clínico-comercial da aluna para a avaliação (preenchido pela IA).

alter table crm.leads
  add column if not exists contexto_avaliacao jsonb;

comment on column crm.leads.contexto_avaliacao is
  'Resumo clínico-comercial da aluna para a avaliação. Preenchido pela IA (ao vivo via tool ou sob demanda). Chaves: queixa_principal, objetivo, historico_relevante, pontos_atencao, disponibilidade, gancho_conversao, atualizado_em, fonte.';
