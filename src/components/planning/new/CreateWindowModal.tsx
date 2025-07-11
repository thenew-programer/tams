import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Settings, X, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Anomaly } from '../../../types';
import { formatDate } from '../../../lib/utils';

interface CreateWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWindow: (windowData: WindowCreationData) => Promise<void>;
  triggeringAnomaly?: Anomaly;
  availableAnomalies: Anomaly[];
}

export interface WindowCreationData {
  type: 'force' | 'minor' | 'major' | 'arret';
  durationDays: number;
  startDate: Date;
  endDate: Date;
  description?: string;
  autoAssignAnomalies: string[];
  scheduledTimes: Array<{
    anomalyId: string;
    scheduledDate: Date;
    estimatedHours: number;
  }>;
}

const WINDOW_TYPES = {
  force: {
    label: 'Arrêt Forcé',
    defaultDuration: 3,
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Intervention urgente et critique',
    icon: '🚨',
    maxDuration: 7,
    minDuration: 1
  },
  arret: {
    label: 'Arrêt',
    defaultDuration: 7,
    color: 'bg-orange-100 text-orange-800 border-orange-200', 
    description: 'Arrêt planifié standard',
    icon: '⏸️',
    maxDuration: 14,
    minDuration: 3
  },
  minor: {
    label: 'Mineur',
    defaultDuration: 21,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Maintenance mineure programmée',
    icon: '🔧',
    maxDuration: 30,
    minDuration: 14
  },
  major: {
    label: 'Majeur', 
    defaultDuration: 42,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Maintenance majeure planifiée',
    icon: '🏗️',
    maxDuration: 60,
    minDuration: 21
  }
} as const;

export const CreateWindowModal: React.FC<CreateWindowModalProps> = ({
  isOpen,
  onClose,
  onCreateWindow,
  triggeringAnomaly,
  availableAnomalies
}) => {
  const [selectedType, setSelectedType] = useState<keyof typeof WINDOW_TYPES>('minor');
  const [durationDays, setDurationDays] = useState<number>(WINDOW_TYPES.minor.defaultDuration);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [selectedAnomalies, setSelectedAnomalies] = useState<string[]>([]);
  const [anomalySchedules, setAnomalySchedules] = useState<Map<string, { date: Date; hours: number }>>(new Map());
  const [isCreating, setIsCreating] = useState(false);

  // Initialize dates when type changes
  useEffect(() => {
    const typeConfig = WINDOW_TYPES[selectedType];
    setDurationDays(typeConfig.defaultDuration);
    
    // Calculate start date based on type urgency
    const now = new Date();
    let calculatedStartDate = new Date(now);
    
    switch (selectedType) {
      case 'force':
        // Force starts immediately or next day
        calculatedStartDate.setDate(now.getDate() + 1);
        break;
      case 'arret':
        // Arret can start in a few days
        calculatedStartDate.setDate(now.getDate() + 3);
        break;
      case 'minor':
        // Minor maintenance scheduled for next week
        calculatedStartDate.setDate(now.getDate() + 7);
        break;
      case 'major':
        // Major maintenance planned further out
        calculatedStartDate.setDate(now.getDate() + 14);
        break;
    }
    
    setStartDate(calculatedStartDate);
    
    const calculatedEndDate = new Date(calculatedStartDate);
    calculatedEndDate.setDate(calculatedStartDate.getDate() + typeConfig.defaultDuration);
    setEndDate(calculatedEndDate);
    
    setDescription(`${typeConfig.label} - ${typeConfig.description}`);
  }, [selectedType]);

  // Update end date when duration or start date changes
  useEffect(() => {
    const newEndDate = new Date(startDate);
    newEndDate.setDate(startDate.getDate() + durationDays);
    setEndDate(newEndDate);
  }, [startDate, durationDays]);

  // Initialize with triggering anomaly
  useEffect(() => {
    if (triggeringAnomaly && !selectedAnomalies.includes(triggeringAnomaly.id)) {
      setSelectedAnomalies([triggeringAnomaly.id]);
      setAnomalySchedules(new Map([[triggeringAnomaly.id, { 
        date: new Date(startDate), 
        hours: getEstimatedHours(triggeringAnomaly.criticalityLevel) 
      }]]));
    }
  }, [triggeringAnomaly, startDate]);

  const getEstimatedHours = (criticality: string): number => {
    switch (criticality) {
      case 'critical': return 8;
      case 'high': return 6;
      case 'medium': return 4;
      case 'low': return 2;
      default: return 4;
    }
  };

  const handleAnomalyToggle = (anomalyId: string) => {
    const newSelected = selectedAnomalies.includes(anomalyId)
      ? selectedAnomalies.filter(id => id !== anomalyId)
      : [...selectedAnomalies, anomalyId];
    
    setSelectedAnomalies(newSelected);
    
    // Add/remove from schedules
    const newSchedules = new Map(anomalySchedules);
    if (newSelected.includes(anomalyId) && !newSchedules.has(anomalyId)) {
      const anomaly = availableAnomalies.find(a => a.id === anomalyId);
      newSchedules.set(anomalyId, {
        date: new Date(startDate),
        hours: anomaly ? getEstimatedHours(anomaly.criticalityLevel) : 4
      });
    } else if (!newSelected.includes(anomalyId)) {
      newSchedules.delete(anomalyId);
    }
    setAnomalySchedules(newSchedules);
  };

  const updateAnomalySchedule = (anomalyId: string, field: 'date' | 'hours', value: Date | number) => {
    const newSchedules = new Map(anomalySchedules);
    const current = newSchedules.get(anomalyId) || { date: new Date(startDate), hours: 4 };
    newSchedules.set(anomalyId, {
      ...current,
      [field]: value
    });
    setAnomalySchedules(newSchedules);
  };

  const handleCreate = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const scheduledTimes = Array.from(anomalySchedules.entries()).map(([anomalyId, schedule]) => ({
        anomalyId,
        scheduledDate: schedule.date,
        estimatedHours: schedule.hours
      }));

      const windowData: WindowCreationData = {
        type: selectedType === 'arret' ? 'minor' : selectedType, // Map 'arret' to minor for backend compatibility
        durationDays,
        startDate,
        endDate,
        description,
        autoAssignAnomalies: selectedAnomalies,
        scheduledTimes
      };

      await onCreateWindow(windowData);
      onClose();
    } catch (error) {
      console.error('Error creating window:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const typeConfig = WINDOW_TYPES[selectedType];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Créer Fenêtre de Maintenance</h2>
            <p className="text-sm text-gray-500 mt-1">Configurez votre nouvelle fenêtre de maintenance</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Window Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Type de Fenêtre
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(WINDOW_TYPES).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type as keyof typeof WINDOW_TYPES)}
                    className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                      selectedType === type 
                        ? `${config.color} border-current shadow-md` 
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">{config.icon}</div>
                      <div className="font-medium text-sm">{config.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{config.defaultDuration} jours</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Duration Adjustment */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée personnalisée ({typeConfig.minDuration}-{typeConfig.maxDuration} jours)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={typeConfig.minDuration}
                    max={typeConfig.maxDuration}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <input
                      type="number"
                      min={typeConfig.minDuration}
                      max={typeConfig.maxDuration}
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <span className="text-sm text-gray-500">jours</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Planification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                  <input
                    type="datetime-local"
                    value={startDate.toISOString().slice(0, 16)}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
                  <input
                    type="datetime-local"
                    value={endDate.toISOString().slice(0, 16)}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description de la fenêtre de maintenance..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Anomaly Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Assignation des Anomalies ({selectedAnomalies.length} sélectionnées)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {availableAnomalies.slice(0, 10).map((anomaly) => {
                  const isSelected = selectedAnomalies.includes(anomaly.id);
                  const schedule = anomalySchedules.get(anomaly.id);
                  
                  return (
                    <div key={anomaly.id} className={`p-3 border rounded-lg ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleAnomalyToggle(anomaly.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {anomaly.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {anomaly.equipmentId} • {anomaly.service}
                            </div>
                            <Badge variant="info" className="text-xs mt-1">
                              {anomaly.criticalityLevel}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Scheduling Details */}
                      {isSelected && schedule && (
                        <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Date prévue
                            </label>
                            <input
                              type="date"
                              value={schedule.date.toISOString().split('T')[0]}
                              onChange={(e) => updateAnomalySchedule(anomaly.id, 'date', new Date(e.target.value))}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Heures estimées
                            </label>
                            <input
                              type="number"
                              min="0.5"
                              max="24"
                              step="0.5"
                              value={schedule.hours}
                              onChange={(e) => updateAnomalySchedule(anomaly.id, 'hours', Number(e.target.value))}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {availableAnomalies.length > 10 && (
                <div className="text-center text-sm text-gray-500 mt-3">
                  Showing 10 of {availableAnomalies.length} available anomalies
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            <div className="font-medium">{typeConfig.label}</div>
            <div>{formatDate(startDate)} → {formatDate(endDate)} ({durationDays} jours)</div>
            <div>{selectedAnomalies.length} anomalie(s) assignée(s)</div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Annuler
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={isCreating || durationDays < 1}
              className="flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Créer Fenêtre
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
