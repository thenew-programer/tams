import React from 'react';
import { CheckCircle, Clock, AlertTriangle, Calendar, User, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ActionPlan, Anomaly } from '../../types';
import { formatDateTime } from '../../lib/utils';
import { supabaseActionPlanService } from '../../services/supabaseActionPlanService';
import toast from 'react-hot-toast';

interface ActionPlanDetailsProps {
  actionPlan: ActionPlan;
  anomaly: Anomaly;
  onActionPlanUpdate: (updatedPlan: ActionPlan) => void;
  onAnomalyStatusUpdate?: (anomalyId: string, status: 'new' | 'in_progress' | 'treated' | 'closed') => void;
}

export const ActionPlanDetails: React.FC<ActionPlanDetailsProps> = ({ 
  actionPlan, 
  anomaly,
  onActionPlanUpdate,
  onAnomalyStatusUpdate 
}) => {
  const handleStatusChange = async (actionId: string, newStatus: string) => {
    try {
      // Update the action item status
      const updatedPlan = await supabaseActionPlanService.updateActionItem(actionId, {
        statut: newStatus,
        progression: newStatus === 'termine' ? 100 : newStatus === 'en_cours' ? 50 : 0
      });
      
      if (updatedPlan) {
        onActionPlanUpdate(updatedPlan);
        
        // Check if all actions are complete
        const allActionsComplete = updatedPlan.actions.every(action => action.statut === 'termine');
        
        // If all actions are complete, update anomaly status to "treated"
        if (allActionsComplete && onAnomalyStatusUpdate) {
          onAnomalyStatusUpdate(anomaly.id, 'treated');
          toast.success('Toutes les actions sont terminées. Le statut de l\'anomalie a été mis à jour.');
        }
      }
    } catch (error) {
      console.error('Error updating action status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planifie': return 'bg-blue-100 text-blue-800';
      case 'en_cours': return 'bg-yellow-100 text-yellow-800';
      case 'termine': return 'bg-green-100 text-green-800';
      case 'reporte': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planifie': return <Calendar className="w-4 h-4" />;
      case 'en_cours': return <Clock className="w-4 h-4" />;
      case 'termine': return <CheckCircle className="w-4 h-4" />;
      case 'reporte': return <AlertTriangle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Plan d'Action</span>
          <Badge 
            variant={
              actionPlan.status === 'completed' ? 'success' : 
              actionPlan.status === 'in_progress' ? 'warning' : 
              'default'
            }
            className="ml-2"
          >
            {actionPlan.status === 'completed' ? 'Terminé' : 
             actionPlan.status === 'in_progress' ? 'En Cours' : 
             actionPlan.status === 'approved' ? 'Approuvé' : 'Brouillon'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-600">Priorité</div>
            <div className="text-xl font-bold text-blue-900">{actionPlan.priority}/5</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-green-600">Coût Estimé</div>
            <div className="text-xl font-bold text-green-900">{actionPlan.estimatedCost} €</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-sm text-purple-600">Durée Totale</div>
            <div className="text-xl font-bold text-purple-900">
              {actionPlan.totalDurationDays}j {actionPlan.totalDurationHours}h
            </div>
          </div>
        </div>
        
        {actionPlan.needsOutage && (
          <div className="p-3 mb-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">
                Arrêt {actionPlan.outageType} requis - {actionPlan.outageDuration} jour(s)
              </span>
            </div>
            {actionPlan.plannedDate && (
              <div className="text-xs text-orange-700 mt-1">
                Planifié pour: {formatDateTime(actionPlan.plannedDate)}
              </div>
            )}
          </div>
        )}
        
        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">Progression globale</div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${actionPlan.completionPercentage}%` }}
            ></div>
          </div>
          <div className="text-right text-sm text-gray-500 mt-1">
            {actionPlan.completionPercentage}% terminé
          </div>
        </div>

        {actionPlan.comments && (
          <div className="p-3 mb-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-1">Commentaires</div>
            <div className="text-sm text-gray-600">{actionPlan.comments}</div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Actions</h3>
          <div className="space-y-4">
            {actionPlan.actions.map((action, index) => (
              <div key={action.id} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 flex justify-between items-center">
                  <h4 className="font-medium">
                    <span className="text-gray-500 mr-2">{index + 1}.</span> 
                    {action.action}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className={`flex items-center px-2 py-1 rounded text-xs ${getStatusColor(action.statut)}`}>
                      {getStatusIcon(action.statut)}
                      <span className="ml-1">
                        {action.statut === 'planifie' ? 'Planifié' : 
                         action.statut === 'en_cours' ? 'En cours' : 
                         action.statut === 'termine' ? 'Terminé' : 
                         action.statut === 'reporte' ? 'Reporté' : 
                         action.statut}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Responsable:</span> 
                      <span className="ml-1 flex items-center">
                        <User className="w-3.5 h-3.5 mr-1" />
                        {action.responsable}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">PDRS:</span> 
                      <span className={`ml-1 ${action.pdrsDisponible === 'OUI' ? 'text-green-600' : 'text-red-600'}`}>
                        {action.pdrsDisponible}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Durée:</span> 
                      <span className="ml-1">
                        {action.dureeHeures}h / {action.dureeJours}j
                      </span>
                    </div>
                    {action.ressourcesInternes && (
                      <div>
                        <span className="text-gray-600">Ressources internes:</span> {action.ressourcesInternes}
                      </div>
                    )}
                    
                    {action.ressourcesExternes && (
                      <div>
                        <span className="text-gray-600">Ressources externes:</span> {action.ressourcesExternes}
                      </div>
                    )}
                    
                    <div className="col-span-2 mt-2">
                      <div className="text-xs font-medium text-gray-500 mb-1">Changer le statut:</div>
                      <div className="flex space-x-2">
                        <Button 
                          variant={action.statut === 'planifie' ? 'primary' : 'outline'}
                          size="sm" 
                          className="text-xs py-1 h-7"
                          onClick={() => handleStatusChange(action.id, 'planifie')}
                        >
                          Planifié
                        </Button>
                        <Button 
                          variant={action.statut === 'en_cours' ? 'primary' : 'outline'}
                          size="sm" 
                          className="text-xs py-1 h-7"
                          onClick={() => handleStatusChange(action.id, 'en_cours')}
                        >
                          En cours
                        </Button>
                        <Button 
                          variant={action.statut === 'termine' ? 'primary' : 'outline'}
                          size="sm" 
                          className="text-xs py-1 h-7"
                          onClick={() => handleStatusChange(action.id, 'termine')}
                        >
                          Terminé
                        </Button>
                        <Button 
                          variant={action.statut === 'reporte' ? 'primary' : 'outline'}
                          size="sm" 
                          className="text-xs py-1 h-7"
                          onClick={() => handleStatusChange(action.id, 'reporte')}
                        >
                          Reporté
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
