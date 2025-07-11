import React, { useState } from 'react';
import { X, Calendar, Clock, AlertTriangle, Users, Wrench } from 'lucide-react';
import { generateId } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card, CardContent } from '../ui/Card';
import { MaintenanceWindow } from '../../types';

interface MaintenanceWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (window: MaintenanceWindow) => void;
  editWindow?: MaintenanceWindow;
  anomalies?: Anomaly[];
  onAutoAssign?: boolean;
}

export const MaintenanceWindowModal: React.FC<MaintenanceWindowModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editWindow,
  anomalies = []
}) => {
  const [formData, setFormData] = useState({
    type: editWindow?.type || 'minor' as 'force' | 'minor' | 'major',
    durationDays: editWindow?.durationDays || 1,
    startDate: editWindow?.startDate ? new Date(editWindow.startDate).toISOString().slice(0, 16) : '',
    description: editWindow?.description || '',
    status: editWindow?.status || 'planned' as 'planned' | 'in_progress' | 'completed' | 'cancelled'
  });

  const [showAutoAssignPreview, setShowAutoAssignPreview] = useState(false);
  const [compatibleAnomalies, setCompatibleAnomalies] = useState<Anomaly[]>([]);

  // Update duration based on type selection
  const handleTypeChange = (newType: 'force' | 'minor' | 'major') => {
    let defaultDuration = 1;
    switch (newType) {
      case 'force':
        defaultDuration = 1;
        break;
      case 'minor':
        defaultDuration = 3;
        break;
      case 'major':
        defaultDuration = 14;
        break;
    }
    
    setFormData({ 
      ...formData, 
      type: newType,
      durationDays: editWindow ? formData.durationDays : defaultDuration
    });
  };

  // Calculate compatible anomalies when form data changes
  React.useEffect(() => {
    if (anomalies && anomalies.length > 0) {
      const compatible = anomalies.filter(anomaly => {
        // Must not already be assigned
        if (anomaly.maintenanceWindowId) return false;
        
        // Must have action plan that needs outage
        if (!anomaly.actionPlan?.needsOutage) return false;
        
        // Must match outage type
        if (anomaly.actionPlan.outageType !== formData.type) return false;
        
        // Must fit within window duration
        const requiredDuration = anomaly.actionPlan.outageDuration || 1;
        return requiredDuration <= formData.durationDays;
      });

      // Sort by criticality and priority
      const sorted = compatible.sort((a, b) => {
        const criticalityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aCriticality = criticalityOrder[a.criticalityLevel as keyof typeof criticalityOrder] || 0;
        const bCriticality = criticalityOrder[b.criticalityLevel as keyof typeof criticalityOrder] || 0;
        
        if (aCriticality !== bCriticality) {
          return bCriticality - aCriticality;
        }
        
        return (a.priority || 5) - (b.priority || 5);
      });

      setCompatibleAnomalies(sorted);
    }
  }, [formData.type, formData.durationDays, anomalies]);
  const typeOptions = [
    { value: 'force', label: 'Arrêt Forcé (Urgence)' },
    { value: 'minor', label: 'Arrêt Mineur (3-7 jours)' },
    { value: 'major', label: 'Arrêt Majeur (14-42 jours)' }
  ];

  const statusOptions = [
    { value: 'planned', label: 'Planifié' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Terminé' },
    { value: 'cancelled', label: 'Annulé' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const startDate = new Date(formData.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + formData.durationDays);

    const windowId = editWindow?.id || generateId();
    const newWindow: MaintenanceWindow = {
      id: windowId,
      type: formData.type,
      durationDays: formData.durationDays,
      startDate,
      endDate,
      description: formData.description,
      status: formData.status,
      assignedAnomalies: editWindow?.assignedAnomalies || []
    };

    onSave(newWindow);
    onClose();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'force': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'major': return <Wrench className="w-5 h-5 text-blue-500" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'force': return 'border-red-200 bg-red-50';
      case 'major': return 'border-blue-200 bg-blue-50';
      default: return 'border-yellow-200 bg-yellow-50';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {editWindow ? 'Modifier l\'Arrêt' : 'Nouvel Arrêt de Maintenance'}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Type d'Arrêt</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {typeOptions.map((option) => (
                <div
                  key={option.value}
                  className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                    formData.type === option.value
                      ? getTypeColor(option.value) + ' border-opacity-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTypeChange(option.value as any)}
                >
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(option.value)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-500">
                        {option.value === 'force' && 'Intervention immédiate'}
                        {option.value === 'minor' && 'Maintenance préventive'}
                        {option.value === 'major' && 'Révision complète'}
                      </p>
                    </div>
                  </div>
                  {formData.type === option.value && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Date and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de Début</label>
              <Input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durée (jours)</label>
              <Input
                type="number"
                min="1"
                max={formData.type === 'force' ? '3' : formData.type === 'minor' ? '7' : '42'}
                value={formData.durationDays}
                onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) })}
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.type === 'force' && 'Maximum 3 jours pour un arrêt forcé'}
                {formData.type === 'minor' && 'Recommandé: 3-7 jours pour un arrêt mineur'}
                {formData.type === 'major' && 'Recommandé: 14-42 jours pour un arrêt majeur'}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Décrivez les travaux prévus..."
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <Select
              options={statusOptions}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            />
          </div>

          {/* 42-Slot Planning Preview */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">Aperçu Planning (Système 42 Créneaux)</h4>
              <div className="grid grid-cols-7 gap-1 text-xs">
                {Array.from({ length: 42 }, (_, i) => {
                  const date = new Date(formData.startDate || Date.now());
                  date.setDate(date.getDate() + i);
                  const isInWindow = i < formData.durationDays;
                  
                  return (
                    <div
                      key={i}
                      className={`p-2 rounded text-center ${
                        isInWindow
                          ? formData.type === 'force'
                            ? 'bg-red-100 text-red-800'
                            : formData.type === 'major'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Créneaux utilisés: {formData.durationDays}/42 ({Math.round((formData.durationDays / 42) * 100)}%)
              </div>
            </CardContent>
          </Card>

          {/* Auto-Assignment Preview */}
          {compatibleAnomalies.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Assignation Automatique</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAutoAssignPreview(!showAutoAssignPreview)}
                  >
                    {showAutoAssignPreview ? 'Masquer' : 'Aperçu'} ({compatibleAnomalies.length})
                  </Button>
                </div>
                
                <div className="text-sm text-blue-700 mb-3">
                  {compatibleAnomalies.length} anomalie(s) compatible(s) seront automatiquement assignées à cet arrêt.
                </div>

                {showAutoAssignPreview && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {compatibleAnomalies.slice(0, 10).map((anomaly, index) => (
                      <div key={anomaly.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getCriticalityColor(anomaly.criticalityLevel)}`} />
                          <span className="text-sm font-medium">{anomaly.equipmentId}</span>
                          <span className="text-xs text-gray-600 truncate">{anomaly.title}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={anomaly.criticalityLevel === 'critical' ? 'danger' : 'warning'} className="text-xs">
                            {anomaly.criticalityLevel}
                          </Badge>
                          {anomaly.actionPlan && (
                            <span className="text-xs text-blue-600">
                              {anomaly.actionPlan.outageDuration}j
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {compatibleAnomalies.length > 10 && (
                      <div className="text-xs text-gray-500 text-center py-2">
                        +{compatibleAnomalies.length - 10} autres anomalies...
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {editWindow ? 'Mettre à jour' : 'Créer l\'Arrêt'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};