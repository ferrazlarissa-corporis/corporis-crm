update crm.agent_config
set persona_prompt = regexp_replace(persona_prompt, '^[[:space:]]+|[[:space:]]+$', '', 'g')
where persona_prompt ~ '^[[:space:]]+|[[:space:]]+$';
