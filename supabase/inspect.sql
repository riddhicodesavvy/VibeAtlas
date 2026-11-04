-- Read-only inspection. Run through an authorized SQL/MCP connection before migration.
select table_schema, table_name, column_name, data_type, is_nullable
from information_schema.columns where table_schema in ('public','vibeatlas')
order by table_schema, table_name, ordinal_position;

select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and n.nspname in ('public','vibeatlas');

select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname in ('public','vibeatlas');

select table_schema,table_name,grantee,privilege_type
from information_schema.role_table_grants
where table_schema in ('public','vibeatlas') order by table_name,grantee;

select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname in ('public','vibeatlas');
-- Also record exact row counts, constraints, triggers and dependent applications for each existing table.
-- Do not infer that empty API results mean an empty database or valid RLS.
