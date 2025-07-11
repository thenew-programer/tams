import { apiService, ApiResponse } from './apiService';

export interface DashboardMetrics {
  total_anomalies: number;
  open_anomalies: number;
  critical_anomalies: number;
  average_resolution_time: number;
  treatment_rate: number;
  safety_incidents: number;
  maintenance_window_utilization: number;
  cost_impact: number;
}

export interface AnomaliesByMonth {
  month: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface AnomaliesByService {
  service: string;
  count: number;
  percentage: number;
}

export interface AnomaliesByCriticality {
  criticality_level: string;
  count: number;
  percentage: number;
}

export interface MaintenanceWindowsChart {
  window_id: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  anomaly_count: number;
}

export class DashboardService {
  async getMetrics(): Promise<DashboardMetrics> {
    const response = await apiService.get<ApiResponse<DashboardMetrics>>('/dashboard/metrics');
    return response.data!;
  }

  async getAnomaliesByMonth(): Promise<AnomaliesByMonth[]> {
    const response = await apiService.get<ApiResponse<AnomaliesByMonth[]>>('/dashboard/charts/anomalies-by-month');
    return response.items || [];
  }

  async getAnomaliesByService(): Promise<AnomaliesByService[]> {
    const response = await apiService.get<ApiResponse<AnomaliesByService[]>>('/dashboard/charts/anomalies-by-service');
    return response.items || [];
  }

  async getAnomaliesByCriticality(): Promise<AnomaliesByCriticality[]> {
    const response = await apiService.get<ApiResponse<AnomaliesByCriticality[]>>('/dashboard/charts/anomalies-by-criticality');
    return response.items || [];
  }

  async getMaintenanceWindows(): Promise<MaintenanceWindowsChart[]> {
    const response = await apiService.get<ApiResponse<MaintenanceWindowsChart[]>>('/dashboard/charts/maintenance-windows');
    return response.items || [];
  }
}

export const dashboardService = new DashboardService();