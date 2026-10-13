-- Plano personalizado (pacote de sessões): prazo indeterminado, com cancelamento a qualquer momento
-- e dispensa de multa/aviso em caso de solicitação médica ou parto. A cláusula 3.8 é gerada por
-- src/lib/contrato/gerar.ts em {{clausula_pacote}}; nos demais tipos de plano o campo some do texto.
-- Idempotente: só altera modelo que ainda não tem o campo.
update vendas.contrato_modelo
set corpo = replace(corpo, E'\n\nCLÁUSULA QUARTA', E'\n{{clausula_pacote}}\n\nCLÁUSULA QUARTA'),
    updated_at = now()
where corpo not like '%{{clausula_pacote}}%'
  and corpo like E'%\n\nCLÁUSULA QUARTA%'
  and nome in (
    'Pilates — prestação de serviços',
    'Fisioterapia Pélvica — prestação de serviços',
    'Acupuntura — prestação de serviços',
    'Pacote misto — Pilates + Fisioterapia Pélvica'
  );
