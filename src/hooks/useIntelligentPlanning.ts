import { useState, useEffect, useCallback } from 'react';
import { IntelligentPlanningService, SchedulingResult } from '../services/intelligentPlanningService';
import { MockIntelligentPlanningService } from '../services/mockIntelligentPlanningService';
import { Anomaly, MaintenanceWindow } from '../types';
import { toast } from 'react-hot-toast';

export const useIntelligentPlanning = () => {
  // Use mock service for local development
  const isLocalDevelopment = import.meta.env.DEV || !import.meta.env.VITE_API_URL;
  const [planningService] = useState(() => 
    isLocalDevelopment 
      ? new MockIntelligentPlanningService() as any
      : new IntelligentPlanningService()
  );
  
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(true);
  const [schedulingInProgress, setSchedulingInProgress] = useState(false);
  const [lastSchedulingResults, setLastSchedulingResults] = useState<SchedulingResult[]>([]);

  // Auto-schedule treated anomalies periodically
  useEffect(() => {
    if (!autoScheduleEnabled) return;

    const interval = setInterval(async () => {
      await performAutoScheduling();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [autoScheduleEnabled]);

  const performAutoScheduling = useCallback(async () => {
    if (schedulingInProgress) return;

    setSchedulingInProgress(true);
    try {
      const results = await planningService.autoScheduleTreatedAnomalies();
      
      if (results.length > 0) {
        const successCount = results.filter((r: SchedulingResult) => r.success).length;
        const failCount = results.filter((r: SchedulingResult) => !r.success).length;
        
        if (successCount > 0) {
          toast.success(`Auto-scheduled ${successCount} anomalies to maintenance windows`);
        }
        
        if (failCount > 0) {
          toast.error(`Failed to schedule ${failCount} anomalies`);
        }
      }
      
      setLastSchedulingResults(results);
    } catch (error) {
      console.error('Auto-scheduling failed:', error);
      // Don't show error toast for automatic scheduling failures
    } finally {
      setSchedulingInProgress(false);
    }
  }, [planningService, schedulingInProgress]);

  const scheduleAnomalyManually = useCallback(async (
    anomaly: Anomaly, 
    windowId: string
  ): Promise<boolean> => {
    try {
      // You can extend the service to support manual scheduling to specific windows
      // For now, we'll use the automatic scheduling
      const results = await planningService.autoScheduleTreatedAnomalies();
      const result = results.find((r: SchedulingResult) => r.anomalyId === anomaly.id);
      
      if (result?.success) {
        toast.success(`Scheduled ${anomaly.title} to maintenance window`);
        return true;
      } else {
        toast.error(`Failed to schedule ${anomaly.title}`);
        return false;
      }
    } catch (error) {
      console.error('Manual scheduling failed:', error);
      toast.error('Failed to schedule anomaly');
      return false;
    }
  }, [planningService]);

  const createAutomaticWindow = useCallback(async (
    anomaly: Anomaly,
    windowType: 'force' | 'minor' | 'major' = 'minor'
  ): Promise<MaintenanceWindow | null> => {
    try {
      const newWindow = await planningService.createAutomaticMaintenanceWindow(anomaly, windowType);
      toast.success(`Created ${windowType} maintenance window for ${anomaly.title}`);
      return newWindow;
    } catch (error) {
      console.error('Failed to create automatic window:', error);
      toast.error('Failed to create maintenance window');
      return null;
    }
  }, [planningService]);

  const getSchedulingRecommendations = useCallback(async () => {
    try {
      return await planningService.getSchedulingRecommendations();
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return { recommendations: [], unschedulableAnomalies: [] };
    }
  }, [planningService]);

  return {
    // State
    autoScheduleEnabled,
    schedulingInProgress,
    lastSchedulingResults,
    
    // Actions
    setAutoScheduleEnabled,
    performAutoScheduling,
    scheduleAnomalyManually,
    createAutomaticWindow,
    getSchedulingRecommendations
  };
};

export default useIntelligentPlanning;
