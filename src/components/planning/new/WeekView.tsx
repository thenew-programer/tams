import React, { useState, useMemo } from 'react';
import { 
  Users,
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { MaintenanceWindow, Anomaly } from '../../../types';

interface WeekViewProps {
  currentDate: Date;
  windows: (MaintenanceWindow & { 
    assignedAnomalies: Anomaly[];
    utilization: number;
    riskLevel: string;
  })[];
  onViewWindow: (window: MaintenanceWindow) => void;
  onCreateWindow: (date: Date) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  windows,
  onViewWindow,
  onCreateWindow,
  onNavigate
}) => {
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);

  // Generate week days
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(currentDate.getDate() - day);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  }, [currentDate]);

  // Generate time slots (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  // Get windows for a specific day
  const getWindowsForDay = (date: Date) => {
    return windows.filter(window => {
      const startDate = new Date(window.startDate);
      const endDate = new Date(window.endDate);
      return date >= startDate && date <= endDate;
    });
  };

  // Get window color
  const getWindowColor = (window: MaintenanceWindow & { riskLevel: string }) => {
    const baseColors = {
      force: 'bg-red-500 border-red-600',
      major: 'bg-blue-500 border-blue-600',
      minor: 'bg-green-500 border-green-600'
    };
    
    const riskOverlay: Record<string, string> = {
      high: 'ring-2 ring-red-300',
      medium: 'ring-2 ring-yellow-300',
      low: ''
    };
    
    return `${baseColors[window.type] || 'bg-gray-500 border-gray-600'} ${riskOverlay[window.riskLevel] || ''}`;
  };

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Week header */}
      <div className="border-b bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => onNavigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h3 className="text-lg font-semibold text-gray-900">
              {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} - 
              {weekDays[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            
            <Button variant="outline" size="sm" onClick={() => onNavigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            {windows.length} fenêtres cette semaine
          </div>
        </div>
      </div>

      {/* Days header */}
      <div className="grid grid-cols-8 border-b">
        <div className="p-3 border-r bg-gray-50">
          <span className="text-sm font-medium text-gray-600">Heure</span>
        </div>
        {weekDays.map((day, index) => {
          const isToday = day.toDateString() === new Date().toDateString();
          const dayWindows = getWindowsForDay(day);
          
          return (
            <div
              key={index}
              className={`p-3 border-r text-center ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}
            >
              <div className={`font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </div>
              <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                {day.getDate()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {dayWindows.length} fenêtre{dayWindows.length !== 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="max-h-96 overflow-y-auto">
        {timeSlots.map(hour => (
          <div key={hour} className="grid grid-cols-8 border-b border-gray-100 min-h-[60px]">
            {/* Time label */}
            <div className="p-2 border-r bg-gray-50 flex items-center justify-center">
              <span className="text-sm text-gray-600">
                {hour.toString().padStart(2, '0')}:00
              </span>
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => {
              const dayWindows = getWindowsForDay(day);
              const isSelected = selectedSlot?.date.toDateString() === day.toDateString() && selectedSlot?.hour === hour;
              
              return (
                <div
                  key={dayIndex}
                  className={`p-1 border-r hover:bg-gray-50 cursor-pointer relative ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedSlot({ date: day, hour })}
                >
                  {/* Windows in this time slot */}
                  {dayWindows.map((window) => (
                    <div
                      key={window.id}
                      className={`mb-1 p-1 rounded text-xs text-white cursor-pointer ${getWindowColor(window)} hover:opacity-80 transition-opacity`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewWindow(window);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">
                          {window.type.substring(0, 3).toUpperCase()}
                        </span>
                        {window.riskLevel === 'high' && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="h-2 w-2" />
                        <span>{window.assignedAnomalies.length}</span>
                      </div>
                    </div>
                  ))}

                  {/* Add window button for empty slots */}
                  {dayWindows.length === 0 && isSelected && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newDate = new Date(day);
                        newDate.setHours(hour);
                        onCreateWindow(newDate);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected slot info */}
      {selectedSlot && (
        <div className="border-t bg-blue-50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-blue-900">
                {selectedSlot.date.toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })} à {selectedSlot.hour.toString().padStart(2, '0')}:00
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => {
                const newDate = new Date(selectedSlot.date);
                newDate.setHours(selectedSlot.hour);
                onCreateWindow(newDate);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Créer Fenêtre
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
