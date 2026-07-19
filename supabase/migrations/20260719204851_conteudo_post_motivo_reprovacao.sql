-- Corporis Conteúdo — M12: motivo da reprovação (mockup "Prévia e aprovação.html"
-- exige um texto obrigatório ao reprovar, mas a tabela post não tinha onde guardar).

alter table conteudo.post add column motivo_reprovacao text;
