alter table crm.clinic_config
  alter column funcionamento set default '[
    {"day": "Segunda", "h": "06:00 - 11:00 | 14:00 - 21:00", "off": false},
    {"day": "Terça", "h": "06:00 - 11:00 | 15:00 - 21:00", "off": false},
    {"day": "Quarta", "h": "06:00 - 11:00 | 15:00 - 21:00", "off": false},
    {"day": "Quinta", "h": "06:00 - 12:00 | 15:00 - 21:00", "off": false},
    {"day": "Sexta", "h": "06:00 - 11:00 | 15:00 - 21:00", "off": false},
    {"day": "Sábado", "h": "Fechado", "off": true},
    {"day": "Domingo", "h": "Fechado", "off": true}
  ]'::jsonb;

update crm.clinic_config
set funcionamento = '[
  {"day": "Segunda", "h": "06:00 - 11:00 | 14:00 - 21:00", "off": false},
  {"day": "Terça", "h": "06:00 - 11:00 | 15:00 - 21:00", "off": false},
  {"day": "Quarta", "h": "06:00 - 11:00 | 15:00 - 21:00", "off": false},
  {"day": "Quinta", "h": "06:00 - 12:00 | 15:00 - 21:00", "off": false},
  {"day": "Sexta", "h": "06:00 - 11:00 | 15:00 - 21:00", "off": false},
  {"day": "Sábado", "h": "Fechado", "off": true},
  {"day": "Domingo", "h": "Fechado", "off": true}
]'::jsonb
where id = '00000000-0000-0000-0000-000000000001'::uuid;
