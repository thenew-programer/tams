import { supabase } from '../lib/supabase';
import { calculateCriticalityLevelFromSum } from '../lib/scoreUtils';

export interface DashboardKPIs {
  totalAnomalies: number;
  openAnomalies: number;
  criticalAnomalies: number;
  averageResolutionTime: number;
  treatmentRate: number;
  safetyIncidents: number;
  maintenanceWindowUtilization: number;
  costImpact: number;
  changeStats?: {
    totalChange: number;
    openChange: number;
    criticalChange: number;
    treatmentRateChange: number;
  };
}

export interface AnomalyChartData {
  month: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ServiceDistributionData {
  service: string;
  count: number;
  percentage: number;
}

export class SupabaseDashboardService {
  /**
   * Get dashboard KPIs from Supabase data
   */
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    try {
      // Get total anomalies count
      const { count: totalAnomalies } = await supabase
        .from('anomalies')
        .select('*', { count: 'exact', head: true });

      // Get open anomalies count (new and in_progress)
      const { count: openAnomalies } = await supabase
        .from('anomalies')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'in_progress']);

      // Get all anomalies with scores to calculate critical count
      const { data: anomaliesWithScores, error: anomaliesError } = await supabase
        .from('anomalies')
        .select(`
          id,
          final_fiabilite_integrite_score,
          final_disponibilite_score, 
          final_process_safety_score,
          user_fiabilite_integrite_score,
          user_disponibilite_score,
          user_process_safety_score,
          use_user_scores
        `);

      if (anomaliesError) throw anomaliesError;

      // Calculate critical anomalies using our criticality calculation
      let criticalAnomalies = 0;
      if (anomaliesWithScores) {
        criticalAnomalies = anomaliesWithScores.filter(anomaly => {
          const fiabiliteScore = anomaly.use_user_scores 
            ? (anomaly.user_fiabilite_integrite_score ?? anomaly.final_fiabilite_integrite_score ?? 0)
            : (anomaly.final_fiabilite_integrite_score ?? 0);
          
          const disponibiliteScore = anomaly.use_user_scores
            ? (anomaly.user_disponibilite_score ?? anomaly.final_disponibilite_score ?? 0)
            : (anomaly.final_disponibilite_score ?? 0);
          
          const processSafetyScore = anomaly.use_user_scores
            ? (anomaly.user_process_safety_score ?? anomaly.final_process_safety_score ?? 0)
            : (anomaly.final_process_safety_score ?? 0);
          
          const criticality = calculateCriticalityLevelFromSum(
            fiabiliteScore,
            disponibiliteScore,
            processSafetyScore
          );
          
          return criticality === 'critical';
        }).length;
      }

      // Get treated/closed anomalies for treatment rate
      const { count: treatedAnomalies } = await supabase
        .from('anomalies')
        .select('*', { count: 'exact', head: true })
        .in('status', ['treated', 'closed']);

      // Calculate treatment rate
      const treatmentRate = totalAnomalies ? 
        Math.round((treatedAnomalies || 0) / totalAnomalies * 100 * 100) / 100 : 0;

      // Get average resolution time (for treated/closed anomalies)
      const { data: resolvedAnomalies } = await supabase
        .from('anomalies')
        .select('created_at, updated_at')
        .in('status', ['treated', 'closed'])
        .limit(100); // Limit for performance

      let averageResolutionTime = 0;
      if (resolvedAnomalies && resolvedAnomalies.length > 0) {
        const totalDays = resolvedAnomalies.reduce((sum, anomaly) => {
          const created = new Date(anomaly.created_at);
          const updated = new Date(anomaly.updated_at);
          const days = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          return sum + Math.max(0, days); // Ensure positive values
        }, 0);
        averageResolutionTime = Math.round((totalDays / resolvedAnomalies.length) * 100) / 100;
      }

      // Get maintenance window utilization
      const { data: maintenanceWindows } = await supabase
        .from('maintenance_windows')
        .select('id, duration_days, status');

      const { count: assignedAnomalies } = await supabase
        .from('anomalies')
        .select('*', { count: 'exact', head: true })
        .not('maintenance_window_id', 'is', null);

      let maintenanceWindowUtilization = 0;
      if (maintenanceWindows && maintenanceWindows.length > 0) {
        const totalCapacity = maintenanceWindows.reduce((sum, window) => 
          sum + (window.duration_days * 8), 0); // Assuming 8 hours per day
        
        // Estimate utilization based on assigned anomalies
        const estimatedUtilization = assignedAnomalies ? 
          Math.min(100, (assignedAnomalies * 4 / totalCapacity) * 100) : 0; // Assuming 4h average per anomaly
        maintenanceWindowUtilization = Math.round(estimatedUtilization * 100) / 100;
      }

      // Safety incidents (this would need a dedicated table, for now we'll estimate)
      // You might want to add a safety_incidents table later
      const safetyIncidents = criticalAnomalies ? Math.floor(criticalAnomalies * 0.1) : 0;

      // Cost impact (estimated based on critical anomalies and hours)
      const { data: anomaliesWithHours } = await supabase
        .from('anomalies')
        .select('estimated_hours')
        .not('estimated_hours', 'is', null);

      let costImpact = 0;
      if (anomaliesWithHours && anomaliesWithHours.length > 0) {
        const totalHours = anomaliesWithHours.reduce((sum, anomaly) => 
          sum + (anomaly.estimated_hours || 0), 0);
        // Estimate cost at 100€/hour average
        costImpact = Math.round((totalHours * 100 / 1000000) * 100) / 100; // Convert to millions
      }

      return {
        totalAnomalies: totalAnomalies || 0,
        openAnomalies: openAnomalies || 0,
        criticalAnomalies,
        averageResolutionTime,
        treatmentRate,
        safetyIncidents,
        maintenanceWindowUtilization,
        costImpact
      };

    } catch (error) {
      console.error('Error fetching dashboard KPIs:', error);
      // Return default values in case of error
      return {
        totalAnomalies: 0,
        openAnomalies: 0,
        criticalAnomalies: 0,
        averageResolutionTime: 0,
        treatmentRate: 0,
        safetyIncidents: 0,
        maintenanceWindowUtilization: 0,
        costImpact: 0
      };
    }
  }

  /**
   * Get anomalies by month for chart data
   */
  async getAnomaliesChartData(): Promise<AnomalyChartData[]> {
    try {
      const { data: anomalies, error } = await supabase
        .from('anomalies')
        .select(`
          created_at,
          final_fiabilite_integrite_score,
          final_disponibilite_score,
          final_process_safety_score,
          user_fiabilite_integrite_score,
          user_disponibilite_score,
          user_process_safety_score,
          use_user_scores
        `);

      if (error) throw error;

      // Group by month and calculate criticality
      const monthlyData: { [key: string]: AnomalyChartData } = {};
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 
                     'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

      // Initialize all months
      months.forEach(month => {
        monthlyData[month] = {
          month,
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        };
      });

      anomalies?.forEach(anomaly => {
        const date = new Date(anomaly.created_at);
        const month = months[date.getMonth()];
        
        if (monthlyData[month]) {
          monthlyData[month].total++;

          // Calculate criticality
          const fiabiliteScore = anomaly.use_user_scores 
            ? (anomaly.user_fiabilite_integrite_score ?? anomaly.final_fiabilite_integrite_score ?? 0)
            : (anomaly.final_fiabilite_integrite_score ?? 0);
          
          const disponibiliteScore = anomaly.use_user_scores
            ? (anomaly.user_disponibilite_score ?? anomaly.final_disponibilite_score ?? 0)
            : (anomaly.final_disponibilite_score ?? 0);
          
          const processSafetyScore = anomaly.use_user_scores
            ? (anomaly.user_process_safety_score ?? anomaly.final_process_safety_score ?? 0)
            : (anomaly.final_process_safety_score ?? 0);
          
          const criticality = calculateCriticalityLevelFromSum(
            fiabiliteScore,
            disponibiliteScore,
            processSafetyScore
          );

          monthlyData[month][criticality]++;
        }
      });

      return Object.values(monthlyData);

    } catch (error) {
      console.error('Error fetching chart data:', error);
      return [];
    }
  }

  /**
   * Get service distribution data
   */
  async getServiceDistributionData(): Promise<ServiceDistributionData[]> {
    try {
      const { data: anomalies, error } = await supabase
        .from('anomalies')
        .select('service');

      if (error) throw error;

      // Count by service
      const serviceCounts: { [key: string]: number } = {};
      let total = 0;

      anomalies?.forEach(anomaly => {
        const service = anomaly.service || 'Non spécifié';
        serviceCounts[service] = (serviceCounts[service] || 0) + 1;
        total++;
      });

      // Convert to array with percentages
      return Object.entries(serviceCounts).map(([service, count]) => ({
        service,
        count,
        percentage: Math.round((count / total) * 100 * 100) / 100
      })).sort((a, b) => b.count - a.count); // Sort by count descending

    } catch (error) {
      console.error('Error fetching service distribution:', error);
      return [];
    }
  }

  /**
   * Get change statistics compared to previous period
   */
  async getChangeStatistics(currentKPIs: DashboardKPIs): Promise<DashboardKPIs['changeStats']> {
    try {
      // Get data from 30 days ago for comparison
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: totalAnomaliesPrevious } = await supabase
        .from('anomalies')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', thirtyDaysAgo.toISOString());

      const { count: openAnomaliesPrevious } = await supabase
        .from('anomalies')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'in_progress'])
        .lt('created_at', thirtyDaysAgo.toISOString());

      // Calculate percentage changes
      const totalChange = totalAnomaliesPrevious ? 
        Math.round(((currentKPIs.totalAnomalies - totalAnomaliesPrevious) / totalAnomaliesPrevious) * 100 * 100) / 100 : 0;
      
      const openChange = openAnomaliesPrevious ? 
        Math.round(((currentKPIs.openAnomalies - openAnomaliesPrevious) / openAnomaliesPrevious) * 100 * 100) / 100 : 0;

      return {
        totalChange,
        openChange,
        criticalChange: 0, // This would require historical tracking
        treatmentRateChange: 0 // This would require historical tracking
      };

    } catch (error) {
      console.error('Error calculating change statistics:', error);
      return {
        totalChange: 0,
        openChange: 0,
        criticalChange: 0,
        treatmentRateChange: 0
      };
    }
  }
}

export const supabaseDashboardService = new SupabaseDashboardService();
