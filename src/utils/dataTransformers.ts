import { Anomaly, MaintenanceWindow, ActionPlan, ActionItem } from '../types';
import { 
  BackendAnomaly, 
  CreateAnomalyData, 
  UpdateAnomalyData 
} from '../services/anomalyService';
import { 
  BackendMaintenanceWindow, 
  CreateMaintenanceWindowData 
} from '../services/maintenanceService';
import { 
  BackendActionPlan, 
  BackendActionItem,
  CreateActionPlanData 
} from '../services/actionPlanService';

// Transform backend anomaly to frontend format
export const transformBackendAnomaly = (backendAnomaly: BackendAnomaly): Anomaly => {
  return {
    id: backendAnomaly.id,
    title: backendAnomaly.description, // Backend uses 'description' as title
    description: backendAnomaly.description,
    equipmentId: backendAnomaly.num_equipement,
    service: backendAnomaly.service,
    responsiblePerson: backendAnomaly.responsable,
    status: backendAnomaly.status,
    originSource: backendAnomaly.source_origine,
    createdAt: new Date(backendAnomaly.created_at),
    updatedAt: new Date(backendAnomaly.updated_at),
    
    // AI Predictions
    fiabiliteScore: backendAnomaly.fiabilite_score,
    integriteScore: backendAnomaly.integrite_score,
    disponibiliteScore: backendAnomaly.disponibilite_score,
    processSafetyScore: backendAnomaly.process_safety_score,
    criticalityLevel: backendAnomaly.criticality_level,
    
    // User overrides
    userFiabiliteScore: backendAnomaly.user_fiabilite_score,
    userIntegriteScore: backendAnomaly.user_integrite_score,
    userDisponibiliteScore: backendAnomaly.user_disponibilite_score,
    userProcessSafetyScore: backendAnomaly.user_process_safety_score,
    userCriticalityLevel: backendAnomaly.user_criticality_level,
    useUserScores: backendAnomaly.use_user_scores,
    
    // Optional fields
    estimatedHours: backendAnomaly.estimated_hours,
    priority: backendAnomaly.priority,
    maintenanceWindowId: backendAnomaly.maintenance_window_id,
    
    // Metadata
    lastModifiedBy: backendAnomaly.last_modified_by,
    lastModifiedAt: backendAnomaly.last_modified_at ? new Date(backendAnomaly.last_modified_at) : undefined,
  };
};

// Transform frontend anomaly to backend create format
export const transformToCreateAnomalyData = (anomaly: Omit<Anomaly, 'id' | 'createdAt' | 'updatedAt'>): CreateAnomalyData => {
  return {
    num_equipement: anomaly.equipmentId,
    description: anomaly.description,
    service: anomaly.service,
    responsable: anomaly.responsiblePerson,
    source_origine: anomaly.originSource,
    status: anomaly.status,
    estimated_hours: anomaly.estimatedHours,
    priority: anomaly.priority,
    
    // User score overrides
    user_fiabilite_score: anomaly.userFiabiliteScore,
    user_integrite_score: anomaly.userIntegriteScore,
    user_disponibilite_score: anomaly.userDisponibiliteScore,
    user_process_safety_score: anomaly.userProcessSafetyScore,
    use_user_scores: anomaly.useUserScores,
  };
};

// Transform frontend anomaly updates to backend format
export const transformToUpdateAnomalyData = (updates: Partial<Anomaly>): UpdateAnomalyData => {
  const backendUpdates: UpdateAnomalyData = {};
  
  if (updates.equipmentId !== undefined) backendUpdates.num_equipement = updates.equipmentId;
  if (updates.description !== undefined) backendUpdates.description = updates.description;
  if (updates.service !== undefined) backendUpdates.service = updates.service;
  if (updates.responsiblePerson !== undefined) backendUpdates.responsable = updates.responsiblePerson;
  if (updates.originSource !== undefined) backendUpdates.source_origine = updates.originSource;
  if (updates.status !== undefined) backendUpdates.status = updates.status;
  if (updates.estimatedHours !== undefined) backendUpdates.estimated_hours = updates.estimatedHours;
  if (updates.priority !== undefined) backendUpdates.priority = updates.priority;
  if (updates.maintenanceWindowId !== undefined) backendUpdates.maintenance_window_id = updates.maintenanceWindowId;
  
  // User score overrides
  if (updates.userFiabiliteScore !== undefined) backendUpdates.user_fiabilite_score = updates.userFiabiliteScore;
  if (updates.userIntegriteScore !== undefined) backendUpdates.user_integrite_score = updates.userIntegriteScore;
  if (updates.userDisponibiliteScore !== undefined) backendUpdates.user_disponibilite_score = updates.userDisponibiliteScore;
  if (updates.userProcessSafetyScore !== undefined) backendUpdates.user_process_safety_score = updates.userProcessSafetyScore;
  if (updates.useUserScores !== undefined) backendUpdates.use_user_scores = updates.useUserScores;
  
  return backendUpdates;
};

// Transform backend maintenance window to frontend format
export const transformBackendMaintenanceWindow = (backendWindow: BackendMaintenanceWindow): MaintenanceWindow => {
  return {
    id: backendWindow.id,
    type: backendWindow.type,
    durationDays: backendWindow.duration_days,
    startDate: new Date(backendWindow.start_date),
    endDate: new Date(backendWindow.end_date),
    description: backendWindow.description,
    status: backendWindow.status,
  };
};

// Transform frontend maintenance window to backend create format
export const transformToCreateMaintenanceWindowData = (window: Omit<MaintenanceWindow, 'id'>): CreateMaintenanceWindowData => {
  return {
    type: window.type,
    duration_days: window.durationDays,
    start_date: window.startDate.toISOString(),
    description: window.description,
    status: window.status,
  };
};

// Transform backend action plan to frontend format
export const transformBackendActionPlan = (backendPlan: BackendActionPlan): ActionPlan => {
  return {
    id: backendPlan.id,
    anomalyId: backendPlan.anomaly_id,
    needsOutage: backendPlan.needs_outage,
    outageType: backendPlan.outage_type,
    outageDuration: backendPlan.outage_duration,
    plannedDate: backendPlan.planned_date ? new Date(backendPlan.planned_date) : undefined,
    actions: backendPlan.actions.map(transformBackendActionItem),
    totalDurationHours: backendPlan.total_duration_hours,
    totalDurationDays: backendPlan.total_duration_days,
    estimatedCost: backendPlan.estimated_cost,
    priority: backendPlan.priority,
    comments: backendPlan.comments,
    createdAt: new Date(backendPlan.created_at),
    updatedAt: new Date(backendPlan.updated_at),
    status: backendPlan.status,
    completionPercentage: backendPlan.completion_percentage,
  };
};

// Transform backend action item to frontend format
export const transformBackendActionItem = (backendItem: BackendActionItem): ActionItem => {
  return {
    id: backendItem.id,
    action: backendItem.action,
    responsable: backendItem.responsable,
    pdrsDisponible: backendItem.pdrs_disponible,
    ressourcesInternes: backendItem.ressources_internes,
    ressourcesExternes: backendItem.ressources_externes,
    statut: backendItem.statut,
    dureeHeures: backendItem.duree_heures,
    dureeJours: backendItem.duree_jours,
    dateDebut: backendItem.date_debut ? new Date(backendItem.date_debut) : undefined,
    dateFin: backendItem.date_fin ? new Date(backendItem.date_fin) : undefined,
    progression: backendItem.progression,
  };
};

// Transform frontend action plan to backend create format
export const transformToCreateActionPlanData = (plan: Omit<ActionPlan, 'id' | 'createdAt' | 'updatedAt' | 'actions' | 'totalDurationHours' | 'totalDurationDays' | 'completionPercentage'>): CreateActionPlanData => {
  return {
    anomaly_id: plan.anomalyId,
    needs_outage: plan.needsOutage,
    outage_type: plan.outageType,
    outage_duration: plan.outageDuration,
    planned_date: plan.plannedDate?.toISOString(),
    estimated_cost: plan.estimatedCost,
    priority: plan.priority,
    comments: plan.comments,
  };
};