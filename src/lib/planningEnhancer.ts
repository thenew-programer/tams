import { Anomaly, MaintenanceWindow, ActionPlan } from '../types';
import { toast } from 'react-hot-toast';

export class PlanningEnhancer {
  
  /**
   * Smart scheduling algorithm that considers multiple factors
   */
  static smartSchedule(
    anomalies: Anomaly[],
    maintenanceWindows: MaintenanceWindow[],
    actionPlans: ActionPlan[]
  ): {
    scheduledAnomalies: Anomaly[];
    unscheduledAnomalies: Anomaly[];
    windowUtilization: Record<string, number>;
    recommendations: string[];
  } {
    const scheduledAnomalies: Anomaly[] = [];
    const unscheduledAnomalies: Anomaly[] = [];
    const windowUtilization: Record<string, number> = {};
    const recommendations: string[] = [];

    // Sort anomalies by priority (critical first, then by creation date)
    const sortedAnomalies = [...anomalies].sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityA = priorityOrder[a.criticalityLevel] || 0;
      const priorityB = priorityOrder[b.criticalityLevel] || 0;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Sort maintenance windows by date
    const sortedWindows = [...maintenanceWindows].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    // Initialize window utilization
    sortedWindows.forEach(window => {
      windowUtilization[window.id] = 0;
    });

    // Schedule anomalies
    for (const anomaly of sortedAnomalies) {
      let scheduled = false;

      // Only schedule treated anomalies
      if (anomaly.status !== 'treated') {
        unscheduledAnomalies.push(anomaly);
        continue;
      }

      // Find the best maintenance window
      for (const window of sortedWindows) {
        const actionPlan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
        const requiredDuration = actionPlan?.outageDuration || 1;
        const currentUtilization = windowUtilization[window.id] || 0;
        
        // Check if the window can accommodate this anomaly
        if (currentUtilization + requiredDuration <= window.durationDays) {
          // Check compatibility based on window type and anomaly criticality
          const compatible = this.checkCompatibility(anomaly, window);
          
          if (compatible) {
            scheduledAnomalies.push({
              ...anomaly,
              maintenanceWindowId: window.id
            });
            windowUtilization[window.id] += requiredDuration;
            scheduled = true;
            break;
          }
        }
      }

      if (!scheduled) {
        unscheduledAnomalies.push(anomaly);
        
        // Generate recommendations for unscheduled anomalies
        if (anomaly.criticalityLevel === 'critical') {
          recommendations.push(`Anomalie critique non programmée: ${anomaly.title} - Créer un arrêt forcé`);
        } else if (anomaly.criticalityLevel === 'high') {
          recommendations.push(`Anomalie haute priorité: ${anomaly.title} - Considérer un arrêt mineur`);
        }
      }
    }

    return {
      scheduledAnomalies,
      unscheduledAnomalies,
      windowUtilization,
      recommendations
    };
  }

  /**
   * Check if an anomaly is compatible with a maintenance window
   */
  private static checkCompatibility(anomaly: Anomaly, window: MaintenanceWindow): boolean {
    // Force maintenance windows can handle critical anomalies
    if (window.type === 'force' && anomaly.criticalityLevel === 'critical') {
      return true;
    }

    // Major maintenance windows can handle high and medium anomalies
    if (window.type === 'major' && ['high', 'medium'].includes(anomaly.criticalityLevel)) {
      return true;
    }

    // Minor maintenance windows can handle medium and low anomalies
    if (window.type === 'minor' && ['medium', 'low'].includes(anomaly.criticalityLevel)) {
      return true;
    }

    return false;
  }

  /**
   * Generate optimization suggestions
   */
  static generateOptimizationSuggestions(
    anomalies: Anomaly[],
    maintenanceWindows: MaintenanceWindow[],
    actionPlans: ActionPlan[]
  ): string[] {
    const suggestions: string[] = [];
    const { windowUtilization, unscheduledAnomalies } = this.smartSchedule(anomalies, maintenanceWindows, actionPlans);

    // Check for underutilized windows
    maintenanceWindows.forEach(window => {
      const utilization = windowUtilization[window.id] || 0;
      const utilizationPercentage = (utilization / window.durationDays) * 100;
      
      if (utilizationPercentage < 50) {
        suggestions.push(`Fenêtre sous-utilisée: ${window.description} (${utilizationPercentage.toFixed(1)}%)`);
      } else if (utilizationPercentage > 90) {
        suggestions.push(`Fenêtre surchargée: ${window.description} (${utilizationPercentage.toFixed(1)}%)`);
      }
    });

    // Check for missing maintenance windows
    const criticalUnscheduled = unscheduledAnomalies.filter(a => a.criticalityLevel === 'critical');
    if (criticalUnscheduled.length > 0) {
      suggestions.push(`${criticalUnscheduled.length} anomalies critiques non programmées - Créer un arrêt forcé`);
    }

    const highUnscheduled = unscheduledAnomalies.filter(a => a.criticalityLevel === 'high');
    if (highUnscheduled.length > 3) {
      suggestions.push(`${highUnscheduled.length} anomalies haute priorité - Considérer un arrêt mineur`);
    }

    return suggestions;
  }

  /**
   * Create automatic maintenance window for an anomaly
   */
  static createAutomaticWindow(
    anomaly: Anomaly,
    actionPlan?: ActionPlan
  ): MaintenanceWindow {
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    
    let windowType: 'force' | 'minor' | 'major' = 'minor';
    let duration = 3;
    
    if (anomaly.criticalityLevel === 'critical') {
      windowType = 'force';
      duration = 1;
    } else if (anomaly.criticalityLevel === 'high') {
      windowType = 'minor';
      duration = 3;
    } else {
      windowType = 'minor';
      duration = 7;
    }

    const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

    return {
      id: `auto-${Date.now()}`,
      type: windowType,
      durationDays: duration,
      startDate: startDate,
      endDate: endDate,
      description: `Arrêt automatique pour ${anomaly.equipmentId} - ${anomaly.title}`,
      status: 'planned',
      autoCreated: true,
      assignedAnomalies: [anomaly]
    };
  }

  /**
   * Validate scheduling constraints
   */
  static validateScheduling(
    anomalies: Anomaly[],
    maintenanceWindows: MaintenanceWindow[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for overlapping maintenance windows
    for (let i = 0; i < maintenanceWindows.length; i++) {
      for (let j = i + 1; j < maintenanceWindows.length; j++) {
        const window1 = maintenanceWindows[i];
        const window2 = maintenanceWindows[j];
        
        const start1 = new Date(window1.startDate);
        const end1 = new Date(window1.endDate);
        const start2 = new Date(window2.startDate);
        const end2 = new Date(window2.endDate);
        
        if (start1 <= end2 && start2 <= end1) {
          errors.push(`Fenêtres de maintenance en conflit: ${window1.description} et ${window2.description}`);
        }
      }
    }

    // Check for critical anomalies without force windows
    const criticalAnomalies = anomalies.filter(a => 
      a.criticalityLevel === 'critical' && 
      a.status === 'treated' && 
      !a.maintenanceWindowId
    );

    if (criticalAnomalies.length > 0) {
      const forceWindows = maintenanceWindows.filter(w => w.type === 'force');
      if (forceWindows.length === 0) {
        errors.push(`${criticalAnomalies.length} anomalies critiques nécessitent un arrêt forcé`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Show user-friendly notifications
   */
  static showSchedulingResults(results: {
    scheduledAnomalies: Anomaly[];
    unscheduledAnomalies: Anomaly[];
    recommendations: string[];
  }) {
    const { scheduledAnomalies, unscheduledAnomalies, recommendations } = results;

    if (scheduledAnomalies.length > 0) {
      toast.success(`${scheduledAnomalies.length} anomalies programmées avec succès`);
    }

    if (unscheduledAnomalies.length > 0) {
      toast.error(`${unscheduledAnomalies.length} anomalies non programmées`);
    }

    if (recommendations.length > 0) {
      toast(`${recommendations.length} recommandations disponibles`);
    }
  }
}

export default PlanningEnhancer;
