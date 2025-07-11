import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Shield, 
  Activity, 
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  PlayCircle,
  PauseCircle,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { anomalyService } from '../services/anomalyService';
import { SupabaseActionPlanService } from '../services/supabaseActionPlanService';
import { maintenanceWindowService } from '../services/maintenanceWindowService';
import toast from 'react-hot-toast';

interface DashboardKPIs {
  // Core Anomaly Metrics
  totalAnomalies: number;
  criticalAnomalies: number;
  openAnomalies: number;
  treatmentRate: number;
  
  // Action Items Metrics
  totalActionItems: number;
  completedActionItems: number;
  inProgressActionItems: number;
  plannedActionItems: number;
  overDueActionItems: number;
  actionItemsCompletionRate: number;
  
  // Performance Metrics
  averageResolutionTime: number;
  operationalEfficiency: number;
  
  // Trend Data
  newAnomaliesThisWeek: number;
  resolvedAnomaliesThisWeek: number;
  monthlyTrend: {
    current: number;
    previous: number;
    change: number;
  };
}

export const Dashboard: React.FC = () => {
  const [dashboardKPIs, setDashboardKPIs] = useState<DashboardKPIs>({
    totalAnomalies: 0,
    criticalAnomalies: 0,
    openAnomalies: 0,
    treatmentRate: 0,
    totalActionItems: 0,
    completedActionItems: 0,
    inProgressActionItems: 0,
    plannedActionItems: 0,
    overDueActionItems: 0,
    actionItemsCompletionRate: 0,
    averageResolutionTime: 0,
    operationalEfficiency: 0,
    newAnomaliesThisWeek: 0,
    resolvedAnomaliesThisWeek: 0,
    monthlyTrend: { current: 0, previous: 0, change: 0 }
  });

  // Calculate real KPIs from anomaly and action items data
  const calculateKPIs = async (): Promise<DashboardKPIs> => {
    try {
      const anomalies = await anomalyService.getAllAnomalies();
      const actionPlanService = SupabaseActionPlanService.getInstance();
      
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Basic anomaly metrics
      const totalAnomalies = anomalies.length;
      const openAnomalies = anomalies.filter(a => a.status !== 'closed').length;
      
      // Calculate criticality level based on sum of scores - consistent with AnomalyTable
      const calculateCriticalityLevel = (anomaly: any): 'low' | 'normal' | 'high' | 'critical' => {
        const fiabiliteIntegriteScore = anomaly.userFiabiliteIntegriteScore ?? anomaly.fiabiliteIntegriteScore ?? 0;
        const disponibiliteScore = anomaly.userDisponibiliteScore ?? anomaly.disponibiliteScore ?? 0;
        const processSafetyScore = anomaly.userProcessSafetyScore ?? anomaly.processSafetyScore ?? 0;
        
        const totalScore = fiabiliteIntegriteScore + disponibiliteScore + processSafetyScore;
        
        // New criticality logic:
        // >= 9: Anomalies critiques
        // 7-8: Anomalies à criticité élevée  
        // 3-6: Anomalies à criticité normale
        // 0-2: Anomalies à criticité faible
        if (totalScore >= 9) return 'critical';
        if (totalScore >= 7) return 'high';
        if (totalScore >= 3) return 'normal';
        return 'low';
      };
      
      const criticalAnomalies = anomalies.filter(a => {
        return calculateCriticalityLevel(a) === 'critical';
      }).length;
      
      const resolvedAnomalies = anomalies.filter(a => a.status === 'closed').length;
      const treatmentRate = totalAnomalies > 0 ? (resolvedAnomalies / totalAnomalies) * 100 : 0;

      // Get all action items data
      let totalActionItems = 0;
      let completedActionItems = 0;
      let inProgressActionItems = 0;
      let plannedActionItems = 0;
      let overDueActionItems = 0;

      try {
        // Get all action plans with their items
        const allActionPlans = await Promise.all(
          anomalies.map(async (anomaly) => {
            try {
              return await actionPlanService.getActionPlan(anomaly.id);
            } catch (error) {
              // If no action plan exists for this anomaly, return null
              return null;
            }
          })
        );

        // Calculate action items metrics
        for (const plan of allActionPlans) {
          if (plan && plan.actions) {
            for (const item of plan.actions) {
              totalActionItems++;
              
              switch (item.statut) {
                case 'termine':
                  completedActionItems++;
                  break;
                case 'en_cours':
                  inProgressActionItems++;
                  break;
                case 'planifie':
                  plannedActionItems++;
                  break;
                case 'reporte':
                  // Check if overdue
                  if (item.dateFin && new Date(item.dateFin) < now) {
                    overDueActionItems++;
                  }
                  break;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching action items:', error);
      }

      const actionItemsCompletionRate = totalActionItems > 0 
        ? (completedActionItems / totalActionItems) * 100 
        : 0;

      // Time-based metrics
      const newAnomaliesThisWeek = anomalies.filter(a => 
        new Date(a.createdAt) >= oneWeekAgo
      ).length;
      
      const resolvedAnomaliesThisWeek = anomalies.filter(a => 
        a.status === 'closed' && new Date(a.updatedAt) >= oneWeekAgo
      ).length;

      // Monthly trend
      const currentMonthAnomalies = anomalies.filter(a => 
        new Date(a.createdAt) >= oneMonthAgo
      ).length;
      
      const previousMonthAnomalies = anomalies.filter(a => {
        const createdDate = new Date(a.createdAt);
        const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        return createdDate >= twoMonthsAgo && createdDate < oneMonthAgo;
      }).length;
      
      const monthlyChange = previousMonthAnomalies > 0 
        ? ((currentMonthAnomalies - previousMonthAnomalies) / previousMonthAnomalies) * 100 
        : 0;

      // Calculate average resolution time
      const resolvedWithTimes = anomalies.filter(a => 
        a.status === 'closed' && a.createdAt && a.updatedAt
      );
      
      const averageResolutionTime = resolvedWithTimes.length > 0
        ? resolvedWithTimes.reduce((sum, a) => {
            const created = new Date(a.createdAt);
            const resolved = new Date(a.updatedAt);
            return sum + (resolved.getTime() - created.getTime());
          }, 0) / resolvedWithTimes.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      // Operational Efficiency calculation - based on action plan completion timing and quality
      const maintenanceWindows = await maintenanceWindowService.getMaintenanceWindows();
      
      // Get maintenance windows that are completed or in progress
      const activeWindows = maintenanceWindows.filter(w => 
        ['planned', 'in_progress', 'completed'].includes(w.status)
      );
      
      // Percentage of anomalies that are assigned to maintenance windows
      const scheduledAnomalyCount = anomalies.filter(a => a.maintenanceWindowId).length;
      const schedulingEfficiency = totalAnomalies > 0 ? (scheduledAnomalyCount / totalAnomalies) * 100 : 0;
      
      // Action plan quality score based on completion rates
      const actionPlanQuality = actionItemsCompletionRate;
      
      // Response time efficiency - percentage of anomalies treated within target time (7 days)
      const targetResponseDays = 7;
      const responseTimeEfficiency = resolvedWithTimes.length > 0
        ? (resolvedWithTimes.filter(a => {
            const created = new Date(a.createdAt);
            const resolved = new Date(a.updatedAt);
            const daysToResolve = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            return daysToResolve <= targetResponseDays;
          }).length / resolvedWithTimes.length) * 100
        : 0;
      
      // Combined operational efficiency score
      const operationalEfficiency = (
        schedulingEfficiency * 0.4 + 
        actionPlanQuality * 0.4 + 
        responseTimeEfficiency * 0.2
      );

      return {
        totalAnomalies,
        criticalAnomalies,
        openAnomalies,
        treatmentRate,
        totalActionItems,
        completedActionItems,
        inProgressActionItems,
        plannedActionItems,
        overDueActionItems,
        actionItemsCompletionRate,
        averageResolutionTime,
        operationalEfficiency,
        newAnomaliesThisWeek,
        resolvedAnomaliesThisWeek,
        monthlyTrend: {
          current: currentMonthAnomalies,
          previous: previousMonthAnomalies,
          change: monthlyChange
        }
      };
    } catch (error) {
      console.error('Error calculating KPIs:', error);
      return {
        totalAnomalies: 0,
        criticalAnomalies: 0,
        openAnomalies: 0,
        treatmentRate: 0,
        totalActionItems: 0,
        completedActionItems: 0,
        inProgressActionItems: 0,
        plannedActionItems: 0,
        overDueActionItems: 0,
        actionItemsCompletionRate: 0,
        averageResolutionTime: 0,
        operationalEfficiency: 0,
        newAnomaliesThisWeek: 0,
        resolvedAnomaliesThisWeek: 0,
        monthlyTrend: { current: 0, previous: 0, change: 0 }
      };
    }
  };

  const loadDashboardData = async (showToast = false) => {
    try {
      const kpis = await calculateKPIs();
      setDashboardKPIs(kpis);
      
      if (showToast) {
        toast.success('Dashboard mis à jour avec succès');
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (showToast) {
        toast.error('Erreur lors du chargement du dashboard');
      }
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getSafetyLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600' };
    if (score >= 60) return { label: 'Bon', color: 'text-yellow-600' };
    if (score >= 40) return { label: 'Moyen', color: 'text-orange-600' };
    return { label: 'Critique', color: 'text-red-600' };
  };

  const getEfficiencyLevel = (score: number) => {
    if (score >= 85) return { label: 'Optimale', color: 'text-green-600' };
    if (score >= 70) return { label: 'Efficace', color: 'text-blue-600' };
    if (score >= 50) return { label: 'Adéquate', color: 'text-yellow-600' };
    if (score >= 30) return { label: 'Améliorable', color: 'text-orange-600' };
    return { label: 'Insuffisante', color: 'text-red-600' };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble des anomalies et plans d'action</p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Anomalies</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardKPIs.totalAnomalies}</p>
                <p className="text-xs text-gray-500 mt-1">Toutes anomalies</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Critiques</p>
                <p className="text-3xl font-bold text-red-600">{dashboardKPIs.criticalAnomalies}</p>
                <p className="text-xs text-gray-500 mt-1">Score ≥ 9</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">En Cours</p>
                <p className="text-3xl font-bold text-orange-600">{dashboardKPIs.openAnomalies}</p>
                <p className="text-xs text-gray-500 mt-1">Non résolues</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Taux de Résolution</p>
                <p className="text-3xl font-bold text-green-600">{dashboardKPIs.treatmentRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">Résolution</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Actions</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardKPIs.totalActionItems}</p>
                <p className="text-xs text-gray-500 mt-1">Plans d'action</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Actions Terminées</p>
                <p className="text-2xl font-bold text-green-600">{dashboardKPIs.completedActionItems}</p>
                <p className="text-xs text-gray-500 mt-1">Complétées</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Taux d'Achèvement</p>
                <p className="text-2xl font-bold text-blue-600">{dashboardKPIs.actionItemsCompletionRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">Actions</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Temps Moyen de Résolution</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardKPIs.averageResolutionTime.toFixed(1)} jours</p>
                <p className="text-xs text-gray-500 mt-1">Résolution moyenne</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Clock className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Efficacité Opérationnelle</p>
                <p className={`text-2xl font-bold ${getEfficiencyLevel(dashboardKPIs.operationalEfficiency).color}`}>
                  {getEfficiencyLevel(dashboardKPIs.operationalEfficiency).label}
                </p>
                <p className="text-xs text-gray-500 mt-1">{dashboardKPIs.operationalEfficiency.toFixed(0)}/100</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Activité Hebdomadaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-900">{dashboardKPIs.newAnomaliesThisWeek}</p>
                <p className="text-sm text-blue-700">Nouvelles Anomalies</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">{dashboardKPIs.resolvedAnomaliesThisWeek}</p>
                <p className="text-sm text-green-700">Anomalies Résolues</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tendance Mensuelle</span>
                <div className="flex items-center gap-2">
                  {dashboardKPIs.monthlyTrend.change >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    dashboardKPIs.monthlyTrend.change >= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {Math.abs(dashboardKPIs.monthlyTrend.change).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              État des Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Terminées</span>
                </div>
                <span className="text-lg font-bold text-green-900">{dashboardKPIs.completedActionItems}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <PlayCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">En Cours</span>
                </div>
                <span className="text-lg font-bold text-blue-900">{dashboardKPIs.inProgressActionItems}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <PauseCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Planifiées</span>
                </div>
                <span className="text-lg font-bold text-yellow-900">{dashboardKPIs.plannedActionItems}</span>
              </div>
              
              {dashboardKPIs.overDueActionItems > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium text-red-900">En Retard</span>
                  </div>
                  <span className="text-lg font-bold text-red-900">{dashboardKPIs.overDueActionItems}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
