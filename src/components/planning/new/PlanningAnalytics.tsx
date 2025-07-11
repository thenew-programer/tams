import React, { useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target, 
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { MaintenanceWindow, Anomaly, ActionPlan } from '../../../types';

interface PlanningAnalyticsProps {
  windows: MaintenanceWindow[];
  anomalies: Anomaly[];
  actionPlans: ActionPlan[];
}

export const PlanningAnalytics: React.FC<PlanningAnalyticsProps> = ({
  windows,
  anomalies,
  actionPlans
}) => {
  // Calculate analytics data
  const analytics = useMemo(() => {
    const treatedAnomalies = anomalies.filter(a => a.status === 'treated');
    const scheduledAnomalies = treatedAnomalies.filter(a => a.maintenanceWindowId);
    const unscheduledAnomalies = treatedAnomalies.filter(a => !a.maintenanceWindowId);
    
    // Window statistics
    const plannedWindows = windows.filter(w => w.status === 'planned');
    const inProgressWindows = windows.filter(w => w.status === 'in_progress');
    const completedWindows = windows.filter(w => w.status === 'completed');
    
    // Type distribution
    const windowsByType = windows.reduce((acc, window) => {
      acc[window.type] = (acc[window.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Criticality distribution
    const anomaliesByCriticality = treatedAnomalies.reduce((acc, anomaly) => {
      acc[anomaly.criticalityLevel] = (acc[anomaly.criticalityLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Utilization analysis
    const windowUtilization = windows.map(window => {
      const windowAnomalies = treatedAnomalies.filter(a => a.maintenanceWindowId === window.id);
      const totalPlannedHours = windowAnomalies.reduce((sum, anomaly) => {
        const plan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
        return sum + (plan?.totalDurationDays || 1) * 8; // 8 hours per day
      }, 0);
      const maxHours = window.durationDays * 24;
      return {
        id: window.id,
        type: window.type,
        utilization: maxHours > 0 ? (totalPlannedHours / maxHours) * 100 : 0,
        plannedHours: totalPlannedHours,
        maxHours
      };
    });
    
    const avgUtilization = windowUtilization.length > 0 
      ? windowUtilization.reduce((sum, w) => sum + w.utilization, 0) / windowUtilization.length
      : 0;
    
    // Timeline analysis
    const upcomingWindows = windows.filter(w => 
      w.status === 'planned' && new Date(w.startDate) > new Date()
    ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    // Productivity metrics
    const schedulingEfficiency = treatedAnomalies.length > 0 
      ? (scheduledAnomalies.length / treatedAnomalies.length) * 100 
      : 0;
    
    return {
      treatedAnomalies: treatedAnomalies.length,
      scheduledAnomalies: scheduledAnomalies.length,
      unscheduledAnomalies: unscheduledAnomalies.length,
      schedulingEfficiency,
      totalWindows: windows.length,
      plannedWindows: plannedWindows.length,
      inProgressWindows: inProgressWindows.length,
      completedWindows: completedWindows.length,
      windowsByType,
      anomaliesByCriticality,
      avgUtilization,
      windowUtilization,
      upcomingWindows: upcomingWindows.slice(0, 5)
    };
  }, [windows, anomalies, actionPlans]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'force': return 'bg-red-100 text-red-800';
      case 'major': return 'bg-blue-100 text-blue-800';
      case 'minor': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 90) return 'text-red-600';
    if (utilization > 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Anomalies Traitées</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.treatedAnomalies}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Efficacité Planning</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics.schedulingEfficiency.toFixed(1)}%
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fenêtres Actives</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.plannedWindows}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Utilisation Moyenne</p>
                <p className={`text-2xl font-bold ${getUtilizationColor(analytics.avgUtilization)}`}>
                  {analytics.avgUtilization.toFixed(1)}%
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Window Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              État des Fenêtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Planifiées</span>
                </div>
                <span className="font-medium">{analytics.plannedWindows}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">En cours</span>
                </div>
                <span className="font-medium">{analytics.inProgressWindows}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Terminées</span>
                </div>
                <span className="font-medium">{analytics.completedWindows}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Window Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Types de Fenêtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.windowsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <Badge className={getTypeColor(type)}>
                    {type.toUpperCase()}
                  </Badge>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Criticality Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Répartition par Criticité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.anomaliesByCriticality).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 ${getCriticalityColor(level)} rounded-full`}></div>
                    <span className="text-sm capitalize">{level}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Utilization Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Analyse d'Utilisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.windowUtilization.slice(0, 5).map((window) => (
                <div key={window.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(window.type)} variant="default">
                      {window.type}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${getUtilizationColor(window.utilization)}`}>
                      {window.utilization.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {window.plannedHours}h / {window.maxHours}h
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Windows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Prochaines Fenêtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.upcomingWindows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucune fenêtre planifiée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.upcomingWindows.map((window) => {
                const windowAnomalies = anomalies.filter(a => a.maintenanceWindowId === window.id);
                const daysUntil = Math.ceil(
                  (new Date(window.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                
                return (
                  <div key={window.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={getTypeColor(window.type)}>
                          {window.type.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-medium">{window.description}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(window.startDate).toLocaleDateString('fr-FR')} - {window.durationDays} jours
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{windowAnomalies.length}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Dans {daysUntil} jour{daysUntil > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduling Efficiency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Performance du Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analytics.scheduledAnomalies}</div>
              <div className="text-sm text-gray-600">Anomalies Planifiées</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{analytics.unscheduledAnomalies}</div>
              <div className="text-sm text-gray-600">En Attente</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analytics.schedulingEfficiency.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Efficacité</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
