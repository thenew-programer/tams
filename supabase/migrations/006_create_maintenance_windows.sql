-- Create maintenance windows table for the new planning system
-- This migration creates the maintenance_windows table and updates the anomalies table

-- Create maintenance windows table
CREATE TABLE IF NOT EXISTS public.maintenance_windows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('force', 'minor', 'major')),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    auto_created BOOLEAN DEFAULT FALSE,
    source_anomaly_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT maintenance_windows_dates_valid CHECK (end_date > start_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_start_date ON public.maintenance_windows(start_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_status ON public.maintenance_windows(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_type ON public.maintenance_windows(type);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_source_anomaly ON public.maintenance_windows(source_anomaly_id);

-- Add foreign key constraint to anomalies table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'anomalies_maintenance_window_id_fkey'
        AND table_name = 'anomalies'
    ) THEN
        ALTER TABLE public.anomalies 
        ADD CONSTRAINT anomalies_maintenance_window_id_fkey 
        FOREIGN KEY (maintenance_window_id) 
        REFERENCES public.maintenance_windows(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_maintenance_windows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_maintenance_windows_updated_at ON public.maintenance_windows;

CREATE TRIGGER trigger_maintenance_windows_updated_at
    BEFORE UPDATE ON public.maintenance_windows
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_windows_updated_at();

-- Create planning algorithm tables
CREATE TABLE IF NOT EXISTS public.planning_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_type TEXT NOT NULL CHECK (session_type IN ('auto', 'manual', 'optimization')),
    total_anomalies INTEGER DEFAULT 0,
    scheduled_anomalies INTEGER DEFAULT 0,
    new_windows_created INTEGER DEFAULT 0,
    optimization_score DECIMAL(5,2),
    session_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

-- Create planning algorithm configurations
CREATE TABLE IF NOT EXISTS public.planning_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default planning configuration
INSERT INTO public.planning_configurations (name, config_data, is_active) 
VALUES (
    'default_planning_config',
    '{
        "auto_schedule_enabled": true,
        "auto_schedule_delay_ms": 2000,
        "compatibility_threshold": 60,
        "window_utilization_target": 85,
        "criticality_weights": {
            "critical": 100,
            "high": 75,
            "medium": 50,
            "low": 25
        },
        "window_type_preferences": {
            "force": {
                "max_duration_days": 3,
                "preferred_for_criticality": ["critical"],
                "scheduling_urgency": "immediate"
            },
            "major": {
                "max_duration_days": 14,
                "preferred_for_criticality": ["high", "medium"],
                "scheduling_urgency": "weekend"
            },
            "minor": {
                "max_duration_days": 7,
                "preferred_for_criticality": ["medium", "low"],
                "scheduling_urgency": "flexible"
            }
        }
    }'::jsonb,
    true
) ON CONFLICT (name) DO UPDATE SET 
    config_data = EXCLUDED.config_data,
    updated_at = NOW();

-- Create indexes for planning tables
CREATE INDEX IF NOT EXISTS idx_planning_sessions_type ON public.planning_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_planning_sessions_created_at ON public.planning_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_planning_configurations_active ON public.planning_configurations(is_active);

-- Add RLS policies if needed
ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Enable read access for all users" ON public.maintenance_windows
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.maintenance_windows
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.maintenance_windows
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.maintenance_windows
    FOR DELETE USING (true);

-- Similar policies for planning tables
CREATE POLICY "Enable read access for all users" ON public.planning_sessions
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.planning_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.planning_configurations
    FOR SELECT USING (true);

CREATE POLICY "Enable update for authenticated users" ON public.planning_configurations
    FOR UPDATE USING (true);
