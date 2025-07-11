import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Save, Zap, User } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Card, CardContent } from '../ui/Card';
import { Anomaly } from '../../types';
import { calculateCriticalityLevel } from '../../lib/scoringUtils';

interface AnomalyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (anomaly: Omit<Anomaly, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editAnomaly?: Anomaly;
}

export const AnomalyModal: React.FC<AnomalyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editAnomaly
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    equipmentId: '',
    service: 'Production',
    responsiblePerson: '',
    status: 'new' as 'new' | 'in_progress' | 'treated' | 'closed',
    originSource: '',
    estimatedHours: 0,
    priority: 1,
    // New combined scoring system
    fiabiliteIntegriteScore: 2.5,
    disponibiliteScore: 2.5,
    processSafetyScore: 2.5,
    useUserScores: false
  });

  const [aiScores, setAiScores] = useState({
    fiabiliteIntegriteScore: 2.5,
    disponibiliteScore: 2.5,
    processSafetyScore: 2.5,
    criticalityLevel: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });

  useEffect(() => {
    if (editAnomaly) {
      setFormData({
        title: editAnomaly.title,
        description: editAnomaly.description,
        equipmentId: editAnomaly.equipmentId,
        service: editAnomaly.service,
        responsiblePerson: editAnomaly.responsiblePerson,
        status: editAnomaly.status,
        originSource: editAnomaly.originSource,
        estimatedHours: editAnomaly.estimatedHours || 0,
        priority: editAnomaly.priority || 1,
        fiabiliteIntegriteScore: editAnomaly.userFiabiliteIntegriteScore || editAnomaly.fiabiliteIntegriteScore,
        disponibiliteScore: editAnomaly.userDisponibiliteScore || editAnomaly.disponibiliteScore,
        processSafetyScore: editAnomaly.userProcessSafetyScore || editAnomaly.processSafetyScore,
        useUserScores: editAnomaly.useUserScores || false
      });

      setAiScores({
        fiabiliteIntegriteScore: editAnomaly.fiabiliteIntegriteScore,
        disponibiliteScore: editAnomaly.disponibiliteScore,
        processSafetyScore: editAnomaly.processSafetyScore,
        criticalityLevel: editAnomaly.criticalityLevel
      });
    } else {
      // Reset form for new anomaly
      setFormData({
        title: '',
        description: '',
        equipmentId: '',
        service: 'Production',
        responsiblePerson: '',
        status: 'new',
        originSource: '',
        estimatedHours: 0,
        priority: 1,
        fiabiliteIntegriteScore: 2.5,
        disponibiliteScore: 2.5,
        processSafetyScore: 2.5,
        useUserScores: false
      });

      // Simulate AI prediction for new anomaly
      setAiScores({
        fiabiliteIntegriteScore: Math.random() * 2 + 2.5, // 2.5-4.5 range
        disponibiliteScore: Math.random() * 2 + 2.5,
        processSafetyScore: Math.random() * 2 + 2.5,
        criticalityLevel: 'medium'
      });
    }
  }, [editAnomaly, isOpen]);

  const serviceOptions = [
    { value: 'Production', label: 'Production' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Intégrité', label: 'Intégrité' },
    { value: 'Instrumentation', label: 'Instrumentation' },
    { value: 'Utilités', label: 'Utilités' }
  ];

  const statusOptions = [
    { value: 'new', label: 'Nouveau' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'treated', label: 'Traité' },
    { value: 'closed', label: 'Fermé' }
  ];

  const originOptions = [
    { value: 'Inspection préventive', label: 'Inspection préventive' },
    { value: 'Rapport opérateur', label: 'Rapport opérateur' },
    { value: 'Système de monitoring', label: 'Système de monitoring' },
    { value: 'Inspection NDT', label: 'Inspection NDT' },
    { value: 'Maintenance préventive', label: 'Maintenance préventive' },
    { value: 'Autre', label: 'Autre' }
  ];

  const handleScoreChange = (field: string, value: number) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
  };

  const getCurrentCriticality = () => {
    const scores = formData.useUserScores ? formData : aiScores;
    return calculateCriticalityLevel(
      scores.fiabiliteIntegriteScore,
      scores.disponibiliteScore,
      scores.processSafetyScore
    );
  };

  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentCriticality = getCurrentCriticality();
    
    const anomalyData: Omit<Anomaly, 'id' | 'createdAt' | 'updatedAt'> = {
      title: formData.title,
      description: formData.description,
      equipmentId: formData.equipmentId,
      service: formData.service,
      responsiblePerson: formData.responsiblePerson,
      status: formData.status,
      originSource: formData.originSource,
      estimatedHours: formData.estimatedHours,
      priority: formData.priority,
      
      // AI Scores (always preserved)
      fiabiliteIntegriteScore: aiScores.fiabiliteIntegriteScore,
      disponibiliteScore: aiScores.disponibiliteScore,
      processSafetyScore: aiScores.processSafetyScore,
      criticalityLevel: aiScores.criticalityLevel,
      
      // User overrides
      userFiabiliteIntegriteScore: formData.useUserScores ? formData.fiabiliteIntegriteScore : undefined,
      userDisponibiliteScore: formData.useUserScores ? formData.disponibiliteScore : undefined,
      userProcessSafetyScore: formData.useUserScores ? formData.processSafetyScore : undefined,
      userCriticalityLevel: formData.useUserScores ? currentCriticality : undefined,
      useUserScores: formData.useUserScores,
      lastModifiedBy: 'Admin User',
      lastModifiedAt: new Date()
    };

    onSave(anomalyData);
  };

  if (!isOpen) return null;

  const currentScores = formData.useUserScores ? formData : aiScores;
  const currentCriticality = getCurrentCriticality();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {editAnomaly ? 'Modifier l\'Anomalie' : 'Nouvelle Anomalie'}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input
                label="Titre de l'anomalie"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              
              <Input
                label="Équipement ID"
                value={formData.equipmentId}
                onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                required
              />
              
              <Select
                label="Service"
                options={serviceOptions}
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              />
              
              <Input
                label="Personne responsable"
                value={formData.responsiblePerson}
                onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-4">
              <Select
                label="Statut"
                options={statusOptions}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              />
              
              <Select
                label="Source d'origine"
                options={originOptions}
                value={formData.originSource}
                onChange={(e) => setFormData({ ...formData, originSource: e.target.value })}
              />
              
              <Input
                label="Heures estimées"
                type="number"
                min="0"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) })}
              />
              
              <Input
                label="Priorité (1-5)"
                type="number"
                min="1"
                max="5"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              />
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
              placeholder="Décrivez l'anomalie en détail..."
              required
            />
          </div>

          {/* Criticality Scores */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Scores de Criticité</h3>
                <div className="flex items-center space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, useUserScores: !formData.useUserScores })}
                  >
                    {formData.useUserScores ? (
                      <>
                        <User className="w-4 h-4 mr-2" />
                        Mode Utilisateur
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Mode IA
                      </>
                    )}
                  </Button>
                  <Badge variant={getBadgeVariant(currentCriticality)}>
                    {currentCriticality}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 mb-2">Fiabilité + Intégrité</p>
                  {formData.useUserScores ? (
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.fiabiliteIntegriteScore}
                      onChange={(e) => handleScoreChange('fiabiliteIntegriteScore', parseFloat(e.target.value))}
                      className="w-full text-center text-xl font-bold text-blue-900 bg-transparent border-b-2 border-blue-300 focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-xl font-bold text-blue-900">{aiScores.fiabiliteIntegriteScore.toFixed(1)}</p>
                  )}
                  <div className="text-xs text-blue-600 mt-1">/5</div>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600 mb-2">Disponibilité</p>
                  {formData.useUserScores ? (
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.disponibiliteScore}
                      onChange={(e) => handleScoreChange('disponibiliteScore', parseFloat(e.target.value))}
                      className="w-full text-center text-xl font-bold text-orange-900 bg-transparent border-b-2 border-orange-300 focus:outline-none focus:border-orange-500"
                    />
                  ) : (
                    <p className="text-xl font-bold text-orange-900">{aiScores.disponibiliteScore.toFixed(1)}</p>
                  )}
                  <div className="text-xs text-orange-600 mt-1">/5</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 mb-2">Sécurité</p>
                  {formData.useUserScores ? (
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.processSafetyScore}
                      onChange={(e) => handleScoreChange('processSafetyScore', parseFloat(e.target.value))}
                      className="w-full text-center text-xl font-bold text-purple-900 bg-transparent border-b-2 border-purple-300 focus:outline-none focus:border-purple-500"
                    />
                  ) : (
                    <p className="text-xl font-bold text-purple-900">{aiScores.processSafetyScore.toFixed(1)}</p>
                  )}
                  <div className="text-xs text-purple-600 mt-1">/5</div>
                </div>
              </div>

              <div className="mt-4 text-center">
                <div className="text-sm text-gray-500">
                  {((currentScores.fiabiliteIntegriteScore + currentScores.disponibiliteScore + currentScores.processSafetyScore)).toFixed(1)}/15
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};