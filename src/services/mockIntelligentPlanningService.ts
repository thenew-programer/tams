import { Anomaly, MaintenanceWindow } from '../types';
import { mockAnomalies, mockMaintenanceWindows } from '../data/mockData';

export interface SchedulingResult {
  anomalyId: string;
  windowId: string;
  scheduledDate: Date;
  estimatedDuration: number;
  success: boolean;
  reason?: string;
}

export interface IntelligentPlanningConfig {
  minHoursForScheduling: number;
  maxHoursPerWindow: number;
  criticalityWeights: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  timeBuffer: number;
  workingHoursPerDay: number;
}

export class MockIntelligentPlanningService {
  private config: IntelligentPlanningConfig;

  constructor() {
    this.config = {
      minHoursForScheduling: 1,
      maxHoursPerWindow: 120,
      criticalityWeights: {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1
      },
      timeBuffer: 2,
      workingHoursPerDay: 8
    };
  }

  /**
   * Auto-schedule treated anomalies to available maintenance windows
   */
  async autoScheduleTreatedAnomalies(): Promise<SchedulingResult[]> {
    console.log('🚀 Starting auto-scheduling with mock service');
    
    // Get treated anomalies that are not yet scheduled
    const treatedAnomalies = this.getTreatedUnscheduledAnomalies();
    console.log('📋 Found treated anomalies:', treatedAnomalies.length);
    
    // Get available maintenance windows
    const availableWindows = this.getAvailableMaintenanceWindows();
    console.log('🏗️ Available maintenance windows:', availableWindows.length);
    
    // Generate available time slots
    const availableSlots = this.generateAvailableSlots(availableWindows);
    console.log('📅 Available time slots:', availableSlots.length);
    
    // Sort anomalies by priority and criticality
    const sortedAnomalies = this.sortAnomaliesByPriority(treatedAnomalies);
    console.log('⚡ Sorted anomalies:', sortedAnomalies.map(a => `${a.title} (${a.criticalityLevel})`));
    
    // Schedule anomalies to optimal slots
    const results: SchedulingResult[] = [];
    
    for (const anomaly of sortedAnomalies) {
      const result = this.scheduleAnomalyToOptimalSlot(anomaly, availableSlots);
      results.push(result);
      console.log(`✅ Scheduled ${anomaly.title}: ${result.success ? 'Success' : 'Failed'}`);
      
      // Update available slots if successful
      if (result.success) {
        this.updateAvailableSlots(availableSlots, result);
      }
    }
    
    console.log('🎯 Final results:', results);
    return results;
  }

  /**
   * Get treated anomalies that haven't been scheduled yet
   */
  private getTreatedUnscheduledAnomalies(): Anomaly[] {
    const treated = mockAnomalies.filter(anomaly => 
      anomaly.status === 'treated' && 
      !anomaly.maintenanceWindowId &&
      anomaly.estimatedHours && 
      anomaly.estimatedHours >= this.config.minHoursForScheduling
    );
    
    console.log('🔍 Filtering anomalies:');
    console.log('- Total anomalies:', mockAnomalies.length);
    console.log('- Treated anomalies:', mockAnomalies.filter(a => a.status === 'treated').length);
    console.log('- Treated & unscheduled:', treated.length);
    console.log('- Treated anomalies details:', treated.map(a => ({
      id: a.id,
      title: a.title,
      status: a.status,
      estimatedHours: a.estimatedHours,
      criticalityLevel: a.criticalityLevel
    })));
    
    return treated;
  }

  /**
   * Get available maintenance windows for scheduling
   */
  private getAvailableMaintenanceWindows(): MaintenanceWindow[] {
    const available = mockMaintenanceWindows.filter(window => window.status === 'planned');
    
    console.log('🏗️ Filtering maintenance windows:');
    console.log('- Total windows:', mockMaintenanceWindows.length);
    console.log('- Planned windows:', available.length);
    console.log('- Window details:', available.map(w => ({
      id: w.id,
      type: w.type,
      durationDays: w.durationDays,
      startDate: w.startDate,
      status: w.status
    })));
    
    return available;
  }

  /**
   * Generate available time slots from maintenance windows
   */
  private generateAvailableSlots(windows: MaintenanceWindow[]): Array<{
    windowId: string;
    startTime: Date;
    endTime: Date;
    availableHours: number;
    windowType: 'force' | 'minor' | 'major';
    priority: number;
  }> {
    const slots = [];
    
    for (const window of windows) {
      const totalHours = window.durationDays * this.config.workingHoursPerDay;
      const assignedHours = window.assignedAnomalies?.reduce((sum, anomaly) => 
        sum + (anomaly.estimatedHours || 0), 0) || 0;
      
      const availableHours = totalHours - assignedHours;
      
      if (availableHours >= this.config.minHoursForScheduling) {
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
    
    switch (window.type) {
      case 'force':
        priority += 10;
        break;
      case 'minor':
        priority += 5;
        break;
      case 'major':
        priority += 3;
        break;
    }
    
    const daysFromNow = Math.ceil((window.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    priority += Math.max(0, 30 - daysFromNow);
    
    return priority;
  }

  /**
   * Sort anomalies by priority and criticality
   */
  private sortAnomaliesByPriority(anomalies: Anomaly[]): Anomaly[] {
    return anomalies.sort((a, b) => {
      const aCriticalityWeight = this.config.criticalityWeights[a.criticalityLevel];
      const bCriticalityWeight = this.config.criticalityWeights[b.criticalityLevel];
      
      if (aCriticalityWeight !== bCriticalityWeight) {
        return bCriticalityWeight - aCriticalityWeight;
      }
      
      const aPriority = a.priority || 5;
      const bPriority = b.priority || 5;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Schedule an anomaly to the most optimal available slot
   */
  private scheduleAnomalyToOptimalSlot(
    anomaly: Anomaly, 
    availableSlots: Array<{
      windowId: string;
      startTime: Date;
      endTime: Date;
      availableHours: number;
      windowType: 'force' | 'minor' | 'major';
      priority: number;
    }>
  ): SchedulingResult {
    const requiredHours = anomaly.estimatedHours || 0;
    
    for (const slot of availableSlots) {
      if (slot.availableHours >= requiredHours + this.config.timeBuffer) {
        return {
          anomalyId: anomaly.id,
          windowId: slot.windowId,
          scheduledDate: slot.startTime,
          estimatedDuration: requiredHours,
          success: true
        };
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
   * Update available slots after successful scheduling
   */
  private updateAvailableSlots(slots: Array<{
    windowId: string;
    startTime: Date;
    endTime: Date;
    availableHours: number;
    windowType: 'force' | 'minor' | 'major';
    priority: number;
  }>, result: SchedulingResult): void {
    const slot = slots.find(s => s.windowId === result.windowId);
    if (slot) {
      slot.availableHours -= result.estimatedDuration + this.config.timeBuffer;
      
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
    startDate.setDate(startDate.getDate() + (windowType === 'force' ? 1 : 7));
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + estimatedDays);
    
    const newWindow: MaintenanceWindow = {
      id: `auto-${Date.now()}`,
      type: windowType,
      durationDays: estimatedDays,
      startDate,
      endDate,
      description: `Auto-created for anomaly: ${anomaly.title}`,
      status: 'planned',
      assignedAnomalies: [],
      autoCreated: true,
      sourceAnomalyId: anomaly.id
    };
    
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
    console.log('📊 Getting scheduling recommendations');
    
    const treatedAnomalies = this.getTreatedUnscheduledAnomalies();
    const availableWindows = this.getAvailableMaintenanceWindows();
    
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
    
    console.log('📋 Recommendations:', recommendations.length);
    console.log('❌ Unschedulable:', unschedulableAnomalies.length);
    
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
