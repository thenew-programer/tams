import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { MaintenanceWindow } from '../../types';
import { formatDate } from '../../lib/utils';

interface PlanningCalendarProps {
  maintenanceWindows: MaintenanceWindow[];
  onSchedule?: (windowId: string, anomalyId: string) => void;
}

export const PlanningCalendar: React.FC<PlanningCalendarProps> = ({ 
  maintenanceWindows,
  onSchedule 
}) => {
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'force': return 'bg-red-100 text-red-800 border-red-200';
      case 'minor': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'major': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'info';
      case 'in_progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'default';
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'force': return 'Arrêt Forcé';
      case 'minor': return 'Arrêt Mineur';
      case 'major': return 'Arrêt Majeur';
      default: return type;
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Planning des Arrêts de Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {maintenanceWindows.map((window) => (
              <div
                key={window.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedWindow === window.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${getTypeColor(window.type)}`}
                onClick={() => setSelectedWindow(window.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Badge variant={getStatusColor(window.status)}>
                        {window.status}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {getTypeLabel(window.type)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {window.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(window.startDate)} - {formatDate(window.endDate)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {window.durationDays} jour{window.durationDays > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                {selectedWindow === window.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          Anomalies assignées: {window.assignedAnomalies?.length || 0}
                        </p>
                        <p className="text-sm text-gray-600">
                          Capacité disponible: 80%
                        </p>
                      </div>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm">
                          Optimiser
                        </Button>
                        <Button variant="primary" size="sm">
                          Planifier
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Optimisation Intelligente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900">Suggestions IA</h4>
              <p className="text-sm text-blue-700 mt-1">
                12 anomalies peuvent être regroupées pour optimiser l'arrêt majeur
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900">Économies Potentielles</h4>
              <p className="text-sm text-green-700 mt-1">
                Réduction estimée: 15% du temps d'arrêt
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-medium text-orange-900">Alertes</h4>
              <p className="text-sm text-orange-700 mt-1">
                3 anomalies critiques nécessitent une attention immédiate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};