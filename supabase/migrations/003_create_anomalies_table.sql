create table public.anomalies (
  id uuid not null default gen_random_uuid (),
  equipement_id text not null,
  description text null,
  service text null,
  system_id text null,
  status text null default 'nouvelle'::text,
  source_origine text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  ai_fiabilite_integrite_score integer null,
  ai_disponibilite_score integer null,
  ai_process_safety_score integer null,
  ai_criticality_level integer null,
  human_fiabilite_integrite_score integer null,
  human_disponibilite_score integer null,
  human_process_safety_score integer null,
  human_criticality_level integer null,
  final_fiabilite_integrite_score integer GENERATED ALWAYS as (
    COALESCE(
      human_fiabilite_integrite_score,
      ai_fiabilite_integrite_score
    )
  ) STORED null,
  final_disponibilite_score integer GENERATED ALWAYS as (
    COALESCE(human_disponibilite_score, ai_disponibilite_score)
  ) STORED null,
  final_process_safety_score integer GENERATED ALWAYS as (
    COALESCE(
      human_process_safety_score,
      ai_process_safety_score
    )
  ) STORED null,
  final_criticality_level integer GENERATED ALWAYS as (
    COALESCE(human_criticality_level, ai_criticality_level)
  ) STORED null,
  estimated_hours integer null,
  priority integer null,
  maintenance_window_id uuid null,
  import_batch_id uuid null,
  constraint anomalies_pkey primary key (id),
  constraint anomalies_ai_disponibilite_score_check check (
    (
      (ai_disponibilite_score >= 1)
      and (ai_disponibilite_score <= 5)
    )
  ),
  constraint anomalies_ai_fiabilite_integrite_score_check check (
    (
      (ai_fiabilite_integrite_score >= 1)
      and (ai_fiabilite_integrite_score <= 5)
    )
  ),
  constraint anomalies_ai_process_safety_score_check check (
    (
      (ai_process_safety_score >= 1)
      and (ai_process_safety_score <= 5)
    )
  ),
  constraint anomalies_human_criticality_level_check check (
    (
      (human_criticality_level >= 1)
      and (human_criticality_level <= 15)
    )
  ),
  constraint anomalies_human_disponibilite_score_check check (
    (
      (human_disponibilite_score >= 1)
      and (human_disponibilite_score <= 5)
    )
  ),
  constraint anomalies_human_fiabilite_integrite_score_check check (
    (
      (human_fiabilite_integrite_score >= 1)
      and (human_fiabilite_integrite_score <= 5)
    )
  ),
  constraint anomalies_human_process_safety_score_check check (
    (
      (human_process_safety_score >= 1)
      and (human_process_safety_score <= 5)
    )
  ),
  constraint anomalies_ai_criticality_level_check check (
    (
      (ai_criticality_level >= 1)
      and (ai_criticality_level <= 15)
    )
  ),
  constraint anomalies_status_check check (
    (
      status = any (
        array[
          'nouvelle'::text,
          'en_cours'::text,
          'traite'::text,
          'cloture'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_anomalies_status on public.anomalies using btree (status) TABLESPACE pg_default;

create index IF not exists idx_anomalies_service on public.anomalies using btree (service) TABLESPACE pg_default;

create index IF not exists idx_anomalies_criticality on public.anomalies using btree (final_criticality_level) TABLESPACE pg_default;

create index IF not exists idx_anomalies_created_at on public.anomalies using btree (created_at) TABLESPACE pg_default;

create trigger trigger_archive_closed_anomaly BEFORE
update on anomalies for EACH row
execute FUNCTION archive_closed_anomaly ();