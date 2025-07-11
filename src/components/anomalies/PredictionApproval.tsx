import React, { useState } from 'react';
import { CheckCircle, Edit2, Save, X, Zap, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Anomaly } from '../../types';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface PredictionApprovalProps {
  anomaly: Anomaly;
  onUpdate: (updatedAnomaly: Anomaly) => void;
}

export const PredictionApproval: React.FC<PredictionApprovalProps> = ({ anomaly, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedScores, setEditedScores] = useState({
    fiabiliteIntegriteScore: anomaly.fiabiliteIntegriteScore,
    disponibiliteScore: anomaly.disponibiliteScore,
    processSafetyScore: anomaly.processSafetyScore
  });
  const [isLoading, setIsLoading] = useState(false);

  // Calculate criticality based on total score
  const totalScore = editedScores.fiabiliteIntegriteScore + editedScores.disponibiliteScore + editedScores.processSafetyScore;
  
  const getCurrentCriticality = (total: number) => {
    if (total > 9) return 'critical';   // > 9: Anomalies critiques
    if (total >= 7) return 'high';     // 7-8: Anomalies à criticité élevée
    if (total >= 3) return 'medium';   // 3-6: Anomalies à criticité normale
    return 'low';                      // 0-2: Anomalies à criticité faible
  };

  const currentCriticality = getCurrentCriticality(totalScore);

  const handleApproveAI = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('anomalies')
        .update({
          status: 'en_cours',
          updated_at: new Date().toISOString()
        })
        .eq('id', anomaly.id);

      if (error) throw error;

      // Update local state
      const updatedAnomaly = {
        ...anomaly,
        status: 'in_progress' as const,
        updatedAt: new Date()
      };

      onUpdate(updatedAnomaly);
      toast.success('Prédictions IA approuvées avec succès');
    } catch (error) {
      console.error('Error approving AI predictions:', error);
      toast.error('Erreur lors de l\'approbation des prédictions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdits = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('anomalies')
        .update({
          human_fiabilite_integrite_score: Math.round(editedScores.fiabiliteIntegriteScore),
          human_disponibilite_score: Math.round(editedScores.disponibiliteScore),
          human_process_safety_score: Math.round(editedScores.processSafetyScore),
          status: 'en_cours',
          updated_at: new Date().toISOString()
        })
        .eq('id', anomaly.id);

      if (error) throw error;

      // Update local state
      const updatedAnomaly = {
        ...anomaly,
        userFiabiliteIntegriteScore: editedScores.fiabiliteIntegriteScore,
        userDisponibiliteScore: editedScores.disponibiliteScore,
        userProcessSafetyScore: editedScores.processSafetyScore,
        useUserScores: true,
        status: 'in_progress' as const,
        updatedAt: new Date()
      };

      onUpdate(updatedAnomaly);
      setIsEditing(false);
      toast.success('Modifications sauvegardées avec succès');
    } catch (error) {
      console.error('Error saving user edits:', error);
      toast.error('Erreur lors de la sauvegarde des modifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedScores({
      fiabiliteIntegriteScore: anomaly.fiabiliteIntegriteScore,
      disponibiliteScore: anomaly.disponibiliteScore,
      processSafetyScore: anomaly.processSafetyScore
    });
    setIsEditing(false);
  };

  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'success';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-red-600';
    if (score >= 3) return 'text-orange-600';
    if (score >= 2) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <span>Prédictions de Criticité</span>
            {anomaly.status !== 'new' && (
              <Badge variant="info">
                {anomaly.status === 'in_progress' ? 'En cours' : 
                 anomaly.status === 'treated' ? 'Traité' : 
                 anomaly.status === 'closed' ? 'Fermé' : anomaly.status}
              </Badge>
            )}
          </div>
          <div className="flex space-x-2">
            {!isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  disabled={isLoading}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
                {anomaly.status === 'new' && (
                  <Button 
                    size="sm" 
                    onClick={handleApproveAI}
                    disabled={isLoading}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approuver IA
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveEdits}
                  disabled={isLoading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {anomaly.status === 'new' && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Action requise:</strong> Veuillez approuver les prédictions IA ou les modifier selon votre expertise.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 mb-2">Fiabilité + Intégrité</p>
            {isEditing ? (
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={editedScores.fiabiliteIntegriteScore}
                onChange={(e) => setEditedScores({
                  ...editedScores,
                  fiabiliteIntegriteScore: parseFloat(e.target.value) || 0
                })}
                className="w-full text-center text-xl font-bold text-blue-900 bg-transparent border-b-2 border-blue-300 focus:outline-none focus:border-blue-500"
              />
            ) : (
              <p className={`text-xl font-bold ${getScoreColor(editedScores.fiabiliteIntegriteScore)}`}>
                {editedScores.fiabiliteIntegriteScore.toFixed(1)}
              </p>
            )}
            <div className="text-xs text-blue-600 mt-1">/5</div>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-600 mb-2">Disponibilité</p>
            {isEditing ? (
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={editedScores.disponibiliteScore}
                onChange={(e) => setEditedScores({
                  ...editedScores,
                  disponibiliteScore: parseFloat(e.target.value) || 0
                })}
                className="w-full text-center text-xl font-bold text-orange-900 bg-transparent border-b-2 border-orange-300 focus:outline-none focus:border-orange-500"
              />
            ) : (
              <p className={`text-xl font-bold ${getScoreColor(editedScores.disponibiliteScore)}`}>
                {editedScores.disponibiliteScore.toFixed(1)}
              </p>
            )}
            <div className="text-xs text-orange-600 mt-1">/5</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600 mb-2">Sécurité Process</p>
            {isEditing ? (
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={editedScores.processSafetyScore}
                onChange={(e) => setEditedScores({
                  ...editedScores,
                  processSafetyScore: parseFloat(e.target.value) || 0
                })}
                className="w-full text-center text-xl font-bold text-purple-900 bg-transparent border-b-2 border-purple-300 focus:outline-none focus:border-purple-500"
              />
            ) : (
              <p className={`text-xl font-bold ${getScoreColor(editedScores.processSafetyScore)}`}>
                {editedScores.processSafetyScore.toFixed(1)}
              </p>
            )}
            <div className="text-xs text-purple-600 mt-1">/5</div>
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="text-sm text-gray-500">Criticité:</span>
            <Badge variant={getBadgeVariant(currentCriticality)}>
              {currentCriticality.toUpperCase()}
            </Badge>
          </div>
          <div className="text-sm text-gray-500">
            Score total: {(editedScores.fiabiliteIntegriteScore + editedScores.disponibiliteScore + editedScores.processSafetyScore).toFixed(1)}/15
          </div>
        </div>

        {anomaly.useUserScores && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Scores modifiés par l'utilisateur</span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Ces scores ont été ajustés manuellement et remplacent les prédictions IA.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="mt-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Sauvegarde en cours...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
