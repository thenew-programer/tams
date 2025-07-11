import { apiService, ApiResponse } from './apiService';

export interface BackendActionItem {
  id: string;
  action: string;
  responsable: string;
  pdrs_disponible: string;
  ressources_internes: string;
  ressources_externes: string;
  statut: 'planifie' | 'en_cours' | 'termine' | 'reporte';
  duree_heures: number;
  duree_jours: number;
  date_debut?: string;
  date_fin?: string;
  progression: number;
}

export interface BackendActionPlan {
  id: string;
  anomaly_id: string;
  needs_outage: boolean;
  outage_type?: 'force' | 'minor' | 'major';
  outage_duration?: number;
  planned_date?: string;
  actions: BackendActionItem[];
  total_duration_hours: number;
  total_duration_days: number;
  estimated_cost: number;
  priority: 1 | 2 | 3 | 4 | 5;
  comments: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'approved' | 'in_progress' | 'completed';
  completion_percentage: number;
}

export interface CreateActionPlanData {
  anomaly_id: string;
  needs_outage: boolean;
  outage_type?: 'force' | 'minor' | 'major';
  outage_duration?: number;
  planned_date?: string;
  estimated_cost?: number;
  priority?: 1 | 2 | 3 | 4 | 5;
  comments?: string;
}

export interface UpdateActionPlanData extends Partial<CreateActionPlanData> {
  status?: 'draft' | 'approved' | 'in_progress' | 'completed';
}

export interface CreateActionItemData {
  action: string;
  responsable: string;
  pdrs_disponible: string;
  ressources_internes: string;
  ressources_externes: string;
  statut: 'planifie' | 'en_cours' | 'termine' | 'reporte';
  duree_heures: number;
  duree_jours: number;
  date_debut?: string;
  date_fin?: string;
}

export interface UpdateActionItemData extends Partial<CreateActionItemData> {
  progression?: number;
}

export class ActionPlanService {
  async getActionPlan(anomalyId: string): Promise<BackendActionPlan> {
    const response = await apiService.get<ApiResponse<BackendActionPlan>>(`/action-plans/${anomalyId}`);
    return response.data!;
  }

  async createActionPlan(data: CreateActionPlanData): Promise<BackendActionPlan> {
    const response = await apiService.post<ApiResponse<BackendActionPlan>>(`/action-plans/${data.anomaly_id}`, data);
    return response.data!;
  }

  async updateActionPlan(anomalyId: string, updates: UpdateActionPlanData): Promise<BackendActionPlan> {
    const response = await apiService.put<ApiResponse<BackendActionPlan>>(`/action-plans/${anomalyId}`, updates);
    return response.data!;
  }

  async addActionItem(planId: string, itemData: CreateActionItemData): Promise<BackendActionItem> {
    const response = await apiService.post<ApiResponse<BackendActionItem>>(`/action-plans/${planId}/items`, itemData);
    return response.data!;
  }

  async updateActionItem(planId: string, itemId: string, updates: UpdateActionItemData): Promise<BackendActionItem> {
    const response = await apiService.put<ApiResponse<BackendActionItem>>(`/action-plans/${planId}/items/${itemId}`, updates);
    return response.data!;
  }

  async deleteActionItem(planId: string, itemId: string): Promise<void> {
    await apiService.delete(`/action-plans/${planId}/items/${itemId}`);
  }
}

export const actionPlanService = new ActionPlanService();