-- Normaliza telefones de leads para E.164 brasileiro: +55 + DDD + número.
-- Exemplos aceitos na entrada: (49) 99929-2140, 49 99929-2140, +55 49 99929-2140.

create or replace function crm.normalize_br_phone(input text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
  national_digits text;
begin
  digits := regexp_replace(coalesce(input, ''), '\D', '', 'g');

  if digits = '' then
    return input;
  end if;

  if left(digits, 2) = '00' then
    digits := substring(digits from 3);
  end if;

  national_digits := digits;
  if left(digits, 2) = '55' and length(digits) in (12, 13) then
    national_digits := substring(digits from 3);
  end if;

  if left(national_digits, 1) = '0' and length(national_digits) in (11, 12) then
    national_digits := substring(national_digits from 2);
  end if;

  if length(national_digits) in (10, 11) then
    return '+55' || national_digits;
  end if;

  return input;
end;
$$;

create or replace function crm.set_lead_normalized_phone()
returns trigger
language plpgsql
as $$
begin
  new.telefone := crm.normalize_br_phone(new.telefone);
  return new;
end;
$$;

drop trigger if exists leads_normalize_telefone on crm.leads;

create trigger leads_normalize_telefone
before insert or update of telefone on crm.leads
for each row
execute function crm.set_lead_normalized_phone();

with normalized as (
  select
    id,
    telefone,
    crm.normalize_br_phone(telefone) as normalized_phone
  from crm.leads
),
safe_to_update as (
  select
    id,
    normalized_phone,
    count(*) over (partition by normalized_phone) as normalized_count
  from normalized
  where normalized_phone ~ '^\+55[1-9][0-9][0-9]{8,9}$'
)
update crm.leads l
set telefone = s.normalized_phone
from safe_to_update s
where l.id = s.id
  and s.normalized_count = 1
  and l.telefone <> s.normalized_phone;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_telefone_e164_br_check'
      and conrelid = 'crm.leads'::regclass
  ) then
    alter table crm.leads
      add constraint leads_telefone_e164_br_check
      check (telefone ~ '^\+55[1-9][0-9][0-9]{8,9}$')
      not valid;
  end if;
end;
$$;
