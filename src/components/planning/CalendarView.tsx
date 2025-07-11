import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  AlertTriangle,
  Plus,
  Filter,
  Settings,
  Zap,
  CheckCircle,
  Wrench,
  Edit,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Anomaly, MaintenanceWindow, ActionPlan } from '../../types';
import { formatDate, getCriticalityColor } from '../../lib/utils';
import { MaintenanceWindowModal } from './MaintenanceWindowModal';
import { planningIntegration } from '../../lib/planningUtils';
import toast from 'react-hot-toast';

interface CalendarViewProps {
  anomalies: Anomaly[];
  maintenanceWindows: MaintenanceWindow[];
  onScheduleAnomaly?: (anomalyId: string, windowId: string) => void;
  onCreateWindow?: () => void;
  onUpdateWindows?: (window: MaintenanceWindow) => void;
  actionPlans?: ActionPlan[];
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  anomalies: Anomaly[];
  maintenanceWindows: MaintenanceWindow[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  anomalies,
  maintenanceWindows,
  onScheduleAnomaly,
  onCreateWindow,
  onUpdateWindows,
  actionPlans = []
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [filterCriticality, setFilterCriticality] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingWindow, setEditingWindow] = useState<MaintenanceWindow | undefined>();
  const [localWindows, setLocalWindows] = useState<MaintenanceWindow[]>(maintenanceWindows);
  const [viewType, setViewType] = useState<'calendar' | 'timeline' | 'slots'>('calendar');
  const [draggedAnomaly, setDraggedAnomaly] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<MaintenanceWindow | null>(null);
  const [showWindowDetails, setShowWindowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showOptimizeResults, setShowOptimizeResults] = useState(false);

  const today = new Date();
  
  const handleOptimizeAI = () => {
    // Calculate optimal scheduling suggestions
    const { suggestions } = planningIntegration.calculateOptimalScheduling(actionPlans, localWindows);
    
    if (suggestions.length > 0) {
      setShowOptimizeResults(true);
      toast.success(`${suggestions.length} suggestions d'optimisation trouvées`);
    } else {
      toast('Aucune optimisation possible pour le moment');
    }
  };

  const handleToggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleFilterChange = (newFilter: string) => {
    setFilterCriticality(newFilter);
    toast.success(`Filtre appliqué: ${newFilter}`);
  };

  const filteredAnomalies = filterCriticality === 'all' 
    ? anomalies 
    : anomalies.filter(a => a.criticalityLevel === filterCriticality);
  
  const getAnomaliesForDate = (date: Date) => {
    return filteredAnomalies.filter(anomaly => {
      const anomalyDate = new Date(anomaly.createdAt);
      return anomalyDate.toDateString() === date.toDateString();
    });
  };

  const getMaintenanceWindowsForDate = (date: Date) => {
    return localWindows.filter(window => {
      const startDate = new Date(window.startDate);
      const endDate = new Date(window.endDate);
      return date >= startDate && date <= endDate;
    });
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days: CalendarDay[] = [];
    
    // Previous month days
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.toDateString() === today.toDateString(),
        anomalies: getAnomaliesForDate(date),
        maintenanceWindows: getMaintenanceWindowsForDate(date)
      });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        anomalies: getAnomaliesForDate(date),
        maintenanceWindows: getMaintenanceWindowsForDate(date)
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.toDateString() === today.toDateString(),
        anomalies: getAnomaliesForDate(date),
        maintenanceWindows: getMaintenanceWindowsForDate(date)
      });
    }
    
    return days;
  }, [currentDate, anomalies, localWindows]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleCreateWindow = () => {
    setEditingWindow(undefined);
    setShowModal(true);
  };

  const handleSaveWindow = (windowData: MaintenanceWindow) => {
    if (onUpdateWindows) {
      onUpdateWindows(windowData);
    }
    
    // Update local state to reflect changes immediately
    if (editingWindow) {
      setLocalWindows(prev => prev.map(w => w.id === editingWindow.id ? windowData : w));
    } else {
      setLocalWindows(prev => [...prev, windowData]);
    }
    
    setShowModal(false);
  };

  const handleDragStart = (anomalyId: string) => {
    setDraggedAnomaly(anomalyId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    if (draggedAnomaly && onScheduleAnomaly) {
      // Find or create a maintenance window for this slot
      const windowId = `slot-${slotIndex}`;
      onScheduleAnomaly(draggedAnomaly, windowId);
      setDraggedAnomaly(null);
      toast.success('Anomalie assignée au créneau');
    }
  };

  const getSlotUtilization = () => {
    const totalSlots = 42;
    const usedSlots = localWindows.reduce((sum, window) => sum + window.durationDays, 0);
    return Math.round((usedSlots / totalSlots) * 100);
  };

  const getOptimalScheduling = () => {
    // Use the planning integration utility
    const { suggestions } = planningIntegration.calculateOptimalScheduling(actionPlans, localWindows);
    
    return suggestions.map(suggestion => ({
      window: localWindows.find(w => w.id === suggestion.windowId),
      actionPlans: suggestion.actionPlans,
      efficiency: suggestion.efficiency
    })).filter(s => s.window);
  };

  const schedulingSuggestions = getOptimalScheduling();

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const getCriticalityStats = (day: CalendarDay) => {
    const critical = day.anomalies.filter(a => a.criticalityLevel === 'critical').length;
    const high = day.anomalies.filter(a => a.criticalityLevel === 'high').length;
    const total = day.anomalies.length;
    
    return { critical, high, total };
  };

  const handleWindowClick = (window: MaintenanceWindow) => {
    setSelectedWindow(window);
    setShowWindowDetails(true);
  };

  const getAssignedAnomaliesCount = (window: MaintenanceWindow) => {
    return window.assignedAnomalies?.length || 0;
  };

  const getWindowUtilization = (window: MaintenanceWindow) => {
    const assignedDuration = window.assignedAnomalies?.reduce((sum, anomaly) => {
      return sum + (anomaly.actionPlan?.outageDuration || 1);
    }, 0) || 0;
    
    return Math.round((assignedDuration / window.durationDays) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={viewType === 'calendar' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewType('calendar')}
            >
              Calendrier
            </Button>
            <Button
              variant={viewType === 'timeline' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewType('timeline')}
            >
              Timeline
            </Button>
            <Button
              variant={viewType === 'slots' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewType('slots')}
            >
              42 Créneaux
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleToggleFilters}>
            <Filter className="w-4 h-4 mr-2" />
            Filtres Avancés
          </Button>
          <Button variant="outline" size="sm" onClick={handleOptimizeAI}>
            <Settings className="w-4 h-4 mr-2" />
            Optimiser IA
          </Button>
          <Button onClick={handleCreateWindow}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvel Arrêt
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold">Filtres</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Criticité:</span>
                <Button
                  variant={filterCriticality === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('all')}
                >
                  Tous
                </Button>
                <Button
                  variant={filterCriticality === 'critical' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('critical')}
                >
                  Critique
                </Button>
                <Button
                  variant={filterCriticality === 'high' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('high')}
                >
                  Élevée
                </Button>
                <Button
                  variant={filterCriticality === 'medium' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('medium')}
                >
                  Normale
                </Button>
                <Button
                  variant={filterCriticality === 'low' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('low')}
                >
                  Faible
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Results */}
      {showOptimizeResults && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Suggestions d'optimisation IA</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowOptimizeResults(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {schedulingSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">{suggestion.window?.type} - {suggestion.window?.description}</p>
                    <p className="text-sm text-gray-600">
                      Efficacité: {suggestion.efficiency}% | 
                      Actions: {suggestion.actionPlans.length}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => {
                    toast.success('Suggestion appliquée');
                    setShowOptimizeResults(false);
                  }}>
                    Appliquer
                  </Button>
                </div>
              ))}
              {schedulingSuggestions.length === 0 && (
                <p className="text-gray-600">Aucune suggestion d'optimisation disponible pour le moment.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive Planning Interface */}
        <div className="lg:col-span-3">
          {viewType === 'calendar' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Vue Calendrier</span>
                  <div className="text-sm text-gray-500">
                    Utilisation: {getSlotUtilization()}%
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 border-b border-gray-200">
                  {dayNames.map(day => (
                    <div key={day} className="p-4 text-center text-sm font-medium text-gray-500 bg-gray-50">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7">
                  {calendarDays.slice(0, 42).map((day, index) => {
                    const stats = getCriticalityStats(day);
                    const slotNumber = index + 1;
                    
                    return (
                      <div
                        key={index}
                        className={`min-h-[120px] p-2 border-r border-b border-gray-100 cursor-pointer transition-all hover:bg-gray-50 relative ${
                          !day.isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : ''
                        } ${
                          day.isToday ? 'bg-blue-50 border-blue-200' : ''
                        } ${
                          selectedDay?.toDateString() === day.date.toDateString() ? 'bg-blue-100' : ''
                        } ${
                          hoveredSlot === index ? 'bg-green-50 border-green-300' : ''
                        }`}
                        onClick={() => setSelectedDay(day.date)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onMouseEnter={() => setHoveredSlot(index)}
                        onMouseLeave={() => setHoveredSlot(null)}
                      >
                        {/* Slot Number */}
                        <div className="absolute top-1 left-1 text-xs text-gray-400 bg-white rounded px-1">
                          {slotNumber}
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${
                            day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                            {day.date.getDate()}
                          </span>
                          {stats.total > 0 && (
                            <div className="flex items-center space-x-1">
                              {stats.critical > 0 && (
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              )}
                              {stats.high > 0 && (
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Maintenance Windows */}
                        {day.maintenanceWindows.map((window, idx) => (
                          <div
                            key={idx}
                            className={`mb-1 px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transform hover:scale-105 transition-all relative ${
                              window.type === 'force' ? 'bg-red-100 text-red-800 border border-red-200' :
                              window.type === 'major' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWindowClick(window);
                            }}
                          >
                            {window.autoCreated && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1">
                                <Wrench className="w-3 h-3" />
                                <span className="truncate">
                                  {window.autoCreated ? 'Auto' : ''}
                                  {window.type === 'force' ? 'Forcé' :
                                   window.type === 'major' ? 'Majeur' : 'Mineur'}
                                </span>
                              </div>
                              {getAssignedAnomaliesCount(window) > 0 && (
                                <Badge variant="info" className="text-xs px-1 py-0">
                                  {getAssignedAnomaliesCount(window)}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {getWindowUtilization(window)}% utilisé
                            </div>
                          </div>
                        ))}

                        {/* Anomalies */}
                        {day.anomalies.slice(0, 2).map((anomaly, idx) => (
                          <div
                            key={idx}
                            className={`mb-1 px-2 py-1 rounded text-xs truncate cursor-move transition-colors ${
                              anomaly.maintenanceWindowId 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                            draggable
                            onDragStart={() => handleDragStart(anomaly.id)}
                          >
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${getCriticalityColor(anomaly.criticalityLevel)}`} />
                              <span className="truncate">{anomaly.equipmentId}</span>
                              {anomaly.maintenanceWindowId && (
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              )}
                            </div>
                          </div>
                        ))}

                        {day.anomalies.length > 2 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{day.anomalies.length - 2} autres
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {viewType === 'slots' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Système 42 Créneaux</span>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500">
                      {localWindows.reduce((sum, w) => sum + w.durationDays, 0)}/42 créneaux utilisés
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getSlotUtilization()}%` }}
                      ></div>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 42 }, (_, index) => {
                    const isOccupied = localWindows.some(window => {
                      const startSlot = Math.floor((new Date(window.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return startSlot <= index && index < startSlot + window.durationDays;
                    });
                    
                    const occupyingWindow = localWindows.find(window => {
                      const startSlot = Math.floor((new Date(window.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return startSlot <= index && index < startSlot + window.durationDays;
                    });
                    
                    return (
                      <div
                        key={index}
                        className={`h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-sm font-medium cursor-pointer transition-all hover:scale-105 ${
                          isOccupied 
                            ? 'bg-blue-100 border-blue-300 text-blue-800' 
                            : 'bg-gray-50 border-gray-300 text-gray-500 hover:bg-green-50 hover:border-green-300'
                        } ${
                          hoveredSlot === index ? 'ring-2 ring-blue-400' : ''
                        }`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onMouseEnter={() => setHoveredSlot(index)}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={() => {
                          if (isOccupied && occupyingWindow) {
                            handleWindowClick(occupyingWindow);
                          } else {
                            handleCreateWindow();
                          }
                        }}
                      >
                        <div className="text-xs">{index + 1}</div>
                        {isOccupied && occupyingWindow ? (
                          <div className="text-xs text-center">
                            <div>{occupyingWindow.type}</div>
                            <div>{getAssignedAnomaliesCount(occupyingWindow)} anomalies</div>
                          </div>
                        ) : (
                          <div className="text-xs">Libre</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Guide d'utilisation</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Glissez-déposez les anomalies sur les créneaux disponibles</li>
                    <li>• Cliquez sur un créneau libre pour créer un nouvel arrêt</li>
                    <li>• Cliquez sur un créneau occupé pour voir les détails</li>
                    <li>• Les créneaux bleus sont déjà occupés par des arrêts planifiés</li>
                    <li>• Optimisation automatique basée sur la criticité et les ressources</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {viewType === 'timeline' && (
            <Card>
              <CardHeader>
                <CardTitle>Vue Timeline Interactive</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {localWindows.map((window, index) => (
                    <div
                      key={window.id}
                      className={`p-4 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all ${
                        window.type === 'force' ? 'border-red-500 bg-red-50' :
                        window.type === 'major' ? 'border-blue-500 bg-blue-50' :
                        'border-yellow-500 bg-yellow-50'
                      }`}
                      onClick={() => handleWindowClick(window)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-gray-900">
                              Arrêt {window.type === 'force' ? 'Forcé' : window.type === 'major' ? 'Majeur' : 'Mineur'}
                            </h4>
                            {window.autoCreated && (
                              <Badge variant="warning" className="text-xs">Auto</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{window.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(window.startDate)} - {formatDate(window.endDate)} ({window.durationDays} jours)
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            Anomalies: {getAssignedAnomaliesCount(window)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Utilisation: {getWindowUtilization(window)}%
                          </div>
                          <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${getWindowUtilization(window)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Assigned Anomalies Preview */}
                      {window.assignedAnomalies && window.assignedAnomalies.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex flex-wrap gap-2">
                            {window.assignedAnomalies.slice(0, 3).map((anomaly, idx) => (
                              <div key={idx} className="flex items-center space-x-1 bg-white px-2 py-1 rounded text-xs">
                                <div className={`w-2 h-2 rounded-full ${getCriticalityColor(anomaly.criticalityLevel)}`} />
                                <span>{anomaly.equipmentId}</span>
                              </div>
                            ))}
                            {window.assignedAnomalies.length > 3 && (
                              <div className="text-xs text-gray-500 px-2 py-1">
                                +{window.assignedAnomalies.length - 3} autres
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {localWindows.length === 0 && (
                    <div className="text-center py-12">
                      <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Aucun arrêt planifié</p>
                      <Button className="mt-4" onClick={handleCreateWindow}>
                        Créer le premier arrêt
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Statistiques Rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Anomalies non assignées</span>
                <span className="font-semibold text-orange-600">
                  {anomalies.filter(a => !a.maintenanceWindowId).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Anomalies assignées</span>
                <span className="font-semibold text-green-600">
                  {anomalies.filter(a => a.maintenanceWindowId).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Critiques</span>
                <span className="font-semibold text-red-600">
                  {anomalies.filter(a => a.criticalityLevel === 'critical').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Arrêts planifiés</span>
                <span className="font-semibold text-blue-600">{localWindows.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Taux d'utilisation</span>
                <span className="font-semibold text-green-600">
                  {getSlotUtilization()}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Créneaux libres</span>
                <span className="font-semibold text-blue-600">
                  {42 - localWindows.reduce((sum, w) => sum + w.durationDays, 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Anomalies à planifier */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Anomalies à Planifier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {anomalies.filter(a => !a.maintenanceWindowId).slice(0, 10).map((anomaly) => (
                <div
                  key={anomaly.id}
                  className="p-2 bg-gray-50 rounded cursor-move hover:bg-gray-100 transition-colors"
                  draggable
                  onDragStart={() => handleDragStart(anomaly.id)}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getCriticalityColor(anomaly.criticalityLevel)}`} />
                    <span className="text-xs font-medium truncate">{anomaly.equipmentId}</span>
                    {anomaly.hasActionPlan && (
                      <Wrench className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{anomaly.title}</div>
                  {anomaly.actionPlan?.needsOutage && (
                    <div className="text-xs text-orange-600 mt-1">
                      Arrêt {anomaly.actionPlan.outageType} requis
                    </div>
                  )}
                </div>
              ))}
              {anomalies.filter(a => !a.maintenanceWindowId).length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">
                  Toutes les anomalies sont planifiées
                </p>
              )}
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span>Suggestions IA</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {schedulingSuggestions.slice(0, 3).map((suggestion, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">
                      Arrêt {suggestion.window?.type}
                    </span>
                    <Badge variant="info" className="text-xs">
                      {Math.round(suggestion.efficiency)}% efficace
                    </Badge>
                  </div>
                  <p className="text-xs text-blue-700 mb-2">
                    {suggestion.window && formatDate(suggestion.window.startDate)}
                  </p>
                  <div className="space-y-1">
                    {(suggestion.actionPlans || []).slice(0, 2).map((plan, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-xs text-blue-800 truncate">
                          Plan d'action {plan.id}
                        </span>
                      </div>
                    ))}
                    {(suggestion.actionPlans || []).length > 2 && (
                      <span className="text-xs text-blue-600">
                        +{(suggestion.actionPlans || []).length - 2} autres
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
                    Appliquer Suggestion
                  </Button>
                </div>
              ))}
              {schedulingSuggestions.length === 0 && (
                <div className="text-center py-4">
                  <Zap className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Aucune suggestion disponible</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Légende</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Critique</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Élevée</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Normale</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Faible</span>
              </div>
              <hr className="my-2" />
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                <span className="text-xs text-gray-600">Arrêt Forcé</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                <span className="text-xs text-gray-600">Arrêt Majeur</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className="text-xs text-gray-600">Arrêt Mineur</span>
              </div>
              <hr className="my-2" />
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span className="text-xs text-gray-600">Anomalie assignée</span>
              </div>
              <div className="flex items-center space-x-2">
                <Wrench className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-gray-600">Plan d'action</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Maintenance Window Modal */}
      <MaintenanceWindowModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveWindow}
        editWindow={editingWindow}
        anomalies={anomalies}
      />

      {/* Window Details Modal */}
      {selectedWindow && showWindowDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Wrench className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Arrêt {selectedWindow.type === 'force' ? 'Forcé' : selectedWindow.type === 'major' ? 'Majeur' : 'Mineur'}
                  </h2>
                  <p className="text-sm text-gray-600">{selectedWindow.description}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowWindowDetails(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600">Durée</div>
                  <div className="text-2xl font-bold text-blue-900">{selectedWindow.durationDays} jours</div>
                  <div className="text-xs text-blue-600">
                    {formatDate(selectedWindow.startDate)} - {formatDate(selectedWindow.endDate)}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600">Anomalies Assignées</div>
                  <div className="text-2xl font-bold text-green-900">{getAssignedAnomaliesCount(selectedWindow)}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-orange-600">Utilisation</div>
                  <div className="text-2xl font-bold text-orange-900">{getWindowUtilization(selectedWindow)}%</div>
                  <div className="w-full bg-orange-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getWindowUtilization(selectedWindow)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Assigned Anomalies */}
              {selectedWindow.assignedAnomalies && selectedWindow.assignedAnomalies.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Anomalies Assignées</h3>
                  <div className="space-y-3">
                    {selectedWindow.assignedAnomalies.map((anomaly, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getCriticalityColor(anomaly.criticalityLevel)}`} />
                          <div>
                            <div className="font-medium text-gray-900">{anomaly.equipmentId}</div>
                            <div className="text-sm text-gray-600">{anomaly.title}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={anomaly.criticalityLevel === 'critical' ? 'danger' : 'warning'}>
                            {anomaly.criticalityLevel}
                          </Badge>
                          {anomaly.hasActionPlan && (
                            <Badge variant="info">Plan d'action</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!selectedWindow.assignedAnomalies || selectedWindow.assignedAnomalies.length === 0) && (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune anomalie assignée à cet arrêt</p>
                  <Button className="mt-4" onClick={() => {
                    setEditingWindow(selectedWindow);
                    setShowWindowDetails(false);
                    setShowModal(true);
                  }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier l'arrêt
                  </Button>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <Button variant="outline" onClick={() => {
                  setEditingWindow(selectedWindow);
                  setShowWindowDetails(false);
                  setShowModal(true);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
                <Button onClick={() => setShowWindowDetails(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Day Details */}
      {selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5" />
              <span>Détails du {formatDate(selectedDay)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Anomalies</h4>
                <div className="space-y-2">
                  {getAnomaliesForDate(selectedDay).map((anomaly) => (
                    <div key={anomaly.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${getCriticalityColor(anomaly.criticalityLevel)}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{anomaly.equipmentId}</p>
                        <p className="text-xs text-gray-500">{anomaly.title}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={anomaly.criticalityLevel === 'critical' ? 'danger' : 'warning'}>
                          {anomaly.criticalityLevel}
                        </Badge>
                        {anomaly.maintenanceWindowId && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                  {getAnomaliesForDate(selectedDay).length === 0 && (
                    <p className="text-sm text-gray-500">Aucune anomalie ce jour</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Maintenance</h4>
                <div className="space-y-2">
                  {getMaintenanceWindowsForDate(selectedDay).map((window) => (
                    <div key={window.id} className="p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                         onClick={() => handleWindowClick(window)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-900">
                          Arrêt {window.type}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Badge variant="info">{window.status}</Badge>
                          {getAssignedAnomaliesCount(window) > 0 && (
                            <Badge variant="success">{getAssignedAnomaliesCount(window)} anomalies</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-blue-700">{window.description}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Durée: {window.durationDays} jour{window.durationDays > 1 ? 's' : ''} - Utilisation: {getWindowUtilization(window)}%
                      </p>
                    </div>
                  ))}
                  {getMaintenanceWindowsForDate(selectedDay).length === 0 && (
                    <p className="text-sm text-gray-500">Aucune maintenance planifiée</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CalendarView;