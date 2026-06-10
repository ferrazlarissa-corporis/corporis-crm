update crm.agent_config
set persona_prompt = btrim(persona_prompt)
where persona_prompt <> btrim(persona_prompt);
