import { supabase } from '../lib/supabase';
import { loggingService } from './loggingService';
import { ActionPlan } from '../types';

export interface SupabaseActionPlan {
  id: string;
  anomaly_id: string;
  needs_outage: boolean;
  outage_type?: 'force' | 'minor' | 'major';
  outage_duration?: number;
  planned_date?: string;
  estimated_cost: number;
  priority: 1 | 2 | 3 | 4 | 5;
  comments?: string;
  status: 'draft' | 'approved' | 'in_progress' | 'completed';
  completion_percentage: number;
  total_duration_hours: number;
  total_duration_days: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseActionItem {
  id: string;
  action_plan_id: string;
  action: string;
  responsable: string;
  pdrs_disponible?: string;
  ressources_internes?: string;
  ressources_externes?: string;
  statut: 'planifie' | 'en_cours' | 'termine' | 'reporte';
  duree_heures: number;
  duree_jours: number;
  date_debut?: string;
  date_fin?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateActionPlanData {
  anomalyId: string;
  needsOutage: boolean;
  outageType?: 'force' | 'minor' | 'major';
  outageDuration?: number;
  plannedDate?: Date;
  estimatedCost?: number;
  priority: 1 | 2 | 3 | 4 | 5;
  comments?: string;
  actions: {
    action: string;
    responsable: string;
    pdrsDisponible?: string;
    ressourcesInternes?: string;
    ressourcesExternes?: string;
    dureeHeures: number;
    dureeJours: number;
    dateDebut?: Date;
    dateFin?: Date;
  }[];
}

export interface UpdateActionPlanData {
  needsOutage?: boolean;
  outageType?: 'force' | 'minor' | 'major';
  outageDuration?: number;
  plannedDate?: Date;
  estimatedCost?: number;
  priority?: 1 | 2 | 3 | 4 | 5;
  comments?: string;
  status?: 'draft' | 'approved' | 'in_progress' | 'completed';
}

export class SupabaseActionPlanService {
  private static instance: SupabaseActionPlanService;

  private constructor() {}

  static getInstance(): SupabaseActionPlanService {
    if (!SupabaseActionPlanService.instance) {
      SupabaseActionPlanService.instance = new SupabaseActionPlanService();
    }
    return SupabaseActionPlanService.instance;
  }

  // Helper method to get the anomaly ID for a plan ID
  private async getAnomalyIdForPlan(planId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('action_plans')
        .select('anomaly_id')
        .eq('id', planId)
        .single();
      
      if (error || !data) {
        console.error('Error getting anomaly ID for plan:', error);
        return null;
      }
      
      return data.anomaly_id;
    } catch (error) {
      console.error('Error in getAnomalyIdForPlan:', error);
      return null;
    }
  }

  // Convert Supabase format to frontend format
  private mapSupabaseToFrontend(supabasePlan: SupabaseActionPlan, items: SupabaseActionItem[] = []): ActionPlan {
    return {
      id: supabasePlan.id,
      anomalyId: supabasePlan.anomaly_id,
      needsOutage: supabasePlan.needs_outage,
      outageType: supabasePlan.outage_type,
      outageDuration: supabasePlan.outage_duration,
      plannedDate: supabasePlan.planned_date ? new Date(supabasePlan.planned_date) : undefined,
      estimatedCost: supabasePlan.estimated_cost,
      priority: supabasePlan.priority,
      comments: supabasePlan.comments || '',
      status: supabasePlan.status,
      completionPercentage: supabasePlan.completion_percentage,
      totalDurationHours: supabasePlan.total_duration_hours,
      totalDurationDays: supabasePlan.total_duration_days,
      actions: items.map(item => ({
        id: item.id,
        action: item.action,
        responsable: item.responsable,
        pdrsDisponible: item.pdrs_disponible || '',
        ressourcesInternes: item.ressources_internes || '',
        ressourcesExternes: item.ressources_externes || '',
        statut: item.statut,
        dureeHeures: item.duree_heures,
        dureeJours: item.duree_jours,
        dateDebut: item.date_debut ? new Date(item.date_debut) : undefined,
        dateFin: item.date_fin ? new Date(item.date_fin) : undefined
      })),
      createdAt: new Date(supabasePlan.created_at),
      updatedAt: new Date(supabasePlan.updated_at)
    };
  }

  async getActionPlan(anomalyId: string): Promise<ActionPlan | null> {
    try {
      // Get the action plan with explicit column selection to avoid 406 and missing column issues
      const response = await supabase
        .from('action_plans')
        .select('id, anomaly_id, needs_outage, outage_type, outage_duration, planned_date, estimated_cost, priority, comments, status, completion_percentage, total_duration_hours, total_duration_days, created_at, updated_at')
        .eq('anomaly_id', anomalyId)
        .single();
      
      if (response.error) {
        if (response.error.code === 'PGRST116') {
          // No rows found, return null
          return null;
        }
        console.error('Error fetching action plan:', response.error);
        await loggingService.logError(response.error, 'getActionPlan');
        return null;
      }
      
      const planData = response.data;

      if (!planData) {
        return null;
      }

      // Get the action items with explicit column selection
      const { data: itemsData, error: itemsError } = await supabase
        .from('action_items')
        .select('id, action_plan_id, action, responsable, pdrs_disponible, ressources_internes, ressources_externes, statut, duree_heures, duree_jours, date_debut, date_fin, order_index, created_at, updated_at')
        .eq('action_plan_id', planData.id)
        .order('order_index');

      if (itemsError) {
        console.error('Error fetching action items:', itemsError);
        return this.mapSupabaseToFrontend(planData, []);
      }

      return this.mapSupabaseToFrontend(planData, itemsData || []);
    } catch (error) {
      console.error('Error fetching action plan:', error);
      await loggingService.logError(error as Error, 'getActionPlan');
      return null;
    }
  }

  async createActionPlan(data: CreateActionPlanData): Promise<ActionPlan | null> {
    try {
      // Create the action plan
      const { data: planData, error: planError } = await supabase
        .from('action_plans')
        .insert([{
          anomaly_id: data.anomalyId,
          needs_outage: data.needsOutage,
          outage_type: data.outageType,
          outage_duration: data.outageDuration,
          planned_date: data.plannedDate?.toISOString(),
          estimated_cost: data.estimatedCost || 0,
          priority: data.priority,
          comments: data.comments || '',
          status: 'draft'
        }])
        .select()
        .single();

      if (planError || !planData) {
        console.error('Error creating action plan:', planError);
        return null;
      }

      // Create the action items - explicitly set field names to avoid ambiguous column issue
      const actionItems = data.actions.map((action, index) => ({
        action_plan_id: planData.id,
        action: action.action,
        responsable: action.responsable,
        pdrs_disponible: action.pdrsDisponible || '',
        ressources_internes: action.ressourcesInternes || '',
        ressources_externes: action.ressourcesExternes || '',
        statut: 'planifie' as const,
        duree_heures: action.dureeHeures,
        duree_jours: action.dureeJours,
        date_debut: action.dateDebut?.toISOString(),
        date_fin: action.dateFin?.toISOString(),
        order_index: index
      }));

      // Add explicit fields to avoid ambiguous column issues, including all required fields for SupabaseActionItem
      const { data: itemsData, error: itemsError } = await supabase
        .from('action_items')
        .insert(actionItems)
        .select('id, action_plan_id, action, responsable, pdrs_disponible, ressources_internes, ressources_externes, statut, duree_heures, duree_jours, date_debut, date_fin, order_index, created_at, updated_at');

      if (itemsError) {
        console.error('Error creating action items:', itemsError);
        // Still return the plan even if items failed
        return this.mapSupabaseToFrontend(planData, []);
      }

      // Update plan totals
      await this.updatePlanTotals(planData.id);

      // Log successful creation
      await loggingService.logAction({
        action: 'create_action_plan',
        category: 'action_plan_management',
        entity: 'action_plan',
        entityId: planData.id,
        details: {
          description: `Created action plan for anomaly ${data.anomalyId}`,
          additionalInfo: {
            anomalyId: data.anomalyId,
            priority: data.priority,
            needsOutage: data.needsOutage,
            actionsCount: data.actions.length
          }
        },
        severity: 'success',
        success: true
      });

      return this.mapSupabaseToFrontend(planData, itemsData || []);
    } catch (error) {
      console.error('Error creating action plan:', error);
      await loggingService.logError(error as Error, 'createActionPlan');
      return null;
    }
  }

  async updateActionPlan(planId: string, updates: UpdateActionPlanData): Promise<ActionPlan | null> {
    try {
      const { data: planData, error: planError } = await supabase
        .from('action_plans')
        .update({
          needs_outage: updates.needsOutage,
          outage_type: updates.outageType,
          outage_duration: updates.outageDuration,
          planned_date: updates.plannedDate?.toISOString(),
          estimated_cost: updates.estimatedCost,
          priority: updates.priority,
          comments: updates.comments,
          status: updates.status
        })
        .eq('id', planId)
        .select()
        .single();

      if (planError || !planData) {
        console.error('Error updating action plan:', planError);
        return null;
      }

      // Get the action items with explicit column selection
      const { data: itemsData, error: itemsError } = await supabase
        .from('action_items')
        .select('id, action_plan_id, action, responsable, pdrs_disponible, ressources_internes, ressources_externes, statut, duree_heures, duree_jours, date_debut, date_fin, order_index, created_at, updated_at')
        .eq('action_plan_id', planId)
        .order('order_index');

      if (itemsError) {
        console.error('Error fetching action items:', itemsError);
        return this.mapSupabaseToFrontend(planData, []);
      }

      // Log successful update
      await loggingService.logAction({
        action: 'update_action_plan',
        category: 'action_plan_management',
        entity: 'action_plan',
        entityId: planId,
        details: {
          description: `Updated action plan ${planId}`,
          additionalInfo: {
            updatedFields: Object.keys(updates)
          }
        },
        severity: 'success',
        success: true
      });

      return this.mapSupabaseToFrontend(planData, itemsData || []);
    } catch (error) {
      console.error('Error updating action plan:', error);
      await loggingService.logError(error as Error, 'updateActionPlan');
      return null;
    }
  }

  async deleteActionPlan(planId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('action_plans')
        .delete()
        .eq('id', planId);

      if (error) {
        console.error('Error deleting action plan:', error);
        return false;
      }

      // Log successful deletion
      await loggingService.logAction({
        action: 'delete_action_plan',
        category: 'action_plan_management',
        entity: 'action_plan',
        entityId: planId,
        details: {
          description: `Deleted action plan ${planId}`
        },
        severity: 'success',
        success: true
      });

      return true;
    } catch (error) {
      console.error('Error deleting action plan:', error);
      await loggingService.logError(error as Error, 'deleteActionPlan');
      return false;
    }
  }

  async getAllActionPlans(): Promise<ActionPlan[]> {
    try {
      // Get all action plans with explicit column selection to avoid 406 error
      const response = await supabase
        .from('action_plans')
        .select('id, anomaly_id, needs_outage, outage_type, outage_duration, planned_date, estimated_cost, priority, comments, status, completion_percentage, total_duration_hours, total_duration_days, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (response.error) {
        console.error('Error fetching action plans:', response.error);
        // Just log the error without using logAction
        console.error('Error details:', {
          errorCode: response.error.code,
          statusCode: response.status,
          message: response.error.message
        });
        return [];
      }
      
      const plansData = response.data;

      const plans: ActionPlan[] = [];
      for (const plan of plansData || []) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('action_items')
          .select('id, action_plan_id, action, responsable, pdrs_disponible, ressources_internes, ressources_externes, statut, duree_heures, duree_jours, date_debut, date_fin, order_index, created_at, updated_at')
          .eq('action_plan_id', plan.id)
          .order('order_index');

        if (itemsError) {
          console.error('Error fetching action items for plan:', plan.id, itemsError);
          plans.push(this.mapSupabaseToFrontend(plan, []));
        } else {
          plans.push(this.mapSupabaseToFrontend(plan, itemsData || []));
        }
      }

      return plans;
    } catch (error) {
      console.error('Error fetching all action plans:', error);
      await loggingService.logError(error as Error, 'getAllActionPlans');
      return [];
    }
  }

  private async updatePlanTotals(planId: string): Promise<void> {
    try {
      const { data } = await supabase
        .rpc('calculate_action_plan_duration', { plan_id: planId });

      if (data) {
        await supabase
          .from('action_plans')
          .update({
            total_duration_hours: data.hours,
            total_duration_days: data.days
          })
          .eq('id', planId);
      }
    } catch (error) {
      console.error('Error updating plan totals:', error);
    }
  }

  async addActionItem(planId: string, item: {
    action: string;
    responsable: string;
    pdrsDisponible?: string;
    ressourcesInternes?: string;
    ressourcesExternes?: string;
    statut?: string;
    dureeHeures: number;
    dureeJours: number;
    dateDebut?: Date;
    dateFin?: Date;
  }): Promise<ActionPlan | null> {
    try {
      // Get the current highest order index
      const { data: existingItems } = await supabase
        .from('action_items')
        .select('order_index')
        .eq('action_plan_id', planId)
        .order('order_index', { ascending: false })
        .limit(1);
      
      const nextOrderIndex = existingItems && existingItems.length > 0 
        ? existingItems[0].order_index + 1 
        : 0;
      
      // Create the action item with explicit fields to avoid ambiguous column issues
      const { error: itemError } = await supabase
        .from('action_items')
        .insert([{
          action_plan_id: planId,
          action: item.action,
          responsable: item.responsable,
          pdrs_disponible: item.pdrsDisponible || '',
          ressources_internes: item.ressourcesInternes || '',
          ressources_externes: item.ressourcesExternes || '',
          statut: item.statut || 'planifie',
          duree_heures: item.dureeHeures,
          duree_jours: item.dureeJours,
          date_debut: item.dateDebut?.toISOString(),
          date_fin: item.dateFin?.toISOString(),
          order_index: nextOrderIndex
        }])
        .select();

      if (itemError) {
        console.error('Error adding action item:', itemError);
        await loggingService.logError(itemError, 'addActionItem');
        return null;
      }

      // Update plan totals
      await this.updatePlanTotals(planId);
      
      // Get the updated plan with all items
      const anomalyId = await this.getAnomalyIdForPlan(planId);
      if (!anomalyId) {
        console.error('Could not find anomaly ID for plan', planId);
        return null;
      }
      return this.getActionPlan(anomalyId);
    } catch (error) {
      console.error('Error adding action item:', error);
      await loggingService.logError(error as Error, 'addActionItem');
      return null;
    }
  }

  async deleteActionItem(planId: string, itemId: string): Promise<ActionPlan | null> {
    try {
      const { error } = await supabase
        .from('action_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Error deleting action item:', error);
        await loggingService.logError(error, 'deleteActionItem');
        return null;
      }

      // Update plan totals
      await this.updatePlanTotals(planId);
      
      // Get the updated plan with all remaining items
      const anomalyId = await this.getAnomalyIdForPlan(planId);
      if (!anomalyId) {
        console.error('Could not find anomaly ID for plan', planId);
        return null;
      }
      return this.getActionPlan(anomalyId);
    } catch (error) {
      console.error('Error deleting action item:', error);
      await loggingService.logError(error as Error, 'deleteActionItem');
      return null;
    }
  }
  
  async updateActionItem(itemId: string, updates: {
    action?: string;
    responsable?: string;
    pdrsDisponible?: string;
    ressourcesInternes?: string;
    ressourcesExternes?: string;
    statut?: string;
    dureeHeures?: number;
    dureeJours?: number;
    dateDebut?: Date;
    dateFin?: Date;
  }): Promise<ActionPlan | null> {
    try {
      // First get the plan ID for this item
      const { data: item, error: fetchError } = await supabase
        .from('action_items')
        .select('action_plan_id')
        .eq('id', itemId)
        .single();
        
      if (fetchError || !item) {
        console.error('Error fetching action item:', fetchError);
        return null;
      }
      
      const planId = item.action_plan_id;
      
      // Update the action item
      const { error: updateError } = await supabase
        .from('action_items')
        .update({
          action: updates.action,
          responsable: updates.responsable,
          pdrs_disponible: updates.pdrsDisponible,
          ressources_internes: updates.ressourcesInternes,
          ressources_externes: updates.ressourcesExternes,
          statut: updates.statut,
          duree_heures: updates.dureeHeures,
          duree_jours: updates.dureeJours,
          date_debut: updates.dateDebut?.toISOString(),
          date_fin: updates.dateFin?.toISOString(),
        })
        .eq('id', itemId);

      if (updateError) {
        console.error('Error updating action item:', updateError);
        await loggingService.logError(updateError, 'updateActionItem');
        return null;
      }

      // Update plan totals
      await this.updatePlanTotals(planId);
      
      // Get the updated plan
      const anomalyId = await this.getAnomalyIdForPlan(planId);
      if (!anomalyId) {
        console.error('Could not find anomaly ID for plan', planId);
        return null;
      }
      return this.getActionPlan(anomalyId);
    } catch (error) {
      console.error('Error updating action item:', error);
      await loggingService.logError(error as Error, 'updateActionItem');
      return null;
    }
  }
}

export const supabaseActionPlanService = SupabaseActionPlanService.getInstance();
