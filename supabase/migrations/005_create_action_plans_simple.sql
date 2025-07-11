-- Simple action plans table migration
-- This version focuses on basic table creation without complex triggers

-- Create action plans table
CREATE TABLE IF NOT EXISTS public.action_plans (
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

-- Create action items table
CREATE TABLE IF NOT EXISTS public.action_items (
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

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_action_plans_anomaly_id ON public.action_plans(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_status ON public.action_plans(status);
CREATE INDEX IF NOT EXISTS idx_action_plans_priority ON public.action_plans(priority);
CREATE INDEX IF NOT EXISTS idx_action_items_action_plan_id ON public.action_items(action_plan_id);
CREATE INDEX IF NOT EXISTS idx_action_items_statut ON public.action_items(statut);

-- Enable RLS
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Allow all for authenticated users" ON public.action_plans
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON public.action_items
    FOR ALL USING (auth.role() = 'authenticated');

-- Simple trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_action_plans_updated_at
    BEFORE UPDATE ON public.action_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_items_updated_at
    BEFORE UPDATE ON public.action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
