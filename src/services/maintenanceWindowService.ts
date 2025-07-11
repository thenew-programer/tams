import { supabase } from '../lib/supabase';
import { MaintenanceWindow } from '../types';
import { supabasePlanningService } from './supabasePlanningService';

class MaintenanceWindowService {
  // Get all maintenance windows
  async getMaintenanceWindows(): Promise<MaintenanceWindow[]> {
    return await supabasePlanningService.getMaintenanceWindows();
  }

  // Create a new maintenance window
  async createMaintenanceWindow(windowData: Omit<MaintenanceWindow, 'id' | 'assignedAnomalies'>): Promise<MaintenanceWindow> {
    return await supabasePlanningService.createMaintenanceWindow(windowData);
  }

  // Update a maintenance window
  async updateMaintenanceWindow(id: string, updates: Partial<MaintenanceWindow>): Promise<MaintenanceWindow> {
    return await supabasePlanningService.updateMaintenanceWindow(id, updates);
  }

  // Delete a maintenance window
  async deleteMaintenanceWindow(id: string): Promise<void> {
    return await supabasePlanningService.deleteMaintenanceWindow(id);
  }

  // Get maintenance window by ID
  async getMaintenanceWindowById(id: string): Promise<MaintenanceWindow | null> {
    try {
      const windows = await this.getMaintenanceWindows();
      return windows.find(w => w.id === id) || null;
    } catch (error) {
      console.error('Error fetching maintenance window:', error);
      return null;
    }
  }

  // Get available windows (planned and in future)
  async getAvailableWindows(): Promise<MaintenanceWindow[]> {
    try {
      const windows = await this.getMaintenanceWindows();
      return windows.filter(window => 
        window.status === 'planned' && 
        new Date(window.startDate) > new Date()
      );
    } catch (error) {
      console.error('Error fetching available windows:', error);
      return [];
    }
  }

  // Get windows by status
  async getWindowsByStatus(status: MaintenanceWindow['status']): Promise<MaintenanceWindow[]> {
    try {
      const windows = await this.getMaintenanceWindows();
      return windows.filter(window => window.status === status);
    } catch (error) {
      console.error('Error fetching windows by status:', error);
      return [];
    }
  }

  // Assign anomaly to window
  async assignAnomalyToWindow(anomalyId: string, windowId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('anomalies')
        .update({ maintenance_window_id: windowId })
        .eq('id', anomalyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error assigning anomaly to window:', error);
      throw error;
    }
  }

  // Unassign anomaly from window
  async unassignAnomalyFromWindow(anomalyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('anomalies')
        .update({ maintenance_window_id: null })
        .eq('id', anomalyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error unassigning anomaly from window:', error);
      throw error;
    }
  }

  // Get window utilization statistics
  async getWindowUtilization(windowId: string): Promise<{
    assignedAnomalies: number;
    totalDurationRequired: number;
    utilizationPercentage: number;
  }> {
    try {
      const { data: anomalies, error } = await supabase
        .from('anomalies')
        .select('id, estimated_hours')
        .eq('maintenance_window_id', windowId);

      if (error) throw error;

      const window = await this.getMaintenanceWindowById(windowId);
      if (!window) {
        return { assignedAnomalies: 0, totalDurationRequired: 0, utilizationPercentage: 0 };
      }

      const totalHours = anomalies.reduce((sum, anomaly) => sum + (anomaly.estimated_hours || 8), 0);
      const totalDays = Math.ceil(totalHours / 8);
      const utilizationPercentage = window.durationDays > 0 ? (totalDays / window.durationDays) * 100 : 0;

      return {
        assignedAnomalies: anomalies.length,
        totalDurationRequired: totalDays,
        utilizationPercentage
      };
    } catch (error) {
      console.error('Error calculating window utilization:', error);
      return { assignedAnomalies: 0, totalDurationRequired: 0, utilizationPercentage: 0 };
    }
  }
}

export const maintenanceWindowService = new MaintenanceWindowService();
