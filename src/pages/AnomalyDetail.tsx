import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Wrench,
  Clock, 
  AlertTriangle,
  Edit,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { ActionPlanModal } from '../components/anomalies/ActionPlanModal';
import { ActionPlanDetails } from '../components/anomalies/ActionPlanDetails';
import { REXFileUpload } from '../components/anomalies/REXFileUpload';
import { PredictionApproval } from '../components/anomalies/PredictionApproval';
import { useData } from '../contexts/DataContext';
import { formatDateTime } from '../lib/utils';
import { ActionPlan } from '../types';
import { planningIntegration } from '../lib/planningUtils';
import toast from 'react-hot-toast';

export const AnomalyDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAnomalyById, addActionPlan, updateActionPlan, updateAnomaly, actionPlans, getActionPlanByAnomalyId } = useData();
  
  // Find the anomaly (in a real app, this would be fetched from an API)
  const anomaly = id ? getAnomalyById(id) : undefined;
  
  const [showActionPlan, setShowActionPlan] = useState(false);
  const [actionPlan, setActionPlan] = useState<ActionPlan | undefined>(undefined);
  const [rexFileRefresh, setRexFileRefresh] = useState(0);
  const [hasRexFile, setHasRexFile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnomaly, setEditedAnomaly] = useState(anomaly);

  // Load action plan when component mounts
  useEffect(() => {
    const loadActionPlan = async () => {
      if (anomaly?.id) {
        try {
          const plan = await getActionPlanByAnomalyId(anomaly.id);
          if (plan) {
            setActionPlan(plan);
          }
        } catch (error) {
          console.error('Error loading action plan:', error);
        }
      }
    };

    loadActionPlan();
    setEditedAnomaly(anomaly);
  }, [anomaly?.id, getActionPlanByAnomalyId, anomaly]);

  const statusOptions = [
    { value: 'new', label: 'Nouveau' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'treated', label: 'Traité' },
    { value: 'closed', label: 'Fermé' }
  ];

  const criticalityLevels = [
    { value: 'low', label: 'Faible', color: 'bg-green-500' },
    { value: 'normal', label: 'Normale', color: 'bg-yellow-500' },
    { value: 'high', label: 'Élevée', color: 'bg-orange-500' },
    { value: 'critical', label: 'Critique', color: 'bg-red-500' }
  ];

  const calculateCriticalityLevel = (anomaly: any): 'low' | 'normal' | 'high' | 'critical' => {
    const fiabiliteIntegriteScore = anomaly.userFiabiliteIntegriteScore ?? anomaly.fiabiliteIntegriteScore ?? 0;
    const disponibiliteScore = anomaly.userDisponibiliteScore ?? anomaly.disponibiliteScore ?? 0;
    const processSafetyScore = anomaly.userProcessSafetyScore ?? anomaly.processSafetyScore ?? 0;
    
    const totalScore = fiabiliteIntegriteScore + disponibiliteScore + processSafetyScore;
    
    if (totalScore >= 9) return 'critical';
    if (totalScore >= 7) return 'high';
    if (totalScore >= 3) return 'normal';
    return 'low';
  };
  
  if (!anomaly) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Anomalie non trouvée</h2>
          <p className="text-gray-600 mb-6">L'anomalie demandée n'existe pas ou a été supprimée.</p>
          <Button onClick={() => navigate('/anomalies')} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Button>
        </div>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'new': return 'info';
      case 'in_progress': return 'warning';
      case 'treated': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const handleSaveEdit = async () => {
    if (!editedAnomaly) return;
    
    try {
      await updateAnomaly(anomaly.id, {
        description: editedAnomaly.description,
        service: editedAnomaly.service,
        equipmentId: editedAnomaly.equipmentId,
        status: editedAnomaly.status
      });
      setIsEditing(false);
      toast.success('Anomalie mise à jour avec succès');
    } catch (error) {
      console.error('Error updating anomaly:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSaveActionPlan = async (actionPlan: ActionPlan) => {
    try {
      console.log('Saving action plan:', actionPlan);
      
      if (actionPlan.id && actionPlans.find(p => p.id === actionPlan.id)) {
        // Update existing action plan
        await updateActionPlan(actionPlan.id, {
          needsOutage: actionPlan.needsOutage,
          outageType: actionPlan.outageType,
          outageDuration: actionPlan.outageDuration,
          plannedDate: actionPlan.plannedDate,
          estimatedCost: actionPlan.estimatedCost,
          priority: actionPlan.priority,
          comments: actionPlan.comments,
          status: actionPlan.status
        });
      } else {
        // Create new action plan
        await addActionPlan({
          anomalyId: anomaly.id,
          needsOutage: actionPlan.needsOutage,
          outageType: actionPlan.outageType,
          outageDuration: actionPlan.outageDuration,
          plannedDate: actionPlan.plannedDate,
          estimatedCost: actionPlan.estimatedCost || 0,
          priority: actionPlan.priority,
          comments: actionPlan.comments || '',
          actions: actionPlan.actions.map(action => ({
            action: action.action,
            responsable: action.responsable,
            pdrsDisponible: action.pdrsDisponible,
            ressourcesInternes: action.ressourcesInternes,
            ressourcesExternes: action.ressourcesExternes,
            dureeHeures: action.dureeHeures,
            dureeJours: action.dureeJours,
            dateDebut: action.dateDebut,
            dateFin: action.dateFin
          }))
        });
      }
      
      setActionPlan(actionPlan);
      toast.success('Plan d\'action sauvegardé avec succès');
    } catch (error) {
      console.error('Error saving action plan:', error);
      toast.error('Erreur lors de la sauvegarde du plan d\'action');
    }
  };

  const handleUpdatePlanning = (actionPlan: ActionPlan) => {
    // In a real app, this would update the planning via API
    console.log('Updating planning with action plan:', actionPlan);
    
    if (actionPlan.outageType === 'force') {
      // Create urgent outage
      const urgentWindow = planningIntegration.createUrgentOutage(actionPlan);
      console.log('Created urgent maintenance window:', urgentWindow);
    }
  };
  
  const handleAnomalyStatusUpdate = async (anomalyId: string, status: 'new' | 'in_progress' | 'treated' | 'closed') => {
    if (!anomaly) return;
    
    try {
      // Update the anomaly status
      await updateAnomaly(anomalyId, { status });
      toast.success(`Statut de l'anomalie mis à jour: ${status}`);
    } catch (error) {
      console.error('Error updating anomaly status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  // Handle anomaly updates from PredictionApproval component
  const handleAnomalyUpdate = () => {
    // Simple reload for now - in a real app, this would update the context
    window.location.reload();
  };

  const handleCloseAnomaly = async () => {
    if (!anomaly) return;
    
    if (!window.confirm('Êtes-vous sûr de vouloir clôturer cette anomalie? Cette action est irréversible.')) {
      return;
    }
    
    try {
      await updateAnomaly(anomaly.id, { status: 'closed' });
      toast.success('Anomalie clôturée avec succès');
      // Redirect back to anomalies list after closing
      setTimeout(() => navigate('/anomalies'), 1500);
    } catch (error) {
      console.error('Error closing anomaly:', error);
      toast.error('Erreur lors de la clôture de l\'anomalie');
    }
  };

  const currentCriticality = calculateCriticalityLevel(anomaly);
  const criticalityInfo = criticalityLevels.find(level => level.value === currentCriticality);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/anomalies')} className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Retour aux anomalies
              </Button>
            </div>
            
            <div className="flex items-center space-x-3">
              {!isEditing ? (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    setEditedAnomaly(anomaly);
                  }}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                  <Button onClick={handleSaveEdit}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                </div>
              )}
              
              <Button 
                onClick={() => setShowActionPlan(true)}
                className={actionPlan ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                <Wrench className="h-4 w-4 mr-2" />
                {actionPlan ? 'Modifier Plan' : 'Créer Plan d\'Action'}
              </Button>
            </div>
          </div>
          
          {/* Title and Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${criticalityInfo?.color}`} />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Anomalie #{anomaly.id.substring(0, 8)}
                </h1>
                <p className="text-gray-600 mt-1">
                  Créée le {formatDateTime(anomaly.createdAt)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant={getStatusVariant(anomaly.status)} className="text-sm py-1 px-3">
                {statusOptions.find(s => s.value === anomaly.status)?.label}
              </Badge>
              <Badge variant={currentCriticality === 'critical' ? 'danger' : currentCriticality === 'high' ? 'warning' : 'default'} className="text-sm py-1 px-3">
                Criticité {criticalityInfo?.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Plan Modal */}
        <ActionPlanModal
          isOpen={showActionPlan}
          onClose={() => setShowActionPlan(false)}
          onSave={handleSaveActionPlan}
          onUpdatePlanning={handleUpdatePlanning}
          anomaly={anomaly}
          existingActionPlan={actionPlan}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Information Card */}
            <Card className="shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-xl text-gray-900">Informations Générales</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    {isEditing ? (
                      <textarea
                        value={editedAnomaly?.description || ''}
                        onChange={(e) => setEditedAnomaly(prev => prev ? {...prev, description: e.target.value} : prev)}
                        rows={4}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    ) : (
                      <p className="text-gray-900 bg-gray-50 p-4 rounded-lg border">
                        {anomaly.description || 'Aucune description fournie'}
                      </p>
                    )}
                  </div>

                  {/* Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedAnomaly?.service || ''}
                          onChange={(e) => setEditedAnomaly(prev => prev ? {...prev, service: e.target.value} : prev)}
                        />
                      ) : (
                        <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border">
                          {anomaly.service || 'Non spécifié'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Équipement ID
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedAnomaly?.equipmentId || ''}
                          onChange={(e) => setEditedAnomaly(prev => prev ? {...prev, equipmentId: e.target.value} : prev)}
                        />
                      ) : (
                        <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border">
                          {anomaly.equipmentId || 'Non spécifié'}
                        </p>
                      )}
                    </div>

                    {/* Show equipment ID and service info */}
                    {(isEditing) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Statut
                        </label>
                        <select
                          value={editedAnomaly?.status || 'new'}
                          onChange={(e) => setEditedAnomaly(prev => prev ? {...prev, status: e.target.value as any} : prev)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          {statusOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Plan Summary */}
            {actionPlan && (
              <ActionPlanDetails 
                actionPlan={actionPlan} 
                anomaly={anomaly} 
                onActionPlanUpdate={setActionPlan} 
                onAnomalyStatusUpdate={handleAnomalyStatusUpdate} 
              />
            )}
            
            {/* REX File Upload - Only visible when anomaly is treated */}
            <div className="mb-6">
              <REXFileUpload 
                key={`rex-${anomaly.id}-${rexFileRefresh}`}
                anomalyId={anomaly.id}
                isEnabled={anomaly.status === 'treated'} 
                onFileUploaded={() => setRexFileRefresh(prev => prev + 1)}
                onFileStatusChange={setHasRexFile}
              />
            </div>

            {/* Close Anomaly Button - Only visible when anomaly is treated and has REX file */}
            {anomaly.status === 'treated' && hasRexFile && (
              <Card className="border-green-200 bg-green-50 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-green-800 mb-2">
                        Prêt pour la clôture
                      </h3>
                      <p className="text-sm text-green-700">
                        L'anomalie est traitée et le fichier REX a été ajouté. Vous pouvez maintenant clôturer cette anomalie.
                      </p>
                    </div>
                    <Button
                      onClick={handleCloseAnomaly}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Clôturer l'anomalie
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Predictions */}
            <PredictionApproval 
              anomaly={anomaly}
              onUpdate={handleAnomalyUpdate}
            />
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Status & Metrics */}
            <Card className="shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-lg text-gray-900">Métriques</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priorité
                    </label>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <span className="text-gray-900">Priorité {anomaly.priority || 1}</span>
                      <Badge variant="default">P{anomaly.priority || 1}</Badge>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Heures estimées
                    </label>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <span className="text-gray-900">{anomaly.estimatedHours || 0} heures</span>
                      <Clock className="h-4 w-4 text-gray-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Responsable
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <span className="text-gray-900">{anomaly.responsiblePerson || 'Non assigné'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="flex items-center space-x-2 text-lg text-gray-900">
                  <Clock className="h-5 w-5" />
                  <span>Chronologie</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Anomalie créée</p>
                      <p className="text-xs text-gray-500">{formatDateTime(anomaly.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Analyse IA effectuée</p>
                      <p className="text-xs text-gray-500">{formatDateTime(anomaly.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Dernière mise à jour</p>
                      <p className="text-xs text-gray-500">{formatDateTime(anomaly.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};