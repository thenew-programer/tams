-- Function to calculate total duration for an action plan
CREATE OR REPLACE FUNCTION calculate_action_plan_duration(plan_id UUID)
RETURNS TABLE (days INTEGER, hours INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(duree_jours), 0)::INTEGER as total_days,
        COALESCE(SUM(duree_heures), 0)::INTEGER as total_hours
    FROM action_items
    WHERE action_plan_id = plan_id;
END;
$$ LANGUAGE plpgsql;
