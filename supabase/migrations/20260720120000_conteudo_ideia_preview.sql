-- Corporis Conteúdo — prévia de link nas ideias importadas: card hoje só mostra
-- a URL crua como título. Ao colar um link, buscamos og:title/og:description/
-- og:image no momento da importação e guardamos aqui pra render de miniatura +
-- resumo no Banco de ideias.
alter table conteudo.ideia
  add column imagem_preview_url text,
  add column resumo text;
