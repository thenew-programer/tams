import React from 'react';
import { Anomaly } from '../../types';
import { formatScore, getScoreColor, getScoreBackgroundColor } from '../../lib/scoreUtils';

interface AnomalyScoreDisplayProps {
  anomaly: Anomaly;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AnomalyScoreDisplay: React.FC<AnomalyScoreDisplayProps> = ({
  anomaly,
  showDetails = false,
  size = 'md'
}) => {
  // Use user scores if available, otherwise use AI scores
  const fiabiliteIntegriteScore = anomaly.useUserScores 
    ? anomaly.userFiabiliteIntegriteScore ?? anomaly.fiabiliteIntegriteScore
    : anomaly.fiabiliteIntegriteScore;
  
  const disponibiliteScore = anomaly.useUserScores 
    ? anomaly.userDisponibiliteScore ?? anomaly.disponibiliteScore
    : anomaly.disponibiliteScore;
  
  const processSafetyScore = anomaly.useUserScores 
    ? anomaly.userProcessSafetyScore ?? anomaly.processSafetyScore
    : anomaly.processSafetyScore;

  const criticalityLevel = anomaly.useUserScores 
    ? anomaly.userCriticalityLevel ?? anomaly.criticalityLevel
    : anomaly.criticalityLevel;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-700 bg-red-100';
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCriticalityLabel = (level: string) => {
    switch (level) {
      case 'critical': return 'Critique';
      case 'high': return 'Élevé';
      case 'medium': return 'Normal';
      case 'low': return 'Faible';
      default: return 'Inconnu';
    }
  };

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded text-xs font-medium ${getCriticalityColor(criticalityLevel)}`}>
          {getCriticalityLabel(criticalityLevel)}
        </span>
        <span className={`${sizeClasses[size]} font-medium ${getScoreColor(fiabiliteIntegriteScore)}`}>
          {formatScore(fiabiliteIntegriteScore)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Criticality Level */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Criticité:</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getCriticalityColor(criticalityLevel)}`}>
          {getCriticalityLabel(criticalityLevel)}
        </span>
      </div>

      {/* Individual Scores */}
      <div className="space-y-2">
        {/* Combined Fiabilité & Intégrité */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Fiabilité & Intégrité:</span>
          <div className="flex items-center gap-2">
            <div className={`w-16 h-2 rounded-full ${getScoreBackgroundColor(fiabiliteIntegriteScore)}`}>
              <div
                className={`h-2 rounded-full ${getScoreColor(fiabiliteIntegriteScore).replace('text-', 'bg-')}`}
                style={{ width: `${(fiabiliteIntegriteScore / 5) * 100}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${getScoreColor(fiabiliteIntegriteScore)}`}>
              {formatScore(fiabiliteIntegriteScore)}
            </span>
          </div>
        </div>

        {/* Disponibilité */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Disponibilité:</span>
          <div className="flex items-center gap-2">
            <div className={`w-16 h-2 rounded-full ${getScoreBackgroundColor(disponibiliteScore)}`}>
              <div
                className={`h-2 rounded-full ${getScoreColor(disponibiliteScore).replace('text-', 'bg-')}`}
                style={{ width: `${(disponibiliteScore / 5) * 100}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${getScoreColor(disponibiliteScore)}`}>
              {formatScore(disponibiliteScore)}
            </span>
          </div>
        </div>

        {/* Process Safety */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Sécurité Processus:</span>
          <div className="flex items-center gap-2">
            <div className={`w-16 h-2 rounded-full ${getScoreBackgroundColor(processSafetyScore)}`}>
              <div
                className={`h-2 rounded-full ${getScoreColor(processSafetyScore).replace('text-', 'bg-')}`}
                style={{ width: `${(processSafetyScore / 5) * 100}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${getScoreColor(processSafetyScore)}`}>
              {formatScore(processSafetyScore)}
            </span>
          </div>
        </div>
      </div>

      {/* User Override Indicator */}
      {anomaly.useUserScores && (
        <div className="flex items-center gap-1 text-xs text-blue-600">
          <span>✓</span>
          <span>Scores utilisateur appliqués</span>
          {anomaly.lastModifiedBy && (
            <span className="text-gray-500">par {anomaly.lastModifiedBy}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default AnomalyScoreDisplay;
