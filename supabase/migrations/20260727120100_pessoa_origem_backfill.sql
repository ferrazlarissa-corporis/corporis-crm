-- Preenchimento único: clientes que já foram convertidas a partir de um lead herdam a origem do lead
-- (e o detalhe, quando houver). Só toca em quem ainda não tem origem.
update core.pessoa p
set origem = l.origem::text,
    origem_detalhe = case when l.origem::text in ('indicacao', 'parceiro') then l.origem_detalhe end
from crm.leads l
where l.pessoa_id = p.id
  and l.estagio = 'convertido'
  and p.origem is null;
