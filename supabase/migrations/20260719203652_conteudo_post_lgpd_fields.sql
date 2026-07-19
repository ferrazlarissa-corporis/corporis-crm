-- Corporis Conteúdo — M11: campos de LGPD do post (mockup do Editor de post tem
-- 2 toggles: "usa depoimento/imagem real" e "autorização assinada"). O gate de
-- conformidade (CLAUDE_1.md §8) exige um `consentimento_lgpd_ref` (referência,
-- não só um booleano) quando o post usa depoimento — por isso o segundo campo é
-- texto livre (onde a autorização está arquivada), não só um checkbox.

alter table conteudo.post
  add column lgpd_usa_depoimento boolean not null default false,
  add column lgpd_consentimento_ref text;
