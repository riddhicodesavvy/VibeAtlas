-- Initial migration applied as vibeatlas_catalogue_v1 after inspecting an empty public schema.
-- Historical filename retained. Baseline and verification evidence are under docs/.
-- Stops if application tables already exist: never silently reuses an unknown schema.
begin;
do $$ begin
  if to_regclass('public.songs') is not null or to_regclass('public.audio_features') is not null
     or to_regclass('public.model_runs') is not null or to_regclass('public.song_clusters') is not null
     or to_regclass('public.song_embeddings') is not null or to_regclass('public.source_attributions') is not null then
    raise exception 'Existing VibeAtlas tables detected. Inspect and write additive compatibility migrations first.';
  end if;
end $$;
create table public.songs (
 id text primary key,provider text not null check(provider in ('jamendo','fma')),
 provider_track_id text not null,title text not null,artist text not null,album text not null default '',
 genres text[] not null default '{}',duration double precision check(duration>=0),image_url text,
 provider_url text not null,license_url text,availability_status text not null default 'unverified',
 playback_available boolean not null default false,analysis_permission text not null default 'unverified',
 metadata_source text not null,last_verified_at timestamptz,created_at timestamptz not null default now(),
 unique(provider,provider_track_id)
);
create table public.audio_features (
 id bigint generated always as identity primary key,song_id text not null references public.songs(id),
 feature_schema_version text not null,extraction_version text not null,feature_vector double precision[] not null,
 provenance jsonb not null,quality_status text not null,created_at timestamptz not null default now(),
 check(array_length(feature_vector,1)>0),unique(song_id,feature_schema_version,extraction_version)
);
create table public.model_runs (
 id text primary key,model_type text not null,model_version text not null,dataset_hash text not null,
 feature_schema_version text not null,parameters jsonb not null,evaluation_metrics jsonb not null,
 manifest_checksum text not null,created_at timestamptz not null default now()
);
create table public.song_clusters (
 song_id text references public.songs(id),model_run_id text references public.model_runs(id),cluster_id integer not null,
 assignment_distance double precision check(assignment_distance>=0),membership_probabilities double precision[],
 primary key(song_id,model_run_id)
);
create table public.song_embeddings (
 song_id text references public.songs(id),model_run_id text references public.model_runs(id),
 projection_method text not null,x double precision not null,y double precision not null,
 primary key(song_id,model_run_id)
);
create table public.source_attributions (
 song_id text primary key references public.songs(id),source_url text not null,license_url text,
 attribution_text text not null,verified_at timestamptz not null
);
create index songs_search on public.songs using gin(to_tsvector('simple',title||' '||artist));
create index songs_genres on public.songs using gin(genres);
create index song_clusters_run on public.song_clusters(model_run_id);
create index song_embeddings_run on public.song_embeddings(model_run_id);
alter table public.songs enable row level security;
alter table public.audio_features enable row level security;
alter table public.model_runs enable row level security;
alter table public.song_clusters enable row level security;
alter table public.song_embeddings enable row level security;
alter table public.source_attributions enable row level security;
revoke all on public.songs,public.audio_features,public.model_runs,public.song_clusters,public.song_embeddings,public.source_attributions from anon,authenticated;
grant select on public.songs,public.source_attributions to anon,authenticated;
create policy catalogue_read on public.songs for select to anon,authenticated using(availability_status='available');
create policy attribution_read on public.source_attributions for select to anon,authenticated using(exists(select 1 from public.songs s where s.id=song_id and s.availability_status='available'));
-- No public write policies. Numeric artifacts are served through the application API.
commit;
