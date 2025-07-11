import { supabase } from '../lib/supabase';
import { loggingService } from './loggingService';
import { MaintenanceWindow, Anomaly, ActionPlan } from '../types';

// Supabase interfaces for database
export interface SupabaseMaintenanceWindow {
  id: string;
  type: 'force' | 'minor' | 'major';
  duration_days: number;
  start_date: string;
  end_date: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  auto_created: boolean;
  source_anomaly_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PlanningSession {
  id: string;
  session_type: 'auto' | 'manual' | 'optimization';
  total_anomalies: number;
  scheduled_anomalies: number;
  new_windows_created: number;
  optimization_score?: number;
  session_data?: any;
  created_at: Date;
  completed_at?: Date;
  status: 'running' | 'completed' | 'failed';
}

export interface ScheduleAssignment {
  anomalyId: string;
  windowId: string;
  score: number;
  reason: string;
}

export interface ScheduleResults {
  assignments: ScheduleAssignment[];
  newWindows: MaintenanceWindow[];
  unassigned: string[];
  optimizationScore: number;
  sessionId: string;
}

export interface OptimizationResults {
  reassignments: Array<{
    anomalyId: string;
    oldWindowId?: string;
    newWindowId: string;
    improvement: number;
  }>;
  windowOptimizations: Array<{
    windowId: string;
    currentUtilization: number;
    optimalUtilization: number;
    suggestions: string[];
  }>;
  overallImprovement: number;
  sessionId: string;
}

export interface AnomalySchedule {
  id?: string;
  anomalyId: string;
  maintenanceWindowId: string;
  scheduledDate: Date;
  estimatedHours: number;
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlanningConfiguration {
  auto_schedule_enabled: boolean;
  auto_schedule_delay_ms: number;
  compatibility_threshold: number;
  window_utilization_target: number;
  criticality_weights: Record<string, number>;
  window_type_preferences: Record<string, any>;
}

class SupabasePlanningService {
  // Maintenance Windows CRUD
  async createMaintenanceWindow(windowData: Omit<MaintenanceWindow, 'id' | 'assignedAnomalies'>): Promise<MaintenanceWindow> {
    try {
      const supabaseWindow: Omit<SupabaseMaintenanceWindow, 'id' | 'created_at' | 'updated_at'> = {
        type: windowData.type,
        duration_days: windowData.durationDays,
        start_date: windowData.startDate.toISOString(),
        end_date: windowData.endDate.toISOString(),
        description: windowData.description,
        status: windowData.status,
        auto_created: windowData.autoCreated || false,
        source_anomaly_id: windowData.sourceAnomalyId
      };

      const { data, error } = await supabase
        .from('maintenance_windows')
        .insert([supabaseWindow])
        .select()
        .single();

      if (error) throw error;

      await loggingService.logMaintenanceAction(
        'create_maintenance_window',
        data.id,
        {
          description: `Created maintenance window: ${windowData.type} window for ${windowData.durationDays} days`,
          additionalInfo: { windowData: supabaseWindow }
        }
      );

      return this.transformFromSupabase(data);
    } catch (error) {
      console.error('Error creating maintenance window:', error);
      throw error;
    }
  }

  async getMaintenanceWindows(): Promise<MaintenanceWindow[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_windows')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;

      const windows = data.map(window => this.transformFromSupabase(window));
      
      // Get assigned anomalies for each window
      for (const window of windows) {
        window.assignedAnomalies = await this.getAssignedAnomalies(window.id);
      }

      return windows;
    } catch (error) {
      console.error('Error fetching maintenance windows:', error);
      throw error;
    }
  }

  async updateMaintenanceWindow(id: string, updates: Partial<MaintenanceWindow>): Promise<MaintenanceWindow> {
    try {
      const supabaseUpdates: Partial<SupabaseMaintenanceWindow> = {};
      
      if (updates.type !== undefined) supabaseUpdates.type = updates.type;
      if (updates.durationDays !== undefined) supabaseUpdates.duration_days = updates.durationDays;
      if (updates.startDate !== undefined) supabaseUpdates.start_date = updates.startDate.toISOString();
      if (updates.endDate !== undefined) supabaseUpdates.end_date = updates.endDate.toISOString();
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.status !== undefined) supabaseUpdates.status = updates.status;

      const { data, error } = await supabase
        .from('maintenance_windows')
        .update(supabaseUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await loggingService.logMaintenanceAction(
        'update_maintenance_window',
        id,
        {
          description: `Updated maintenance window: ${Object.keys(updates).join(', ')}`,
          oldValue: null, // Could be improved by fetching old values
          newValue: supabaseUpdates,
          additionalInfo: { updates: supabaseUpdates }
        }
      );

      return this.transformFromSupabase(data);
    } catch (error) {
      console.error('Error updating maintenance window:', error);
      throw error;
    }
  }

  async deleteMaintenanceWindow(id: string): Promise<void> {
    try {
      // First, unassign all anomalies from this window
      await supabase
        .from('anomalies')
        .update({ maintenance_window_id: null })
        .eq('maintenance_window_id', id);

      const { error } = await supabase
        .from('maintenance_windows')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loggingService.logMaintenanceAction(
        'delete_maintenance_window',
        id,
        {
          description: `Deleted maintenance window and unassigned anomalies`,
          additionalInfo: {}
        }
      );
    } catch (error) {
      console.error('Error deleting maintenance window:', error);
      throw error;
    }
  }

  // Planning Algorithm Implementation
  async autoScheduleTreatedAnomalies(
    treatedAnomalies: Anomaly[], 
    availableWindows: MaintenanceWindow[], 
    actionPlans: ActionPlan[]
  ): Promise<ScheduleResults> {
    const sessionId = await this.createPlanningSession('auto', treatedAnomalies.length);
    
    try {
      const config = await this.getPlanningConfiguration();
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

      // Track window capacity
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
          if (capacity <= 0) continue;

          const score = this.calculateCompatibilityScore(anomaly, window, actionPlan, config);
          
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { window, score };
          }
        }

        if (bestMatch && bestMatch.score >= config.compatibility_threshold) {
          assignments.push({
            anomalyId: anomaly.id,
            windowId: bestMatch.window.id,
            score: bestMatch.score,
            reason: `Auto-scheduled with ${bestMatch.score}% compatibility`
          });

          // Update capacity
          const currentCapacity = windowCapacity.get(bestMatch.window.id) || 0;
          windowCapacity.set(bestMatch.window.id, currentCapacity - 1);

          // Update anomaly in database
          await this.assignAnomalyToWindow(anomaly.id, bestMatch.window.id);
        } else {
          // Create new window for unassigned critical/high priority anomalies
          if (anomaly.criticalityLevel === 'critical' || anomaly.criticalityLevel === 'high') {
            const newWindow = await this.createOptimalWindow([anomaly.id], actionPlans, config);
            newWindows.push(newWindow);
            
            assignments.push({
              anomalyId: anomaly.id,
              windowId: newWindow.id,
              score: 100,
              reason: 'New optimized window created'
            });

            // Update anomaly in database
            await this.assignAnomalyToWindow(anomaly.id, newWindow.id);
          } else {
            unassigned.push(anomaly.id);
          }
        }
      }

      const optimizationScore = assignments.length > 0 
        ? assignments.reduce((sum, a) => sum + a.score, 0) / assignments.length
        : 0;

      const results: ScheduleResults = {
        assignments,
        newWindows,
        unassigned,
        optimizationScore,
        sessionId
      };

      await this.completePlanningSession(sessionId, assignments.length, newWindows.length, optimizationScore);

      return results;
    } catch (error) {
      await this.failPlanningSession(sessionId, error as Error);
      throw error;
    }
  }

  async createMaintenanceWindowWithSchedules(
    windowData: Omit<MaintenanceWindow, 'id' | 'assignedAnomalies'>, 
    scheduledTimes: Array<{
      anomalyId: string;
      scheduledDate: Date;
      estimatedHours: number;
    }>
  ): Promise<MaintenanceWindow> {
    try {
      // Create the maintenance window
      const window = await this.createMaintenanceWindow(windowData);

      // Create schedules for each anomaly
      for (const schedule of scheduledTimes) {
        await this.createAnomalySchedule({
          anomalyId: schedule.anomalyId,
          maintenanceWindowId: window.id,
          scheduledDate: schedule.scheduledDate,
          estimatedHours: schedule.estimatedHours,
          status: 'scheduled'
        });

        // Assign anomaly to window
        await this.assignAnomalyToWindow(schedule.anomalyId, window.id);
      }

      await loggingService.logMaintenanceAction(
        'create_maintenance_window',
        window.id,
        {
          description: `Created maintenance window with ${scheduledTimes.length} scheduled anomalies`,
          additionalInfo: { 
            windowData, 
            scheduledTimes: scheduledTimes.length,
            totalEstimatedHours: scheduledTimes.reduce((sum, s) => sum + s.estimatedHours, 0)
          }
        }
      );

      return window;
    } catch (error) {
      console.error('Error creating maintenance window with schedules:', error);
      throw error;
    }
  }

  async createOptimalWindow(
    anomalyIds: string[], 
    actionPlans: ActionPlan[], 
    config?: PlanningConfiguration
  ): Promise<MaintenanceWindow> {
    if (!config) {
      config = await this.getPlanningConfiguration();
    }

    // Get anomalies data
    const anomalies = await this.getAnomaliesByIds(anomalyIds);
    const relevantPlans = actionPlans.filter(ap => anomalyIds.includes(ap.anomalyId));
    
    // Determine optimal window type and duration
    const maxDuration = Math.max(...relevantPlans.map(ap => ap.totalDurationDays), 1);
    const hasOutage = relevantPlans.some(ap => ap.needsOutage);
    const maxPriority = Math.min(...relevantPlans.map(ap => ap.priority), 5);
    const criticalityLevels = anomalies.map(a => a.criticalityLevel);
    const hasCritical = criticalityLevels.includes('critical');
    const hasHigh = criticalityLevels.includes('high');

    let windowType: 'force' | 'minor' | 'major';
    let durationDays: number;

    if ((maxPriority <= 2 && hasOutage) || hasCritical) {
      windowType = 'force';
      durationDays = Math.min(maxDuration, 3);
    } else if (maxDuration > 7 || relevantPlans.length > 3 || hasHigh) {
      windowType = 'major';
      durationDays = Math.min(maxDuration + 2, 14);
    } else {
      windowType = 'minor';
      durationDays = Math.min(maxDuration + 1, 7);
    }

    // Schedule for optimal time
    const now = new Date();
    const startDate = new Date(now);
    
    const preferences = config.window_type_preferences[windowType];
    if (preferences?.scheduling_urgency === 'immediate') {
      // Schedule ASAP
      startDate.setDate(now.getDate() + 1);
    } else if (preferences?.scheduling_urgency === 'weekend') {
      // Find next weekend
      const daysUntilSaturday = (6 - now.getDay()) % 7;
      startDate.setDate(now.getDate() + (daysUntilSaturday || 7));
    } else {
      // Flexible - schedule in 3-7 days
      startDate.setDate(now.getDate() + 5);
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + durationDays);

    const windowData: Omit<MaintenanceWindow, 'id' | 'assignedAnomalies'> = {
      type: windowType,
      durationDays,
      startDate,
      endDate,
      description: `Auto-created ${windowType} window for ${anomalyIds.length} treated anomal${anomalyIds.length > 1 ? 'ies' : 'y'}`,
      status: 'planned',
      autoCreated: true,
      sourceAnomalyId: anomalyIds[0]
    };

    return await this.createMaintenanceWindow(windowData);
  }

  async optimizeScheduling(
    treatedAnomalies: Anomaly[],
    maintenanceWindows: MaintenanceWindow[],
    actionPlans: ActionPlan[]
  ): Promise<OptimizationResults> {
    const sessionId = await this.createPlanningSession('optimization', treatedAnomalies.length);
    
    try {
      const config = await this.getPlanningConfiguration();
      const reassignments: OptimizationResults['reassignments'] = [];
      const windowOptimizations: OptimizationResults['windowOptimizations'] = [];

      // Analyze current assignments
      const scheduledAnomalies = treatedAnomalies.filter(a => a.maintenanceWindowId);
      
      for (const anomaly of scheduledAnomalies) {
        const currentWindow = maintenanceWindows.find(w => w.id === anomaly.maintenanceWindowId);
        if (!currentWindow) continue;

        const actionPlan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
        const currentScore = this.calculateCompatibilityScore(anomaly, currentWindow, actionPlan, config);

        // Find better alternatives
        for (const window of maintenanceWindows) {
          if (window.id === currentWindow.id || window.status !== 'planned') continue;

          const alternativeScore = this.calculateCompatibilityScore(anomaly, window, actionPlan, config);
          const improvement = alternativeScore - currentScore;

          if (improvement > 15) { // Significant improvement threshold
            reassignments.push({
              anomalyId: anomaly.id,
              oldWindowId: currentWindow.id,
              newWindowId: window.id,
              improvement
            });
            
            // Apply the reassignment
            await this.assignAnomalyToWindow(anomaly.id, window.id);
            break;
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
        const optimalUtilization = config.window_utilization_target;

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

      const results: OptimizationResults = {
        reassignments,
        windowOptimizations,
        overallImprovement,
        sessionId
      };

      await this.completePlanningSession(sessionId, reassignments.length, 0, overallImprovement);

      return results;
    } catch (error) {
      await this.failPlanningSession(sessionId, error as Error);
      throw error;
    }
  }

  // Anomaly Schedule Management
  async createAnomalySchedule(scheduleData: Omit<AnomalySchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AnomalySchedule> {
    try {
      const { data, error } = await supabase
        .from('anomaly_schedules')
        .insert([{
          anomaly_id: scheduleData.anomalyId,
          maintenance_window_id: scheduleData.maintenanceWindowId,
          scheduled_date: scheduleData.scheduledDate.toISOString(),
          estimated_hours: scheduleData.estimatedHours,
          actual_start_time: scheduleData.actualStartTime?.toISOString(),
          actual_end_time: scheduleData.actualEndTime?.toISOString(),
          status: scheduleData.status,
          notes: scheduleData.notes
        }])
        .select()
        .single();

      if (error) throw error;

      return this.transformScheduleFromSupabase(data);
    } catch (error) {
      console.error('Error creating anomaly schedule:', error);
      throw error;
    }
  }

  async getSchedulesForWindow(windowId: string): Promise<AnomalySchedule[]> {
    try {
      const { data, error } = await supabase
        .from('anomaly_schedules')
        .select('*')
        .eq('maintenance_window_id', windowId)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      return data.map(this.transformScheduleFromSupabase);
    } catch (error) {
      console.error('Error fetching schedules for window:', error);
      throw error;
    }
  }

  async updateAnomalySchedule(id: string, updates: Partial<AnomalySchedule>): Promise<AnomalySchedule> {
    try {
      const supabaseUpdates: any = {};
      
      if (updates.scheduledDate) supabaseUpdates.scheduled_date = updates.scheduledDate.toISOString();
      if (updates.estimatedHours !== undefined) supabaseUpdates.estimated_hours = updates.estimatedHours;
      if (updates.actualStartTime) supabaseUpdates.actual_start_time = updates.actualStartTime.toISOString();
      if (updates.actualEndTime) supabaseUpdates.actual_end_time = updates.actualEndTime.toISOString();
      if (updates.status) supabaseUpdates.status = updates.status;
      if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;

      const { data, error } = await supabase
        .from('anomaly_schedules')
        .update(supabaseUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return this.transformScheduleFromSupabase(data);
    } catch (error) {
      console.error('Error updating anomaly schedule:', error);
      throw error;
    }
  }

  private transformScheduleFromSupabase(supabaseSchedule: any): AnomalySchedule {
    return {
      id: supabaseSchedule.id,
      anomalyId: supabaseSchedule.anomaly_id,
      maintenanceWindowId: supabaseSchedule.maintenance_window_id,
      scheduledDate: new Date(supabaseSchedule.scheduled_date),
      estimatedHours: supabaseSchedule.estimated_hours,
      actualStartTime: supabaseSchedule.actual_start_time ? new Date(supabaseSchedule.actual_start_time) : undefined,
      actualEndTime: supabaseSchedule.actual_end_time ? new Date(supabaseSchedule.actual_end_time) : undefined,
      status: supabaseSchedule.status,
      notes: supabaseSchedule.notes,
      createdAt: new Date(supabaseSchedule.created_at),
      updatedAt: new Date(supabaseSchedule.updated_at)
    };
  }

  // Helper methods
  private calculateCompatibilityScore(
    anomaly: Anomaly,
    window: MaintenanceWindow,
    actionPlan?: ActionPlan,
    config?: PlanningConfiguration
  ): number {
    if (!config) {
      // Default scoring without config
      const windowTypeScore = {
        'force': { 'critical': 100, 'high': 80, 'medium': 60, 'low': 40 },
        'major': { 'critical': 90, 'high': 95, 'medium': 85, 'low': 70 },
        'minor': { 'critical': 60, 'high': 70, 'medium': 90, 'low': 95 }
      };
      return windowTypeScore[window.type][anomaly.criticalityLevel] || 50;
    }

    let score = 0;

    // Base compatibility using config weights
    const criticalityWeight = config.criticality_weights[anomaly.criticalityLevel] || 50;
    const windowPreference = config.window_type_preferences[window.type];
    
    if (windowPreference?.preferred_for_criticality?.includes(anomaly.criticalityLevel)) {
      score += criticalityWeight;
    } else {
      score += criticalityWeight * 0.6; // Penalty for non-preferred match
    }

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

      // Priority alignment
      const priorityBonus = { 1: 20, 2: 15, 3: 10, 4: 5, 5: 0 };
      score += priorityBonus[actionPlan.priority] || 0;
    }

    // Timing preferences
    const daysUntilWindow = Math.ceil(
      (new Date(window.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (anomaly.criticalityLevel === 'critical' && daysUntilWindow <= 7) {
      score += 15;
    } else if (anomaly.criticalityLevel === 'low' && daysUntilWindow > 30) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private async assignAnomalyToWindow(anomalyId: string, windowId: string): Promise<void> {
    const { error } = await supabase
      .from('anomalies')
      .update({ maintenance_window_id: windowId })
      .eq('id', anomalyId);

    if (error) throw error;
  }

  private async getAssignedAnomalies(windowId: string): Promise<Anomaly[]> {
    const { data, error } = await supabase
      .from('anomalies')
      .select('*')
      .eq('maintenance_window_id', windowId);

    if (error) throw error;

    // Transform to frontend format (you'll need to implement this based on your anomaly transformer)
    return data.map(anomaly => ({
      id: String(anomaly.id), // Ensure ID is always a string
      title: anomaly.description || '',
      description: anomaly.description || '',
      equipmentId: anomaly.equipement_id,
      service: anomaly.service || '',
      responsiblePerson: '', // Add this field to DB if needed
      status: this.mapStatusToFrontend(anomaly.status),
      originSource: anomaly.source_origine || '',
      createdAt: new Date(anomaly.created_at),
      updatedAt: new Date(anomaly.updated_at),
      fiabiliteIntegriteScore: anomaly.final_fiabilite_integrite_score || 0,
      disponibiliteScore: anomaly.final_disponibilite_score || 0,
      processSafetyScore: anomaly.final_process_safety_score || 0,
      criticalityLevel: this.mapCriticalityToFrontend(anomaly.final_criticality_level),
      maintenanceWindowId: anomaly.maintenance_window_id
    }));
  }

  private async getAnomaliesByIds(anomalyIds: string[]): Promise<Anomaly[]> {
    // Enhanced validation and cleaning of anomaly IDs
    const cleanIds = anomalyIds
      .map(id => {
        // Handle different types of IDs
        if (id === null || id === undefined) return null;
        if (typeof id === 'string') return id.trim();
        if (typeof id === 'number') return String(id);
        if (typeof id === 'object') {
          try {
            const stringified = String(id);
            if (stringified !== '[object Object]') return stringified;
          } catch (e) {
            // Ignore conversion errors
          }
        }
        console.warn('Invalid anomaly ID detected:', id, typeof id);
        return null;
      })
      .filter((id): id is string => id !== null && id.length > 0 && id !== 'undefined' && id !== 'null');

    if (cleanIds.length === 0) {
      console.warn('getAnomaliesByIds: No valid anomaly IDs provided', { 
        originalIds: anomalyIds,
        cleanedIds: cleanIds 
      });
      return [];
    }

    console.log('Fetching anomalies with IDs:', cleanIds);

    const { data, error } = await supabase
      .from('anomalies')
      .select('*')
      .in('id', cleanIds);

    if (error) throw error;

    return data.map(anomaly => ({
      id: String(anomaly.id), // Ensure ID is always a string
      title: anomaly.description || '',
      description: anomaly.description || '',
      equipmentId: anomaly.equipement_id,
      service: anomaly.service || '',
      responsiblePerson: '',
      status: this.mapStatusToFrontend(anomaly.status),
      originSource: anomaly.source_origine || '',
      createdAt: new Date(anomaly.created_at),
      updatedAt: new Date(anomaly.updated_at),
      fiabiliteIntegriteScore: anomaly.final_fiabilite_integrite_score || 0,
      disponibiliteScore: anomaly.final_disponibilite_score || 0,
      processSafetyScore: anomaly.final_process_safety_score || 0,
      criticalityLevel: this.mapCriticalityToFrontend(anomaly.final_criticality_level),
      maintenanceWindowId: anomaly.maintenance_window_id
    }));
  }

  private mapStatusToFrontend(status: string): 'new' | 'in_progress' | 'treated' | 'closed' {
    const statusMap: Record<string, 'new' | 'in_progress' | 'treated' | 'closed'> = {
      'nouvelle': 'new',
      'en_cours': 'in_progress',
      'traite': 'treated',
      'cloture': 'closed'
    };
    return statusMap[status] || 'new';
  }

  private mapCriticalityToFrontend(level: number): 'low' | 'medium' | 'high' | 'critical' {
    if (level <= 3) return 'low';
    if (level <= 7) return 'medium';
    if (level <= 11) return 'high';
    return 'critical';
  }

  private transformFromSupabase(supabaseWindow: SupabaseMaintenanceWindow): MaintenanceWindow {
    return {
      id: supabaseWindow.id,
      type: supabaseWindow.type,
      durationDays: supabaseWindow.duration_days,
      startDate: new Date(supabaseWindow.start_date),
      endDate: new Date(supabaseWindow.end_date),
      description: supabaseWindow.description,
      status: supabaseWindow.status,
      assignedAnomalies: [], // Will be populated separately
      autoCreated: supabaseWindow.auto_created,
      sourceAnomalyId: supabaseWindow.source_anomaly_id
    };
  }

  private async createPlanningSession(type: 'auto' | 'manual' | 'optimization', totalAnomalies: number): Promise<string> {
    const { data, error } = await supabase
      .from('planning_sessions')
      .insert([{
        session_type: type,
        total_anomalies: totalAnomalies,
        status: 'running'
      }])
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  private async completePlanningSession(sessionId: string, scheduledAnomalies: number, newWindows: number, optimizationScore: number): Promise<void> {
    await supabase
      .from('planning_sessions')
      .update({
        scheduled_anomalies: scheduledAnomalies,
        new_windows_created: newWindows,
        optimization_score: optimizationScore,
        completed_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('id', sessionId);
  }

  private async failPlanningSession(sessionId: string, error: Error): Promise<void> {
    await supabase
      .from('planning_sessions')
      .update({
        session_data: { error: error.message },
        completed_at: new Date().toISOString(),
        status: 'failed'
      })
      .eq('id', sessionId);
  }

  private async getPlanningConfiguration(): Promise<PlanningConfiguration> {
    const { data, error } = await supabase
      .from('planning_configurations')
      .select('config_data')
      .eq('is_active', true)
      .single();

    if (error) {
      console.warn('Using default planning configuration:', error);
      return {
        auto_schedule_enabled: true,
        auto_schedule_delay_ms: 2000,
        compatibility_threshold: 60,
        window_utilization_target: 85,
        criticality_weights: { critical: 100, high: 75, medium: 50, low: 25 },
        window_type_preferences: {
          force: { preferred_for_criticality: ['critical'], scheduling_urgency: 'immediate' },
          major: { preferred_for_criticality: ['high', 'medium'], scheduling_urgency: 'weekend' },
          minor: { preferred_for_criticality: ['medium', 'low'], scheduling_urgency: 'flexible' }
        }
      };
    }

    return data.config_data as PlanningConfiguration;
  }

  // Planning sessions and analytics
  async getPlanningHistory(limit: number = 50): Promise<PlanningSession[]> {
    const { data, error } = await supabase
      .from('planning_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(session => ({
      id: session.id,
      session_type: session.session_type,
      total_anomalies: session.total_anomalies,
      scheduled_anomalies: session.scheduled_anomalies,
      new_windows_created: session.new_windows_created,
      optimization_score: session.optimization_score,
      session_data: session.session_data,
      created_at: new Date(session.created_at),
      completed_at: session.completed_at ? new Date(session.completed_at) : undefined,
      status: session.status
    }));
  }
}

export const supabasePlanningService = new SupabasePlanningService();
