-- Create logs table for tracking all user and system actions
CREATE TABLE IF NOT EXISTS public.logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    username TEXT,
    action TEXT NOT NULL,
    category TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    details JSONB NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'success', 'warning', 'error', 'critical')),
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON public.logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON public.logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_category ON public.logs(category);
CREATE INDEX IF NOT EXISTS idx_logs_entity ON public.logs(entity);
CREATE INDEX IF NOT EXISTS idx_logs_severity ON public.logs(severity);
CREATE INDEX IF NOT EXISTS idx_logs_success ON public.logs(success);
CREATE INDEX IF NOT EXISTS idx_logs_session_id ON public.logs(session_id);

-- Create a partial index for recent logs (remove the NOW() function which is not immutable)
CREATE INDEX IF NOT EXISTS idx_logs_recent ON public.logs(timestamp DESC);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_logs_updated_at
    BEFORE UPDATE ON public.logs
    FOR EACH ROW
    EXECUTE FUNCTION update_logs_updated_at();

-- Create RLS policies for logs table
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own logs
CREATE POLICY "Users can view their own logs" ON public.logs
    FOR SELECT USING (auth.uid() = user_id);

-- Allow system to insert logs
CREATE POLICY "System can insert logs" ON public.logs
    FOR INSERT WITH CHECK (true);

-- Allow admins to view all logs (you can modify this based on your admin logic)
CREATE POLICY "Admins can view all logs" ON public.logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create a function to create logs table if it doesn't exist (for the service)
CREATE OR REPLACE FUNCTION create_logs_table_if_not_exists()
RETURNS VOID AS $$
BEGIN
    -- This function is mainly for the service to call
    -- The actual table creation is handled by this migration
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get log statistics
CREATE OR REPLACE FUNCTION get_log_statistics(
    start_date TIMESTAMPTZ DEFAULT NULL,
    end_date TIMESTAMPTZ DEFAULT NULL,
    user_filter UUID DEFAULT NULL
)
RETURNS TABLE (
    total_logs BIGINT,
    success_count BIGINT,
    error_count BIGINT,
    success_rate NUMERIC,
    categories JSONB,
    severities JSONB,
    recent_activity BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_logs AS (
        SELECT *
        FROM public.logs
        WHERE 
            (start_date IS NULL OR timestamp >= start_date)
            AND (end_date IS NULL OR timestamp <= end_date)
            AND (user_filter IS NULL OR user_id = user_filter)
    ),
    stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE success = true) as success,
            COUNT(*) FILTER (WHERE success = false) as errors,
            jsonb_object_agg(category, category_count) as cat_stats,
            jsonb_object_agg(severity, severity_count) as sev_stats,
            COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as recent
        FROM (
            SELECT 
                success,
                category,
                severity,
                timestamp,
                COUNT(*) OVER (PARTITION BY category) as category_count,
                COUNT(*) OVER (PARTITION BY severity) as severity_count
            FROM filtered_logs
        ) subquery
    )
    SELECT 
        total,
        success,
        errors,
        CASE WHEN total > 0 THEN ROUND((success::numeric / total::numeric) * 100, 2) ELSE 0 END,
        cat_stats,
        sev_stats,
        recent
    FROM stats;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.logs 
    WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample log entries for testing
INSERT INTO public.logs (action, category, entity, details, severity, success) VALUES
    ('system_startup', 'system_operation', 'system', '{"description": "System started successfully"}', 'info', true),
    ('user_login', 'user_activity', 'user', '{"description": "User logged in"}', 'success', true),
    ('create_anomaly', 'anomaly_management', 'anomaly', '{"description": "New anomaly created", "anomaly_type": "temperature"}', 'success', true),
    ('auto_schedule_anomalies', 'maintenance_planning', 'planning', '{"description": "Auto-scheduled 5 anomalies", "affectedRecords": 5}', 'success', true);
