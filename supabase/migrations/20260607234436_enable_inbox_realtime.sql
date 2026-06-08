do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'crm'
        and tablename = 'conversations'
    ) then
      alter publication supabase_realtime add table crm.conversations;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'crm'
        and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table crm.messages;
    end if;
  end if;
end $$;
