import { ActionPlan, MaintenanceWindow, Anomaly } from '../types';
import { generateId } from './utils';

export interface PlanningIntegration {
  mergeActionPlanWithPlanning: (actionPlan: ActionPlan, existingWindows: MaintenanceWindow[]) => {
    updatedWindows: MaintenanceWindow[];
    newWindow?: MaintenanceWindow;
    merged: boolean;
  };
  createUrgentOutage: (actionPlan: ActionPlan) => MaintenanceWindow;
  calculateOptimalScheduling: (actionPlans: ActionPlan[], windows: MaintenanceWindow[]) => {
    suggestions: Array<{
      windowId: string;
      actionPlans: ActionPlan[];
      efficiency: number;
      timeUtilization: number;
    }>;
  };
  updatePlanningFromActionPlan: (actionPlan: ActionPlan, windows: MaintenanceWindow[]) => MaintenanceWindow[];
  assignAnomaliesToWindow: (window: MaintenanceWindow, anomalies: Anomaly[]) => {
    updatedWindow: MaintenanceWindow;
    updatedAnomalies: Anomaly[];
  };
}

export const planningIntegration: PlanningIntegration = {
  mergeActionPlanWithPlanning: (actionPlan: ActionPlan, existingWindows: MaintenanceWindow[]) => {
    if (!actionPlan.needsOutage) {
      return { updatedWindows: existingWindows, merged: false };
    }

    // Find compatible existing window
    const compatibleWindow = existingWindows.find(window => {
      if (window.status !== 'planned') return false;
      if (window.type !== actionPlan.outageType) return false;
      
      // Check if there's enough time remaining
      const remainingDays = window.durationDays - (window.assignedAnomalies?.length || 0);
      return remainingDays >= (actionPlan.outageDuration || 1);
    });

    if (compatibleWindow) {
      // Merge with existing window
      const updatedWindows = existingWindows.map(window => {
        if (window.id === compatibleWindow.id) {
          return {
            ...window,
            assignedAnomalies: [...(window.assignedAnomalies || [])],
            description: `${window.description} + Action Plan ${actionPlan.id}`
          };
        }
        return window;
      });
      
      return { updatedWindows, merged: true };
    } else {
      // Create new window
      const newWindow = planningIntegration.createUrgentOutage(actionPlan);
      return {
        updatedWindows: [...existingWindows, newWindow],
        newWindow,
        merged: false
      };
    }
  },

  createUrgentOutage: (actionPlan: ActionPlan): MaintenanceWindow => {
    const startDate = actionPlan.plannedDate || new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (actionPlan.outageDuration || 1));

    return {
      id: generateId(),
      type: actionPlan.outageType || 'force',
      durationDays: actionPlan.outageDuration || 1,
      startDate,
      endDate,
      description: `Arrêt automatique - Plan d'action ${actionPlan.id}`,
      status: actionPlan.outageType === 'force' ? 'in_progress' : 'planned',
      autoCreated: true,
      sourceAnomalyId: actionPlan.anomalyId,
      assignedAnomalies: []
    };
  },

  calculateOptimalScheduling: (actionPlans: ActionPlan[], windows: MaintenanceWindow[]) => {
    const suggestions = [];
    
    for (const window of windows) {
      if (window.status !== 'planned') continue;
      
      const compatiblePlans = actionPlans.filter(plan => {
        if (!plan.needsOutage) return false;
        if (plan.outageType !== window.type) return false;
        return (plan.outageDuration || 1) <= window.durationDays;
      });
      
      if (compatiblePlans.length > 0) {
        const totalDuration = compatiblePlans.reduce((sum, plan) => sum + (plan.outageDuration || 1), 0);
        const efficiency = Math.min(100, (compatiblePlans.length / 3) * 100);
        const timeUtilization = Math.min(100, (totalDuration / window.durationDays) * 100);
        
        suggestions.push({
          windowId: window.id,
          actionPlans: compatiblePlans,
          efficiency,
          timeUtilization
        });
      }
    }
    
    return { suggestions: suggestions.sort((a, b) => b.efficiency - a.efficiency) };
  },

  updatePlanningFromActionPlan: (actionPlan: ActionPlan, windows: MaintenanceWindow[]) => {
    if (actionPlan.outageType === 'force') {
      // For urgent outages, create immediately
      const urgentWindow = planningIntegration.createUrgentOutage(actionPlan);
      return [...windows, urgentWindow];
    }
    
    // For other types, try to merge or suggest optimal placement
    const { updatedWindows } = planningIntegration.mergeActionPlanWithPlanning(actionPlan, windows);
    return updatedWindows;
  },

  assignAnomaliesToWindow: (window: MaintenanceWindow, anomalies: Anomaly[]) => {
    // Filter anomalies that need outage and are compatible
    const compatibleAnomalies = anomalies.filter(anomaly => {
      // Must not already be assigned
      if (anomaly.maintenanceWindowId) return false;
      
      // Must have action plan that needs outage
      if (!anomaly.actionPlan?.needsOutage) return false;
      
      // Must match outage type
      if (anomaly.actionPlan.outageType !== window.type) return false;
      
      // Must fit within window duration
      const requiredDuration = anomaly.actionPlan.outageDuration || 1;
      return requiredDuration <= window.durationDays;
    });

    // Sort by criticality and priority
    const sortedAnomalies = compatibleAnomalies.sort((a, b) => {
      const criticalityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aCriticality = criticalityOrder[a.criticalityLevel as keyof typeof criticalityOrder] || 0;
      const bCriticality = criticalityOrder[b.criticalityLevel as keyof typeof criticalityOrder] || 0;
      
      if (aCriticality !== bCriticality) {
        return bCriticality - aCriticality;
      }
      
      return (a.priority || 5) - (b.priority || 5);
    });

    // Calculate how many anomalies can fit
    let totalDurationUsed = 0;
    const assignedAnomalies = [];
    
    for (const anomaly of sortedAnomalies) {
      const requiredDuration = anomaly.actionPlan?.outageDuration || 1;
      if (totalDurationUsed + requiredDuration <= window.durationDays) {
        assignedAnomalies.push(anomaly);
        totalDurationUsed += requiredDuration;
      }
    }

    // Update window with assigned anomalies
    const updatedWindow: MaintenanceWindow = {
      ...window,
      assignedAnomalies: assignedAnomalies
    };

    // Update anomalies with window assignment
    const updatedAnomalies = anomalies.map(anomaly => {
      if (assignedAnomalies.find(assigned => assigned.id === anomaly.id)) {
        return {
          ...anomaly,
          maintenanceWindowId: window.id
        };
      }
      return anomaly;
    });

    return { updatedWindow, updatedAnomalies };
  }
};

export const calculateActionPlanProgress = (actionPlan: ActionPlan): number => {
  if (actionPlan.actions.length === 0) return 0;
  
  const totalProgress = actionPlan.actions.reduce((sum, action) => sum + action.progression, 0);
  return Math.round(totalProgress / actionPlan.actions.length);
};

export const getActionPlanStatusColor = (status: string): string => {
  switch (status) {
    case 'draft': return 'bg-gray-500';
    case 'approved': return 'bg-blue-500';
    case 'in_progress': return 'bg-yellow-500';
    case 'completed': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

export const getActionStatusColor = (status: string): string => {
  switch (status) {
    case 'planifie': return 'bg-blue-500';
    case 'en_cours': return 'bg-yellow-500';
    case 'termine': return 'bg-green-500';
    case 'reporte': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};