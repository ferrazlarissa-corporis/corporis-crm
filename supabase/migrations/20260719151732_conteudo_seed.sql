-- Corporis Conteúdo — M1: seed dos 7 pilares editoriais e dos 4 templates de slide base.
-- Pilares e cor_token seguem exatamente o array PILLARS já codificado nos mockups
-- (app/conteúdo/Corporis Conteúdo - Banco de ideias.html), não a proposta do §7 do
-- CLAUDE_1.md — decisão tomada pra manter fidelidade visual com as telas de referência.

insert into conteudo.pilar_editorial (nome, descricao, cor_token) values
  ('Diástase abdominal', 'Recuperação do abdômen no pós-parto, com cuidado e sem pressa.', 'pillar-diastase'),
  ('Fisio pélvica', 'Saúde íntima tratada com discreção, respeito e informação — sem tabu.', 'pillar-pelvica'),
  ('Postura no trabalho', 'Dor lombar, ciático e postura de quem passa o dia sentada.', 'pillar-postura'),
  ('Pilates gestante', 'Pilates adaptado a cada fase da gestação, preparo para o parto e recuperação.', 'pillar-gestante'),
  ('Pilates terapêutico', 'Fortalecimento e reabilitação através do movimento, sob orientação individual.', 'pillar-terapeutico'),
  ('Saúde preventiva', 'Cuidado contínuo com o corpo, antes que o incômodo apareça.', 'pillar-preventiva'),
  ('Bastidores & equipe', 'Por dentro da Corporis: a Larissa, o ambiente, a equipe, o dia a dia da clínica.', 'pillar-bastidores')
on conflict (nome) do nothing;

insert into conteudo.template_slide (nome, tipo) values
  ('Capa', 'capa'),
  ('Conteúdo', 'conteudo'),
  ('Citação', 'citacao'),
  ('CTA', 'cta')
on conflict (nome) do nothing;
