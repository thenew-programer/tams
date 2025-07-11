import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users,
  AlertTriangle,
  Edit,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { MaintenanceWindow, Anomaly, ActionPlan } from '../../../types';
import { WeekView } from './WeekView';

interface CalendarPlanningViewProps {
  windows: MaintenanceWindow[];
  anomalies: Anomaly[];
  actionPlans: ActionPlan[];
  onViewWindow: (window: MaintenanceWindow) => void;
  onEditWindow: (window: MaintenanceWindow) => void;
  onCreateWindow: (startDate?: Date) => void;
}

type CalendarView = 'month' | 'week' | 'timeline';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  windows: (MaintenanceWindow & { 
    assignedAnomalies: Anomaly[];
    utilization: number;
    riskLevel: string;
    position?: number;
    span?: number;
  })[];
}

export const CalendarPlanningView: React.FC<CalendarPlanningViewProps> = ({
  windows,
  anomalies,
  actionPlans,
  onViewWindow,
  onEditWindow,
  onCreateWindow
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedWindow, setSelectedWindow] = useState<MaintenanceWindow | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'force' | 'major' | 'minor'>('all');

  // Enhanced window data with analytics
  const enhancedWindows = useMemo(() => {
    return windows.map(window => {
      const assignedAnomalies = anomalies.filter(a => a.maintenanceWindowId === window.id);
      const relatedPlans = actionPlans.filter(ap => assignedAnomalies.some(a => a.id === ap.anomalyId));
      
      const totalWorkDays = relatedPlans.reduce((sum, plan) => sum + plan.totalDurationDays, 0);
      const utilization = window.durationDays > 0 ? (totalWorkDays / window.durationDays) * 100 : 0;
      
      const riskLevel = utilization > 100 ? 'high' : 
                      utilization > 85 ? 'medium' : 
                      assignedAnomalies.some(a => a.criticalityLevel === 'critical') ? 'medium' : 'low';
      
      return {
        ...window,
        assignedAnomalies,
        utilization,
        riskLevel
      };
    });
  }, [windows, anomalies, actionPlans]);

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startCalendar = new Date(firstDay);
    startCalendar.setDate(startCalendar.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startCalendar);
      date.setDate(startCalendar.getDate() + i);
      
      // Filter windows that intersect with this date
      const dayWindows = enhancedWindows.filter(window => {
        const startDate = new Date(window.startDate);
        const endDate = new Date(window.endDate);
        return date >= startDate && date <= endDate;
      }).filter(window => filterType === 'all' || window.type === filterType);
      
      days.push({
        date: new Date(date),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        windows: dayWindows
      });
    }
    
    return days;
  }, [currentDate, enhancedWindows, filterType]);

  // Navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get window color based on type and status
  const getWindowColor = (window: MaintenanceWindow & { riskLevel: string }) => {
    const baseColors = {
      force: 'bg-red-500',
      major: 'bg-blue-500',
      minor: 'bg-green-500'
    };
    
    const riskOverlay = {
      high: 'ring-2 ring-red-300 bg-opacity-90',
      medium: 'ring-2 ring-yellow-300 bg-opacity-80',
      low: 'bg-opacity-70'
    };
    
    return `${baseColors[window.type] || 'bg-gray-500'} ${riskOverlay[window.riskLevel as keyof typeof riskOverlay] || ''}`;
  };

  // Timeline view for detailed scheduling
  const renderTimelineView = () => {
    const sortedWindows = enhancedWindows
      .filter(w => filterType === 'all' || w.type === filterType)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Timeline Planning</h3>
            <div className="text-sm text-gray-500">
              {sortedWindows.length} fenêtres planifiées
            </div>
          </div>
          
          <div className="space-y-3">
            {sortedWindows.map((window, index) => (
              <div
                key={window.id}
                className="relative flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => setSelectedWindow(window)}
              >
                {/* Timeline connector */}
                {index < sortedWindows.length - 1 && (
                  <div className="absolute left-6 top-full w-px h-3 bg-gray-300" />
                )}
                
                <div className={`w-4 h-4 rounded-full ${getWindowColor(window)} flex-shrink-0 mr-4`} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {window.type.toUpperCase()} - {window.durationDays} jours
                      </h4>
                      <p className="text-sm text-gray-600">
                        {new Date(window.startDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })} → {new Date(window.endDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{window.assignedAnomalies.length} anomalies</span>
                        </div>
                        <div className={`text-xs ${
                          window.utilization > 100 ? 'text-red-600' :
                          window.utilization > 85 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {window.utilization.toFixed(1)}% utilisé
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewWindow(window);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditWindow(window);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        window.utilization > 100 ? 'bg-red-500' :
                        window.utilization > 85 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(window.utilization, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Month calendar view
  const renderMonthView = () => (
    <div className="bg-white rounded-lg border">
      {/* Calendar header */}
      <div className="p-4 border-b">
        <div className="grid grid-cols-7 gap-1">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className="p-2">
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`min-h-[120px] p-2 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors ${
                !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
              } ${day.isToday ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${
                  day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {day.date.getDate()}
                </span>
                
                {day.windows.length === 0 && day.isCurrentMonth && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-6 w-6 opacity-50 hover:opacity-100"
                    onClick={() => onCreateWindow(day.date)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <div className="space-y-1">
                {day.windows.slice(0, 2).map((window) => (
                  <div
                    key={window.id}
                    className={`text-xs p-2 rounded text-white cursor-pointer hover:opacity-80 transition-all duration-200 transform hover:scale-105 ${getWindowColor(window)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewWindow(window);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate text-xs">
                        {window.type.toUpperCase()}
                      </span>
                      {window.riskLevel === 'high' && (
                        <AlertTriangle className="h-3 w-3 text-yellow-200" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs opacity-90">
                      <div className="flex items-center gap-1">
                        <Users className="h-2 w-2" />
                        <span>{window.assignedAnomalies.length}</span>
                      </div>
                      <span>{window.utilization.toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 w-full bg-white bg-opacity-30 rounded-full h-1">
                      <div 
                        className="h-1 rounded-full bg-white bg-opacity-80"
                        style={{ width: `${Math.min(window.utilization, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                
                {day.windows.length > 2 && (
                  <div 
                    className="text-xs text-gray-500 text-center p-1 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Show all windows for this day in a quick preview
                      setSelectedWindow(day.windows[0]);
                    }}
                  >
                    +{day.windows.length - 2} autres
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-blue-600" />
            Calendrier de Planification
          </h2>
          <p className="text-gray-600 mt-1">
            Gestion visuelle des fenêtres de maintenance avec timeline interactive
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { mode: 'month' as CalendarView, icon: CalendarIcon, label: 'Mois' },
              { mode: 'week' as CalendarView, icon: Clock, label: 'Semaine' },
              { mode: 'timeline' as CalendarView, icon: Clock, label: 'Timeline' }
            ].map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                variant={view === mode ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setView(mode)}
                className="text-xs"
              >
                <Icon className="h-3 w-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>

          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="all">Tous types</option>
            <option value="force">Arrêt Forcé</option>
            <option value="major">Majeur</option>
            <option value="minor">Mineur</option>
          </select>

          <Button onClick={() => onCreateWindow()} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle Fenêtre
          </Button>
        </div>
      </div>

      {/* Calendar navigation (for month view) */}
      {view === 'month' && (
        <div className="flex items-center justify-between bg-white rounded-lg p-4 border">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h3 className="text-lg font-semibold text-gray-900">
              {currentDate.toLocaleDateString('fr-FR', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </h3>
            
            <Button variant="outline" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" onClick={goToToday}>
              Aujourd'hui
            </Button>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span>Arrêt Forcé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span>Majeur</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Mineur</span>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      {view === 'month' && renderMonthView()}
      {view === 'week' && (
        <WeekView
          currentDate={currentDate}
          windows={enhancedWindows}
          onViewWindow={onViewWindow}
          onCreateWindow={onCreateWindow}
          onNavigate={(direction) => {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
            setCurrentDate(newDate);
          }}
        />
      )}
      {view === 'timeline' && renderTimelineView()}

      {/* Selected window details (quick preview) */}
      {selectedWindow && (
        <Card className="border-l-4 border-blue-500 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Fenêtre Sélectionnée: {selectedWindow.type.toUpperCase()}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewWindow(selectedWindow)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Voir Détails
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditWindow(selectedWindow)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedWindow(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Période</p>
                <p className="font-medium">
                  {new Date(selectedWindow.startDate).toLocaleDateString('fr-FR')} - 
                  {new Date(selectedWindow.endDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Anomalies</p>
                <p className="font-medium">
                  {enhancedWindows.find(w => w.id === selectedWindow.id)?.assignedAnomalies.length || 0} assignées
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Utilisation</p>
                <p className="font-medium">
                  {enhancedWindows.find(w => w.id === selectedWindow.id)?.utilization.toFixed(1) || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
