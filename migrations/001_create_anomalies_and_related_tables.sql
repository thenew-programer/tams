-- Table: import_batches
CREATE TABLE IF NOT EXISTS import_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name text NOT NULL,
    file_path text,
    total_rows integer,
    successful_rows integer,
    failed_rows integer,
    status text,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: rex_files (Return of Experience files)
CREATE TABLE IF NOT EXISTS rex_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    filename text NOT NULL,
    filepath text NOT NULL,
    file_size_bytes integer,
    mime_type text,
    uploaded_by uuid,
    upload_date timestamp with time zone DEFAULT now(),
    description text,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Table: anomalies
CREATE TABLE IF NOT EXISTS anomalies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    num_equipement text NOT NULL,
    description text,
    service text,
    responsable text,
    status text DEFAULT 'nouvelle' CHECK (status IN ('nouvelle', 'en_cours', 'traite', 'cloture')),
    source_origine text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    -- AI predicted scores (1-5 for scores, 1-15 for criticality)
    ai_fiabilite_integrite_score integer CHECK (ai_fiabilite_integrite_score >= 1 AND ai_fiabilite_integrite_score <= 5),
    ai_disponibilite_score integer CHECK (ai_disponibilite_score >= 1 AND ai_disponibilite_score <= 5),
    ai_process_safety_score integer CHECK (ai_process_safety_score >= 1 AND ai_process_safety_score <= 5),
    ai_criticality_level integer CHECK (ai_criticality_level >= 1 AND ai_criticality_level <= 15),
    -- Human corrected scores (when AI predictions need adjustment)
    human_fiabilite_integrite_score integer CHECK (human_fiabilite_integrite_score >= 1 AND human_fiabilite_integrite_score <= 5),
    human_disponibilite_score integer CHECK (human_disponibilite_score >= 1 AND human_disponibilite_score <= 5),
    human_process_safety_score integer CHECK (human_process_safety_score >= 1 AND human_process_safety_score <= 5),
    human_criticality_level integer CHECK (human_criticality_level >= 1 AND human_criticality_level <= 15),
    -- Final scores (human takes precedence over AI if available)
    final_fiabilite_integrite_score integer GENERATED ALWAYS AS (COALESCE(human_fiabilite_integrite_score, ai_fiabilite_integrite_score)) STORED,
    final_disponibilite_score integer GENERATED ALWAYS AS (COALESCE(human_disponibilite_score, ai_disponibilite_score)) STORED,
    final_process_safety_score integer GENERATED ALWAYS AS (COALESCE(human_process_safety_score, ai_process_safety_score)) STORED,
    final_criticality_level integer GENERATED ALWAYS AS (COALESCE(human_criticality_level, ai_criticality_level)) STORED,
    estimated_hours integer,
    priority integer,
    maintenance_window_id uuid,
    import_batch_id uuid REFERENCES import_batches(id),
    rex_file_id uuid REFERENCES rex_files(id)
);

-- Table: maintenance_windows
CREATE TABLE IF NOT EXISTS maintenance_windows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: action_plans
CREATE TABLE IF NOT EXISTS action_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_id uuid REFERENCES anomalies(id),
    description text,
    needs_outage boolean DEFAULT false,
    outage_type text CHECK (outage_type IN ('force', 'minor', 'major')),
    outage_duration integer,
    planned_date timestamp with time zone,
    estimated_cost numeric(10,2) DEFAULT 0,
    priority integer DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'completed')),
    comments text,
    total_duration_hours integer DEFAULT 0,
    total_duration_days integer DEFAULT 0,
    completion_percentage integer DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: action_items
CREATE TABLE IF NOT EXISTS action_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_plan_id uuid REFERENCES action_plans(id) ON DELETE CASCADE,
    action text NOT NULL,
    responsable text NOT NULL,
    pdrs_disponible text DEFAULT 'OUI',
    ressources_internes text,
    ressources_externes text,
    statut text DEFAULT 'planifie' CHECK (statut IN ('planifie', 'en_cours', 'termine', 'reporte')),
    duree_heures integer DEFAULT 0,
    duree_jours integer DEFAULT 0,
    date_debut timestamp with time zone,
    date_fin timestamp with time zone,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: archived_anomalies (same structure as anomalies)
CREATE TABLE IF NOT EXISTS archived_anomalies (
    id uuid PRIMARY KEY,
    num_equipement text NOT NULL,
    description text,
    service text,
    responsable text,
    status text CHECK (status IN ('nouvelle', 'en_cours', 'traite', 'cloture')),
    source_origine text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    archived_at timestamp with time zone DEFAULT now(),
    -- AI predicted scores (1-5 for scores, 1-15 for criticality)
    ai_fiabilite_integrite_score integer CHECK (ai_fiabilite_integrite_score >= 1 AND ai_fiabilite_integrite_score <= 5),
    ai_disponibilite_score integer CHECK (ai_disponibilite_score >= 1 AND ai_disponibilite_score <= 5),
    ai_process_safety_score integer CHECK (ai_process_safety_score >= 1 AND ai_process_safety_score <= 5),
    ai_criticality_level integer CHECK (ai_criticality_level >= 1 AND ai_criticality_level <= 15),
    -- Human corrected scores (when AI predictions need adjustment)
    human_fiabilite_integrite_score integer CHECK (human_fiabilite_integrite_score >= 1 AND human_fiabilite_integrite_score <= 5),
    human_disponibilite_score integer CHECK (human_disponibilite_score >= 1 AND human_disponibilite_score <= 5),
    human_process_safety_score integer CHECK (human_process_safety_score >= 1 AND human_process_safety_score <= 5),
    human_criticality_level integer CHECK (human_criticality_level >= 1 AND human_criticality_level <= 15),
    -- Final scores (human takes precedence over AI if available)
    final_fiabilite_integrite_score integer,
    final_disponibilite_score integer,
    final_process_safety_score integer,
    final_criticality_level integer,
    estimated_hours integer,
    priority integer,
    maintenance_window_id uuid,
    import_batch_id uuid REFERENCES import_batches(id),
    rex_file_id uuid REFERENCES rex_files(id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE rex_files ENABLE ROW LEVEL SECURITY;

-- Function to archive anomaly when status is set to 'closed'
CREATE OR REPLACE FUNCTION archive_closed_anomaly()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cloture' AND OLD.status != 'cloture' THEN
        -- Copy final scores to archived table
        INSERT INTO archived_anomalies (
            id, num_equipement, description, service, responsable, status, source_origine,
            created_at, updated_at, ai_fiabilite_integrite_score, ai_disponibilite_score,
            ai_process_safety_score, ai_criticality_level, human_fiabilite_integrite_score,
            human_disponibilite_score, human_process_safety_score, human_criticality_level,
            final_fiabilite_integrite_score, final_disponibilite_score, final_process_safety_score,
            final_criticality_level, estimated_hours, priority, maintenance_window_id, import_batch_id,
            rex_file_id
        ) VALUES (
            NEW.id, NEW.num_equipement, NEW.description, NEW.service, NEW.responsable, NEW.status,
            NEW.source_origine, NEW.created_at, NEW.updated_at, NEW.ai_fiabilite_integrite_score,
            NEW.ai_disponibilite_score, NEW.ai_process_safety_score, NEW.ai_criticality_level,
            NEW.human_fiabilite_integrite_score, NEW.human_disponibilite_score, NEW.human_process_safety_score,
            NEW.human_criticality_level, NEW.final_fiabilite_integrite_score, NEW.final_disponibilite_score,
            NEW.final_process_safety_score, NEW.final_criticality_level, NEW.estimated_hours,
            NEW.priority, NEW.maintenance_window_id, NEW.import_batch_id, NEW.rex_file_id
        );
        
        -- Delete from anomalies table
        DELETE FROM anomalies WHERE id = NEW.id;
        
        -- Return NULL to prevent the original UPDATE
        RETURN NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically archive closed anomalies
CREATE TRIGGER trigger_archive_closed_anomaly
    BEFORE UPDATE ON anomalies
    FOR EACH ROW
    EXECUTE FUNCTION archive_closed_anomaly();

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_action_plan_timestamp
    BEFORE UPDATE ON action_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_item_timestamp
    BEFORE UPDATE ON action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update action plan completion percentage
CREATE OR REPLACE FUNCTION update_action_plan_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate completion percentage based on completed actions
    WITH action_counts AS (
        SELECT 
            COUNT(*) as total_actions,
            COUNT(CASE WHEN statut = 'termine' THEN 1 END) as completed_actions
        FROM action_items
        WHERE action_plan_id = NEW.action_plan_id
    )
    UPDATE action_plans
    SET 
        completion_percentage = 
            CASE 
                WHEN action_counts.total_actions > 0 
                THEN (action_counts.completed_actions::float / action_counts.total_actions * 100)::integer
                ELSE 0
            END,
        status = 
            CASE 
                WHEN action_counts.total_actions = 0 THEN 'draft'
                WHEN action_counts.completed_actions = action_counts.total_actions THEN 'completed'
                WHEN action_counts.completed_actions > 0 THEN 'in_progress'
                ELSE status
            END
    FROM action_counts
    WHERE id = NEW.action_plan_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for action plan completion updates
CREATE TRIGGER update_action_plan_completion_trigger
    AFTER INSERT OR UPDATE OR DELETE ON action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_action_plan_completion();

-- Create policies to allow all authenticated users to access all data
-- Anomalies table policies
CREATE POLICY "All users can view anomalies" ON anomalies
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "All users can insert anomalies" ON anomalies
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "All users can update anomalies" ON anomalies
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "All users can delete anomalies" ON anomalies
    FOR DELETE TO authenticated
    USING (false);

-- Import batches table policies
CREATE POLICY "All users can view import_batches" ON import_batches
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "All users can insert import_batches" ON import_batches
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "All users can update import_batches" ON import_batches
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "All users can delete import_batches" ON import_batches
    FOR DELETE TO authenticated
    USING (true);

-- Maintenance windows table policies
CREATE POLICY "All users can view maintenance_windows" ON maintenance_windows
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "All users can insert maintenance_windows" ON maintenance_windows
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "All users can update maintenance_windows" ON maintenance_windows
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "All users can delete maintenance_windows" ON maintenance_windows
    FOR DELETE TO authenticated
    USING (true);

-- Action plans table policies
CREATE POLICY "All users can view action_plans" ON action_plans
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "All users can insert action_plans" ON action_plans
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "All users can update action_plans" ON action_plans
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "All users can delete action_plans" ON action_plans
    FOR DELETE TO authenticated
    USING (true);

-- Action items table policies
CREATE POLICY "All users can view action_items" ON action_items
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "All users can insert action_items" ON action_items
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "All users can update action_items" ON action_items
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "All users can delete action_items" ON action_items
    FOR DELETE TO authenticated
    USING (true);

-- Archived anomalies table policies
CREATE POLICY "All users can view archived_anomalies" ON archived_anomalies
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "All users can insert archived_anomalies" ON archived_anomalies
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "All users can update archived_anomalies" ON archived_anomalies
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "No deletion of archived_anomalies" ON archived_anomalies
    FOR DELETE TO authenticated
    USING (false);

-- REX files table policies
CREATE POLICY "All users can view rex_files" ON rex_files
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "All users can insert rex_files" ON rex_files
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "All users can update rex_files" ON rex_files
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Only admins can delete rex_files" ON rex_files
    FOR DELETE TO authenticated
    USING (false);  -- By default, no deletion. Can be updated to role-based check if needed

-- Create indexes for better performance
CREATE INDEX idx_anomalies_status ON anomalies(status);
CREATE INDEX idx_anomalies_service ON anomalies(service);
CREATE INDEX idx_anomalies_criticality ON anomalies(final_criticality_level);
CREATE INDEX idx_anomalies_created_at ON anomalies(created_at);
CREATE INDEX idx_import_batches_created_at ON import_batches(created_at);
CREATE INDEX idx_maintenance_windows_start_time ON maintenance_windows(start_time);
CREATE INDEX idx_action_plans_anomaly_id ON action_plans(anomaly_id);
CREATE INDEX idx_action_items_action_plan_id ON action_items(action_plan_id);
CREATE INDEX idx_action_items_statut ON action_items(statut);
CREATE INDEX idx_action_items_order_index ON action_items(order_index);
CREATE INDEX idx_archived_anomalies_archived_at ON archived_anomalies(archived_at);
CREATE INDEX idx_archived_anomalies_service ON archived_anomalies(service);
CREATE INDEX idx_archived_anomalies_criticality ON archived_anomalies(final_criticality_level);
CREATE INDEX idx_rex_files_upload_date ON rex_files(upload_date);
CREATE INDEX idx_anomalies_rex_file_id ON anomalies(rex_file_id);
CREATE INDEX idx_archived_anomalies_rex_file_id ON archived_anomalies(rex_file_id);
