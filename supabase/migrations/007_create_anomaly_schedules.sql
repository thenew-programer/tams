-- Create anomaly scheduling table to store detailed scheduling information
-- This allows us to store specific dates, times, and estimated hours for each anomaly

CREATE TABLE IF NOT EXISTS public.anomaly_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    anomaly_id UUID NOT NULL REFERENCES public.anomalies(id) ON DELETE CASCADE,
    maintenance_window_id UUID NOT NULL REFERENCES public.maintenance_windows(id) ON DELETE CASCADE,
    scheduled_date TIMESTAMPTZ NOT NULL,
    estimated_hours DECIMAL(4,1) NOT NULL CHECK (estimated_hours > 0 AND estimated_hours <= 24),
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT anomaly_schedules_actual_times_valid CHECK (
        (actual_start_time IS NULL AND actual_end_time IS NULL) OR
        (actual_start_time IS NOT NULL AND actual_end_time IS NOT NULL AND actual_end_time > actual_start_time)
    ),
    CONSTRAINT anomaly_schedules_unique_anomaly_window UNIQUE (anomaly_id, maintenance_window_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_anomaly_schedules_anomaly_id ON public.anomaly_schedules(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_schedules_window_id ON public.anomaly_schedules(maintenance_window_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_schedules_scheduled_date ON public.anomaly_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_anomaly_schedules_status ON public.anomaly_schedules(status);

-- Enable RLS
ALTER TABLE public.anomaly_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for anomaly_schedules
CREATE POLICY "Users can view anomaly schedules" ON public.anomaly_schedules
    FOR SELECT USING (true);

CREATE POLICY "Users can insert anomaly schedules" ON public.anomaly_schedules
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update anomaly schedules" ON public.anomaly_schedules
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete anomaly schedules" ON public.anomaly_schedules
    FOR DELETE USING (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_anomaly_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_anomaly_schedules_updated_at
    BEFORE UPDATE ON public.anomaly_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_anomaly_schedules_updated_at();

-- Add comments
COMMENT ON TABLE public.anomaly_schedules IS 'Detailed scheduling information for anomalies within maintenance windows';
COMMENT ON COLUMN public.anomaly_schedules.scheduled_date IS 'Planned date and time for the anomaly work';
COMMENT ON COLUMN public.anomaly_schedules.estimated_hours IS 'Estimated hours needed to complete the work';
COMMENT ON COLUMN public.anomaly_schedules.actual_start_time IS 'Actual start time when work began';
COMMENT ON COLUMN public.anomaly_schedules.actual_end_time IS 'Actual end time when work was completed';
