import { useState, useCallback } from 'react';
import { Anomaly, MaintenanceWindow, ActionPlan } from '../types';
import { generateId } from '../lib/utils';

interface ScheduleAssignment {
  anomalyId: string;
  windowId: string;
  score: number;
  reason: string;
}

interface ScheduleResults {
  assignments: ScheduleAssignment[];
  newWindows: MaintenanceWindow[];
  unassigned: string[];
  optimizationScore: number;
}

interface WindowOptimization {
  windowId: string;
  currentUtilization: number;
  optimalUtilization: number;
  suggestions: string[];
}

interface OptimizationResults {
  reassignments: Array<{
    anomalyId: string;
    oldWindowId?: string;
    newWindowId: string;
    improvement: number;
  }>;
  windowOptimizations: WindowOptimization[];
  overallImprovement: number;
}

export const usePlanningEngine = () => {
  const [isScheduling, setIsScheduling] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Calculate compatibility score between anomaly and window
  const calculateCompatibilityScore = useCallback((
    anomaly: Anomaly,
    window: MaintenanceWindow,
    actionPlan?: ActionPlan
  ): number => {
    let score = 0;

    // Base compatibility based on window type and anomaly criticality
    const windowTypeScore = {
      'force': { 'critical': 100, 'high': 80, 'medium': 60, 'low': 40 },
      'major': { 'critical': 90, 'high': 95, 'medium': 85, 'low': 70 },
      'minor': { 'critical': 60, 'high': 70, 'medium': 90, 'low': 95 }
    };

    score += windowTypeScore[window.type][anomaly.criticalityLevel] || 50;

    // Duration compatibility
    if (actionPlan) {
      const requiredDays = actionPlan.totalDurationDays;
      const availableDays = window.durationDays;
      
      if (requiredDays <= availableDays) {
        score += 20; // Fits well
        if (requiredDays <= availableDays * 0.8) {
          score += 10; // Good utilization
        }
      } else {
        score -= 30; // Doesn't fit
      }
    }

    // Priority alignment
    if (actionPlan) {
      const priorityBonus = {
        1: 20, // Highest priority
        2: 15,
        3: 10,
        4: 5,
        5: 0
      };
      score += priorityBonus[actionPlan.priority] || 0;
    }

    // Timing preferences (sooner for critical)
    const daysUntilWindow = Math.ceil(
      (new Date(window.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (anomaly.criticalityLevel === 'critical' && daysUntilWindow <= 7) {
      score += 15; // Critical needs urgent scheduling
    } else if (anomaly.criticalityLevel === 'low' && daysUntilWindow > 30) {
      score += 10; // Low priority can wait
    }

    return Math.max(0, Math.min(100, score));
  }, []);

  // Auto-schedule treated anomalies
  const autoScheduleTreatedAnomalies = useCallback(async (
    treatedAnomalies: Anomaly[],
    availableWindows: MaintenanceWindow[],
    actionPlans: ActionPlan[]
  ): Promise<ScheduleResults> => {
    setIsScheduling(true);

    try {
      const assignments: ScheduleAssignment[] = [];
      const newWindows: MaintenanceWindow[] = [];
      const unassigned: string[] = [];

      // Sort anomalies by criticality and creation date
      const sortedAnomalies = [...treatedAnomalies].sort((a, b) => {
        const criticalityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
        const aCriticality = criticalityOrder[a.criticalityLevel];
        const bCriticality = criticalityOrder[b.criticalityLevel];
        
        if (aCriticality !== bCriticality) {
          return aCriticality - bCriticality;
        }
        
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Current available windows (with capacity tracking)
      const windowCapacity = new Map<string, number>();
      availableWindows.forEach(window => {
        const currentLoad = window.assignedAnomalies?.length || 0;
        const maxCapacity = Math.floor(window.durationDays * 2); // Rough capacity estimate
        windowCapacity.set(window.id, Math.max(0, maxCapacity - currentLoad));
      });

      for (const anomaly of sortedAnomalies) {
        const actionPlan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
        let bestMatch: { window: MaintenanceWindow; score: number } | null = null;

        // Find best matching window
        for (const window of availableWindows) {
          const capacity = windowCapacity.get(window.id) || 0;
          if (capacity <= 0) continue; // Window is full

          const score = calculateCompatibilityScore(anomaly, window, actionPlan);
          
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { window, score };
          }
        }

        if (bestMatch && bestMatch.score >= 60) { // Minimum threshold
          assignments.push({
            anomalyId: anomaly.id,
            windowId: bestMatch.window.id,
            score: bestMatch.score,
            reason: `Auto-scheduled with ${bestMatch.score}% compatibility`
          });

          // Update capacity
          const currentCapacity = windowCapacity.get(bestMatch.window.id) || 0;
          windowCapacity.set(bestMatch.window.id, currentCapacity - 1);
        } else {
          // Create new window for unassigned critical/high priority anomalies
          if (anomaly.criticalityLevel === 'critical' || anomaly.criticalityLevel === 'high') {
            const newWindow = await createOptimalWindow([anomaly.id], actionPlans);
            newWindows.push(newWindow);
            
            assignments.push({
              anomalyId: anomaly.id,
              windowId: newWindow.id,
              score: 100,
              reason: 'New optimized window created'
            });
          } else {
            unassigned.push(anomaly.id);
          }
        }
      }

      const optimizationScore = assignments.length > 0 
        ? assignments.reduce((sum, a) => sum + a.score, 0) / assignments.length
        : 0;

      return {
        assignments,
        newWindows,
        unassigned,
        optimizationScore
      };

    } finally {
      setIsScheduling(false);
    }
  }, [calculateCompatibilityScore]);

  // Create optimal maintenance window
  const createOptimalWindow = useCallback(async (
    anomalyIds: string[],
    actionPlans: ActionPlan[]
  ): Promise<MaintenanceWindow> => {
    // Get action plans for these anomalies
    const relevantPlans = actionPlans.filter(ap => anomalyIds.includes(ap.anomalyId));
    
    // Determine optimal window type and duration
    const maxDuration = Math.max(...relevantPlans.map(ap => ap.totalDurationDays), 1);
    const hasOutage = relevantPlans.some(ap => ap.needsOutage);
    const maxPriority = Math.min(...relevantPlans.map(ap => ap.priority), 5);

    let windowType: 'force' | 'minor' | 'major';
    let durationDays: number;

    if (maxPriority <= 2 && hasOutage) {
      // High priority with outage = force
      windowType = 'force';
      durationDays = Math.min(maxDuration, 3);
    } else if (maxDuration > 7 || relevantPlans.length > 3) {
      // Long duration or many anomalies = major
      windowType = 'major';
      durationDays = Math.min(maxDuration + 2, 14); // Add buffer
    } else {
      // Default to minor
      windowType = 'minor';
      durationDays = Math.min(maxDuration + 1, 7); // Add small buffer
    }

    // Schedule for next available slot (prefer weekends for major, weekdays for force)
    const now = new Date();
    const startDate = new Date(now);
    
    if (windowType === 'major') {
      // Find next weekend
      const daysUntilSaturday = (6 - now.getDay()) % 7;
      startDate.setDate(now.getDate() + (daysUntilSaturday || 7));
    } else if (windowType === 'force') {
      // Schedule ASAP (next business day)
      const daysToAdd = now.getDay() === 0 ? 1 : now.getDay() === 6 ? 2 : 1;
      startDate.setDate(now.getDate() + daysToAdd);
    } else {
      // Minor: schedule in 3-7 days
      startDate.setDate(now.getDate() + 5);
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + durationDays);

    return {
      id: generateId(),
      type: windowType,
      durationDays,
      startDate,
      endDate,
      description: `Auto-created ${windowType} window for ${anomalyIds.length} treated anomal${anomalyIds.length > 1 ? 'ies' : 'y'}`,
      status: 'planned',
      assignedAnomalies: [],
      autoCreated: true,
      sourceAnomalyId: anomalyIds[0]
    };
  }, []);

  // Optimize existing scheduling
  const optimizeScheduling = useCallback(async (
    treatedAnomalies: Anomaly[],
    maintenanceWindows: MaintenanceWindow[],
    actionPlans: ActionPlan[]
  ): Promise<OptimizationResults> => {
    setIsOptimizing(true);

    try {
      const reassignments: OptimizationResults['reassignments'] = [];
      const windowOptimizations: WindowOptimization[] = [];

      // Analyze current assignments
      const scheduledAnomalies = treatedAnomalies.filter(a => a.maintenanceWindowId);
      
      for (const anomaly of scheduledAnomalies) {
        const currentWindow = maintenanceWindows.find(w => w.id === anomaly.maintenanceWindowId);
        if (!currentWindow) continue;

        const actionPlan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
        const currentScore = calculateCompatibilityScore(anomaly, currentWindow, actionPlan);

        // Find better alternatives
        for (const window of maintenanceWindows) {
          if (window.id === currentWindow.id || window.status !== 'planned') continue;

          const alternativeScore = calculateCompatibilityScore(anomaly, window, actionPlan);
          const improvement = alternativeScore - currentScore;

          if (improvement > 15) { // Significant improvement threshold
            reassignments.push({
              anomalyId: anomaly.id,
              oldWindowId: currentWindow.id,
              newWindowId: window.id,
              improvement
            });
            break; // Take first significant improvement
          }
        }
      }

      // Analyze window utilization
      for (const window of maintenanceWindows) {
        if (window.status !== 'planned') continue;

        const assignedAnomalies = treatedAnomalies.filter(a => a.maintenanceWindowId === window.id);
        const totalRequiredDays = assignedAnomalies.reduce((sum, anomaly) => {
          const actionPlan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
          return sum + (actionPlan?.totalDurationDays || 1);
        }, 0);

        const currentUtilization = (totalRequiredDays / window.durationDays) * 100;
        const optimalUtilization = 85; // Target 85% utilization

        const suggestions: string[] = [];
        if (currentUtilization < 50) {
          suggestions.push('Consider consolidating with other windows');
          suggestions.push('Add more compatible anomalies');
        } else if (currentUtilization > 95) {
          suggestions.push('Window is overloaded - split anomalies');
          suggestions.push('Extend window duration');
        }

        windowOptimizations.push({
          windowId: window.id,
          currentUtilization,
          optimalUtilization,
          suggestions
        });
      }

      const overallImprovement = reassignments.length > 0
        ? reassignments.reduce((sum, r) => sum + r.improvement, 0) / reassignments.length
        : 0;

      return {
        reassignments,
        windowOptimizations,
        overallImprovement
      };

    } finally {
      setIsOptimizing(false);
    }
  }, [calculateCompatibilityScore]);

  return {
    isScheduling,
    isOptimizing,
    autoScheduleTreatedAnomalies,
    createOptimalWindow,
    optimizeScheduling,
    calculateCompatibilityScore
  };
};
