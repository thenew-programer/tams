import { apiService, ApiResponse } from './apiService';

export interface BackendMaintenanceWindow {
  id: string;
  type: 'force' | 'minor' | 'major';
  duration_days: number;
  start_date: string;
  end_date: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CreateMaintenanceWindowData {
  type: 'force' | 'minor' | 'major';
  duration_days: number;
  start_date: string;
  description?: string;
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}

export interface UpdateMaintenanceWindowData extends Partial<CreateMaintenanceWindowData> {}

export interface ScheduleAnomalyData {
  anomaly_id: string;
}

export class MaintenanceService {
  async getAllWindows(): Promise<BackendMaintenanceWindow[]> {
    const response = await apiService.get<ApiResponse<BackendMaintenanceWindow[]>>('/maintenance-windows');
    return response.items || [];
  }

  async getWindow(id: string): Promise<BackendMaintenanceWindow> {
    const response = await apiService.get<ApiResponse<BackendMaintenanceWindow>>(`/maintenance-windows/${id}`);
    return response.data!;
  }

  async createWindow(windowData: CreateMaintenanceWindowData): Promise<BackendMaintenanceWindow> {
    const response = await apiService.post<ApiResponse<BackendMaintenanceWindow>>('/maintenance-windows', windowData);
    return response.data!;
  }

  async updateWindow(id: string, updates: UpdateMaintenanceWindowData): Promise<BackendMaintenanceWindow> {
    const response = await apiService.put<ApiResponse<BackendMaintenanceWindow>>(`/maintenance-windows/${id}`, updates);
    return response.data!;
  }

  async deleteWindow(id: string): Promise<void> {
    await apiService.delete(`/maintenance-windows/${id}`);
  }

  async scheduleAnomaly(windowId: string, data: ScheduleAnomalyData): Promise<ApiResponse> {
    return apiService.post<ApiResponse>(`/maintenance-windows/${windowId}/schedule-anomaly`, data);
  }
}

export const maintenanceService = new MaintenanceService();