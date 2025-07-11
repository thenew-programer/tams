import { Anomaly, MaintenanceWindow, ActionPlan } from '../types';
import { toast } from 'react-hot-toast';

export class AutoPlanningService {
  
  /**
   * Automatically assign treated anomalies to open maintenance windows
   */
  static autoAssignTreatedAnomalies(
    anomalies: Anomaly[],
    maintenanceWindows: MaintenanceWindow[],
    actionPlans: ActionPlan[] = []
  ): {
    updatedAnomalies: Anomaly[];
    updatedWindows: MaintenanceWindow[];
    assignmentResults: AssignmentResult[];
  } {
    const updatedAnomalies = [...anomalies];
    const updatedWindows = [...maintenanceWindows];
    const assignmentResults: AssignmentResult[] = [];

    console.log('Starting auto assignment of treated anomalies');

    // Find treated anomalies that are not yet assigned to any window
    const treatedAnomalies = anomalies.filter(anomaly => 
      anomaly.status === 'in_progress' && 
      !anomaly.maintenanceWindowId
    );
    
    console.log(`Found ${treatedAnomalies.length} treated unassigned anomalies`);

    // Find open maintenance windows (planned or in_progress)
    const openWindows = maintenanceWindows.filter(window => 
      window.status === 'planned' || window.status === 'in_progress'
    );
    
    console.log(`Found ${openWindows.length} open maintenance windows`);
    
    // Log the initial capacity of each window
    openWindows.forEach(window => {
      const availableHours = this.getAvailableHours(window);
      console.log(`Window ${window.id} (${window.title || 'Untitled'}): ${availableHours} hours available`);
    });

    if (treatedAnomalies.length === 0) {
      console.log('No treated anomalies to assign');
      return {
        updatedAnomalies,
        updatedWindows,
        assignmentResults: []
      };
    }

    if (openWindows.length === 0) {
      // No open windows - suggest creating new ones
      console.log('No open windows available, suggesting new ones');
      const criticalAnomalies = treatedAnomalies.filter(a => a.criticalityLevel === 'critical');
      if (criticalAnomalies.length > 0) {
        toast.error(`${criticalAnomalies.length} anomalies critiques traitées nécessitent un arrêt forcé`);
      }
      
      const highPriorityAnomalies = treatedAnomalies.filter(a => a.criticalityLevel === 'high');
      if (highPriorityAnomalies.length > 0) {
        toast(`${highPriorityAnomalies.length} anomalies haute priorité en attente de planification`);
      }

      return {
        updatedAnomalies,
        updatedWindows,
        assignmentResults: []
      };
    }

    // Sort anomalies by priority (critical first)
    const sortedAnomalies = this.sortAnomaliesByPriority(treatedAnomalies);
    console.log(`Sorted ${sortedAnomalies.length} anomalies by priority`);

    // Create a working copy of open windows that we'll update as we assign anomalies
    let workingWindows = [...openWindows];
    
    // Assign anomalies to windows
    for (const anomaly of sortedAnomalies) {
      console.log(`Processing anomaly ${anomaly.id} (${anomaly.description})`);
      console.log(`Status: ${anomaly.status}, Criticality: ${anomaly.criticalityLevel}, Estimated Hours: ${anomaly.estimatedHours || 'unknown'}`);
      
      // Find the best window from our working copy (which has updated capacities)
      const bestWindow = this.findBestWindow(anomaly, workingWindows, actionPlans);
      
      if (bestWindow) {
        console.log(`Found best window: ${bestWindow.id} (${bestWindow.description || 'No description'})`);
        
        // Assign anomaly to window
        const anomalyIndex = updatedAnomalies.findIndex(a => a.id === anomaly.id);
        const windowIndex = updatedWindows.findIndex(w => w.id === bestWindow.id);
        
        if (anomalyIndex !== -1 && windowIndex !== -1) {
          // Update anomaly
          updatedAnomalies[anomalyIndex] = {
            ...updatedAnomalies[anomalyIndex],
            maintenanceWindowId: bestWindow.id
          };

          // Update window in our main result
          const currentAssigned = updatedWindows[windowIndex].assignedAnomalies || [];
          updatedWindows[windowIndex] = {
            ...updatedWindows[windowIndex],
            assignedAnomalies: [...currentAssigned, updatedAnomalies[anomalyIndex]]
          };
          
          // Update our working copy of windows
          const workingWindowIndex = workingWindows.findIndex(w => w.id === bestWindow.id);
          if (workingWindowIndex !== -1) {
            const workingCurrentAssigned = workingWindows[workingWindowIndex].assignedAnomalies || [];
            workingWindows[workingWindowIndex] = {
              ...workingWindows[workingWindowIndex],
              assignedAnomalies: [...workingCurrentAssigned, updatedAnomalies[anomalyIndex]]
            };
          }
          
          // Log the remaining capacity after assignment
          const remainingHours = this.getAvailableHours(workingWindows[workingWindowIndex]);
          console.log(`Assigned to window ${bestWindow.id}. Remaining capacity: ${remainingHours} hours`);

          assignmentResults.push({
            anomalyId: anomaly.id,
            windowId: bestWindow.id,
            success: true,
            reason: `Assigned to ${bestWindow.type} maintenance window`
          });
        }
      } else {
        console.log(`No suitable window found for anomaly ${anomaly.id}`);
        assignmentResults.push({
          anomalyId: anomaly.id,
          windowId: null,
          success: false,
          reason: 'No compatible maintenance window found'
        });
      }
    }
    
    // Log assignment results
    console.log(`Assignment complete. ${assignmentResults.filter(r => r.success).length} anomalies assigned.`);
    console.log(`${assignmentResults.filter(r => !r.success).length} anomalies could not be assigned.`);

    return {
      updatedAnomalies,
      updatedWindows,
      assignmentResults
    };
  }

  /**
   * Find the best maintenance window for an anomaly
   * Improved to consider actual hours required for the anomaly
   */
  private static findBestWindow(
    anomaly: Anomaly,
    openWindows: MaintenanceWindow[],
    actionPlans: ActionPlan[]
  ): MaintenanceWindow | null {
    // Get the action plan for this anomaly to determine actual required hours
    const actionPlan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
    
    // Use estimated hours from anomaly or action plan
    const requiredHours = anomaly.estimatedHours || 
                         (actionPlan?.totalDurationHours) || 
                         (actionPlan?.outageDuration ? actionPlan.outageDuration / 60 : 1);
                         
    console.log(`Finding window for anomaly ${anomaly.id} requiring ${requiredHours} hours`);

    // Filter windows that have enough capacity for this anomaly
    const compatibleWindows = openWindows.filter(window => {
      const isTypeCompatible = this.isTypeCompatible(anomaly.criticalityLevel, window.type);
      const availableHours = this.getAvailableHours(window);
      const hasEnoughCapacity = availableHours >= requiredHours;
      
      console.log(`Window ${window.id}: Type compatible: ${isTypeCompatible}, Available hours: ${availableHours}, Required: ${requiredHours}`);
      
      return isTypeCompatible && hasEnoughCapacity;
    });

    if (compatibleWindows.length === 0) {
      console.log(`No compatible windows found for anomaly ${anomaly.id}`);
      return null;
    }

    // Sort by preference: exact match type > earlier date > best fit for hours
    return compatibleWindows.sort((a, b) => {
      // Prefer exact compatibility match
      const aExactMatch = this.isExactMatch(anomaly, a);
      const bExactMatch = this.isExactMatch(anomaly, b);
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // Prefer windows where this anomaly will fit best (best fit algorithm)
      // This prevents small jobs from taking large windows unnecessarily
      const aAvailableHours = this.getAvailableHours(a);
      const bAvailableHours = this.getAvailableHours(b);
      const aDifference = aAvailableHours - requiredHours;
      const bDifference = bAvailableHours - requiredHours;
      
      // Choose the window with the smallest non-negative difference (best fit)
      if (aDifference >= 0 && bDifference >= 0) {
        return aDifference - bDifference; // Smaller difference is better
      }
      
      // Prefer earlier dates if best fit is equivalent
      const aDate = new Date(a.startDate).getTime();
      const bDate = new Date(b.startDate).getTime();
      
      return aDate - bDate;
    })[0];
  }

  /**
   * Check if anomaly is compatible with maintenance window
   */
  private static isCompatible(
    anomaly: Anomaly,
    window: MaintenanceWindow,
    requiredDuration: number
  ): boolean {
    // Check capacity
    const availableCapacity = this.getAvailableCapacity(window);
    if (availableCapacity < requiredDuration) {
      return false;
    }

    // Check type compatibility
    return this.isTypeCompatible(anomaly.criticalityLevel, window.type);
  }

  /**
   * Check if anomaly criticality matches window type exactly
   */
  private static isExactMatch(anomaly: Anomaly, window: MaintenanceWindow): boolean {
    const criticalityToType = {
      'critical': 'force',
      'high': 'minor',
      'medium': 'minor',
      'low': 'minor'
    };

    return criticalityToType[anomaly.criticalityLevel] === window.type;
  }

  /**
   * Check type compatibility between anomaly and window
   */
  private static isTypeCompatible(criticality: string, windowType: string): boolean {
    switch (windowType) {
      case 'force':
        return criticality === 'critical';
      case 'major':
        return ['critical', 'high', 'medium'].includes(criticality);
      case 'minor':
        return ['high', 'medium', 'low'].includes(criticality);
      default:
        return false;
    }
  }

  /**
   * Get available capacity for a maintenance window
   */
  private static getAvailableCapacity(window: MaintenanceWindow): number {
    const assigned = window.assignedAnomalies || [];
    const usedCapacity = assigned.reduce((sum, anomaly) => {
      return sum + (anomaly.estimatedHours || 8) / 24; // Convert hours to days
    }, 0);
    
    return Math.max(0, window.durationDays - usedCapacity);
  }

  /**
   * Get available hours for a maintenance window
   * This calculates the remaining hours available in a window after
   * considering all anomalies already assigned to it
   */
  private static getAvailableHours(window: MaintenanceWindow): number {
    const assigned = window.assignedAnomalies || [];
    const totalWindowHours = window.durationDays * 24; // Convert days to hours
    
    // Calculate used hours based on estimated hours of assigned anomalies
    const usedHours = assigned.reduce((sum, anomaly) => {
      return sum + (anomaly.estimatedHours || 8); // Default to 8 hours if not specified
    }, 0);
    
    // Account for buffer time between anomalies (2 hours buffer per anomaly)
    const bufferHours = assigned.length > 0 ? (assigned.length * 2) : 0;
    
    // Calculate available hours
    return Math.max(0, totalWindowHours - usedHours - bufferHours);
  }

  /**
   * Sort anomalies by priority for assignment
   */
  private static sortAnomaliesByPriority(anomalies: Anomaly[]): Anomaly[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return [...anomalies].sort((a, b) => {
      // First by criticality
      const aPriority = priorityOrder[a.criticalityLevel] || 0;
      const bPriority = priorityOrder[b.criticalityLevel] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then by creation date (oldest first for same criticality)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Create maintenance window for unassigned treated anomalies
   */
  static createWindowForTreatedAnomalies(
    treatedAnomalies: Anomaly[],
    actionPlans: ActionPlan[] = []
  ): MaintenanceWindow[] {
    const newWindows: MaintenanceWindow[] = [];
    
    // Group by criticality
    const criticalAnomalies = treatedAnomalies.filter(a => a.criticalityLevel === 'critical');
    const highAnomalies = treatedAnomalies.filter(a => a.criticalityLevel === 'high');
    const mediumLowAnomalies = treatedAnomalies.filter(a => 
      ['medium', 'low'].includes(a.criticalityLevel)
    );

    // Create force window for critical anomalies
    if (criticalAnomalies.length > 0) {
      const forceWindow = this.createWindow('force', criticalAnomalies, actionPlans);
      newWindows.push(forceWindow);
    }

    // Create minor window for high priority anomalies
    if (highAnomalies.length > 0) {
      const minorWindow = this.createWindow('minor', highAnomalies, actionPlans);
      newWindows.push(minorWindow);
    }

    // Create minor window for medium/low anomalies if there are enough
    if (mediumLowAnomalies.length >= 3) {
      const maintenanceWindow = this.createWindow('minor', mediumLowAnomalies, actionPlans);
      newWindows.push(maintenanceWindow);
    }

    return newWindows;
  }

  /**
   * Create a maintenance window for a group of anomalies
   */
  private static createWindow(
    type: 'force' | 'minor' | 'major',
    anomalies: Anomaly[],
    actionPlans: ActionPlan[]
  ): MaintenanceWindow {
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    
    // Calculate duration based on anomalies
    const totalHours = anomalies.reduce((sum, anomaly) => {
      const actionPlan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
      return sum + (actionPlan?.outageDuration || 1) * 24; // Convert days to hours
    }, 0);
    
    const duration = Math.max(1, Math.ceil(totalHours / 24)); // Convert back to days
    const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

    // Create description
    const equipmentIds = anomalies.map(a => a.equipmentId).join(', ');
    const description = `Arrêt ${type} automatique - Équipements: ${equipmentIds}`;

    return {
      id: `auto-${type}-${Date.now()}`,
      type,
      durationDays: duration,
      startDate,
      endDate,
      description,
      status: 'planned',
      autoCreated: true,
      assignedAnomalies: anomalies.map(anomaly => ({
        ...anomaly,
        maintenanceWindowId: `auto-${type}-${Date.now()}`
      }))
    };
  }

  /**
   * Show user notification about automatic assignments
   */
  static showAssignmentResults(results: AssignmentResult[]): void {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    if (successful > 0) {
      toast.success(`${successful} anomalies traitées assignées automatiquement`);
    }

    if (failed > 0) {
      toast.error(`${failed} anomalies non assignées - Fenêtres incompatibles`);
    }

    // Log details for debugging
    console.log('Auto-assignment results:', results);
  }
}

export interface AssignmentResult {
  anomalyId: string;
  windowId: string | null;
  success: boolean;
  reason: string;
}

export default AutoPlanningService;
