-- Corporis Conteúdo — M5: título e tipo de fonte por referência
-- (campos vistos no form "Salvar referência" de Referências.html, ausentes no M1).

create type conteudo.tipo_fonte_referencia as enum (
  'instagram', 'reels', 'tiktok', 'artigo', 'pinterest', 'perfil'
);

alter table conteudo.referencia add column titulo text not null default '';
alter table conteudo.referencia add column tipo_fonte conteudo.tipo_fonte_referencia;
