/**
 * Utility functions for score conversion and management
 */

/**
 * Converts individual Fiabilité and Intégrité scores to a combined score
 * @param fiabiliteScore - Fiabilité score (0-10)
 * @param integriteScore - Intégrité score (0-10)
 * @returns Combined score (0-5)
 */
export function combineFiabiliteIntegriteScores(
  fiabiliteScore: number,
  integriteScore: number
): number {
  // Average the two scores and convert from /10 to /5
  const averageScore = (fiabiliteScore + integriteScore) / 2;
  const convertedScore = (averageScore / 10) * 5;
  
  // Round to 1 decimal place
  return Math.round(convertedScore * 10) / 10;
}

/**
 * Converts a score from /10 to /5 scale
 * @param score - Score on /10 scale
 * @returns Score on /5 scale
 */
export function convertScoreToFive(score: number): number {
  const convertedScore = (score / 10) * 5;
  return Math.round(convertedScore * 10) / 10;
}

/**
 * Converts a score from /5 to /10 scale
 * @param score - Score on /5 scale
 * @returns Score on /10 scale
 */
export function convertScoreToTen(score: number): number {
  const convertedScore = (score / 5) * 10;
  return Math.round(convertedScore * 10) / 10;
}

/**
 * Calculates the overall anomaly score based on all metrics
 * @param fiabiliteIntegriteScore - Combined F&I score (0-5)
 * @param disponibiliteScore - Availability score (0-5)
 * @param processSafetyScore - Process safety score (0-5)
 * @returns Overall anomaly score (0-5)
 */
export function calculateOverallAnomalyScore(
  fiabiliteIntegriteScore: number,
  disponibiliteScore: number,
  processSafetyScore: number
): number {
  // Weighted average: F&I (40%), Availability (35%), Process Safety (25%)
  const weightedScore = 
    (fiabiliteIntegriteScore * 0.4) + 
    (disponibiliteScore * 0.35) + 
    (processSafetyScore * 0.25);
  
  return Math.round(weightedScore * 10) / 10;
}

/**
 * Determines criticality level based on scores
 * @param overallScore - Overall anomaly score (0-5)
 * @param processSafetyScore - Process safety score (0-5)
 * @returns Criticality level
 */
export function determineCriticalityLevel(
  overallScore: number,
  processSafetyScore: number
): 'low' | 'medium' | 'high' | 'critical' {
  // Critical if process safety is very low
  if (processSafetyScore <= 1.5) {
    return 'critical';
  }
  
  // High if overall score is low or process safety is concerning
  if (overallScore <= 2.0 || processSafetyScore <= 2.5) {
    return 'high';
  }
  
  // Medium if overall score is moderate
  if (overallScore <= 3.5) {
    return 'medium';
  }
  
  // Low for good scores
  return 'low';
}

/**
 * Calculates criticality level based on sum of all three scores
 * @param fiabiliteIntegriteScore - Combined F&I score (0-5)
 * @param disponibiliteScore - Availability score (0-5)
 * @param processSafetyScore - Process safety score (0-5)
 * @returns Criticality level
 */
export function calculateCriticalityLevelFromSum(
  fiabiliteIntegriteScore: number,
  disponibiliteScore: number,
  processSafetyScore: number
): 'low' | 'medium' | 'high' | 'critical' {
  // Calculate sum of 3 scores out of 5 each (total range 0-15)
  const totalScore = fiabiliteIntegriteScore + disponibiliteScore + processSafetyScore;
  
  if (totalScore > 9) return 'critical';     // > 9: Anomalies critiques
  if (totalScore >= 7) return 'high';       // 7-8: Anomalies à criticité élevée  
  if (totalScore >= 3) return 'medium';     // 3-6: Anomalies à criticité normale
  return 'low';                             // 0-2: Anomalies à criticité faible
}

/**
 * Formats a score for display
 * @param score - Score to format
 * @param maxScore - Maximum possible score (default: 5)
 * @returns Formatted score string
 */
export function formatScore(score: number, maxScore: number = 5): string {
  return `${score.toFixed(1)}/${maxScore}`;
}

/**
 * Gets color class based on score
 * @param score - Score to evaluate
 * @param maxScore - Maximum possible score (default: 5)
 * @returns CSS color class
 */
export function getScoreColor(score: number, maxScore: number = 5): string {
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 60) return 'text-yellow-600';
  if (percentage >= 40) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Gets background color class based on score
 * @param score - Score to evaluate
 * @param maxScore - Maximum possible score (default: 5)
 * @returns CSS background color class
 */
export function getScoreBackgroundColor(score: number, maxScore: number = 5): string {
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 80) return 'bg-green-100';
  if (percentage >= 60) return 'bg-yellow-100';
  if (percentage >= 40) return 'bg-orange-100';
  return 'bg-red-100';
}

/**
 * Migration utility to convert old anomaly data to new format
 * @param oldAnomaly - Anomaly with old score format
 * @returns Anomaly with new score format
 */
export function migrateAnomalyScores(oldAnomaly: any): any {
  const newAnomaly = { ...oldAnomaly };
  
  // Convert old separate scores to new combined score
  if (oldAnomaly.fiabiliteScore !== undefined && oldAnomaly.integriteScore !== undefined) {
    newAnomaly.fiabiliteIntegriteScore = combineFiabiliteIntegriteScores(
      oldAnomaly.fiabiliteScore,
      oldAnomaly.integriteScore
    );
    
    // Remove old fields
    delete newAnomaly.fiabiliteScore;
    delete newAnomaly.integriteScore;
  }
  
  // Convert user override scores
  if (oldAnomaly.userFiabiliteScore !== undefined && oldAnomaly.userIntegriteScore !== undefined) {
    newAnomaly.userFiabiliteIntegriteScore = combineFiabiliteIntegriteScores(
      oldAnomaly.userFiabiliteScore,
      oldAnomaly.userIntegriteScore
    );
    
    // Remove old fields
    delete newAnomaly.userFiabiliteScore;
    delete newAnomaly.userIntegriteScore;
  }
  
  return newAnomaly;
}
