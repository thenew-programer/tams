import React from 'react';
import { AlertTriangle, Shield, Activity, Wrench } from 'lucide-react';
import { Anomaly } from '../../types';
import { formatScore, getScoreColor, getScoreBackgroundColor } from '../../lib/scoringUtils';

interface AnomalyScoresDisplayProps {
  anomaly: Anomaly;
  showUserOverrides?: boolean;
}

export const AnomalyScoresDisplay: React.FC<AnomalyScoresDisplayProps> = ({ 
  anomaly, 
  showUserOverrides = false 
}) => {
  // Use user overrides if available and enabled
  const useUserScores = anomaly.useUserScores && showUserOverrides;
  
  const fiabiliteIntegriteScore = useUserScores 
    ? (anomaly.userFiabiliteIntegriteScore ?? anomaly.fiabiliteIntegriteScore)
    : anomaly.fiabiliteIntegriteScore;
    
  const disponibiliteScore = useUserScores 
    ? (anomaly.userDisponibiliteScore ?? anomaly.disponibiliteScore)
    : anomaly.disponibiliteScore;
    
  const processSafetyScore = useUserScores 
    ? (anomaly.userProcessSafetyScore ?? anomaly.processSafetyScore)
    : anomaly.processSafetyScore;
    
  const criticalityLevel = useUserScores 
    ? (anomaly.userCriticalityLevel ?? anomaly.criticalityLevel)
    : anomaly.criticalityLevel;

  const scores = [
    {
      label: 'Fiabilité + Intégrité',
      value: fiabiliteIntegriteScore,
      icon: Wrench,
      description: 'Score combiné de fiabilité et intégrité'
    },
    {
      label: 'Disponibilité',
      value: disponibiliteScore,
      icon: Activity,
      description: 'Impact sur la disponibilité du système'
    },
    {
      label: 'Sécurité Processus',
      value: processSafetyScore,
      icon: Shield,
      description: 'Risque pour la sécurité des processus'
    }
  ];

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getCriticalityLabel = (level: string) => {
    switch (level) {
      case 'critical': return 'CRITIQUE';
      case 'high': return 'ÉLEVÉ';
      case 'medium': return 'NORMAL';
      case 'low': return 'FAIBLE';
      default: return 'INCONNU';
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Criticality */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold">Niveau de Criticité</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCriticalityColor(criticalityLevel)}`}>
          {getCriticalityLabel(criticalityLevel)}
        </span>
      </div>

      {/* Individual Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scores.map((score, index) => {
          const Icon = score.icon;
          return (
            <div key={index} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{score.label}</h4>
                  <p className="text-xs text-gray-500">{score.description}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold ${getScoreColor(score.value)}`}>
                  {formatScore(score.value)}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreBackgroundColor(score.value)}`}>
                  {score.value >= 4 ? 'Critique' : 
                   score.value >= 3 ? 'Élevé' : 
                   score.value >= 2 ? 'Moyen' : 'Faible'}
                </span>
              </div>

              {/* Score bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      score.value >= 4 ? 'bg-red-500' : 
                      score.value >= 3 ? 'bg-orange-500' : 
                      score.value >= 2 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(score.value / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Override Indicator */}
      {useUserScores && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Scores utilisateur actifs</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Les scores affichés ont été modifiés par {anomaly.lastModifiedBy} le{' '}
            {anomaly.lastModifiedAt?.toLocaleDateString('fr-FR')}
          </p>
        </div>
      )}

      {/* Calculation Info */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <h5 className="text-sm font-medium text-gray-900 mb-2">Informations sur le calcul</h5>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• <strong>Fiabilité + Intégrité:</strong> Score combiné des deux métriques originales</p>
          <p>• <strong>Échelle:</strong> Tous les scores sont sur une échelle de 0 à 5</p>
          <p>• <strong>Criticité:</strong> Calculée automatiquement basée sur la somme des trois scores</p>
        </div>
      </div>
    </div>
  );
};

export default AnomalyScoresDisplay;
