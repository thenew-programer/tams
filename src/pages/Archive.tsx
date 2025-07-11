import React, { useState, useEffect } from 'react';
import { Archive as ArchiveIcon, Search, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AnomalyTable } from '../components/anomalies/AnomalyTable';
import { supabase } from '../lib/supabase';
import { Anomaly } from '../types';
import toast from 'react-hot-toast';
import { anomalyService } from '../services/anomalyService';

export const Archive: React.FC = () => {
  const [archivedAnomalies, setArchivedAnomalies] = useState<Anomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchArchivedAnomalies();
  }, []);

  const fetchArchivedAnomalies = async () => {
    try {
      setIsLoading(true);
      // Use anomalyService instead of direct Supabase query
      const archivedAnomaliesData = await anomalyService.getAllAnomalies({
        archived: true, // Only get records with status 'cloture'
        per_page: 1000
      });

      // The data is already in the correct Anomaly format
      setArchivedAnomalies(archivedAnomaliesData);
    } catch (error) {
      console.error('Error fetching archived anomalies:', error);
      toast.error('Erreur lors du chargement des anomalies archivées');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (anomaly: Anomaly) => {
    if (window.confirm('Êtes-vous sûr de vouloir restaurer cette anomalie ?')) {
      try {
        // Update the status from 'closed/cloture' to 'treated/traite'
        const { error } = await supabase
          .from('anomalies')
          .update({
            status: 'traite',  // Set back to treated status
            updated_at: new Date().toISOString()
          })
          .eq('id', anomaly.id);

        if (error) throw error;

        // Update local state
        setArchivedAnomalies(prev => prev.filter(a => a.id !== anomaly.id));
        
        toast.success('Anomalie restaurée avec succès');
        
        // Refresh the list
        await fetchArchivedAnomalies();
      } catch (error) {
        console.error('Error restoring anomaly:', error);
        toast.error('Erreur lors de la restauration de l\'anomalie');
      }
    }
  };

  const handlePermanentDelete = async (anomaly: Anomaly) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cette anomalie ? Cette action est irréversible.')) {
      try {
        // Delete the anomaly permanently
        const { error } = await supabase
          .from('anomalies')
          .delete()
          .eq('id', anomaly.id);

        if (error) throw error;

        setArchivedAnomalies(prev => prev.filter(a => a.id !== anomaly.id));
        toast.success('Anomalie supprimée définitivement');
      } catch (error) {
        console.error('Error permanently deleting anomaly:', error);
        toast.error('Erreur lors de la suppression définitive');
      }
    }
  };

  const handleExportArchive = () => {
    // Export functionality for archived anomalies
    toast.success('Export des archives en cours de développement');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Archives des Anomalies</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Archives des Anomalies</h1>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
            {archivedAnomalies.length} anomalie{archivedAnomalies.length !== 1 ? 's' : ''} archivée{archivedAnomalies.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportArchive}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline" onClick={fetchArchivedAnomalies}>
            <Search className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {archivedAnomalies.length === 0 ? (
        <div className="text-center py-12">
          <ArchiveIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune anomalie archivée</h3>
          <p className="mt-1 text-sm text-gray-500">
            Les anomalies archivées apparaîtront ici.
          </p>
        </div>
      ) : (
        <AnomalyTable 
          anomalies={archivedAnomalies}
          onEdit={() => {}} // Disable editing for archived anomalies
          onDelete={handlePermanentDelete}
          onRestore={handleRestore}
          isArchive={true}
        />
      )}
    </div>
  );
};
