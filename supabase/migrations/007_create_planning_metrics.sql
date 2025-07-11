-- Migration 007: Create planning metrics and analytics tables
-- This migration creates tables for tracking planning performance and window utilization

-- Planning metrics table for tracking planning algorithm performance
CREATE TABLE IF NOT EXISTS public.planning_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('efficiency', 'utilization', 'completion_rate', 'scheduling_accuracy', 'optimization_score')),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    measurement_date TIMESTAMPTZ DEFAULT NOW(),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    window_id UUID REFERENCES public.maintenance_windows(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.planning_sessions(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Window utilization tracking for capacity management
CREATE TABLE IF NOT EXISTS public.window_utilization (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    window_id UUID NOT NULL REFERENCES public.maintenance_windows(id) ON DELETE CASCADE,
    total_capacity_hours INTEGER NOT NULL CHECK (total_capacity_hours > 0),
    scheduled_hours INTEGER DEFAULT 0 CHECK (scheduled_hours >= 0),
    utilization_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_capacity_hours > 0 
            THEN LEAST(100.0, (scheduled_hours::decimal / total_capacity_hours::decimal) * 100)
            ELSE 0 
        END
    ) STORED,
    anomaly_count INTEGER DEFAULT 0 CHECK (anomaly_count >= 0),
    critical_anomalies INTEGER DEFAULT 0 CHECK (critical_anomalies >= 0),
    high_anomalies INTEGER DEFAULT 0 CHECK (high_anomalies >= 0),
    medium_anomalies INTEGER DEFAULT 0 CHECK (medium_anomalies >= 0),
    low_anomalies INTEGER DEFAULT 0 CHECK (low_anomalies >= 0),
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure scheduled hours don't exceed capacity
    CONSTRAINT scheduled_hours_within_capacity CHECK (scheduled_hours <= total_capacity_hours)
);

-- Planning analytics summary table
CREATE TABLE IF NOT EXISTS public.planning_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date_period DATE NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    total_anomalies INTEGER DEFAULT 0,
    scheduled_anomalies INTEGER DEFAULT 0,
    unscheduled_anomalies INTEGER DEFAULT 0,
    auto_scheduled_anomalies INTEGER DEFAULT 0,
    manual_scheduled_anomalies INTEGER DEFAULT 0,
    scheduling_efficiency DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_anomalies > 0 
            THEN (scheduled_anomalies::decimal / total_anomalies::decimal) * 100 
            ELSE 0 
        END
    ) STORED,
    average_window_utilization DECIMAL(5,2) DEFAULT 0,
    total_windows_created INTEGER DEFAULT 0,
    auto_created_windows INTEGER DEFAULT 0,
    planning_sessions_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for period tracking
    UNIQUE(date_period, period_type)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_planning_metrics_type ON public.planning_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_planning_metrics_date ON public.planning_metrics(measurement_date);
CREATE INDEX IF NOT EXISTS idx_planning_metrics_window_id ON public.planning_metrics(window_id);
CREATE INDEX IF NOT EXISTS idx_planning_metrics_session_id ON public.planning_metrics(session_id);

CREATE INDEX IF NOT EXISTS idx_window_utilization_window_id ON public.window_utilization(window_id);
CREATE INDEX IF NOT EXISTS idx_window_utilization_calculated_at ON public.window_utilization(calculated_at);
CREATE INDEX IF NOT EXISTS idx_window_utilization_percentage ON public.window_utilization(utilization_percentage);

CREATE INDEX IF NOT EXISTS idx_planning_analytics_date_period ON public.planning_analytics(date_period);
CREATE INDEX IF NOT EXISTS idx_planning_analytics_period_type ON public.planning_analytics(period_type);
CREATE INDEX IF NOT EXISTS idx_planning_analytics_efficiency ON public.planning_analytics(scheduling_efficiency);

-- Enable Row Level Security
ALTER TABLE public.planning_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.window_utilization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Enable read access for all users" ON public.planning_metrics
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.planning_metrics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.planning_metrics
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON public.window_utilization
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.window_utilization
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.window_utilization
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON public.planning_analytics
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.planning_analytics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.planning_analytics
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create function to update window utilization
CREATE OR REPLACE FUNCTION update_window_utilization(window_uuid UUID)
RETURNS VOID AS $$
DECLARE
    total_hours INTEGER;
    scheduled_hours INTEGER;
    anomaly_counts RECORD;
BEGIN
    -- Calculate total capacity hours (duration_days * 24)
    SELECT duration_days * 24 INTO total_hours
    FROM public.maintenance_windows
    WHERE id = window_uuid;
    
    -- Calculate scheduled hours from assigned anomalies
    SELECT 
        COALESCE(SUM(estimated_hours), 0) as total_scheduled,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE final_criticality_level >= 13) as critical_count,
        COUNT(*) FILTER (WHERE final_criticality_level BETWEEN 10 AND 12) as high_count,
        COUNT(*) FILTER (WHERE final_criticality_level BETWEEN 7 AND 9) as medium_count,
        COUNT(*) FILTER (WHERE final_criticality_level <= 6) as low_count
    INTO scheduled_hours, anomaly_counts.total_count, anomaly_counts.critical_count, 
         anomaly_counts.high_count, anomaly_counts.medium_count, anomaly_counts.low_count
    FROM public.anomalies
    WHERE maintenance_window_id = window_uuid;
    
    -- Insert or update utilization record
    INSERT INTO public.window_utilization (
        window_id, 
        total_capacity_hours, 
        scheduled_hours, 
        anomaly_count,
        critical_anomalies,
        high_anomalies,
        medium_anomalies,
        low_anomalies,
        calculated_at
    ) VALUES (
        window_uuid, 
        COALESCE(total_hours, 0), 
        COALESCE(scheduled_hours, 0), 
        COALESCE(anomaly_counts.total_count, 0),
        COALESCE(anomaly_counts.critical_count, 0),
        COALESCE(anomaly_counts.high_count, 0),
        COALESCE(anomaly_counts.medium_count, 0),
        COALESCE(anomaly_counts.low_count, 0),
        NOW()
    )
    ON CONFLICT (window_id) 
    DO UPDATE SET
        total_capacity_hours = EXCLUDED.total_capacity_hours,
        scheduled_hours = EXCLUDED.scheduled_hours,
        anomaly_count = EXCLUDED.anomaly_count,
        critical_anomalies = EXCLUDED.critical_anomalies,
        high_anomalies = EXCLUDED.high_anomalies,
        medium_anomalies = EXCLUDED.medium_anomalies,
        low_anomalies = EXCLUDED.low_anomalies,
        calculated_at = EXCLUDED.calculated_at;
END;
$$ LANGUAGE plpgsql;

-- Create function to update planning analytics
CREATE OR REPLACE FUNCTION update_planning_analytics(analysis_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    daily_stats RECORD;
BEGIN
    -- Calculate daily statistics
    SELECT 
        COUNT(*) as total_anomalies,
        COUNT(*) FILTER (WHERE maintenance_window_id IS NOT NULL) as scheduled,
        COUNT(*) FILTER (WHERE maintenance_window_id IS NULL) as unscheduled,
        COALESCE(AVG(wu.utilization_percentage), 0) as avg_utilization
    INTO daily_stats
    FROM public.anomalies a
    LEFT JOIN public.window_utilization wu ON wu.window_id = a.maintenance_window_id
    WHERE DATE(a.created_at) = analysis_date;
    
    -- Insert or update daily analytics
    INSERT INTO public.planning_analytics (
        date_period,
        period_type,
        total_anomalies,
        scheduled_anomalies,
        unscheduled_anomalies,
        average_window_utilization,
        total_windows_created,
        planning_sessions_count
    ) VALUES (
        analysis_date,
        'daily',
        daily_stats.total_anomalies,
        daily_stats.scheduled,
        daily_stats.unscheduled,
        daily_stats.avg_utilization,
        (SELECT COUNT(*) FROM public.maintenance_windows WHERE DATE(created_at) = analysis_date),
        (SELECT COUNT(*) FROM public.planning_sessions WHERE DATE(created_at) = analysis_date)
    )
    ON CONFLICT (date_period, period_type)
    DO UPDATE SET
        total_anomalies = EXCLUDED.total_anomalies,
        scheduled_anomalies = EXCLUDED.scheduled_anomalies,
        unscheduled_anomalies = EXCLUDED.unscheduled_anomalies,
        average_window_utilization = EXCLUDED.average_window_utilization,
        total_windows_created = EXCLUDED.total_windows_created,
        planning_sessions_count = EXCLUDED.planning_sessions_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update window utilization when anomalies change
CREATE OR REPLACE FUNCTION trigger_update_window_utilization()
RETURNS TRIGGER AS $$
BEGIN
    -- Update utilization for old window (if exists)
    IF OLD.maintenance_window_id IS NOT NULL THEN
        PERFORM update_window_utilization(OLD.maintenance_window_id);
    END IF;
    
    -- Update utilization for new window (if exists)
    IF NEW.maintenance_window_id IS NOT NULL THEN
        PERFORM update_window_utilization(NEW.maintenance_window_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for anomaly maintenance window updates
DROP TRIGGER IF EXISTS trigger_anomaly_window_update ON public.anomalies;
CREATE TRIGGER trigger_anomaly_window_update
    AFTER UPDATE OF maintenance_window_id ON public.anomalies
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_window_utilization();

-- Create updated_at trigger for planning_analytics
CREATE TRIGGER update_planning_analytics_updated_at
    BEFORE UPDATE ON public.planning_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial planning metrics for tracking
INSERT INTO public.planning_metrics (metric_type, metric_name, metric_value, metadata) VALUES
    ('efficiency', 'auto_scheduling_success_rate', 85.0, '{"description": "Percentage of anomalies successfully auto-scheduled"}'),
    ('utilization', 'average_window_utilization', 75.0, '{"description": "Average utilization across all maintenance windows"}'),
    ('optimization_score', 'algorithm_performance', 92.0, '{"description": "Overall performance score of planning algorithm"}');

-- Create unique constraint on window_utilization to prevent duplicates
ALTER TABLE public.window_utilization 
ADD CONSTRAINT unique_window_utilization 
UNIQUE(window_id);
