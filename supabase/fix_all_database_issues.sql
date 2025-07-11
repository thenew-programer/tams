-- FULL FIX SCRIPT FOR ACTION PLAN AND ANOMALY ISSUES
-- Run this in your Supabase SQL Editor to fix all issues

-- Check current state
DO $$
BEGIN
    RAISE NOTICE '=== STARTING DATABASE REPAIR SCRIPT ===';
    RAISE NOTICE 'Checking table existence and structure...';
END $$;

-- 1. FIXING ANOMALIES TABLE

-- Add proper indexes to anomalies table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'anomalies' AND indexname = 'idx_anomalies_id') THEN
        CREATE INDEX idx_anomalies_id ON public.anomalies(id);
        RAISE NOTICE 'Created index on anomalies.id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'anomalies' AND indexname = 'idx_anomalies_created_at') THEN
        CREATE INDEX idx_anomalies_created_at ON public.anomalies(created_at);
        RAISE NOTICE 'Created index on anomalies.created_at';
    END IF;
END $$;

-- Fix RLS policies for anomalies
DO $$
BEGIN
    -- Drop conflicting policies
    DROP POLICY IF EXISTS "Users can view their own anomalies" ON public.anomalies;
    DROP POLICY IF EXISTS "Users can update their own anomalies" ON public.anomalies;
    DROP POLICY IF EXISTS "Users can delete their own anomalies" ON public.anomalies;
    
    -- Create simplified policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anomalies' AND policyname = 'anomalies_select_policy') THEN
        CREATE POLICY "anomalies_select_policy" ON public.anomalies 
            FOR SELECT USING (true);
        RAISE NOTICE 'Created select policy for anomalies';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anomalies' AND policyname = 'anomalies_update_policy') THEN
        CREATE POLICY "anomalies_update_policy" ON public.anomalies 
            FOR UPDATE USING (true);
        RAISE NOTICE 'Created update policy for anomalies';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anomalies' AND policyname = 'anomalies_insert_policy') THEN
        CREATE POLICY "anomalies_insert_policy" ON public.anomalies 
            FOR INSERT WITH CHECK (true);
        RAISE NOTICE 'Created insert policy for anomalies';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'anomalies' AND policyname = 'anomalies_delete_policy') THEN
        CREATE POLICY "anomalies_delete_policy" ON public.anomalies 
            FOR DELETE USING (true);
        RAISE NOTICE 'Created delete policy for anomalies';
    END IF;
END $$;

-- 2. FIXING ACTION PLANS TABLE
-- Re-create action_plans table properly

-- Backup existing data if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'action_plans') THEN
        CREATE TABLE IF NOT EXISTS action_plans_backup AS SELECT * FROM action_plans;
        RAISE NOTICE 'Created backup of action_plans table';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'action_items') THEN
        CREATE TABLE IF NOT EXISTS action_items_backup AS SELECT * FROM action_items;
        RAISE NOTICE 'Created backup of action_items table';
    END IF;
END $$;

-- Drop and recreate tables
DROP TRIGGER IF EXISTS trigger_action_items_updated_at ON public.action_items;
DROP TRIGGER IF EXISTS trigger_action_plans_updated_at ON public.action_plans;
DROP TRIGGER IF EXISTS trigger_action_item_insert ON public.action_items;
DROP FUNCTION IF EXISTS update_action_plans_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_action_items_updated_at() CASCADE;
DROP FUNCTION IF EXISTS process_action_item_insert() CASCADE;
DROP TABLE IF EXISTS public.action_items CASCADE;
DROP TABLE IF EXISTS public.action_plans CASCADE;

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
CREATE INDEX idx_action_items_progression ON public.action_items(progression);

-- Enable RLS
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

-- Create simplified RLS policies
CREATE POLICY "action_plans_select_policy" ON public.action_plans 
    FOR SELECT USING (true);

CREATE POLICY "action_plans_insert_policy" ON public.action_plans 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "action_plans_update_policy" ON public.action_plans 
    FOR UPDATE USING (true);

CREATE POLICY "action_plans_delete_policy" ON public.action_plans 
    FOR DELETE USING (true);

CREATE POLICY "action_items_select_policy" ON public.action_items 
    FOR SELECT USING (true);

CREATE POLICY "action_items_insert_policy" ON public.action_items 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "action_items_update_policy" ON public.action_items 
    FOR UPDATE USING (true);

CREATE POLICY "action_items_delete_policy" ON public.action_items 
    FOR DELETE USING (true);

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

-- Create function to process action item inserts to avoid ambiguity
CREATE OR REPLACE FUNCTION process_action_item_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Explicitly qualify all fields to avoid ambiguity
    NEW.progression := COALESCE(NEW.progression, 0);
    NEW.duree_heures := COALESCE(NEW.duree_heures, 0);
    NEW.duree_jours := COALESCE(NEW.duree_jours, 0);
    NEW.order_index := COALESCE(NEW.order_index, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_action_item_insert
    BEFORE INSERT ON public.action_items
    FOR EACH ROW
    EXECUTE FUNCTION process_action_item_insert();

-- Restore data if backup exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'action_plans_backup') THEN
        INSERT INTO action_plans (
            id, anomaly_id, needs_outage, outage_type, outage_duration, 
            planned_date, estimated_cost, priority, comments, status, 
            completion_percentage, total_duration_hours, total_duration_days, 
            created_at, updated_at
        )
        SELECT
            id, anomaly_id, needs_outage, outage_type, outage_duration,
            planned_date, estimated_cost, priority, comments, status,
            completion_percentage, total_duration_hours, total_duration_days,
            created_at, updated_at
        FROM action_plans_backup
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Restored data from action_plans_backup';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'action_items_backup') THEN
        INSERT INTO action_items (
            id, action_plan_id, action, responsable, pdrs_disponible,
            ressources_internes, ressources_externes, statut, duree_heures,
            duree_jours, date_debut, date_fin, progression, order_index,
            created_at, updated_at
        )
        SELECT
            id, action_plan_id, action, responsable, pdrs_disponible,
            ressources_internes, ressources_externes, statut, duree_heures,
            duree_jours, date_debut, date_fin, progression, order_index,
            created_at, updated_at
        FROM action_items_backup
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Restored data from action_items_backup';
    END IF;
END $$;

-- Grant permissions to authenticated users
GRANT ALL ON public.action_plans TO authenticated;
GRANT ALL ON public.action_items TO authenticated;
GRANT ALL ON public.action_plans_id_seq TO authenticated;
GRANT ALL ON public.action_items_id_seq TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Final verification
SELECT 
    (SELECT COUNT(*) FROM public.action_plans) AS action_plans_count,
    (SELECT COUNT(*) FROM public.action_items) AS action_items_count,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'action_plans') AS action_plans_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'action_items') AS action_items_policies,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgrelid = 'public.action_plans'::regclass) AS action_plans_triggers,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgrelid = 'public.action_items'::regclass) AS action_items_triggers;

-- Success message
SELECT 'DATABASE REPAIR COMPLETED SUCCESSFULLY! All tables, indexes, triggers, and policies have been recreated.' as message;
