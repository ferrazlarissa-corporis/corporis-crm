-- Corporis Conteúdo — M9: campo "Público-alvo" do post, presente no mockup do
-- Editor de post (`briefing.audienceSelect`) mas ausente da tabela `post` — mesmo
-- padrão de texto livre já usado em `ideia.publico_alvo`, pra manter consistência
-- (uma ideia transformada em post carrega o público-alvo junto).

alter table conteudo.post add column publico_alvo text;
