-- Create action plans table for managing action plans
-- Clean up existing objects first
DROP TRIGGER IF EXISTS trigger_action_items_completion ON public.action_items;
DROP TRIGGER IF EXISTS trigger_action_items_updated_at ON public.action_items;
DROP TRIGGER IF EXISTS trigger_action_plans_updated_at ON public.action_plans;
DROP FUNCTION IF EXISTS trigger_update_plan_completion() CASCADE;
DROP FUNCTION IF EXISTS update_action_plan_completion(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_action_plan_duration(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_action_items_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_action_plans_updated_at() CASCADE;
DROP TABLE IF EXISTS public.action_items CASCADE;
DROP TABLE IF EXISTS public.action_plans CASCADE;

-- Create action plans table
CREATE TABLE public.action_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    anomaly_id UUID NOT NULL,
    needs_outage BOOLEAN DEFAULT FALSE,
    outage_type TEXT CHECK (outage_type IN ('force', 'minor', 'major')),
    outage_duration INTEGER, -- in minutes
    planned_date TIMESTAMPTZ,
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    comments TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'completed')),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    total_duration_hours INTEGER DEFAULT 0,
    total_duration_days INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create action items table for individual actions within plans
CREATE TABLE public.action_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_plan_id UUID NOT NULL REFERENCES public.action_plans(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    responsable TEXT NOT NULL,
    pdrs_disponible TEXT,
    ressources_internes TEXT,
    ressources_externes TEXT,
    statut TEXT DEFAULT 'planifie' CHECK (statut IN ('planifie', 'en_cours', 'termine', 'reporte')),
    duree_heures INTEGER DEFAULT 0,
    duree_jours INTEGER DEFAULT 0,
    date_debut TIMESTAMPTZ,
    date_fin TIMESTAMPTZ,
    progression INTEGER DEFAULT 0 CHECK (progression >= 0 AND progression <= 100),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
DROP INDEX IF EXISTS idx_action_plans_anomaly_id;
DROP INDEX IF EXISTS idx_action_plans_status;
DROP INDEX IF EXISTS idx_action_plans_priority;
DROP INDEX IF EXISTS idx_action_plans_planned_date;
DROP INDEX IF EXISTS idx_action_items_action_plan_id;
DROP INDEX IF EXISTS idx_action_items_statut;
DROP INDEX IF EXISTS idx_action_items_order_index;

CREATE INDEX idx_action_plans_anomaly_id ON public.action_plans(anomaly_id);
CREATE INDEX idx_action_plans_status ON public.action_plans(status);
CREATE INDEX idx_action_plans_priority ON public.action_plans(priority);
CREATE INDEX idx_action_plans_planned_date ON public.action_plans(planned_date);
CREATE INDEX idx_action_items_action_plan_id ON public.action_items(action_plan_id);
CREATE INDEX idx_action_items_statut ON public.action_items(statut);
CREATE INDEX idx_action_items_order_index ON public.action_items(order_index);

-- Create triggers for updated_at
DROP FUNCTION IF EXISTS update_action_plans_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_action_items_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_action_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_action_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_action_plans_updated_at ON public.action_plans;
DROP TRIGGER IF EXISTS trigger_action_items_updated_at ON public.action_items;

CREATE TRIGGER trigger_action_plans_updated_at
    BEFORE UPDATE ON public.action_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_action_plans_updated_at();

CREATE TRIGGER trigger_action_items_updated_at
    BEFORE UPDATE ON public.action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_action_items_updated_at();

-- Create RLS policies
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view action plans
CREATE POLICY "Authenticated users can view action plans" ON public.action_plans
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to create action plans
CREATE POLICY "Authenticated users can create action plans" ON public.action_plans
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update action plans
CREATE POLICY "Authenticated users can update action plans" ON public.action_plans
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete action plans
CREATE POLICY "Authenticated users can delete action plans" ON public.action_plans
    FOR DELETE USING (auth.role() = 'authenticated');

-- Allow authenticated users to view action items
CREATE POLICY "Authenticated users can view action items" ON public.action_items
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to create action items
CREATE POLICY "Authenticated users can create action items" ON public.action_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update action items
CREATE POLICY "Authenticated users can update action items" ON public.action_items
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete action items
CREATE POLICY "Authenticated users can delete action items" ON public.action_items
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create a function to calculate total duration for action plan
CREATE OR REPLACE FUNCTION calculate_action_plan_duration(plan_id UUID)
RETURNS RECORD AS $$
DECLARE
    total_hours INTEGER;
    total_days INTEGER;
    result RECORD;
BEGIN
    SELECT 
        COALESCE(SUM(duree_heures), 0),
        COALESCE(SUM(duree_jours), 0)
    INTO total_hours, total_days
    FROM action_items
    WHERE action_plan_id = plan_id;
    
    SELECT total_hours as hours, total_days as days INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update action plan completion percentage
CREATE OR REPLACE FUNCTION update_action_plan_completion(plan_id UUID)
RETURNS VOID AS $$
DECLARE
    total_items INTEGER;
    completed_items INTEGER;
    completion_percentage INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_items
    FROM action_items
    WHERE action_plan_id = plan_id;
    
    IF total_items = 0 THEN
        completion_percentage := 0;
    ELSE
        SELECT COUNT(*) INTO completed_items
        FROM action_items
        WHERE action_plan_id = plan_id AND statut = 'termine';
        
        completion_percentage := (completed_items * 100) / total_items;
    END IF;
    
    UPDATE action_plans 
    SET completion_percentage = completion_percentage
    WHERE id = plan_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update plan completion when action items change
CREATE OR REPLACE FUNCTION trigger_update_plan_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_action_plan_completion(OLD.action_plan_id);
        RETURN OLD;
    ELSE
        PERFORM update_action_plan_completion(NEW.action_plan_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_action_items_completion
    AFTER INSERT OR UPDATE OR DELETE ON public.action_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_plan_completion();

-- Note: Sample data removed to avoid migration issues
-- You can insert test data manually after migration is complete if needed
