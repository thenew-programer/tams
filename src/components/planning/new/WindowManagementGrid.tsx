import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Settings,
  Plus,
  MoreVertical,
  Edit,
  Eye,
  AlertTriangle,
  Target,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Dropdown } from '../../ui/Dropdown';
import { Anomaly, MaintenanceWindow, ActionPlan } from '../../../types';
import { formatDate } from '../../../lib/utils';

interface WindowManagementGridProps {
  windows: MaintenanceWindow[];
  anomalies: Anomaly[];
  actionPlans: ActionPlan[];
  onScheduleAnomaly: (anomalyId: string, windowId: string) => void;
  onCreateWindow: () => void;
  onUpdateWindow: (windowId: string, updates: Partial<MaintenanceWindow>) => void;
  onViewWindow: (window: MaintenanceWindow) => void;
  onEditWindow: (window: MaintenanceWindow) => void;
  onDeleteWindow?: (windowId: string) => void;
  viewMode?: 'overview' | 'detailed';
}

export const WindowManagementGrid: React.FC<WindowManagementGridProps> = ({
  windows,
  anomalies,
  actionPlans,
  onCreateWindow,
  onUpdateWindow,
  onViewWindow,
  onEditWindow,
  onDeleteWindow,
  viewMode = 'overview'
}) => {
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);

  // Sort windows by start date and status
  const sortedWindows = useMemo(() => {
    return [...windows].sort((a, b) => {
      // Planned windows first, then by start date
      if (a.status !== b.status) {
        const statusOrder = { 'planned': 0, 'in_progress': 1, 'completed': 2, 'cancelled': 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  }, [windows]);

  // Get window statistics
  const getWindowStats = (window: MaintenanceWindow) => {
    const assignedAnomalies = anomalies.filter(a => a.maintenanceWindowId === window.id);
    const totalRequiredDays = assignedAnomalies.reduce((sum, anomaly) => {
      const actionPlan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
      return sum + (actionPlan?.totalDurationDays || 1);
    }, 0);

    const utilization = window.durationDays > 0 
      ? Math.round((totalRequiredDays / window.durationDays) * 100)
      : 0;

    const criticalCount = assignedAnomalies.filter(a => a.criticalityLevel === 'critical').length;
    const highCount = assignedAnomalies.filter(a => a.criticalityLevel === 'high').length;

    return {
      assignedCount: assignedAnomalies.length,
      utilization,
      criticalCount,
      highCount,
      totalRequiredDays,
      assignedAnomalies
    };
  };

  const getWindowTypeColor = (type: string) => {
    switch (type) {
      case 'force': return 'bg-red-500';
      case 'major': return 'bg-blue-500';
      case 'minor': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'planned': return 'info';
      case 'in_progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'default';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization <= 60) return 'text-green-600';
    if (utilization <= 85) return 'text-blue-600';
    if (utilization <= 100) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Vue d'ensemble
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Fenêtres de maintenance et anomalies
          </p>
        </div>
      </div>

      {/* Windows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 py-6 px-2 md:px-6">
        {sortedWindows.map((window, index) => {
          const stats = getWindowStats(window);
          const isSelected = selectedWindow === window.id;
          const isOverdue = new Date(window.startDate) < new Date() && window.status === 'planned';

          return (
            <div
              key={window.id}
              className="cursor-pointer transform transition-all duration-200 hover:scale-105"
              onClick={() => setSelectedWindow(isSelected ? null : window.id)}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Card 
                className={`transition-all duration-300 hover:shadow-xl card-hover ${
                  isSelected ? 'ring-2 ring-blue-500 shadow-lg scale-105' : ''
                } ${isOverdue ? 'border-red-300 bg-red-50' : 'bg-white'}`}
              >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${getWindowTypeColor(window.type)} rounded-xl p-3 shadow-sm`}>
                      <Calendar className="h-5 w-5 text-white" />
                    </div>              <div>
                <CardTitle className="text-base font-bold text-gray-900">
                  {window.type === 'force' ? 'Arrêt forcé' : 
                   window.type === 'major' ? 'Arrêt majeur' : 
                   'Arrêt mineur'}
                </CardTitle>
                <p className="text-sm text-gray-500 font-medium">
                  {window.durationDays} jours de maintenance
                </p>
              </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(window.status)} className="text-xs font-medium">
                      {window.status.replace('_', ' ')}
                    </Badge>
                    <Dropdown 
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1.5 h-8 w-8 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      }
                      align="right"
                      items={[
                        {
                          label: 'Voir',
                          onClick: () => onViewWindow(window),
                          icon: <Eye className="h-4 w-4 text-blue-500" />
                        },
                        {
                          label: 'Modifier',
                          onClick: () => onEditWindow(window),
                          icon: <Edit className="h-4 w-4 text-gray-500" />
                        },
                        ...(onDeleteWindow ? [
                          {
                            label: 'Supprimer',
                            onClick: () => {
                              if (window.status !== 'completed' && onDeleteWindow) {
                                onDeleteWindow(window.id);
                              }
                            },
                            icon: <Trash2 className="h-4 w-4 text-red-500" />,
                            className: 'text-red-600 hover:bg-red-50'
                          }
                        ] : [])
                      ]}
                    />
                  </div>
                </div>

                {/* Window dates with enhanced styling */}
                <div className="text-sm text-gray-600 space-y-2 mt-4 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="font-medium">Début:</span>
                    <span>{formatDate(window.startDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="font-medium">Fin:</span>
                    <span>{formatDate(window.endDate)}</span>
                  </div>
                </div>

                {isOverdue && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-3 bg-red-50 p-2 rounded-lg animate-gentle-pulse">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Fenêtre en retard</span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                {/* Utilization */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Utilization</span>
                    <span className={`font-medium ${getUtilizationColor(stats.utilization)}`}>
                      {stats.utilization}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        stats.utilization <= 60 ? 'bg-green-500' :
                        stats.utilization <= 85 ? 'bg-blue-500' :
                        stats.utilization <= 100 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(stats.utilization, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Assigned anomalies summary */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Assigned Anomalies
                    </span>
                    <Badge variant="info" className="text-xs">
                      {stats.assignedCount}
                    </Badge>
                  </div>

                  {stats.assignedCount > 0 && (
                    <div className="space-y-2">
                      {stats.criticalCount > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 bg-red-500 rounded-full" />
                          <span>{stats.criticalCount} Critical</span>
                        </div>
                      )}
                      {stats.highCount > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 bg-orange-500 rounded-full" />
                          <span>{stats.highCount} High</span>
                        </div>
                      )}
                      
                      {viewMode === 'detailed' && isSelected && (
                        <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                          {stats.assignedAnomalies.map(anomaly => (
                            <div key={anomaly.id} className="text-xs p-2 bg-gray-50 rounded">
                              <div className="font-medium truncate">{anomaly.title}</div>
                              <div className="text-gray-500">{anomaly.equipmentId}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {stats.assignedCount === 0 && (
                    <div className="text-center py-4 text-gray-400">
                      <Target className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No anomalies assigned</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {window.status === 'planned' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-sm flex-1 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        onClick={() => onViewWindow(window)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir les détails
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          );
        })}

        {/* Create new window card */}
        <div
          className="cursor-pointer"
          onClick={onCreateWindow}
        >
          <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
            <CardContent className="flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center text-gray-500">
                <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Nouvelle fenêtre</p>
                <p className="text-xs mt-1">Planifiez des activités de maintenance</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {windows.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune fenêtre de maintenance</h3>
          <p className="text-gray-600 mb-4">Créez votre première fenêtre pour commencer la planification</p>
          <Button onClick={onCreateWindow}>
            <Plus className="h-4 w-4 mr-2" />
            Créer une fenêtre
          </Button>
        </div>
      )}
    </div>
  );
};
