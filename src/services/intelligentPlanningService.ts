import { Anomaly, MaintenanceWindow } from '../types';
import { AnomalyService, BackendAnomaly } from './anomalyService';
import { MaintenanceService } from './maintenanceService';

export interface PlanningSlot {
  windowId: string;
  startTime: Date;
  endTime: Date;
  availableHours: number;
  windowType: 'force' | 'minor' | 'major';
  priority: number; // Higher priority = preferred slot
}

export interface SchedulingResult {
  anomalyId: string;
  windowId: string;
  scheduledDate: Date;
  estimatedDuration: number;
  success: boolean;
  reason?: string;
}

export interface IntelligentPlanningConfig {
  // Minimum hours required for scheduling
  minHoursForScheduling: number;
  // Maximum hours that can be scheduled in a single window
  maxHoursPerWindow: number;
  // Priority weights for different criticality levels
  criticalityWeights: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  // Time buffer between scheduled anomalies (in hours)
  timeBuffer: number;
  // Working hours per day
  workingHoursPerDay: number;
}

export class IntelligentPlanningService {
  private anomalyService: AnomalyService;
  private maintenanceService: MaintenanceService;
  private config: IntelligentPlanningConfig;

  constructor() {
    this.anomalyService = new AnomalyService();
    this.maintenanceService = new MaintenanceService();
    this.config = {
      minHoursForScheduling: 1,
      maxHoursPerWindow: 120, // 5 days * 24 hours
      criticalityWeights: {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1
      },
      timeBuffer: 2, // 2 hours buffer between tasks
      workingHoursPerDay: 8
    };
  }

  /**
   * Auto-schedule treated anomalies to available maintenance windows
   */
  async autoScheduleTreatedAnomalies(): Promise<SchedulingResult[]> {
    // Get all treated anomalies that are not yet scheduled
    const treatedAnomalies = await this.getTreatedUnscheduledAnomalies();
    
    // Get all available maintenance windows
    const availableWindows = await this.getAvailableMaintenanceWindows();
    
    // Generate available time slots
    const availableSlots = this.generateAvailableSlots(availableWindows);
    
    // Sort anomalies by priority and criticality
    const sortedAnomalies = this.sortAnomaliesByPriority(treatedAnomalies);
    
    // Schedule anomalies to optimal slots
    const results: SchedulingResult[] = [];
    
    for (const anomaly of sortedAnomalies) {
      const result = await this.scheduleAnomalyToOptimalSlot(anomaly, availableSlots);
      results.push(result);
      
      // Update available slots if successful
      if (result.success) {
        this.updateAvailableSlots(availableSlots, result);
      }
    }
    
    return results;
  }

  /**
   * Transform backend anomaly to frontend format
   */
  private transformBackendAnomaly(backendAnomaly: BackendAnomaly): Anomaly {
    return {
      id: backendAnomaly.id,
      title: backendAnomaly.description, // Using description as title
      description: backendAnomaly.description,
      equipmentId: backendAnomaly.num_equipement,
      service: backendAnomaly.service,
      responsiblePerson: backendAnomaly.responsable,
      status: backendAnomaly.status,
      originSource: backendAnomaly.source_origine,
      createdAt: new Date(backendAnomaly.created_at),
      updatedAt: new Date(backendAnomaly.updated_at),
      fiabiliteScore: backendAnomaly.fiabilite_score,
      integriteScore: backendAnomaly.integrite_score,
      disponibiliteScore: backendAnomaly.disponibilite_score,
      processSafetyScore: backendAnomaly.process_safety_score,
      criticalityLevel: backendAnomaly.criticality_level,
      userFiabiliteScore: backendAnomaly.user_fiabilite_score,
      userIntegriteScore: backendAnomaly.user_integrite_score,
      userDisponibiliteScore: backendAnomaly.user_disponibilite_score,
      userProcessSafetyScore: backendAnomaly.user_process_safety_score,
      userCriticalityLevel: backendAnomaly.user_criticality_level,
      useUserScores: backendAnomaly.use_user_scores,
      estimatedHours: backendAnomaly.estimated_hours,
      priority: backendAnomaly.priority,
      maintenanceWindowId: backendAnomaly.maintenance_window_id,
      lastModifiedBy: backendAnomaly.last_modified_by,
      lastModifiedAt: backendAnomaly.last_modified_at ? new Date(backendAnomaly.last_modified_at) : undefined,
    };
  }

  /**
   * Get treated anomalies that haven't been scheduled yet
   */
  private async getTreatedUnscheduledAnomalies(): Promise<Anomaly[]> {
    const response = await this.anomalyService.getAllAnomalies({ status: 'treated' });
    const backendAnomalies = (response.item as unknown as BackendAnomaly[]) || [];
    
    return backendAnomalies
      .filter((anomaly: BackendAnomaly) => 
        !anomaly.maintenance_window_id &&
        anomaly.estimated_hours && 
        anomaly.estimated_hours >= this.config.minHoursForScheduling
      )
      .map((anomaly: BackendAnomaly) => this.transformBackendAnomaly(anomaly));
  }

  /**
   * Get available maintenance windows for scheduling
   */
  private async getAvailableMaintenanceWindows(): Promise<MaintenanceWindow[]> {
    const allWindows = await this.maintenanceService.getAllWindows();
    
    // Convert backend format to frontend format
    return allWindows
      .filter(window => window.status === 'planned')
      .map(window => ({
        id: window.id,
        type: window.type,
        durationDays: window.duration_days,
        startDate: new Date(window.start_date),
        endDate: new Date(window.end_date),
        description: window.description,
        status: window.status,
        assignedAnomalies: []
      }));
  }

  /**
   * Generate available time slots from maintenance windows
   */
  private generateAvailableSlots(windows: MaintenanceWindow[]): PlanningSlot[] {
    const slots: PlanningSlot[] = [];
    
    for (const window of windows) {
      // Calculate total available hours in the window
      const totalHours = window.durationDays * this.config.workingHoursPerDay;
      
      // Get already assigned hours (if any)
      const assignedHours = window.assignedAnomalies?.reduce((sum, anomaly) => 
        sum + (anomaly.estimatedHours || 0), 0) || 0;
      
      const availableHours = totalHours - assignedHours;
      
      if (availableHours >= this.config.minHoursForScheduling) {
        // Calculate priority based on window type and timing
        const priority = this.calculateWindowPriority(window);
        
        slots.push({
          windowId: window.id,
          startTime: window.startDate,
          endTime: window.endDate,
          availableHours,
          windowType: window.type,
          priority
        });
      }
    }
    
    // Sort slots by priority (descending) and then by start time (ascending)
    return slots.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.startTime.getTime() - b.startTime.getTime();
    });
  }

  /**
   * Calculate priority for a maintenance window
   */
  private calculateWindowPriority(window: MaintenanceWindow): number {
    let priority = 0;
    
    // Window type priority
    switch (window.type) {
      case 'force':
        priority += 10; // Highest priority for force windows
        break;
      case 'minor':
        priority += 5;
        break;
      case 'major':
        priority += 3;
        break;
    }
    
    // Earlier windows get higher priority
    const daysFromNow = Math.ceil((window.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    priority += Math.max(0, 30 - daysFromNow); // Closer dates get higher priority
    
    return priority;
  }

  /**
   * Sort anomalies by priority and criticality
   */
  private sortAnomaliesByPriority(anomalies: Anomaly[]): Anomaly[] {
    return anomalies.sort((a, b) => {
      // First sort by criticality level
      const aCriticalityWeight = this.config.criticalityWeights[a.criticalityLevel];
      const bCriticalityWeight = this.config.criticalityWeights[b.criticalityLevel];
      
      if (aCriticalityWeight !== bCriticalityWeight) {
        return bCriticalityWeight - aCriticalityWeight;
      }
      
      // Then by priority (lower number = higher priority)
      const aPriority = a.priority || 5;
      const bPriority = b.priority || 5;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Finally by creation date (older first)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Schedule an anomaly to the most optimal available slot
   */
  private async scheduleAnomalyToOptimalSlot(
    anomaly: Anomaly, 
    availableSlots: PlanningSlot[]
  ): Promise<SchedulingResult> {
    const requiredHours = anomaly.estimatedHours || 0;
    
    // Find the first slot that can accommodate this anomaly
    for (const slot of availableSlots) {
      if (slot.availableHours >= requiredHours + this.config.timeBuffer) {
        try {
          // Try to assign the anomaly to this window
          await this.assignAnomalyToWindow(anomaly.id, slot.windowId);
          
          return {
            anomalyId: anomaly.id,
            windowId: slot.windowId,
            scheduledDate: slot.startTime,
            estimatedDuration: requiredHours,
            success: true
          };
        } catch (error) {
          console.error(`Failed to assign anomaly ${anomaly.id} to window ${slot.windowId}:`, error);
          continue;
        }
      }
    }
    
    return {
      anomalyId: anomaly.id,
      windowId: '',
      scheduledDate: new Date(),
      estimatedDuration: requiredHours,
      success: false,
      reason: 'No suitable maintenance window found'
    };
  }

  /**
   * Assign an anomaly to a maintenance window
   */
  private async assignAnomalyToWindow(anomalyId: string, windowId: string): Promise<void> {
    // Update the anomaly with the maintenance window ID
    await this.anomalyService.updateAnomaly(anomalyId, {
      maintenance_window_id: windowId
    });
    
    // Optionally, you can also update the maintenance window with the scheduled anomaly
    // This depends on your backend API structure
  }

  /**
   * Update available slots after successful scheduling
   */
  private updateAvailableSlots(slots: PlanningSlot[], result: SchedulingResult): void {
    const slot = slots.find(s => s.windowId === result.windowId);
    if (slot) {
      slot.availableHours -= result.estimatedDuration + this.config.timeBuffer;
      
      // Remove slot if no longer viable
      if (slot.availableHours < this.config.minHoursForScheduling) {
        const index = slots.indexOf(slot);
        slots.splice(index, 1);
      }
    }
  }

  /**
   * Create a new maintenance window automatically for high-priority anomalies
   */
  async createAutomaticMaintenanceWindow(
    anomaly: Anomaly, 
    windowType: 'force' | 'minor' | 'major' = 'minor'
  ): Promise<MaintenanceWindow> {
    const estimatedDays = Math.ceil((anomaly.estimatedHours || 8) / this.config.workingHoursPerDay);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (windowType === 'force' ? 1 : 7)); // 1 day for force, 7 days for others
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + estimatedDays);
    
    const windowData = {
      type: windowType,
      duration_days: estimatedDays,
      start_date: startDate.toISOString(),
      description: `Auto-created for anomaly: ${anomaly.title}`,
      status: 'planned' as const
    };
    
    const backendWindow = await this.maintenanceService.createWindow(windowData);
    
    // Convert to frontend format
    const newWindow: MaintenanceWindow = {
      id: backendWindow.id,
      type: backendWindow.type,
      durationDays: backendWindow.duration_days,
      startDate: new Date(backendWindow.start_date),
      endDate: new Date(backendWindow.end_date),
      description: backendWindow.description,
      status: backendWindow.status,
      assignedAnomalies: [],
      autoCreated: true,
      sourceAnomalyId: anomaly.id
    };
    
    // Immediately assign the anomaly to this window
    await this.assignAnomalyToWindow(anomaly.id, newWindow.id);
    
    return newWindow;
  }

  /**
   * Get scheduling recommendations for manual review
   */
  async getSchedulingRecommendations(): Promise<{
    recommendations: Array<{
      anomaly: Anomaly;
      recommendedWindow: MaintenanceWindow;
      reason: string;
      urgency: 'low' | 'medium' | 'high' | 'critical';
    }>;
    unschedulableAnomalies: Array<{
      anomaly: Anomaly;
      reason: string;
    }>;
  }> {
    const treatedAnomalies = await this.getTreatedUnscheduledAnomalies();
    const availableWindows = await this.getAvailableMaintenanceWindows();
    
    const recommendations = [];
    const unschedulableAnomalies = [];
    
    for (const anomaly of treatedAnomalies) {
      const suitableWindow = this.findBestWindow(anomaly, availableWindows);
      
      if (suitableWindow) {
        recommendations.push({
          anomaly,
          recommendedWindow: suitableWindow,
          reason: this.getRecommendationReason(anomaly, suitableWindow),
          urgency: this.calculateUrgency(anomaly)
        });
      } else {
        unschedulableAnomalies.push({
          anomaly,
          reason: 'No suitable maintenance window available'
        });
      }
    }
    
    return { recommendations, unschedulableAnomalies };
  }

  private findBestWindow(anomaly: Anomaly, windows: MaintenanceWindow[]): MaintenanceWindow | null {
    const requiredHours = anomaly.estimatedHours || 0;
    
    return windows.find(window => {
      const totalHours = window.durationDays * this.config.workingHoursPerDay;
      const assignedHours = window.assignedAnomalies?.reduce((sum, a) => sum + (a.estimatedHours || 0), 0) || 0;
      return totalHours - assignedHours >= requiredHours;
    }) || null;
  }

  private getRecommendationReason(anomaly: Anomaly, window: MaintenanceWindow): string {
    const reasons = [];
    
    if (anomaly.criticalityLevel === 'critical' || anomaly.criticalityLevel === 'high') {
      reasons.push('High criticality level');
    }
    
    if (anomaly.priority && anomaly.priority <= 2) {
      reasons.push('High priority');
    }
    
    if (window.type === 'force') {
      reasons.push('Emergency maintenance window');
    }
    
    return reasons.join(', ') || 'Standard scheduling';
  }

  private calculateUrgency(anomaly: Anomaly): 'low' | 'medium' | 'high' | 'critical' {
    return anomaly.criticalityLevel;
  }
}
