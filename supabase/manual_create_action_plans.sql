-- Manual script to create action plans tables
-- Run this directly in your Supabase SQL editor

-- First, let's check if the tables exist
DO $$
BEGIN
    -- Drop existing tables if they exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'action_items') THEN
        DROP TABLE public.action_items CASCADE;
        RAISE NOTICE 'Dropped existing action_items table';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'action_plans') THEN
        DROP TABLE public.action_plans CASCADE;
        RAISE NOTICE 'Dropped existing action_plans table';
    END IF;
END $$;

-- Create action_plans table
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

-- Create action_items table
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

-- Create indexes
CREATE INDEX idx_action_plans_anomaly_id ON public.action_plans(anomaly_id);
CREATE INDEX idx_action_plans_status ON public.action_plans(status);
CREATE INDEX idx_action_plans_priority ON public.action_plans(priority);
CREATE INDEX idx_action_items_action_plan_id ON public.action_items(action_plan_id);
CREATE INDEX idx_action_items_statut ON public.action_items(statut);

-- Enable RLS
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for authenticated users)
CREATE POLICY "action_plans_policy" ON public.action_plans FOR ALL USING (true);
CREATE POLICY "action_items_policy" ON public.action_items FOR ALL USING (true);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_action_plans_updated_at
    BEFORE UPDATE ON public.action_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_items_updated_at
    BEFORE UPDATE ON public.action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Test the tables
INSERT INTO public.action_plans (
    anomaly_id, 
    needs_outage, 
    priority, 
    comments, 
    status
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000', 
    true, 
    3, 
    'Test action plan - you can delete this', 
    'draft'
);

-- Verify the insert worked
SELECT id, anomaly_id, priority, comments, status, created_at 
FROM public.action_plans 
WHERE comments = 'Test action plan - you can delete this';

-- Clean up test data (optional)
-- DELETE FROM public.action_plans WHERE comments = 'Test action plan - you can delete this';

-- Display success message
SELECT 'Action plans tables created successfully!' as message;
