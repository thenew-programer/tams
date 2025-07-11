import React, { useState } from 'react';
import { Plus, Upload, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AnomalyTable } from '../components/anomalies/AnomalyTable';
import { AnomalyModal } from '../components/anomalies/AnomalyModal';
import { ImportModal } from '../components/import/ImportModal';
import { useData } from '../contexts/DataContext';
import { useAnomalyLogging } from '../hooks/useLogging';
import { Anomaly } from '../types';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

export const Anomalies: React.FC = () => {
  const { anomalies, addAnomaly, updateAnomaly, isLoading } = useData();
  const { 
    logAnomalyCreated, 
    logAnomalyUpdated, 
    logError 
  } = useAnomalyLogging();
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingAnomaly, setEditingAnomaly] = useState<Anomaly | undefined>();
  
  const handleEdit = (anomaly: Anomaly) => {
    setEditingAnomaly(anomaly);
    setShowModal(true);
  };

  const handleCreateNew = () => {
    setEditingAnomaly(undefined);
    setShowModal(true);
  };

  const handleSaveAnomaly = async (anomalyData: Omit<Anomaly, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingAnomaly) {
        // Update existing anomaly
        const oldData = { ...editingAnomaly };
        updateAnomaly(editingAnomaly.id, anomalyData);
        
        // Log the update
        await logAnomalyUpdated(editingAnomaly.id, oldData, anomalyData);
        
        toast.success('Anomalie mise à jour avec succès');
      } else {
        // Create new anomaly
        addAnomaly(anomalyData);
        
        // Log the creation (we'll need to get the new ID from the context)
        const newAnomalyId = `anomaly-${Date.now()}`;
        await logAnomalyCreated(newAnomalyId, anomalyData);
        
        toast.success('Nouvelle anomalie créée avec succès');
      }
      setShowModal(false);
    } catch (error) {
      await logError(error as Error, 'anomaly-save');
      toast.error('Erreur lors de la sauvegarde de l\'anomalie');
    }
  };

  const handleImport = (files: File[]) => {
    console.log('Import files:', files);
    setShowImportModal(false);
    toast.success(`Import réalisé: ${files.length} fichier(s) traité(s)`);
  };

  // Helper functions for export
  const calculateCriticalityLevel = (anomaly: Anomaly): 'low' | 'normal' | 'high' | 'critical' => {
    const fiabiliteIntegriteScore = anomaly.userFiabiliteIntegriteScore ?? anomaly.fiabiliteIntegriteScore ?? 0;
    const disponibiliteScore = anomaly.userDisponibiliteScore ?? anomaly.disponibiliteScore ?? 0;
    const processSafetyScore = anomaly.userProcessSafetyScore ?? anomaly.processSafetyScore ?? 0;
    
    const totalScore = fiabiliteIntegriteScore + disponibiliteScore + processSafetyScore;
    
    if (totalScore >= 9) return 'critical';
    if (totalScore >= 7) return 'high';
    if (totalScore >= 3) return 'normal';
    return 'low';
  };

  const getCriticalityLabel = (level: 'low' | 'normal' | 'high' | 'critical'): string => {
    switch (level) {
      case 'critical': return 'Critique';
      case 'high': return 'Élevée';
      case 'normal': return 'Normale';
      case 'low': return 'Faible';
      default: return 'Normale';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'new': return 'Nouveau';
      case 'in_progress': return 'En cours';
      case 'treated': return 'Traité';
      case 'closed': return 'Fermé';
      default: return 'Nouveau';
    }
  };

  const handleExport = () => {
    try {
      // Create CSV content
      const headers = [
        'ID',
        'Équipement',
        'Description',
        'Service',
        'Responsable',
        'Statut',
        'Criticité',
        'Fiabilité/Intégrité',
        'Disponibilité',
        'Sécurité',
        'Date Création',
        'Heures Estimées',
        'Priorité'
      ];
      
      const csvContent = [
        headers.join(','),
        ...anomalies.map(anomaly => [
          anomaly.id,
          anomaly.equipmentId || '',
          `"${(anomaly.description || '').replace(/"/g, '""')}"`,
          anomaly.service || '',
          `"${(anomaly.responsiblePerson || '').replace(/"/g, '""')}"`,
          getStatusLabel(anomaly.status || ''),
          getCriticalityLabel(calculateCriticalityLevel(anomaly)),
          (anomaly.fiabiliteIntegriteScore || 0).toFixed(1),
          (anomaly.disponibiliteScore || 0).toFixed(1),
          (anomaly.processSafetyScore || 0).toFixed(1),
          formatDate(anomaly.createdAt),
          anomaly.estimatedHours || 0,
          anomaly.priority || 1
        ].join(','))
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `anomalies_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Export réalisé avec succès');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Anomalies</h1>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importer
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Anomalie
          </Button>
        </div>
      </div>
      
      <AnomalyTable 
        anomalies={anomalies}
        onEdit={handleEdit}
        isLoading={isLoading}
      />
      
      <AnomalyModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveAnomaly}
        editAnomaly={editingAnomaly}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
    </div>
  );
};