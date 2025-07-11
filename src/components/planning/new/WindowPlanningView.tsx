import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Users,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Eye,
  Edit,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { MaintenanceWindow, Anomaly, ActionPlan } from '../../../types';
import { formatDate } from '../../../lib/utils';

interface WindowPlanningViewProps {
  windows: MaintenanceWindow[];
  anomalies: Anomaly[];
  actionPlans: ActionPlan[];
  onViewWindow: (window: MaintenanceWindow) => void;
  onEditWindow: (window: MaintenanceWindow) => void;
  onCreateWindow: () => void;
}

type SortField = 'date' | 'utilization' | 'priority' | 'type';
type ViewMode = 'grid' | 'timeline' | 'kanban';

export const WindowPlanningView: React.FC<WindowPlanningViewProps> = ({
  windows,
  anomalies,
  actionPlans,
  onViewWindow,
  onEditWindow,
  onCreateWindow
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('date');
  const [filterStatus, setFilterStatus] = useState<'all' | 'planned' | 'in_progress' | 'completed'>('all');

  // Enhanced window analytics
  const windowAnalytics = useMemo(() => {
    return windows.map(window => {
      const assignedAnomalies = anomalies.filter(a => a.maintenanceWindowId === window.id);
      const relatedPlans = actionPlans.filter(ap => assignedAnomalies.some(a => a.id === ap.anomalyId));
      
      // Calculate metrics
      const totalWorkDays = relatedPlans.reduce((sum, plan) => sum + plan.totalDurationDays, 0);
      const utilization = window.durationDays > 0 ? (totalWorkDays / window.durationDays) * 100 : 0;
      
      // Criticality analysis
      const criticalityStats = assignedAnomalies.reduce((stats, anomaly) => {
        stats[anomaly.criticalityLevel] = (stats[anomaly.criticalityLevel] || 0) + 1;
        return stats;
      }, {} as Record<string, number>);
      
      // Priority score calculation
      const priorityScore = assignedAnomalies.reduce((score, anomaly) => {
        const weights = { critical: 10, high: 7, medium: 4, low: 1 };
        return score + (weights[anomaly.criticalityLevel as keyof typeof weights] || 0);
      }, 0);
      
      // Risk assessment
      const riskLevel = utilization > 100 ? 'high' : 
                      utilization > 85 ? 'medium' : 
                      assignedAnomalies.some(a => a.criticalityLevel === 'critical') ? 'medium' : 'low';
      
      return {
        ...window,
        assignedAnomalies,
        relatedPlans,
        utilization,
        priorityScore,
        criticalityStats,
        riskLevel,
        totalWorkDays,
        efficiency: priorityScore / Math.max(totalWorkDays, 1)
      };
    });
  }, [windows, anomalies, actionPlans]);

  // Filtered and sorted windows
  const processedWindows = useMemo(() => {
    let filtered = windowAnalytics;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(w => w.status === filterStatus);
    }
    
    return filtered.sort((a, b) => {
      switch (sortField) {
        case 'date':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'utilization':
          return b.utilization - a.utilization;
        case 'priority':
          return b.priorityScore - a.priorityScore;
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });
  }, [windowAnalytics, filterStatus, sortField]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'force': return 'bg-red-500';
      case 'major': return 'bg-blue-500';
      case 'minor': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {processedWindows.map((window) => (
        <Card 
          key={window.id} 
          className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`${getTypeColor(window.type)} rounded-xl p-3`}>
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    {window.type.toUpperCase()}
                  </CardTitle>
                  <p className="text-sm text-gray-500">{window.durationDays} jours</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(window.status)}>
                  {window.status}
                </Badge>
                <div className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(window.riskLevel)}`}>
                  {window.riskLevel.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Début: {formatDate(window.startDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>Fin: {formatDate(window.endDate)}</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Utilization */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Utilisation</span>
                <span className={`text-sm font-bold ${
                  window.utilization > 100 ? 'text-red-600' :
                  window.utilization > 85 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {window.utilization.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${
                    window.utilization > 100 ? 'bg-red-500' :
                    window.utilization > 85 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(window.utilization, 100)}%` }}
                />
              </div>
            </div>

            {/* Anomalies */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Anomalies</span>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="font-bold">{window.assignedAnomalies.length}</span>
              </div>
            </div>

            {/* Priority Score */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Score Priorité</span>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                <span className="font-bold text-purple-600">{window.priorityScore}</span>
              </div>
            </div>

            {/* Criticality breakdown */}
            {Object.keys(window.criticalityStats).length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Criticité</span>
                <div className="flex gap-1">
                  {Object.entries(window.criticalityStats).map(([level, count]) => (
                    <div 
                      key={level}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        level === 'critical' ? 'bg-red-100 text-red-800' :
                        level === 'high' ? 'bg-orange-100 text-orange-800' :
                        level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}
                    >
                      {count} {level}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewWindow(window)}
                className="flex-1 text-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                Voir
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditWindow(window)}
                className="flex-1 text-sm hover:bg-gray-50 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add new window card */}
      <div
        className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors cursor-pointer rounded-lg"
        onClick={onCreateWindow}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500 hover:text-blue-600 transition-colors">
            <Plus className="h-12 w-12 mb-4" />
            <p className="font-medium">Nouvelle Fenêtre</p>
            <p className="text-sm text-center mt-1">Créer une nouvelle fenêtre de maintenance</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Planification des Fenêtres
          </h2>
          <p className="text-gray-600 mt-1">
            Gestion intelligente et visualisation des fenêtres de maintenance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { mode: 'grid' as ViewMode, icon: BarChart3, label: 'Grille' },
              { mode: 'timeline' as ViewMode, icon: Clock, label: 'Timeline' },
            ].map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="text-xs"
              >
                <Icon className="h-3 w-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>

          {/* Filters */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="all">Tous les statuts</option>
            <option value="planned">Planifié</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
          </select>

          {/* Sort */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="text-sm border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="date">Trier par date</option>
            <option value="utilization">Trier par utilisation</option>
            <option value="priority">Trier par priorité</option>
            <option value="type">Trier par type</option>
          </select>

          <Button onClick={onCreateWindow} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle Fenêtre
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Fenêtres',
            value: windows.length,
            icon: Calendar,
            color: 'bg-blue-500'
          },
          {
            label: 'Utilisation Moy.',
            value: `${windowAnalytics.length > 0 ? Math.round(windowAnalytics.reduce((sum, w) => sum + w.utilization, 0) / windowAnalytics.length) : 0}%`,
            icon: TrendingUp,
            color: 'bg-green-500'
          },
          {
            label: 'Fenêtres Critiques',
            value: windowAnalytics.filter(w => w.riskLevel === 'high').length,
            icon: AlertTriangle,
            color: 'bg-red-500'
          },
          {
            label: 'Efficacité Totale',
            value: `${windowAnalytics.length > 0 ? Math.round(windowAnalytics.reduce((sum, w) => sum + w.efficiency, 0) / windowAnalytics.length * 10) : 0}/10`,
            icon: CheckCircle,
            color: 'bg-purple-500'
          }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} rounded-full p-3`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main content */}
      {viewMode === 'grid' && renderGridView()}
      
      {processedWindows.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune fenêtre trouvée</h3>
          <p className="text-gray-600 mb-4">
            {filterStatus !== 'all' 
              ? `Aucune fenêtre avec le statut "${filterStatus}"`
              : 'Créez votre première fenêtre de maintenance'
            }
          </p>
          <Button onClick={onCreateWindow}>
            <Plus className="h-4 w-4 mr-2" />
            Créer une Fenêtre
          </Button>
        </div>
      )}
    </div>
  );
};
