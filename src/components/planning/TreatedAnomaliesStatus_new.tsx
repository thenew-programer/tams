import React from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AlertTriangle, CheckCircle, Clock, Zap, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Anomaly, MaintenanceWindow } from '../../types';

interface TreatedAnomaliesStatusProps {
  anomalies: Anomaly[];
  maintenanceWindows: MaintenanceWindow[];
  onAutoAssign: () => void;
  onCreateWindow: () => void;
}

export const TreatedAnomaliesStatus: React.FC<TreatedAnomaliesStatusProps> = ({
  anomalies,
  maintenanceWindows,
  onAutoAssign,
  onCreateWindow
}) => {
  // Find treated anomalies not yet assigned to maintenance windows
  const treatedUnassigned = anomalies.filter(a => 
    a.status === 'treated' && !a.maintenanceWindowId
  );

  // Find treated anomalies already assigned
  const treatedAssigned = anomalies.filter(a => 
    a.status === 'treated' && a.maintenanceWindowId
  );

  // Count open maintenance windows
  const openWindows = maintenanceWindows.filter(w => 
    w.status === 'planned' || w.status === 'in_progress'
  ).length;

  // Group unassigned by criticality
  const criticalUnassigned = treatedUnassigned.filter(a => a.criticalityLevel === 'critical');

  if (treatedUnassigned.length === 0 && treatedAssigned.length === 0) {
    return null; // No treated anomalies to show
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Anomalies Traitées</h3>
            <p className="text-gray-600">Suivi et planification des anomalies résolues</p>
          </div>
        </div>
        
        {treatedUnassigned.length > 0 && (
          <div className="flex items-center space-x-3">
            <Button 
              onClick={onAutoAssign}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Zap className="w-5 h-5 mr-2" />
              Auto-Assigner
            </Button>
            <Button 
              onClick={onCreateWindow}
              variant="outline"
              className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 hover:bg-gradient-to-r hover:from-green-100 hover:to-emerald-100 hover:border-green-300 px-6 py-3 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer Fenêtre
            </Button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Assigned Anomalies */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <Badge className="bg-green-100 text-green-800 font-semibold">
              Assignées
            </Badge>
          </div>
          <div className="text-2xl font-bold text-green-900 mb-1">{treatedAssigned.length}</div>
          <div className="text-sm text-green-700">Anomalies planifiées</div>
        </div>

        {/* Unassigned Anomalies */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <Badge className="bg-amber-100 text-amber-800 font-semibold">
              En attente
            </Badge>
          </div>
          <div className="text-2xl font-bold text-amber-900 mb-1">{treatedUnassigned.length}</div>
          <div className="text-sm text-amber-700">Non assignées</div>
        </div>

        {/* Critical Unassigned */}
        <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <Badge className="bg-red-100 text-red-800 font-semibold">
              Critique
            </Badge>
          </div>
          <div className="text-2xl font-bold text-red-900 mb-1">{criticalUnassigned.length}</div>
          <div className="text-sm text-red-700">Urgentes</div>
        </div>

        {/* Open Windows */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
            </div>
            <Badge className="bg-blue-100 text-blue-800 font-semibold">
              Disponibles
            </Badge>
          </div>
          <div className="text-2xl font-bold text-blue-900 mb-1">{openWindows}</div>
          <div className="text-sm text-blue-700">Fenêtres ouvertes</div>
        </div>
      </div>

      {/* Detailed Lists */}
      {treatedUnassigned.length > 0 && (
        <div className="space-y-6">
          {/* Critical Unassigned Details */}
          {criticalUnassigned.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <h4 className="text-lg font-bold text-red-900">Anomalies Critiques Non Assignées</h4>
                <Badge className="bg-red-100 text-red-800 font-semibold">
                  {criticalUnassigned.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {criticalUnassigned.slice(0, 4).map(anomaly => (
                  <div key={anomaly.id} className="bg-white border border-red-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">{anomaly.title}</span>
                      <Badge className="bg-red-100 text-red-800 text-xs">
                        {anomaly.criticalityLevel?.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600">
                      {anomaly.equipmentId} • {anomaly.service}
                    </div>
                  </div>
                ))}
                {criticalUnassigned.length > 4 && (
                  <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm flex items-center justify-center">
                    <span className="text-sm text-red-700 font-medium">
                      +{criticalUnassigned.length - 4} autres anomalies critiques
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Regular Unassigned Summary */}
          {treatedUnassigned.length > criticalUnassigned.length && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <h4 className="text-lg font-bold text-amber-900">Autres Anomalies en Attente</h4>
                  <Badge className="bg-amber-100 text-amber-800 font-semibold">
                    {treatedUnassigned.length - criticalUnassigned.length}
                  </Badge>
                </div>
                <div className="text-sm text-amber-700">
                  Prêtes pour planification automatique
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {treatedUnassigned.length === 0 && treatedAssigned.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h4 className="text-xl font-bold text-green-900 mb-2">Toutes les anomalies sont planifiées</h4>
          <p className="text-green-700">
            Les {treatedAssigned.length} anomalies traitées sont assignées à des fenêtres de maintenance.
          </p>
        </div>
      )}
    </div>
  );
};
