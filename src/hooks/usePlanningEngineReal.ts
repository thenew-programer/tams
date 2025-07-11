import { useState, useCallback } from 'react';
import { Anomaly, MaintenanceWindow, ActionPlan } from '../types';
import { supabasePlanningService, ScheduleResults, OptimizationResults } from '../services/supabasePlanningService';

export const usePlanningEngineReal = () => {
  const [isScheduling, setIsScheduling] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Auto-schedule treated anomalies using the backend service
  const autoScheduleTreatedAnomalies = useCallback(async (
    treatedAnomalies: Anomaly[],
    availableWindows: MaintenanceWindow[],
    actionPlans: ActionPlan[]
  ): Promise<ScheduleResults> => {
    setIsScheduling(true);
    try {
      return await supabasePlanningService.autoScheduleTreatedAnomalies(
        treatedAnomalies,
        availableWindows,
        actionPlans
      );
    } finally {
      setIsScheduling(false);
    }
  }, []);

  // Create optimal maintenance window using the backend service
  const createOptimalWindow = useCallback(async (
    anomalyIds: string[],
    actionPlans: ActionPlan[]
  ): Promise<MaintenanceWindow> => {
    return await supabasePlanningService.createOptimalWindow(anomalyIds, actionPlans);
  }, []);

  // Optimize existing scheduling using the backend service
  const optimizeScheduling = useCallback(async (
    treatedAnomalies: Anomaly[],
    maintenanceWindows: MaintenanceWindow[],
    actionPlans: ActionPlan[]
  ): Promise<OptimizationResults> => {
    setIsOptimizing(true);
    try {
      return await supabasePlanningService.optimizeScheduling(
        treatedAnomalies,
        maintenanceWindows,
        actionPlans
      );
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  // Calculate compatibility score (delegated to service)
  const calculateCompatibilityScore = useCallback((
    anomaly: Anomaly,
    window: MaintenanceWindow,
    actionPlan?: ActionPlan
  ): number => {
    // This is a simplified version for frontend use
    // The real calculation is done in the backend service
    const windowTypeScore = {
      'force': { 'critical': 100, 'high': 80, 'medium': 60, 'low': 40 },
      'major': { 'critical': 90, 'high': 95, 'medium': 85, 'low': 70 },
      'minor': { 'critical': 60, 'high': 70, 'medium': 90, 'low': 95 }
    };

    let score = windowTypeScore[window.type][anomaly.criticalityLevel] || 50;

    // Duration compatibility
    if (actionPlan) {
      const requiredDays = actionPlan.totalDurationDays;
      const availableDays = window.durationDays;
      
      if (requiredDays <= availableDays) {
        score += 20;
        if (requiredDays <= availableDays * 0.8) {
          score += 10;
        }
      } else {
        score -= 30;
      }
    }

    return Math.max(0, Math.min(100, score));
  }, []);

  return {
    isScheduling,
    isOptimizing,
    autoScheduleTreatedAnomalies,
    createOptimalWindow,
    optimizeScheduling,
    calculateCompatibilityScore
  };
};
